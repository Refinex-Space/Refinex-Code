import type { DesktopBridge } from "../../shared/contracts";

declare module "*.css";

declare global {
  interface Window {
    desktopApp: DesktopBridge;
  }
}

export {};
