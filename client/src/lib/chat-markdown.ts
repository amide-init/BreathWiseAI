export type MarkdownBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] };

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string };

const INLINE_TOKEN_RE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
const ORDERED_ITEM_RE = /^\d+[.)]\s+(.+)$/;
const UNORDERED_ITEM_RE = /^[-*•]\s+(.+)$/;

/**
 * Splits assistant text into clean paragraph, ordered-list, and unordered-list blocks.
 * Also rescues inline numbered lists (e.g., "steps: 1. First... 2. Second...") onto separate items.
 */
export function parseMarkdownBlocks(raw: string): MarkdownBlock[] {
  const normalized = raw
    .replace(/\r\n/g, '\n')
    .replace(/([.:;?!])\s+(?=\d+[.)]\s+[A-Z])/g, '$1\n')
    .trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized.split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphLines.join(' ').trim() });
      paragraphLines = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const orderedMatch = ORDERED_ITEM_RE.exec(line);
    if (orderedMatch) {
      flushParagraph();
      const itemText = orderedMatch[1].trim();
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'ol') {
        last.items.push(itemText);
      } else {
        blocks.push({ type: 'ol', items: [itemText] });
      }
      continue;
    }

    const unorderedMatch = UNORDERED_ITEM_RE.exec(line);
    if (unorderedMatch) {
      flushParagraph();
      const itemText = unorderedMatch[1].trim();
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'ul') {
        last.items.push(itemText);
      } else {
        blocks.push({ type: 'ul', items: [itemText] });
      }
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  return blocks;
}

export function tokenizeInlineMarkdown(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    const raw = match[0];
    if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push({ type: 'bold', value: raw.slice(2, -2) });
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      tokens.push({ type: 'italic', value: raw.slice(1, -1) });
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) });
    } else {
      tokens.push({ type: 'text', value: raw });
    }
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return tokens;
}
