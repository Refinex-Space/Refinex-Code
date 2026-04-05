import { Theme } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { useUIStore } from "@renderer/stores/ui";

type ResolvedAppearance = "light" | "dark";

function resolveSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark" as ResolvedAppearance;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useResolvedTheme() {
  const theme = useUIStore((state) => state.theme);
  const [systemTheme, setSystemTheme] = useState<ResolvedAppearance>(resolveSystemTheme);

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

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  return resolvedTheme;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const resolvedTheme = useResolvedTheme();

  return (
    <Theme
      appearance={resolvedTheme}
      accentColor="blue"
      grayColor="slate"
      hasBackground={false}
      radius="medium"
      scaling="100%"
    >
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
    </Theme>
  );
}
