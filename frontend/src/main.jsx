import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./state/AuthContext";
import { SessionTimeoutManager } from "./components/SessionTimeoutManager";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SessionTimeoutManager />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
