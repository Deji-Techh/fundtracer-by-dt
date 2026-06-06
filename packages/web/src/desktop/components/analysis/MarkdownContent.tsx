import type { ReactNode } from 'react';

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on images, **bold**, *italic*, `code`
  const regex = /(!\[([^\]]*)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    if (match[2] !== undefined) {
      // Image: ![alt](url)
      nodes.push(
        <img key={match.index} src={match[3]} alt={match[2]} style={imgStyle} />
      );
    } else if (match[4]) {
      nodes.push(<strong key={match.index}>{match[4]}</strong>);
    } else if (match[5]) {
      nodes.push(<em key={match.index}>{match[5]}</em>);
    } else if (match[6]) {
      nodes.push(<code key={match.index} style={codeStyle}>{match[6]}</code>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes;
}

const codeStyle: React.CSSProperties = {
  background: 'var(--hover-overlay)',
  padding: '1px 5px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '0.92em',
  fontFamily: 'var(--font-mono)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
};

interface Block {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'ul' | 'ol' | 'p' | 'hr';
  children?: ReactNode[];
  items?: string[];
  ordered?: boolean;
}

function parseBlocks(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      blocks.push({ type: (`h${level}` as Block['type']), children: parseInline(hMatch[2]) });
      i++;
      continue;
    }

    // HR
    if (/^[-*_]{3,}\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Unordered list — collect consecutive items
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — collect until blank line or next block marker
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4}\s|[-*]\s+|\d+\.\s+|[-*_]{3,})/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      const text = paraLines.join(' ');
      blocks.push({ type: 'p', children: parseInline(text) });
    }
  }

  return blocks;
}

export function MarkdownContent({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div style={{ fontFamily: 'var(--font-sans)', lineHeight: 1.7, maxWidth: '100%', minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return <h3 key={idx} style={hStyle}>{block.children}</h3>;
          case 'h2':
            return <h4 key={idx} style={h2Style}>{block.children}</h4>;
          case 'h3':
            return <div key={idx} style={h3Style}>{block.children}</div>;
          case 'h4':
            return <div key={idx} style={h4Style}>{block.children}</div>;
          case 'hr':
            return <hr key={idx} style={{ border: 'none', borderTop: '1px solid var(--hairline)', margin: '10px 0' }} />;
          case 'ul':
            return (
              <ul key={idx} style={listStyle}>
                {block.items!.map((item, j) => (
                  <li key={j} style={{ marginBottom: 2 }}>{parseInline(item)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} style={listStyle}>
                {block.items!.map((item, j) => (
                  <li key={j} style={{ marginBottom: 2 }}>{parseInline(item)}</li>
                ))}
              </ol>
            );
          case 'p':
            return <p key={idx} style={pStyle}>{block.children}</p>;
          default:
            return null;
        }
      })}
    </div>
  );
}

const hStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: 'var(--fg)',
  marginBottom: 6, marginTop: 14, lineHeight: 1.3,
};
const h2Style: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--fg)',
  marginBottom: 4, marginTop: 10, lineHeight: 1.3,
};
const h3Style: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--fg-secondary)',
  marginBottom: 4, marginTop: 8,
};
const h4Style: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--fg-tertiary)',
  marginBottom: 2, marginTop: 6,
};
const pStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--fg)',
  marginBottom: 8, marginTop: 0,
  maxWidth: '100%',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
};
const imgStyle: React.CSSProperties = {
  maxWidth: '100%',
  borderRadius: 'var(--radius-md)',
  marginTop: 4,
  marginBottom: 4,
};
const listStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--fg)', margin: '4px 0 8px 0',
  paddingLeft: 20, display: 'flex', flexDirection: 'column',
  maxWidth: '100%',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
};
