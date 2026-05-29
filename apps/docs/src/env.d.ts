interface ThemeManager {
  setTheme(theme?: "auto" | "light" | "dark"): void;
  getTheme(): "auto" | "light" | "dark";
  getSystemTheme(): "light" | "dark";
  getDefaultTheme(): "auto" | "light" | "dark";
}

declare global {
  interface Window {
    theme: ThemeManager;
  }

  interface WindowEventMap {
    /**
     * Fires when the theme is changed.
     * @event theme-changed
     * @type {CustomEvent}
     * @property {"auto" | "light" | "dark"} theme - The configured value (knows if it's auto).
     * @property {"light" | "dark"} systemTheme - The system theme.
     * @property {"auto" | "light" | "dark"} defaultTheme - The default theme defined by attribute `data-default-theme`. in the script tag.
     * @property {"auto" | "light" | "dark"} resolvedTheme - The ACTIVE theme the user has selected.
     */
    "theme-changed": CustomEvent<{
      theme: "auto" | "light" | "dark";
      systemTheme: "light" | "dark";
      defaultTheme: "auto" | "light" | "dark";
      resolvedTheme: "auto" | "light" | "dark";
    }>;
  }
}

export {};