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

export const sanitizeReportHtml = sanitizeRichHtml;

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]!);
}
