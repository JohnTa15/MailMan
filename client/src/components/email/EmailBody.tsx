import { FC, useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';

DOMPurify.addHook('afterSanitizeAttributes', (node: Element) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function frameStyles(dark: boolean) {
  return `
    :root { color-scheme: ${dark ? 'dark' : 'light'}; }
    html, body { margin: 0; padding: 0; background: transparent; }
    body {
      font: 15px/1.65 "Inter Variable", Inter, system-ui, -apple-system, sans-serif;
      color: ${dark ? '#dcdce8' : '#33334a'};
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }
    a { color: ${dark ? '#a5b4fc' : '#4f46e5'}; }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; }
    pre { white-space: pre-wrap; font: inherit; margin: 0; }
    blockquote { margin: 0 0 0 .5rem; padding-left: 1rem; border-left: 3px solid ${dark ? '#33334a' : '#dcdce8'}; color: ${dark ? '#8b8ba3' : '#64647d'}; }
    kbd { font: 12px ui-monospace, monospace; padding: 1px 6px; border-radius: 6px; border: 1px solid ${dark ? '#33334a' : '#dcdce8'}; }
    h1, h2, h3 { color: ${dark ? '#fff' : '#0f1020'}; line-height: 1.3; }
  `;
}

/**
 * Renders untrusted email content: sanitized, then isolated in a sandboxed
 * iframe without script execution so it can neither run code nor restyle
 * the app. The frame grows to fit its content.
 */
export const EmailBody: FC<{ html?: string; text: string; dark: boolean }> = ({ html, text, dark }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);

  const srcDoc = useMemo(() => {
    const content = html
      ? DOMPurify.sanitize(html, {
          WHOLE_DOCUMENT: false,
          FORBID_TAGS: ['form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed'],
        })
      : `<pre>${escapeHtml(text)}</pre>`;
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>${frameStyles(dark)}</style></head><body>${content}</body></html>`;
  }, [html, text, dark]);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | undefined;
    const measure = () => {
      const doc = frame.contentDocument;
      if (doc?.documentElement) setHeight(doc.documentElement.scrollHeight);
    };
    const onLoad = () => {
      measure();
      const body = frame.contentDocument?.body;
      if (body && 'ResizeObserver' in window) {
        observer = new ResizeObserver(measure);
        observer.observe(body);
      }
    };
    frame.addEventListener('load', onLoad);
    if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.body?.childElementCount) {
      onLoad();
    }
    return () => {
      frame.removeEventListener('load', onLoad);
      observer?.disconnect();
    };
  }, [srcDoc]);

  return (
    <iframe
      ref={ref}
      title="Message content"
      srcDoc={srcDoc}
      // No allow-scripts: content can never execute JavaScript
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="block w-full border-0"
      style={{ height }}
    />
  );
};
