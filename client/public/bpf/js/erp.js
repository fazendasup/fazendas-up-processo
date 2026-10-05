/** Busca na lista de setores, POPs e FITs. */
(function () {
  const input = document.getElementById("bpf-search");
  if (!input) return;

  function apply() {
    const q = input.value.trim().toLowerCase();
    document.querySelectorAll(".nav-sector").forEach((sector) => {
      const label = (
        sector.querySelector(".nav-sector-label")?.textContent || ""
      ).toLowerCase();
      const sectorHit = q.length > 0 && label.includes(q);
      let any = sectorHit;
      sector.querySelectorAll(".nav-btn[data-view]").forEach((btn) => {
        const text = (btn.textContent || "").toLowerCase();
        const hit = !q || sectorHit || text.includes(q);
        btn.hidden = !hit;
        if (hit) any = true;
      });
      sector.hidden = Boolean(q) && !any;
      if (q && any) {
        sector.classList.remove("collapsed");
        const toggle = sector.querySelector(".nav-sector-toggle");
        if (toggle) toggle.setAttribute("aria-expanded", "true");
      }
    });
  }

  input.addEventListener("input", apply);
  document.getElementById("sidebar-nav")?.addEventListener("click", () => {
    setTimeout(apply, 0);
  });
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(apply, 0);
  });
})();
