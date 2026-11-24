import { useRef } from "react";

/**
 * Lets a horizontal strip be dragged sideways with the mouse (touch already swipes natively).
 * Spread the returned props on the overflow-x-auto element. A drag never triggers a click.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  return {
    ref,
    onPointerDown: (e: React.PointerEvent<T>) => {
      const el = ref.current;
      if (!el || e.pointerType !== "mouse") return;
      drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
    },
    onPointerMove: (e: React.PointerEvent<T>) => {
      const el = ref.current;
      const d = drag.current;
      if (!el || !d) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 4) d.moved = true;
      el.scrollLeft = d.left - dx;
    },
    onPointerUp: () => {
      setTimeout(() => (drag.current = null), 0);
    },
    onPointerLeave: () => {
      drag.current = null;
    },
    onClickCapture: (e: React.MouseEvent<T>) => {
      if (drag.current?.moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    onDragStart: (e: React.DragEvent<T>) => e.preventDefault(),
  };
}

/** Classes that go with useDragScroll on the strip element. */
export const DRAG_STRIP = "no-scrollbar cursor-grab touch-pan-x select-none overflow-x-auto active:cursor-grabbing";
