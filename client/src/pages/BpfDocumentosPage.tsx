import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { useTheme } from "@/contexts/ThemeContext";

/** POP, FIT, cartazes, formulários e placas BPF — versão única da fazenda. */
export default function BpfDocumentosPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useTheme();
  const [src] = useState(
    () => `/bpf/index.html${window.location.hash || ""}`,
  );

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const applyTheme = () => {
      frame.contentDocument?.documentElement.setAttribute("data-theme", theme);
    };
    frame.addEventListener("load", applyTheme);
    applyTheme();
    return () => frame.removeEventListener("load", applyTheme);
  }, [theme]);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash;
      const frame = frameRef.current?.contentWindow;
      if (!frame || !hash || frame.location.hash === hash) return;
      frame.location.hash = hash;
    };
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="shrink-0">
        <Header />
      </div>
      <iframe
        ref={frameRef}
        title="POP e FIT"
        src={src}
        className="min-h-0 w-full flex-1 border-0 bg-background"
      />
    </div>
  );
}
