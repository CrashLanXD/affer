import Ticker, { type TickCallback, type TickData } from "./ticker";
import Viewport from "./viewport";
import { dist } from "./utils";

/**
 * TODOS:
 * - isFocused via document.hasFocus(), broadcast on focus/blur
 * - Auto-calibration: derive `calibration.offsetX/Y` automatically by comparing
 *   reported window frames instead of requiring a manual offset. Parked for
 *   now - chrome/titlebar height isn't queryable from the page, so it'd have
 *   to be inferred/heuristic and gets messy across browsers.
 *
 * RESOLVED:
 * - Issue 1: Solitary Window Initialization Bug (Líder Solitario)
 * - Issue 2: Zombie Main Window on Tab Suspension (Page Visibility API)
 * - windowWidth/Height (outer) vs viewportWidth/Height (content) split + dpr
 */

export interface WindowState {
  id:             string;
  index:          number;
  /** Outer window position on screen (top-left), same coordinate space as centerX/Y */
  screenX:        number;
  screenY:        number;
  /** Outer OS window footprint (window.outerWidth/outerHeight) - includes browser chrome */
  windowWidth:    number;
  windowHeight:   number;
  /** Inner content/canvas area (Viewport.width/height) - excludes browser chrome */
  viewportWidth:  number;
  viewportHeight: number;
  /** devicePixelRatio for this window, from Viewport.dpr - can differ across monitors */
  dpr:            number;
  /** Physical center of the OUTER window, derived from screenX/Y + windowWidth/Height */
  centerX:        number;
  centerY:        number;
  isMain:         boolean;
  createdAt:      number;
  /** True while the tab is backgrounded and has abdicated leadership eligibility */
  suspended:      boolean;
}

interface RemoteWindowState extends WindowState {
  lastSeen: number;
}

export interface ClusterTelemetry {
  /** Absolute mouse position in pixels */
  mouseAbsolute: { x: number; y: number };
  /** Sorted list of active windows on the swarm  */
  windows:       WindowState[];
  /** Euclidean distances between the center of each window */
  distances:     Record<string, number>;
}

export interface WindowClusterOptions {
  channelId:       string;
  calibration?:    { offsetX: number; offsetY: number };
  externalTicker?: boolean;
  /** Triggers instantly when this window become the Leader of the cluster */
  onMainClaimed?:  () => void;

  /**
   * "instant": Self-assess and claim leadership immediately if alone
   * "lazy": Wait for at least one other window to connect before resolving
   *         hierarchy.
   * @default "instant"
   */
  initMode?: "instant" | "lazy";

  /**
   * What to do if the MAIN window is minimized/backgrounded.
   * "abdicate": Instantly demotes this window's leadership eligibility so a
   *             visible window can take over; reclaims it automatically when
   *             visible again (since createdAt is preserved).
   * "keep": Leadership unaffected by visibility.
   * @default "abdicate"
   */
  onSuspendedBehavior?: "abdicate" | "keep";
}

interface MinimalMouseTracker {
  px:       { x: number; y: number };
  isInside: boolean;
}

type MessageType = "HELLO" | "UPDATE_WIN" | "UPDATE_MOUSE" | "CUSTOM" | "BYE" | "PING";
interface ClusterMessage { // Minified keys to reduce Structured Clone overhead in postMessage
  t: MessageType; // type
  s: string;      // senderId
  d: any;         // data
}

export class WindowCluster {

  public id = Math.random().toString(36).substring(2, 9);
  public createdAt = Date.now();
  public index = 0;
  public isMain = false;
  public isDestroyed = false;

  public telemetry: ClusterTelemetry = {
    mouseAbsolute: { x: 0, y: 0 },
    windows:       [],
    distances:     {},
  };

  private channelId!:          string;
  private channel!:            BroadcastChannel | null;
  private localStateSnapshot!: WindowState;
  private networkEnvelope:     ClusterMessage = { t: "HELLO", s: "", d: null };
  private activeMouseTracker:  MinimalMouseTracker | null = null;

  // windowsMap contains only REMOTE windows. Local state lives in localStateSnapshot.
  private windowsMap = new Map<string, RemoteWindowState>();
  private customListeners = new Map<string, Set<(payload: any, senderId: string) => void>>();

  private calibration = { offsetX: 0, offsetY: 0 };
  private initMode:            "instant" | "lazy" = "instant";
  private onSuspendedBehavior: "abdicate" | "keep" = "abdicate";
  private prevScreenX = -9999;
  private prevScreenY = -9999;
  private prevOuterW  = -9999;
  private prevOuterH  = -9999;
  private prevMouseX  = -9999;
  private prevMouseY  = -9999;

  private onMainClaimedCallback?: () => void;
  private _tickerCallback:        TickCallback | null = null;
  private heartbeatInterval?:     ReturnType<typeof setInterval>;

  // Emits every 2s, dies if silent for 5s (absorbs event loop jitter).
  // Suspended (backgrounded) windows keep pinging via setInterval - they are
  // never purged by DEATH_THRESHOLD, only deprioritized in resolveClusterHierarchy.
  private readonly HEARTBEAT_RATE = 2000;
  private readonly DEATH_THRESHOLD = 5000;

  constructor(options: WindowClusterOptions) {
    if (!options?.channelId) throw new Error("Affer Error: 'channelId' is required to instancing WindowCluster");
    if (typeof window === "undefined") return;

    if (options.calibration) this.calibration = { ...this.calibration, ...options.calibration };
    this.onMainClaimedCallback = options.onMainClaimed;
    this.initMode = options.initMode ?? "instant";
    this.onSuspendedBehavior = options.onSuspendedBehavior ?? "abdicate";

    this.channel = new BroadcastChannel(`zyphora_cluster_${options.channelId}`);
    this.channel.onmessage = this.handleMessage.bind(this);
    this.channelId = options.channelId;
    this.networkEnvelope.s = this.id;

    this.localStateSnapshot = {
      id:             this.id,
      index:          this.index,
      screenX:        0,
      screenY:        0,
      windowWidth:    0,
      windowHeight:   0,
      viewportWidth:  0,
      viewportHeight: 0,
      dpr:            1,
      centerX:        0,
      centerY:        0,
      isMain:         this.isMain,
      createdAt:      this.createdAt,
      suspended:      typeof document !== "undefined" ? document.hidden : false,
    };

    this.update = this.update.bind(this);
    this.handleUnload = this.handleUnload.bind(this);
    this.handlePageShow = this.handlePageShow.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

    this.updateLocalState(window.screenX, window.screenY);

    // solitary window claims leadership immediately instead of waiting.
    if (this.initMode === "instant") {
      this.resolveClusterHierarchy();
      this.calculateDistances();
    }

    this.broadcast("HELLO", this.localStateSnapshot);

    window.addEventListener("pageshow", this.handlePageShow);
    window.addEventListener("beforeunload", this.handleUnload);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    if (!options.externalTicker) {
      this._tickerCallback = (data: TickData) => this.update(data.deltaTime);
      Ticker.add(this._tickerCallback);
    }
    this.heartbeatInterval = setInterval(this.runHeartbeat.bind(this), this.HEARTBEAT_RATE);
  }

  /** Link an external mouse tracker to share coordinates across the cluster */
  public bindMouseTracker(tracker: MinimalMouseTracker): void {
    this.activeMouseTracker = tracker;
  }

  /**
   * Broadcasts arbitrary data to all other windows in the cluster.
   * @param event The event namespace.
   * @param payload Any serializable data.
   */
  public emit(event: string, payload: any): void {
    this.broadcast("CUSTOM", { e: event, p: payload });
  }

  /**
   * Listens for arbitrary data broadcasted by other windows.
   * @returns A cleanup function to remove the listener
   */
  public on(event: string, callback: (payload: any, senderId: string) => void): () => void {
    if (!this.customListeners.has(event)) this.customListeners.set(event, new Set());
    const eventSet = this.customListeners.get(event)!;
    eventSet.add(callback);
    return () => eventSet.delete(callback);
  }

  /**
   * Main synchronization loop.
   */
  public update(_deltaTime?: number): void {
    const currentScreenX = window.screenX;
    const currentScreenY = window.screenY;
    const currentOuterW = window.outerWidth;
    const currentOuterH = window.outerHeight;

    const windowMoved = currentScreenX !== this.prevScreenX || currentScreenY !== this.prevScreenY;
    const windowResized = currentOuterW !== this.prevOuterW || currentOuterH !== this.prevOuterH;

    if (windowMoved || windowResized) {
      this.prevScreenX = currentScreenX;
      this.prevScreenY = currentScreenY;
      this.prevOuterW = currentOuterW;
      this.prevOuterH = currentOuterH;

      this.updateLocalState(currentScreenX, currentScreenY);
      this.broadcast("UPDATE_WIN", this.localStateSnapshot);
      this.calculateDistances();
    }

    if (this.activeMouseTracker && this.activeMouseTracker.isInside) {
      const mx = this.activeMouseTracker.px.x;
      const my = this.activeMouseTracker.px.y;

      if (mx !== this.prevMouseX || my !== this.prevMouseY || windowMoved) {
        this.prevMouseX = mx;
        this.prevMouseY = my;

        this.telemetry.mouseAbsolute.x = currentScreenX + mx + this.calibration.offsetX;
        this.telemetry.mouseAbsolute.y = currentScreenY + my + this.calibration.offsetY;

        this.broadcast("UPDATE_MOUSE", this.telemetry.mouseAbsolute);
      }
    }
  }

  private updateLocalState(sX: number, sY: number): void {
    const vw = Viewport.width;
    const vh = Viewport.height;
    // outerWidth/outerHeight can be unreliable in some embedded/webview contexts;
    // fall back to the viewport size rather than reporting a 0-size window.
    const ww = window.outerWidth  || vw;
    const wh = window.outerHeight || vh;

    this.localStateSnapshot.id = this.id;
    this.localStateSnapshot.index = this.index;
    this.localStateSnapshot.screenX = sX;
    this.localStateSnapshot.screenY = sY;
    this.localStateSnapshot.windowWidth = ww;
    this.localStateSnapshot.windowHeight = wh;
    this.localStateSnapshot.viewportWidth = vw;
    this.localStateSnapshot.viewportHeight = vh;
    this.localStateSnapshot.dpr = Viewport.dpr;
    // centerX/Y use the OUTER window footprint, since screenX/Y are also
    // outer-window coordinates - using the inner viewport here would shift
    // the calculated center by the browser chrome height (title bar, tabs,
    // toolbars), which differs per browser.
    this.localStateSnapshot.centerX = sX + ww / 2;
    this.localStateSnapshot.centerY = sY + wh / 2;
    this.localStateSnapshot.isMain = this.isMain;
    this.localStateSnapshot.createdAt = this.createdAt;
    // `suspended` is intentionally not touched here - it's owned by handleVisibilityChange.
  }

  private broadcast(type: MessageType, data: any): void {
    if (!this.channel) return;
    this.networkEnvelope.t = type;
    this.networkEnvelope.d = data;

    try {
      this.channel.postMessage(this.networkEnvelope);
    } catch {
      // DOMException: Failed to execute 'postMessage' on 'BroadcastChannel': The channel has been closed.
      // Reconnect triggers HELLO asynchronously, dropping the current message is acceptable.
      this.reconnect();
    }

    this.networkEnvelope.d = null; // Free reference for GC
  }

  private runHeartbeat(): void {
    if (typeof window === "undefined") return;
    this.broadcast("PING", null);

    let hierarchyChanged = false;
    const now = Date.now();

    for (const [id, win] of this.windowsMap.entries()) {
      if (now - win.lastSeen > this.DEATH_THRESHOLD) {
        this.windowsMap.delete(id);
        hierarchyChanged = true;
        console.warn(`Affer Cluster: Window ${id} died unexpectedly. Purged`);
      }
    }

    if (hierarchyChanged) {
      this.resolveClusterHierarchy();
      this.calculateDistances();
    }
  }

  private handleMessage(e: MessageEvent<ClusterMessage>): void {
    const { t, s, d } = e.data;
    if (!t || s === this.id) return;

    let senderWin = this.windowsMap.get(s); // any activity means the window is still alive
    if (senderWin) senderWin.lastSeen = Date.now();

    if (t === "PING") {
      if (!senderWin) this.broadcast("UPDATE_WIN", this.localStateSnapshot);
      return;
    }

    else if (t === "HELLO") {
      senderWin = { ...d, lastSeen: Date.now() };
      this.windowsMap.set(s, senderWin as RemoteWindowState);
      this.resolveClusterHierarchy();
      this.calculateDistances();

      this.broadcast("UPDATE_WIN", this.localStateSnapshot);
      if (this.activeMouseTracker && this.activeMouseTracker.isInside) {
        this.broadcast("UPDATE_MOUSE", this.telemetry.mouseAbsolute);
      }
    }
    
    else if (t === "UPDATE_WIN") {
      const existingWin = this.windowsMap.get(s);
      if (existingWin) {
        // A suspended <-> active transition changes leadership eligibility,
        // so it must force a hierarchy re-resolve - unlike plain position/size
        // changes, which don't affect sort order and are cheap to skip.
        const suspensionChanged = existingWin.suspended !== d.suspended;

        existingWin.screenX = d.screenX;
        existingWin.screenY = d.screenY;
        existingWin.windowWidth = d.windowWidth;
        existingWin.windowHeight = d.windowHeight;
        existingWin.viewportWidth = d.viewportWidth;
        existingWin.viewportHeight = d.viewportHeight;
        existingWin.dpr = d.dpr;
        existingWin.centerX = d.centerX;
        existingWin.centerY = d.centerY;
        existingWin.isMain  = d.isMain;
        existingWin.index   = d.index;
        existingWin.suspended = d.suspended;

        if (suspensionChanged) this.resolveClusterHierarchy();
      } else {
        this.windowsMap.set(s, { ...d, lastSeen: Date.now() }); // for security, this should never happen
        this.resolveClusterHierarchy();
      }
      this.calculateDistances();
    }
    
    else if (t === "UPDATE_MOUSE") {
      this.telemetry.mouseAbsolute.x = d.x;
      this.telemetry.mouseAbsolute.y = d.y;
    }

    else if (t === "CUSTOM") {
      const eventSet = this.customListeners.get(d.e);
      if (eventSet) eventSet.forEach(cb => cb(d.p, s));
    }
    
    else if (t === "BYE") {
      this.windowsMap.delete(s);
      delete this.telemetry.distances[s];
      this.resolveClusterHierarchy();
      this.calculateDistances();
    }
  }

  /**
   * Sort cluster and redefines the index of each window.
   * Suspended windows sink to the bottom regardless of age,
   * so a suspended leader loses eligibility without losing its createdAt -
   * meaning it reclaims leadership automatically once visible again.
   */
  private resolveClusterHierarchy(): void {
    const all = [this.localStateSnapshot as RemoteWindowState, ...this.windowsMap.values()];
    const sortedCluster = all.sort((a, b) => {
      if (a.suspended !== b.suspended) return a.suspended ? 1 : -1;
      return a.createdAt - b.createdAt;
    });
    const wasMain = this.isMain;
    const len = sortedCluster.length;

    for (let i = 0; i < len; i++) {
      const win = sortedCluster[i];
      win.index = i;
      win.isMain = i === 0;

      if (win.id === this.id) {
        this.index = i;
        this.isMain = win.isMain;
      }
    }

    this.telemetry.windows = sortedCluster;

    // Triggers callback if leadership was just transferred to this window
    if (!wasMain && this.isMain && this.onMainClaimedCallback) this.onMainClaimedCallback();
  }

  private calculateDistances(): void {
    const wins = this.telemetry.windows;
    const len = wins.length;

    const newDistances: Record<string, number> = {};

    for (let i = 0; i < len; i++) {
      const target = wins[i];
      if (target.id === this.id) continue;
      newDistances[target.id] = dist(target.centerX, target.centerY, this.localStateSnapshot.centerX, this.localStateSnapshot.centerY);
    }

    this.telemetry.distances = newDistances;
  }

  private reconnect(): void {
    if (this.channel) this.channel.close();
    this.channel = new BroadcastChannel(`zyphora_cluster_${this.channelId}`);
    this.channel.onmessage = this.handleMessage;
    setTimeout(() => this.broadcast("HELLO", this.localStateSnapshot), 0);
  }

  private handlePageShow(e: PageTransitionEvent): void {
    if (e.persisted) this.reconnect(); // for BFCache
  }

  /**
   * rAF is throttled/paused on hidden tabs, but
   * visibilitychange fires regardless, so we can react instantly instead of
   * waiting on the (also throttled, but not stopped) heartbeat interval.
   */
  private handleVisibilityChange(): void {
    if (this.onSuspendedBehavior !== "abdicate") return;

    const hidden = document.hidden;
    if (hidden === this.localStateSnapshot.suspended) return; // no change

    this.localStateSnapshot.suspended = hidden;
    this.resolveClusterHierarchy();
    this.calculateDistances();
    this.broadcast("UPDATE_WIN", this.localStateSnapshot);
  }

  private handleUnload(): void {
    this.broadcast("BYE", null);
    if (this.channel) (this.channel.close(), this.channel = null);
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.handleUnload();
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleUnload);
      window.removeEventListener("pageshow", this.handlePageShow);
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
    if (this._tickerCallback) (Ticker.remove(this._tickerCallback), this._tickerCallback = null);
    this.customListeners.clear();
  }

}
