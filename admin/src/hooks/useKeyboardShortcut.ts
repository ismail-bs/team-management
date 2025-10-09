import { useEffect } from 'react';

/**
 * Custom hook for keyboard shortcuts
 * @param key - The key to listen for
 * @param callback - Function to call when key is pressed
 * @param modifiers - Optional modifiers (ctrl, shift, alt, meta)
 */
export const useKeyboardShortcut = (
  key: string,
  callback: () => void,
  modifiers: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  } = {}
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchesKey = event.key.toLowerCase() === key.toLowerCase();
      const matchesCtrl = modifiers.ctrl ? event.ctrlKey : !event.ctrlKey;
      const matchesShift = modifiers.shift ? event.shiftKey : !event.shiftKey;
      const matchesAlt = modifiers.alt ? event.altKey : !event.altKey;
      const matchesMeta = modifiers.meta ? event.metaKey : !event.metaKey;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, modifiers]);
};

/**
 * Hook for Escape key to close dialogs/modals
 */
export const useEscapeKey = (callback: () => void) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [callback]);
};

