import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/syne";
import App from "./App";
import "./index.css";

// SEO: never serve the app over plain HTTP on a real host. Local dev hosts
// are exempt. This runs before React mounts, so no component/state logic is
// involved — plain URL redirect only.
const HOST = window.location.hostname;
const isLocal = HOST === "localhost" || HOST === "127.0.0.1" || HOST === "[::1]";

if (window.location.protocol === "http:" && !isLocal) {
  window.location.replace(window.location.href.replace(/^http:/, "https:"));
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
