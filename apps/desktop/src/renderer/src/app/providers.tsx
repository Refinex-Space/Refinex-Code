import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useUIStore } from "@renderer/stores/ui";

function resolveSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function ThemeEffect() {
  const theme = useUIStore((state) => state.theme);
  const [systemTheme, setSystemTheme] = useState(resolveSystemTheme);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setSystemTheme(media.matches ? "dark" : "light");
    };

    handleChange();
    media.addEventListener("change", handleChange);
    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const resolvedTheme = theme === "system" ? systemTheme : theme;
    document.documentElement.dataset.theme = resolvedTheme;
  }, [systemTheme, theme]);

  return null;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      <ThemeEffect />
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: "var(--color-panel)",
            color: "var(--color-fg)",
            border: "1px solid var(--color-border)",
            borderRadius: "18px",
            backdropFilter: "blur(24px)",
          },
        }}
      />
    </>
  );
}
