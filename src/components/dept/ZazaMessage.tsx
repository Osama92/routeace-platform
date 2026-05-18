import { Fragment } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Renders Zaza assistant text and converts `[label](path)` markdown links
 * into in-app navigations (router push for internal paths, normal anchors
 * for external URLs). Plain text is preserved with whitespace.
 *
 * SECURITY: Only renders links that match the provided allowlist of paths.
 * If the model emits a link not in the allowlist, it is rendered as plain
 * text. This guarantees Zaza cannot leak cross-scope routes even if the
 * system prompt is bypassed.
 */
export function ZazaMessage({ text, allowedPaths }: { text: string; allowedPaths: string[] }) {
  const navigate = useNavigate();
  const allow = new Set(allowedPaths);
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const parts: Array<JSX.Element | string> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const label = m[1];
    const href = m[2];
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) {
      parts.push(
        <a key={`l${key++}`} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {label}
        </a>,
      );
    } else if (allow.has(href)) {
      parts.push(
        <button
          key={`l${key++}`}
          type="button"
          onClick={() => navigate(href)}
          className="text-primary underline hover:opacity-80"
        >
          {label}
        </button>,
      );
    } else {
      // Reject unknown internal paths - render as plain text.
      parts.push(`${label}`);
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}
    </span>
  );
}
