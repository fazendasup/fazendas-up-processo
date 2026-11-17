import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileWarning, Loader2 } from "lucide-react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

type Props = {
  pdfUrl: string;
  className?: string;
};

/**
 * Preview de PDF via canvas (pdf.js).
 * Evita o iframe/blob no celular, que vira só o botão "Abrir" com UUID.
 */
export function PdfBlobViewer({ pdfUrl, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [erro, setErro] = useState<string | null>(null);
  const [paginas, setPaginas] = useState(0);

  useEffect(() => {
    let cancelado = false;
    let doc: PDFDocumentProxy | null = null;

    async function render() {
      setStatus("loading");
      setErro(null);
      setPaginas(0);
      const host = hostRef.current;
      if (!host) return;
      host.replaceChildren();

      try {
        const loadingTask = getDocument({ url: pdfUrl, withCredentials: false });
        doc = await loadingTask.promise;
        if (cancelado) {
          await doc.destroy();
          return;
        }
        setPaginas(doc.numPages);
        const maxWidth = Math.max(280, host.clientWidth || window.innerWidth - 32);

        for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
          if (cancelado) break;
          const page = await doc.getPage(pageNum);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(2.2, (maxWidth * (window.devicePixelRatio || 1)) / base.width);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className =
            "mb-2 w-full max-w-full rounded border bg-white shadow-sm last:mb-0";
          canvas.style.height = "auto";

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas indisponível neste navegador.");
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelado) break;
          host.appendChild(canvas);
        }

        if (!cancelado) setStatus("ok");
      } catch (err) {
        if (cancelado) return;
        console.warn("[PdfBlobViewer]", err);
        setErro(err instanceof Error ? err.message : "Falha ao renderizar o PDF.");
        setStatus("error");
      }
    }

    void render();

    return () => {
      cancelado = true;
      void doc?.destroy();
      if (hostRef.current) hostRef.current.replaceChildren();
    };
  }, [pdfUrl]);

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className ?? ""}`}>
      {status === "loading" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          Carregando preview do PDF…
        </div>
      ) : null}

      {status === "error" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <FileWarning className="h-8 w-8 text-amber-600" />
          <p className="text-sm text-muted-foreground">
            {erro || "Não foi possível mostrar o PDF aqui."}
          </p>
          <Button asChild size="sm" variant="secondary">
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir PDF em nova aba
            </a>
          </Button>
        </div>
      ) : null}

      <div
        ref={hostRef}
        className={`min-h-0 flex-1 overflow-auto p-2 ${status === "ok" ? "" : "hidden"}`}
        aria-label={paginas ? `PDF com ${paginas} página(s)` : "PDF"}
      />
    </div>
  );
}
