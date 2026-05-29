import { startAutoInitialization, stopAutoInitialization, getActiveControllers } from "@crashlanxd/math-art";

let layoutThemeController: AbortController | null = null;

document.addEventListener("astro:page-load", () => {
  stopAutoInitialization();
  startAutoInitialization(); 

  if (layoutThemeController) layoutThemeController.abort();
  layoutThemeController = new AbortController();

  window.addEventListener("theme-changed", () => {
    getActiveControllers().forEach(controller => controller.updateTheme());
  }, { signal: layoutThemeController.signal });
});