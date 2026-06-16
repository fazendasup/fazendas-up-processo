export type LatLng = { lat: number; lng: number };

export function gerarVariantesEndereco(endereco: string): string[] {
  const base = endereco.trim();
  if (!base) return [];

  const variantes: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    variantes.push(normalized);
  };

  const withCity = (value: string) => `${value}, Manaus, AM, Brasil`;

  add(base);
  add(withCity(base));

  const fixed = base
    .replace(/\bSHOPING\b/gi, "Shopping")
    .replace(/\bYPIRANGA\b/gi, "Ypiranga");
  add(fixed);
  add(withCity(fixed));

  const semLoja = fixed
    .replace(/,?\s*\bL(?:OJA)?\.?\s*\d+\w*\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .trim();
  add(semLoja);
  add(withCity(semLoja));

  const mallMatch = fixed.match(
    /\b(manauara\s+shop(?:p)?ing|shopping\s+[\w\s]+|[\w\s]+\s+shopping)\b/gi,
  );
  if (mallMatch) {
    for (const match of mallMatch) {
      add(match);
      add(withCity(match));
    }
  }

  const parts = fixed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    add(`${parts[0]}, ${parts[1]}`);
    add(withCity(`${parts[0]}, ${parts[1]}`));
  }
  if (parts[0]) {
    add(withCity(parts[0]));
  }

  return variantes;
}
