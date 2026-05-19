/** Central Comercial embutida no iframe do sistema supervisório (/comercial). */
export function isEmbeddedInErp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  return new URLSearchParams(window.location.search).get("embed") === "1";
}

export function applyErpEmbedDocumentClass(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("erp-embed", isEmbeddedInErp());
}
