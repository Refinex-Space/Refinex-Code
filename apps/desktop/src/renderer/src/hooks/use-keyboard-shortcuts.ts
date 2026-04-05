import { useEffect } from "react";
import { useUIStore } from "@renderer/stores/ui";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts() {
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const toggleTerminal = useUIStore((state) => state.toggleTerminal);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifierPressed = event.metaKey || event.ctrlKey;
      if (!modifierPressed) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "`") {
        event.preventDefault();
        toggleTerminal();
        return;
      }

      if (key === "b") {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      if (event.shiftKey && key === "t") {
        event.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setCommandPaletteOpen, toggleSidebar, toggleTerminal, toggleTheme]);
}
