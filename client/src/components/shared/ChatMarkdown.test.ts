import { describe, expect, it } from 'vitest';

import { parseMarkdownBlocks, tokenizeInlineMarkdown } from '@/lib/chat-markdown';

describe('ChatMarkdown parser', () => {
  it('parses paragraphs, numbered lists, and bullet lists cleanly', () => {
    const input = [
      'Here are steps for your father today:',
      '1. **Morning walk**: Shift to after 2:00 PM when forecast AQI is lower.',
      '2. Use a snug *N95 mask* if stepping near traffic.',
      '- Keep hydration steady',
      '- Monitor breathing comfort',
    ].join('\n');

    const blocks = parseMarkdownBlocks(input);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ type: 'paragraph', text: 'Here are steps for your father today:' });
    expect(blocks[1]).toEqual({
      type: 'ol',
      items: [
        '**Morning walk**: Shift to after 2:00 PM when forecast AQI is lower.',
        'Use a snug *N95 mask* if stepping near traffic.',
      ],
    });
    expect(blocks[2]).toEqual({
      type: 'ul',
      items: ['Keep hydration steady', 'Monitor breathing comfort'],
    });
  });

  it('rescues inline numbered transitions onto separate list items', () => {
    const input = 'Follow these steps: 1. First keep windows closed. 2. Second wet-mop floors.';
    const blocks = parseMarkdownBlocks(input);
    expect(blocks[0]).toEqual({ type: 'paragraph', text: 'Follow these steps:' });
    expect(blocks[1]).toEqual({
      type: 'ol',
      items: ['First keep windows closed.', 'Second wet-mop floors.'],
    });
  });

  it('tokenizes bold, italic, and inline code without leaking raw markers', () => {
    const tokens = tokenizeInlineMarkdown('Use **N95** *only* outdoors when `PM2.5` spikes.');
    expect(tokens).toEqual([
      { type: 'text', value: 'Use ' },
      { type: 'bold', value: 'N95' },
      { type: 'text', value: ' ' },
      { type: 'italic', value: 'only' },
      { type: 'text', value: ' outdoors when ' },
      { type: 'code', value: 'PM2.5' },
      { type: 'text', value: ' spikes.' },
    ]);
  });
});
