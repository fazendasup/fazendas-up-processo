const STORAGE_KEY = "fazendas_up_active_projeto_id";

export function getActiveProjetoId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function setActiveProjetoId(id: number | null): void {
  if (typeof window === "undefined") return;
  if (id == null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, String(id));
}
