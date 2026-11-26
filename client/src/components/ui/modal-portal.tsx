import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders modal overlays directly into `document.body` so they escape any parent
 * stacking context (`backdrop-filter`, `transform`, or `z-index` on cards/layouts)
 * and always sit cleanly above cards, sidebars, FABs, and fixed navbars.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') {
    return <>{children}</>;
  }
  return createPortal(children, document.body);
}
