import { useEffect, useRef, useState } from "react";

/** Keep chart coordinates in CSS pixels so labels retain their intended size on a phone. */
export function useChartWidth() {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, Math.round(entry.contentRect.width)));
    });
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}
