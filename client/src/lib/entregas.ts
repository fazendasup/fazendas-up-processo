export function isoLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function hojeIso() {
  return isoLocal(new Date());
}

export function diaOperacionalInicial() {
  const date = new Date();
  if (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return isoLocal(date);
}

export function linkGoogleMaps(endereco: string | null | undefined) {
  if (!endereco?.trim()) return null;
  const destino = encodeURIComponent(endereco.trim());
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`;
}

export function linkGoogleMapsRota(paradas: Array<{ endereco?: string | null }>) {
  const enderecos = paradas
    .map((parada) => parada.endereco?.trim())
    .filter((endereco): endereco is string => Boolean(endereco));
  if (enderecos.length === 0) return null;
  if (enderecos.length === 1) return linkGoogleMaps(enderecos[0]);

  // Google Maps URLs aceitam uma quantidade limitada de waypoints. Mantemos o link curto
  // para abrir de forma confiável no app do celular.
  const selecionados = enderecos.slice(0, 10);
  const destination = selecionados[selecionados.length - 1];
  const waypoints = selecionados.slice(0, -1);
  const params = new URLSearchParams({
    api: "1",
    destination,
    travelmode: "driving",
  });
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function linkTelefone(telefone: string | null | undefined) {
  if (!telefone?.trim()) return null;
  const digits = telefone.replace(/\D/g, "");
  return digits ? `tel:+${digits.startsWith("55") ? digits : `55${digits}`}` : null;
}

export function linkWhatsapp(telefone: string | null | undefined, texto?: string) {
  if (!telefone?.trim()) return null;
  const digits = telefone.replace(/\D/g, "");
  if (!digits) return null;
  const numero = digits.startsWith("55") ? digits : `55${digits}`;
  const msg = texto ? `&text=${encodeURIComponent(texto)}` : "";
  return `https://wa.me/${numero}${msg}`;
}

export function labelStatusParada(status: string) {
  const map: Record<string, string> = {
    PENDENTE: "Pendente",
    EM_ROTA: "A caminho",
    ENTREGUE: "Entregue",
    PROBLEMA: "Problema",
    PULADA: "Pulada",
  };
  return map[status] ?? status;
}

export function labelStatusRota(status: string) {
  const map: Record<string, string> = {
    PLANEJADA: "Planejada",
    EM_ROTA: "Em rota",
    CONCLUIDA: "Concluída",
    CANCELADA: "Cancelada",
  };
  return map[status] ?? status;
}

export function trackingUrlAbsoluto(token: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/rastreio/${token}`;
  }
  return `/rastreio/${token}`;
}
