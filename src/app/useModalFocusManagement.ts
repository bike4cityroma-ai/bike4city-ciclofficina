import { useEffect } from "react";

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(dialog: HTMLElement) {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((element) => !element.hidden);
}

export function useModalFocusManagement() {
  useEffect(() => {
    let activeDialog: HTMLElement | null = null;
    let previousFocus: HTMLElement | null = null;

    const activateDialog = (dialog: HTMLElement) => {
      activeDialog = dialog;
      previousFocus = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      queueMicrotask(() => {
        const firstControl = getFocusableElements(dialog)[0];
        (firstControl ?? dialog).focus();
      });
    };

    const observer = new MutationObserver(() => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
      if (dialog && dialog !== activeDialog) {
        activateDialog(dialog);
        return;
      }
      if (!dialog && activeDialog) {
        activeDialog = null;
        if (previousFocus?.isConnected) previousFocus.focus();
        previousFocus = null;
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !activeDialog) return;
      const controls = getFocusableElements(activeDialog);
      if (controls.length === 0) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const initialDialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (initialDialog) activateDialog(initialDialog);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
