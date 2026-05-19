from pathlib import Path

p = Path("client/src/components/PlanejamentoColheitaContinua.tsx")
s = p.read_text(encoding="utf-8")
tag = "div"
needle = f"            </{tag}>\n          <{tag} className=\"rounded-lg border bg-muted/20 p-4 space-y-3\">"
if needle not in s:
    raise SystemExit("needle missing")
replacement = f"            </{tag}>\n          </{tag}>\n\n          <{tag} className=\"rounded-lg border bg-muted/20 p-4 space-y-3\">"
s = s.replace(needle, replacement, 1)
p.write_text(s, encoding="utf-8")
print("ok")
