/** Busca no nome e no texto do procedimento, e o menu no celular. */
(function () {
  const input = document.getElementById("bpf-search");
  const menu = document.getElementById("btn-menu");
  const backdrop = document.getElementById("bpf-backdrop");

  function fold(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function apply() {
    if (!input) return;
    const q = fold(input.value.trim());
    document.querySelectorAll(".nav-sector").forEach((sector) => {
      const label = fold(sector.querySelector(".nav-sector-label")?.textContent);
      const sectorHit = q.length > 0 && label.includes(q);
      const buttons = [...sector.querySelectorAll(".nav-btn[data-view]")];
      let visible = 0;
      buttons.forEach((btn) => {
        const text = fold(btn.textContent);
        const doc = fold(
          typeof window.bpfTextoDoDocumento === "function"
            ? window.bpfTextoDoDocumento(btn.dataset.view)
            : "",
        );
        const hit = !q || sectorHit || text.includes(q) || doc.includes(q);
        btn.hidden = !hit;
        if (hit) visible += 1;
      });
      const count = sector.querySelector(".nav-sector-count");
      if (count) count.textContent = String(q ? visible : buttons.length);
      sector.hidden = Boolean(q) && visible === 0;
      if (q && visible > 0) {
        sector.classList.remove("collapsed");
        const toggle = sector.querySelector(".nav-sector-toggle");
        if (toggle) toggle.setAttribute("aria-expanded", "true");
      }
    });
  }

  input?.addEventListener("input", apply);
  document.getElementById("sidebar-nav")?.addEventListener("click", (event) => {
    if (event.target.closest(".nav-btn")) {
      document.body.classList.remove("sidebar-open");
    }
    setTimeout(apply, 0);
  });
  menu?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });
  backdrop?.addEventListener("click", () => {
    document.body.classList.remove("sidebar-open");
  });
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(apply, 0);
  });
})();