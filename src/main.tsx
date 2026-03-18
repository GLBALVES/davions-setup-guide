import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { RegionProvider } from "./contexts/RegionContext.tsx";

createRoot(document.getElementById("root")!).render(
  <RegionProvider>
    <App />
  </RegionProvider>
);
