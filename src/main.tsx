import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { applyDocumentEmbed, readEmbedFlag } from "./lib/runtime";
import "./index.css";

applyDocumentEmbed(readEmbedFlag());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
