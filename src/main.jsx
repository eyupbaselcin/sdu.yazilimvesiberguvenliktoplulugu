import React from "react";
import { createRoot } from "react-dom/client";
import ContactPage from "./ContactPage.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ContactPage />
  </React.StrictMode>,
);
