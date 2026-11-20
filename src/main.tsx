
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/globals.css";
import "./styles/dashboard.css";
import "./styles/theme.css";

createRoot(document.getElementById("root")!).render(<App />);
