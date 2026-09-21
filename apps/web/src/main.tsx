import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { ThemeProvider } from "./theme";
import { MaxEntry } from "./MaxEntry";
import { OnboardingGate } from "./Onboarding";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <MaxEntry><OnboardingGate><App /></OnboardingGate></MaxEntry>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
