type CustomThemes = "omaha" | "webrings";
type AnyTheme = CustomThemes | (string & {});
type Theme = "auto" | "light" | "dark" | AnyTheme;
type ResolvedTheme = "light" | "dark" | AnyTheme;

interface ThemeManager {
  setTheme(theme?: Theme): void;
  getTheme(): Theme;
  getSystemTheme(): "light" | "dark";
  getDefaultTheme(): Theme;
}

declare global {
  interface Window {
    theme: ThemeManager;
  }

  interface WindowEventMap {
    /**
     * Fires when the theme is changed.
     */
    "theme-changed": CustomEvent<{
      theme:         Theme;                  // The configured theme (can be "auto")
      systemTheme:   "light" | "dark"; // The system theme
      defaultTheme:  Theme;           // The component's default theme
      resolvedTheme: ResolvedTheme;  // The applied theme (will never be "auto")
    }>;
  }
}

export {};
