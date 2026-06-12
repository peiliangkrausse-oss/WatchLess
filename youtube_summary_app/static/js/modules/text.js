export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function cleanSummaryText(markdown = "") {
  return String(markdown || "")
    .replace(/^Source:\s+\S+\s*/gim, "")
    .replace(/^Model:\s+.+\s*/gim, "")
    .trim();
}

export function markdownToHtml(markdown) {
  const safeMarkdown = escapeHtml(markdown || "");
  if (window.marked) return window.marked.parse(safeMarkdown);
  return `<pre>${safeMarkdown}</pre>`;
}

export function chatMarkdownToHtml(markdown) {
  const safeMarkdown = escapeHtml(markdown || "");
  if (window.marked) return window.marked.parse(safeMarkdown);
  return safeMarkdown.replaceAll("\n", "<br>");
}
