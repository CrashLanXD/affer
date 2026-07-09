import { ScrollSection } from '@/core/scroll';

document.addEventListener("astro:page-load", () => {
  const footer = document.querySelector("footer");
  if (!footer) return;

  const footerTracker = new ScrollSection({
    element: footer,
    onUpdate: (section) => {
      // Estos logs corren bajo el Ticker, pero con RENDIMIENTO MÁXIMO (0 DOM reads)
      console.log("--- TELEMETRÍA FOOTER ---");
      console.log("Altura fija:", section.height);
      console.log("Top Absoluto en el DOM entero:", section.topAbs);
      
      // Ideal para saber cuándo entra exactamente al viewport físico
      console.log("Top respecto a la pantalla actual:", section.topViewport);
      console.log("Bottom respecto a la pantalla actual:", section.bottomViewport);
      
      // Ideal para usarlo en Shaders (WebGL) o Translate3D fluidos sin tirones
      console.log("Top Suavizado (LERP):", section.lerpTopViewport);
      
      console.log("Progreso de visibilidad (0 a 1):", section.lerpProgress);
    }
  });

  // Limpieza al cambiar de ruta en Astro
  document.addEventListener("astro:before-preparation", () => {
    footerTracker.destroy();
  }, { once: true });
});