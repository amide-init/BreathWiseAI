import type { ReactNode } from 'react';

import { parseMarkdownBlocks, tokenizeInlineMarkdown } from '@/lib/chat-markdown';

function renderInline(text: string): ReactNode[] {
  return tokenizeInlineMarkdown(text).map((tok, idx) => {
    if (tok.type === 'bold') {
      return (
        <strong key={idx} className="font-semibold text-[#202124] dark:text-[#F1F3F4]">
          {tok.value}
        </strong>
      );
    }
    if (tok.type === 'italic') {
      return (
        <em key={idx} className="italic">
          {tok.value}
        </em>
      );
    }
    if (tok.type === 'code') {
      return (
        <code
          key={idx}
          className="rounded-md bg-[#F1F3F4] px-1.5 py-0.5 font-mono text-[12px] text-[#1A73E8] dark:bg-white/[0.08] dark:text-[#8AB4F8]"
        >
          {tok.value}
        </code>
      );
    }
    return <span key={idx}>{tok.value}</span>;
  });
}

export function ChatMarkdown({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-[#202124] dark:text-[#E3E3E3]">
      {blocks.map((block, idx) => {
        if (block.type === 'ol') {
          return (
            <ol
              key={idx}
              className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-[#1A73E8] dark:marker:text-[#8AB4F8]"
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="pl-0.5">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul
              key={idx}
              className="list-disc space-y-1.5 pl-5 marker:text-[#34A853] dark:marker:text-[#81C995]"
            >
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="pl-0.5">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        return <p key={idx}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
