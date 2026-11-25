import { Check, Globe, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/hooks/useLanguage';
import { getLanguageOption, SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { cn } from '@/lib/cn';

/**
 * Compact header language switcher (`data-no-translate="true"` so language labels stay exact).
 * Displays a subtle spinner while real-time DOM translation is fetching uncached strings.
 */
export function LanguageSelector({ className }: { className?: string }) {
  const { language, setLanguage, isTranslating } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = getLanguageOption(language);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} data-no-translate="true" className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Change language (current: ${current.label})`}
        title={`Language: ${current.label}`}
        className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 shadow-2xs transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-emerald-400/40"
      >
        {isTranslating ? (
          <Loader2
            className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        )}
        <span>{current.shortCode}</span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Choose app language"
          className="absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
            Live Translation
          </p>
          <div className="space-y-0.5">
            {SUPPORTED_LANGUAGES.map((opt) => {
              const selected = opt.code === language;
              return (
                <button
                  key={opt.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setLanguage(opt.code);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors',
                    selected
                      ? 'bg-emerald-500/12 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300'
                      : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                      {opt.nativeHint}
                    </p>
                  </div>
                  {selected ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-zinc-400">{opt.shortCode}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
