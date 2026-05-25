/**
 * components/chat/MarkdownContent.tsx
 * Lightweight markdown — bold, italic, inline code, lists. No external deps.
 */

interface MarkdownContentProps {
  content:  string;
  style?:   React.CSSProperties;
}

/** Parse inline formatting: **bold**, *italic*, `code` */
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={key++} style={{ fontWeight: 600 }}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={key++} style={{
          fontSize: "0.88em", background: "rgba(0,0,0,0.05)",
          padding: "1px 5px", borderRadius: 4, fontFamily: "monospace",
        }}>{match[4]}</code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : [text];
}

export default function MarkdownContent({ content, style }: MarkdownContentProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={key++} style={{ margin: "6px 0", paddingLeft: 18, listStyle: "disc" }}>
        {listItems.map((item, i) => (
          <li key={i} style={{ marginBottom: 3, lineHeight: 1.5 }}>
            {parseInline(item)}
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  for (const line of lines) {
    const bullet = line.match(/^[-•*]\s+(.+)$/) || line.match(/^\d+\.\s+(.+)$/);
    if (bullet) {
      listItems.push(bullet[1]);
    } else {
      flushList();
      if (line.trim()) {
        elements.push(
          <p key={key++} style={{ margin: "0 0 6px", lineHeight: 1.55, ...style }}>
            {parseInline(line)}
          </p>,
        );
      }
    }
  }
  flushList();

  if (elements.length === 0) {
    return <span style={style}>{content}</span>;
  }

  return <div>{elements}</div>;
}
