import { useEffect, useRef } from 'react';

/**
 * Custom Hook für ResizeObserver mit Memory-Leak Prevention
 * 
 * Verwendet useRef Pattern, um zu verhindern, dass ResizeObserver bei jedem Re-Render neu erstellt wird.
 * Dies behebt Memory-Leaks, die durch häufige Re-Erstellung von ResizeObserver-Instanzen entstehen.
 * 
 * @param containerRef - Ref zum zu beobachtenden Container-Element
 * @param onResize - Callback-Funktion, die bei Resize aufgerufen wird
 * @param options - Optionale Konfiguration
 * @param options.debounceMs - Debounce-Zeit in Millisekunden (Standard: 100ms)
 * @param options.enabled - Ob Observer aktiv sein soll (Standard: true)
 * @param options.additionalElementRef - Optional: Zusätzliches Element, das auch beobachtet werden soll (z.B. grandParent für negative Margins)
 */
export function useResizeObserver(
  containerRef: React.RefObject<HTMLElement>,
  onResize: () => void,
  options: {
    debounceMs?: number;
    enabled?: boolean;
    additionalElementRef?: React.RefObject<HTMLElement | null>;
  } = {}
): void {
  const { debounceMs = 100, enabled = true, additionalElementRef } = options;

  // ✅ MEMORY FIX: useRef für onResize (verhindert Re-Erstellung von ResizeObserver)
  const onResizeRef = useRef<() => void>();

  // ✅ MEMORY FIX: Aktualisiere Ref wenn onResize sich ändert
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  // ✅ MEMORY FIX: ResizeObserver nur EINMAL erstellen (keine Dependencies!)
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const resizeTimeoutRef = { current: null as NodeJS.Timeout | null };

    // ✅ MEMORY FIX: Debounced Resize-Handler
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        onResizeRef.current?.();
      }, debounceMs);
    };

    // ✅ MEMORY FIX: Verwende Ref statt direkter Funktion
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // ✅ FIX: Beobachte auch zusätzliches Element, wenn vorhanden (z.B. grandParent für negative Margins)
    if (additionalElementRef?.current) {
      resizeObserver.observe(additionalElementRef.current);
    }

    // ✅ MEMORY FIX: Window-Resize Event-Listener mit Ref
    const handleWindowResize = () => {
      handleResize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [enabled, debounceMs, containerRef, additionalElementRef]); // Nur Dependencies, die sich selten ändern
}
