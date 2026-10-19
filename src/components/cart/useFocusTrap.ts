import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for the cart drawer: moves focus in, keeps Tab inside, closes on Escape, locks page scroll,
 * and returns focus to whatever opened it.
 */
export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const opener = document.activeElement;
    const previouslyFocused = opener instanceof HTMLElement && opener !== document.body ? opener : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    container?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !container) return;
      const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !container.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // The opener can unmount (e.g. an Add button that turns into a stepper); fall back to the header cart button.
      const target = previouslyFocused?.isConnected ? previouslyFocused : document.querySelector<HTMLElement>('button[aria-label^="Open shopping cart"]');
      target?.focus();
    };
  }, [active, containerRef, onClose]);
}
