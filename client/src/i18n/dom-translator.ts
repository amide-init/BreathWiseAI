import { INSTANT_GLOSSARY } from './instant-glossary';
import type { SupportedLanguage } from './languages';

const CACHE_STORAGE_PREFIX = 'breathewise:rt-translate:v4:';
const MAX_CACHE_ENTRIES = 1_000;
// Small batches (12 items) return from Gemini Flash in ~2-4s and never hit the 20s timeout.
const MAX_BATCH_SIZE = 12;
const MAX_CONCURRENT_BATCHES = 3;
const MAX_TEXT_LENGTH = 900;
const DEBOUNCE_MS = 70;
const FAILURE_COOLDOWN_MS = 12_000;
// Periodic lightweight rescan catches async Firestore / lazy-route / modal updates reliably.
const RESCAN_INTERVAL_MS = 1_200;

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'SVG',
  'PATH',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
  'KBD',
]);

const SKIP_EXACT_TOKENS = new Set([
  'AQI',
  'PM2.5',
  'PM10',
  'NO2',
  'NO₂',
  'SO2',
  'SO₂',
  'O3',
  'O₃',
  'CO',
  'CO2',
  'CO₂',
  'CPCB',
  'NAQI',
  'CPCB NAQI',
  'US EPA',
  'HEPA',
  'N95',
  'µg/m³',
  'mg/m³',
  'km/h',
  'kg CO2e',
  'kg CO₂e',
  'BreathWiseAI',
  'BreathWise',
  'BreatheWise AI',
  'EN',
  'हि',
  'বা',
  'म',
  'த',
  'తె',
  'PWA',
  'WAQI',
  'Open-Meteo',
]);

const NUMBER_TOKEN_RE = /\d+(?:\.\d+)?/g;
const PURE_CLOCK_RE = /^\d{1,2}:\d{2}(\s*(AM|PM))?$/i;
const EMAIL_OR_URL_RE = /^(https?:\/\/|www\.|[^\s@]+@[^\s@]+\.[^\s@]+$)/i;

export interface BatchTranslateResponse {
  translations: string[];
  fallbackUsed: boolean;
}

export type BatchTranslateFn = (
  language: SupportedLanguage,
  texts: string[],
) => Promise<BatchTranslateResponse>;

interface TrackedNode {
  original: string;
  applied: string;
}

/**
 * Verifies that every numeric token in the original string is preserved (order-independent
 * multiset comparison so natural Indian-language SOV grammar can reorder clauses safely
 * without dropping, altering, or fabricating any AQI, PM2.5, or CO2 figure).
 */
export function numbersPreserved(original: string, translated: string): boolean {
  const origNums = (original.match(NUMBER_TOKEN_RE) ?? []).sort();
  const nextNums = (translated.match(NUMBER_TOKEN_RE) ?? []).sort();
  if (origNums.length !== nextNums.length) {
    return false;
  }
  return origNums.every((val, idx) => val === nextNums[idx]);
}

/**
 * Determines whether a text string should be left untouched (numbers, units, emails, codes).
 */
export function shouldSkipText(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) {
    return true;
  }
  if (SKIP_EXACT_TOKENS.has(trimmed)) {
    return true;
  }
  if (!/[A-Za-z]{2,}/.test(trimmed)) {
    return true;
  }
  if (PURE_CLOCK_RE.test(trimmed) || EMAIL_OR_URL_RE.test(trimmed)) {
    return true;
  }
  return false;
}

function isInsideSkippedElement(node: Node): boolean {
  let el: Element | null =
    node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;

  while (el) {
    if (SKIP_TAGS.has(el.tagName)) {
      return true;
    }
    if (el.getAttribute('data-no-translate') === 'true' || el.getAttribute('translate') === 'no') {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function splitOuterWhitespace(raw: string): { leading: string; core: string; trailing: string } {
  const match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) {
    return { leading: '', core: raw.replace(/\s+/g, ' ').trim(), trailing: '' };
  }
  // Collapse internal JSX newlines/indentation so identical prose always hits the same cache key.
  return { leading: match[1], core: match[2].replace(/\s+/g, ' ').trim(), trailing: match[3] };
}

function readLangCache(lang: SupportedLanguage): Map<string, string> {
  const map = new Map<string, string>();
  if (lang === 'en') {
    return map;
  }
  try {
    const raw = window.localStorage.getItem(`${CACHE_STORAGE_PREFIX}${lang}`);
    if (!raw) {
      return map;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v.trim() && v !== k) {
        map.set(k, v);
      }
    }
  } catch {
    // Ignore storage quota / parse errors.
  }
  return map;
}

function writeLangCache(lang: SupportedLanguage, cache: Map<string, string>): void {
  if (lang === 'en') {
    return;
  }
  try {
    while (cache.size > MAX_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      cache.delete(oldestKey);
    }
    const obj: Record<string, string> = {};
    for (const [k, v] of cache.entries()) {
      obj[k] = v;
    }
    window.localStorage.setItem(`${CACHE_STORAGE_PREFIX}${lang}`, JSON.stringify(obj));
  } catch {
    // Ignore storage quota errors.
  }
}

/**
 * React-safe real-time frontend view translator:
 * - Firestore data and React state remain 100% English; ONLY visual DOM text nodes and
 *   input placeholders are translated in place (never wrapping/inserting DOM nodes).
 * - Tracks original English strings in WeakMaps so switching back to `'en'` is instant (0ms).
 * - Resolves Tier 1 (0ms glossary) -> Tier 2 (0ms localStorage cache) -> Tier 3 (small
 *   parallel 12-item batches via `translate_texts` so long pages & Firestore cards translate
 *   fast without ever timing out or poisoning cache on fallback).
 */
export class RealTimeDomTranslator {
  private readonly root: HTMLElement;
  private readonly translateBatch: BatchTranslateFn;
  private readonly onStatusChange?: (translating: boolean) => void;

  private language: SupportedLanguage = 'en';
  private observer: MutationObserver | null = null;
  private rescanTimer: ReturnType<typeof setInterval> | null = null;

  private readonly trackedTexts = new WeakMap<Text, TrackedNode>();
  private readonly activeTextNodes = new Set<Text>();

  private readonly trackedPlaceholders = new WeakMap<
    HTMLInputElement | HTMLTextAreaElement,
    TrackedNode
  >();
  private readonly activePlaceholderEls = new Set<HTMLInputElement | HTMLTextAreaElement>();

  private readonly memoryCache = new Map<SupportedLanguage, Map<string, string>>();
  private readonly pendingStrings = new Set<string>();
  private readonly inFlightStrings = new Set<string>();
  private readonly failedUntil = new Map<string, number>();

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private activeRequestCount = 0;

  constructor(options: {
    root: HTMLElement;
    translateBatch: BatchTranslateFn;
    onStatusChange?: (translating: boolean) => void;
  }) {
    this.root = options.root;
    this.translateBatch = options.translateBatch;
    this.onStatusChange = options.onStatusChange;
  }

  public setLanguage(nextLang: SupportedLanguage): void {
    if (this.language === nextLang && (nextLang === 'en' || this.observer !== null)) {
      return;
    }

    this.language = nextLang;
    this.clearPendingBatch();
    this.inFlightStrings.clear();
    this.failedUntil.clear();

    if (nextLang === 'en') {
      this.disconnectObserver();
      this.stopRescanTimer();
      this.restoreAllToEnglish();
      this.emitTranslatingState();
      return;
    }

    // Restore original English first when switching between two non-English languages
    // so every node is re-translated cleanly from its true English source.
    this.restoreAllToEnglish();
    this.ensureObserver();
    this.startRescanTimer();
    this.scanSubtree(this.root);
    this.scheduleBatchFlush();
  }

  public destroy(): void {
    this.clearPendingBatch();
    this.disconnectObserver();
    this.stopRescanTimer();
    this.restoreAllToEnglish();
    this.activeTextNodes.clear();
    this.activePlaceholderEls.clear();
  }

  private getCache(lang: SupportedLanguage): Map<string, string> {
    let cache = this.memoryCache.get(lang);
    if (!cache) {
      cache = readLangCache(lang);
      this.memoryCache.set(lang, cache);
    }
    return cache;
  }

  private lookupInstant(lang: SupportedLanguage, coreText: string): string | null {
    if (lang === 'en') {
      return coreText;
    }
    const glossaryHit = INSTANT_GLOSSARY[lang]?.[coreText];
    if (glossaryHit) {
      return glossaryHit;
    }
    const cacheHit = this.getCache(lang).get(coreText);
    if (cacheHit) {
      return cacheHit;
    }
    return null;
  }

  private ensureObserver(): void {
    if (this.observer) {
      return;
    }
    this.observer = new MutationObserver((mutations) => {
      if (this.language === 'en') {
        return;
      }

      let foundPending = false;
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          if (this.processTextNode(mutation.target as Text)) {
            foundPending = true;
          }
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((added) => {
            if (added.nodeType === Node.TEXT_NODE) {
              if (this.processTextNode(added as Text)) {
                foundPending = true;
              }
            } else if (added.nodeType === Node.ELEMENT_NODE) {
              if (this.scanSubtree(added as Element)) {
                foundPending = true;
              }
            }
          });
        }
      }

      if (foundPending) {
        this.scheduleBatchFlush();
      }
    });

    this.observer.observe(this.root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  private disconnectObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private startRescanTimer(): void {
    if (this.rescanTimer !== null) {
      return;
    }
    this.rescanTimer = setInterval(() => {
      if (this.language === 'en') {
        return;
      }
      if (this.scanSubtree(this.root)) {
        this.scheduleBatchFlush();
      }
    }, RESCAN_INTERVAL_MS);
  }

  private stopRescanTimer(): void {
    if (this.rescanTimer !== null) {
      clearInterval(this.rescanTimer);
      this.rescanTimer = null;
    }
  }

  private scanSubtree(container: Element): boolean {
    if (isInsideSkippedElement(container)) {
      return false;
    }

    let hasPending = false;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      if (this.processTextNode(current as Text)) {
        hasPending = true;
      }
      current = walker.nextNode();
    }

    const inputs = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input[placeholder], textarea[placeholder]',
    );
    inputs.forEach((el) => {
      if (this.processPlaceholderElement(el)) {
        hasPending = true;
      }
    });

    return hasPending;
  }

  private processTextNode(node: Text): boolean {
    if (!node.isConnected || isInsideSkippedElement(node)) {
      return false;
    }

    const raw = node.nodeValue ?? '';
    let tracked = this.trackedTexts.get(node);

    if (tracked) {
      // If React/Firestore updated this Text node to new content, refresh its English source.
      if (raw !== tracked.applied) {
        tracked.original = raw;
        tracked.applied = raw;
      }
    } else {
      tracked = { original: raw, applied: raw };
      this.trackedTexts.set(node, tracked);
    }

    if (shouldSkipText(tracked.original)) {
      return false;
    }

    this.activeTextNodes.add(node);

    const { leading, core, trailing } = splitOuterWhitespace(tracked.original);
    const instant = this.lookupInstant(this.language, core);
    if (instant !== null) {
      const nextValue = `${leading}${instant}${trailing}`;
      if (node.nodeValue !== nextValue) {
        this.applyTextValue(node, tracked, nextValue);
      }
      return false;
    }

    return this.enqueueString(core);
  }

  private processPlaceholderElement(el: HTMLInputElement | HTMLTextAreaElement): boolean {
    if (!el.isConnected) {
      return false;
    }
    if (el.closest('[data-no-translate="true"], [translate="no"]')) {
      return false;
    }

    const raw = el.getAttribute('placeholder') ?? '';
    let tracked = this.trackedPlaceholders.get(el);
    if (tracked) {
      if (raw !== tracked.applied) {
        tracked.original = raw;
        tracked.applied = raw;
      }
    } else {
      tracked = { original: raw, applied: raw };
      this.trackedPlaceholders.set(el, tracked);
    }

    if (shouldSkipText(tracked.original)) {
      return false;
    }

    this.activePlaceholderEls.add(el);

    const core = tracked.original.trim();
    const instant = this.lookupInstant(this.language, core);
    if (instant !== null) {
      if (el.getAttribute('placeholder') !== instant) {
        el.setAttribute('placeholder', instant);
        tracked.applied = instant;
      }
      return false;
    }

    return this.enqueueString(core);
  }

  private enqueueString(core: string): boolean {
    const key = `${this.language}::${core}`;
    if (this.inFlightStrings.has(key) || this.pendingStrings.has(core)) {
      return false;
    }
    const cooldown = this.failedUntil.get(key);
    if (cooldown && Date.now() < cooldown) {
      return false;
    }
    this.pendingStrings.add(core);
    return true;
  }

  private applyTextValue(node: Text, tracked: TrackedNode, nextValue: string): void {
    tracked.applied = nextValue;
    node.nodeValue = nextValue;
  }

  private restoreAllToEnglish(): void {
    for (const node of Array.from(this.activeTextNodes)) {
      if (!node.isConnected) {
        this.activeTextNodes.delete(node);
        continue;
      }
      const tracked = this.trackedTexts.get(node);
      if (tracked && node.nodeValue === tracked.applied && node.nodeValue !== tracked.original) {
        tracked.applied = tracked.original;
        node.nodeValue = tracked.original;
      }
    }

    for (const el of Array.from(this.activePlaceholderEls)) {
      if (!el.isConnected) {
        this.activePlaceholderEls.delete(el);
        continue;
      }
      const tracked = this.trackedPlaceholders.get(el);
      if (
        tracked &&
        el.getAttribute('placeholder') === tracked.applied &&
        tracked.applied !== tracked.original
      ) {
        tracked.applied = tracked.original;
        el.setAttribute('placeholder', tracked.original);
      }
    }
  }

  private clearPendingBatch(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingStrings.clear();
  }

  private scheduleBatchFlush(): void {
    if (this.pendingStrings.size === 0 || this.language === 'en') {
      return;
    }
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flushPendingBatches();
    }, DEBOUNCE_MS);
  }

  private emitTranslatingState(): void {
    this.onStatusChange?.(this.activeRequestCount > 0);
  }

  private async flushPendingBatches(): Promise<void> {
    const targetLang = this.language;
    if (targetLang === 'en' || this.pendingStrings.size === 0) {
      return;
    }

    const allQueued = Array.from(this.pendingStrings);
    this.pendingStrings.clear();

    // Split into small fast batches (12 items each) and process up to 3 concurrently.
    const chunks: string[][] = [];
    for (let i = 0; i < allQueued.length; i += MAX_BATCH_SIZE) {
      chunks.push(allQueued.slice(i, i + MAX_BATCH_SIZE));
    }

    let cursor = 0;
    const runWorker = async (): Promise<void> => {
      while (cursor < chunks.length) {
        const batch = chunks[cursor++];
        if (!batch || this.language !== targetLang) {
          return;
        }
        await this.processSingleBatch(targetLang, batch);
      }
    };

    const workers = Array.from({ length: Math.min(MAX_CONCURRENT_BATCHES, chunks.length) }, () =>
      runWorker(),
    );
    await Promise.all(workers);

    // If more Firestore/lazy nodes mounted while batches were running, flush them next.
    if (this.language === targetLang && this.pendingStrings.size > 0) {
      this.scheduleBatchFlush();
    }
  }

  private async processSingleBatch(targetLang: SupportedLanguage, batch: string[]): Promise<void> {
    batch.forEach((item) => this.inFlightStrings.add(`${targetLang}::${item}`));
    this.activeRequestCount += 1;
    this.emitTranslatingState();

    try {
      const { translations, fallbackUsed } = await this.translateBatch(targetLang, batch);

      if (this.language !== targetLang) {
        return;
      }

      // Never poison localStorage cache if backend returned a fallback English response.
      if (fallbackUsed) {
        const until = Date.now() + FAILURE_COOLDOWN_MS;
        batch.forEach((item) => this.failedUntil.set(`${targetLang}::${item}`, until));
        return;
      }

      const cache = this.getCache(targetLang);
      let cacheUpdated = false;
      const until = Date.now() + FAILURE_COOLDOWN_MS;

      batch.forEach((orig, idx) => {
        const candidate = translations[idx]?.trim();
        if (candidate && candidate !== orig && numbersPreserved(orig, candidate)) {
          cache.set(orig, candidate);
          cacheUpdated = true;
        } else {
          // Do NOT permanently cache untranslated English; allow retry after cooldown.
          this.failedUntil.set(`${targetLang}::${orig}`, until);
        }
      });

      if (cacheUpdated) {
        writeLangCache(targetLang, cache);
        this.applyCachedTranslationsToTrackedNodes(targetLang);
      }
    } catch {
      const until = Date.now() + FAILURE_COOLDOWN_MS;
      batch.forEach((item) => this.failedUntil.set(`${targetLang}::${item}`, until));
    } finally {
      batch.forEach((item) => this.inFlightStrings.delete(`${targetLang}::${item}`));
      this.activeRequestCount = Math.max(0, this.activeRequestCount - 1);
      this.emitTranslatingState();
    }
  }

  private applyCachedTranslationsToTrackedNodes(targetLang: SupportedLanguage): void {
    if (this.language !== targetLang) {
      return;
    }
    for (const node of Array.from(this.activeTextNodes)) {
      if (!node.isConnected) {
        this.activeTextNodes.delete(node);
        continue;
      }
      const tracked = this.trackedTexts.get(node);
      if (!tracked) {
        continue;
      }
      const { leading, core, trailing } = splitOuterWhitespace(tracked.original);
      const hit = this.lookupInstant(targetLang, core);
      if (hit !== null) {
        const nextValue = `${leading}${hit}${trailing}`;
        if (node.nodeValue !== nextValue) {
          this.applyTextValue(node, tracked, nextValue);
        }
      }
    }

    for (const el of Array.from(this.activePlaceholderEls)) {
      if (!el.isConnected) {
        this.activePlaceholderEls.delete(el);
        continue;
      }
      const tracked = this.trackedPlaceholders.get(el);
      if (!tracked) {
        continue;
      }
      const hit = this.lookupInstant(targetLang, tracked.original.trim());
      if (hit !== null && el.getAttribute('placeholder') !== hit) {
        tracked.applied = hit;
        el.setAttribute('placeholder', hit);
      }
    }
  }
}
