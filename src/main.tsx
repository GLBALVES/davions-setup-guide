import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { RegionProvider } from "./contexts/RegionContext.tsx";

// Register Service Worker for Web Push
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("SW registration failed:", err));
}

createRoot(document.getElementById("root")!).render(
  <RegionProvider>
    <App />
  </RegionProvider>
);
