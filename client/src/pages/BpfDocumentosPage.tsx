import { useEffect, useRef } from "react";
import Header from "@/components/Header";
import { useTheme } from "@/contexts/ThemeContext";

/** POP, FIT, cartazes, formulários e placas BPF — o gerador operacional dentro do ERP. */
export default function BpfDocumentosPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const apply = () => {
      frame.contentDocument?.documentElement.setAttribute("data-theme", theme);
    };
    frame.addEventListener("load", apply);
    apply();
    return () => frame.removeEventListener("load", apply);
  }, [theme]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="shrink-0">
        <Header />
      </div>
      <iframe
        ref={frameRef}
        title="POP e FIT"
        src="/bpf/index.html"
        className="min-h-0 w-full flex-1 border-0 bg-background"
      />
    </div>
  );
}
