import { Download, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'breathewise:pwa_install_dismissed';

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed || isStandaloneMode()) {
      return;
    }

    if (isIosSafari()) {
      setShowIosHint(true);
      return;
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [dismissed]);

  function handleDismiss() {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosHint(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore storage error
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      handleDismiss();
    } else {
      setDeferredPrompt(null);
    }
  }

  if (dismissed || (!deferredPrompt && !showIosHint)) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-xs dark:border-emerald-400/25 dark:bg-emerald-400/10">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950">
          <Smartphone className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-zinc-950 dark:text-zinc-50">
            Check morning air in 1 tap from your Home Screen
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            {showIosHint
              ? 'In Safari, tap Share → “Add to Home Screen” to install BreathWiseAI.'
              : 'Install BreathWiseAI as a lightweight app—instant load & offline cache.'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {deferredPrompt ? (
          <Button type="button" size="sm" variant="brand" onClick={() => void handleInstall()}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Install
          </Button>
        ) : null}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
