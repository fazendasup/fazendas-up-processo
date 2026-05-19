import { useMemo } from "react";
import { useLocation } from "wouter";

/** Compatível com o padrão do React Router para páginas migradas do Comercia. */
export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams, opts?: { replace?: boolean }) => void,
] {
  const [location, setLocation] = useLocation();
  const q = location.indexOf("?");
  const path = q >= 0 ? location.slice(0, q) : location;
  const params = useMemo(
    () => new URLSearchParams(q >= 0 ? location.slice(q + 1) : ""),
    [location, q]
  );

  const setSearchParams = (next: URLSearchParams, opts?: { replace?: boolean }) => {
    const qs = next.toString();
    setLocation(qs ? `${path}?${qs}` : path, { replace: opts?.replace });
  };

  return [params, setSearchParams];
}
