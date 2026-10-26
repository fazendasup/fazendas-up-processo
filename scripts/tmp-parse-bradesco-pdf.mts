import fs from "node:fs";
import { execFileSync } from "node:child_process";

const pdfPath =
  process.argv[2] ??
  "c:\\Users\\adson\\Downloads\\Bradesco_22102026_105604.PDF";

// Try pdftotext if available; else raw strings from PDF
function extractText(path: string): string {
  try {
    return execFileSync("pdftotext", ["-layout", path, "-"], {
      encoding: "utf8",
      maxBuffer: 10_000_000,
    });
  } catch {
    const buf = fs.readFileSync(path);
    const raw = buf.toString("latin1");
    const parts: string[] = [];
    // crude PDF string extractor
    const re = /\((?:\\.|[^\\)])+\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw))) {
      const s = m[0]
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\([()\\])/g, "$1");
      if (s.trim()) parts.push(s);
    }
    return parts.join("\n");
  }
}

const text = extractText(pdfPath);
console.log("--- TEXT START ---");
console.log(text.slice(0, 8000));
console.log("--- TEXT END ---");
console.log("chars", text.length);
