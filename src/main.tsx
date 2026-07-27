import React from "react";
import ReactDOM from "react-dom/client";

// Fontes empacotadas com o app: instalado como PWA ele continua com a
// tipografia certa offline, e sem a ida ao Google Fonts a primeira pintura
// deixa de esperar por uma resposta de rede.
import "@fontsource/anton/latin-400.css";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-800.css";

import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
