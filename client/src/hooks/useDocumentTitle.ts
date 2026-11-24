import { useEffect } from 'react';

/**
 * Keeps the browser tab title synchronized with the active screen.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
