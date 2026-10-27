import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/Auth";
import { Web3Provider } from "./context/Web3";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <Web3Provider>
        <App />
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: 14, fontFamily: "Figtree", fontWeight: 500 } }} />
      </Web3Provider>
    </AuthProvider>
  </BrowserRouter>
);
