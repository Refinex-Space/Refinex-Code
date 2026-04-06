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

function supportsAppearancePersistence() {
  return (
    typeof window !== "undefined" &&
    typeof window.desktopApp?.getAppearanceSettings === "function" &&
    typeof window.desktopApp?.saveAppearanceSettings === "function"
  );
}

export function Providers({ children }: ProvidersProps) {
  const resolvedTheme = useResolvedTheme();
  const theme = useUIStore((state) => state.theme);
  const pointerCursorEnabled = useUIStore((state) => state.pointerCursorEnabled);
  const uiFontSize = useUIStore((state) => state.uiFontSize);
  const codeFontSize = useUIStore((state) => state.codeFontSize);
  const colors = useUIStore((state) => state.colors);
  const appearanceSettingsHydrated = useUIStore(
    (state) => state.appearanceSettingsHydrated,
  );
  const hydrateAppearanceSettings = useUIStore(
    (state) => state.hydrateAppearanceSettings,
  );

  useEffect(() => {
    let cancelled = false;
    if (!supportsAppearancePersistence()) {
      return () => {
        cancelled = true;
      };
    }

    void window.desktopApp
      .getAppearanceSettings()
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        hydrateAppearanceSettings({
          theme: snapshot.theme,
          pointerCursorEnabled: snapshot.pointerCursorEnabled,
          uiFontSize: snapshot.uiFontSize,
          codeFontSize: snapshot.codeFontSize,
          colors: snapshot.colors,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [hydrateAppearanceSettings]);

  useEffect(() => {
    const activeColors = colors[resolvedTheme];
    document.documentElement.style.setProperty("--ui-font-size", `${uiFontSize}px`);
    document.documentElement.style.setProperty("--code-font-size", `${codeFontSize}px`);
    document.documentElement.style.setProperty(
      "--color-sidebar",
      activeColors.sidebarBackground,
    );
    document.documentElement.style.setProperty(
      "--color-bg",
      activeColors.panelBackground,
    );
    document.documentElement.dataset.pointerCursor = pointerCursorEnabled
      ? "enabled"
      : "disabled";
  }, [codeFontSize, colors, pointerCursorEnabled, resolvedTheme, uiFontSize]);

  useEffect(() => {
    if (
      !appearanceSettingsHydrated ||
      !supportsAppearancePersistence()
    ) {
      return;
    }

    void window.desktopApp
      .saveAppearanceSettings({
        theme,
        pointerCursorEnabled,
        uiFontSize,
        codeFontSize,
        colors,
      })
      .catch(() => undefined);
  }, [
    appearanceSettingsHydrated,
    codeFontSize,
    colors,
    pointerCursorEnabled,
    theme,
    uiFontSize,
  ]);

  return (
    <Theme
      appearance={resolvedTheme}
      accentColor="gray"
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
