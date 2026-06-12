export function formatFileLabel(file) {
  if (!file) return "file";
  const size = Number(file.size) || 0;
  if (size < 1024) return `${file.name} (${size} B)`;
  if (size < 1024 * 1024) return `${file.name} (${Math.round(size / 1024)} KB)`;
  return `${file.name} (${(size / 1024 / 1024).toFixed(1)} MB)`;
}
