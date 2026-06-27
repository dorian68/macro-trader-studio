import DOMPurify from 'dompurify';

export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      'base',
      'button',
      'embed',
      'form',
      'iframe',
      'input',
      'link',
      'meta',
      'object',
      'script',
      'select',
      'style',
      'textarea',
    ],
    FORBID_ATTR: ['formaction'],
  });
}

// LLM-generated report HTML often embeds literal Markdown bold (**text**) inside
// <p> tags, which would otherwise render as raw asterisks. Convert balanced **…**
// runs (within a single line, non-empty) to <strong> before sanitizing.
function convertMarkdownBold(html: string): string {
  return html.replace(/\*\*(?!\s)([^*\n]+?)\*\*/g, "<strong>$1</strong>");
}

export function sanitizeReportHtml(html: string): string {
  return sanitizeRichHtml(convertMarkdownBold(html));
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]!);
}
