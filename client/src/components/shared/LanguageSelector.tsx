import { Check, Globe, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useLanguage } from '@/hooks/useLanguage';
import { getLanguageOption, SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { cn } from '@/lib/cn';

/**
 * Compact header language switcher (`data-no-translate="true"` so language labels stay exact).
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
        className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white px-3 py-1.5 text-xs font-semibold text-[#3C4043] transition-all hover:border-[#4285F4]/60 dark:border-white/[0.12] dark:bg-[#1E1F20] dark:text-[#E3E3E3] dark:hover:border-[#8AB4F8]/50"
      >
        {isTranslating ? (
          <Loader2
            className="h-3.5 w-3.5 animate-spin text-[#4285F4] dark:text-[#8AB4F8]"
            aria-hidden="true"
          />
        ) : (
          <Globe className="h-3.5 w-3.5 text-[#4285F4] dark:text-[#8AB4F8]" aria-hidden="true" />
        )}
        <span>{current.shortCode}</span>
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Choose app language"
          className="cloud-card absolute right-0 z-[80] mt-2 w-60 rounded-3xl border border-[#DADCE0] bg-white p-1.5 dark:border-white/[0.1] dark:bg-[#1E1F20]"
        >
          <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-[#5F6368] uppercase dark:text-[#9AA0A6]">
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
                    'flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-2 text-left transition-colors',
                    selected
                      ? 'bg-[#4285F4]/12 text-[#1A73E8] dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]'
                      : 'text-[#3C4043] hover:bg-[#F1F3F4] dark:text-[#E3E3E3] dark:hover:bg-white/[0.06]',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="truncate text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                      {opt.nativeHint}
                    </p>
                  </div>
                  {selected ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-[#4285F4] dark:text-[#8AB4F8]"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-[#9AA0A6]">{opt.shortCode}</span>
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
