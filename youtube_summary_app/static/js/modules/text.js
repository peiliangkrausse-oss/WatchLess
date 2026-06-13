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
  return basicMarkdownToHtml(safeMarkdown);
}

export function chatMarkdownToHtml(markdown) {
  const safeMarkdown = escapeHtml(markdown || "");
  if (window.marked) return window.marked.parse(safeMarkdown);
  return basicMarkdownToHtml(safeMarkdown);
}

function basicMarkdownToHtml(safeMarkdown) {
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    blocks.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
    listItems = [];
  }

  for (const rawLine of safeMarkdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      blocks.push(`<h${heading[1].length}>${heading[2]}</h${heading[1].length}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      continue;
    }
    flushList();
    blocks.push(`<p>${line}</p>`);
  }
  flushList();
  return blocks.join("");
}
