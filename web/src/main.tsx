import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import StagePage from "./stage/StagePage";
import JoinPage from "./join/JoinPage";
import AdminPage from "./admin/AdminPage";
// Fonts bundled locally so the stage looks right with no internet.
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/stage" element={<StagePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/stage" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
