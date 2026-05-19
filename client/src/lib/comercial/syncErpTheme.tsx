import { useEffect } from "react";
import { isEmbeddedInErp } from "./embeddedErp";
import { useTheme } from "./theme";

/** Alinha tema claro/escuro com o documento do ERP (mesma origem via /comercial-app). */
export function ErpThemeSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!isEmbeddedInErp()) return;

    const applyFromParent = () => {
      try {
        const dark = window.parent.document.documentElement.classList.contains("dark");
        setTheme(dark ? "dark" : "light");
      } catch {
        /* origem diferente — mantém tema local */
      }
    };

    applyFromParent();

    try {
      const parentRoot = window.parent.document.documentElement;
      const obs = new MutationObserver(applyFromParent);
      obs.observe(parentRoot, { attributes: true, attributeFilter: ["class"] });
      return () => obs.disconnect();
    } catch {
      return undefined;
    }
  }, [setTheme]);

  return null;
}
