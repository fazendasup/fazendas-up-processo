import { test, expect, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "comercial@visioneer.com.br";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "Fup@2026";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Senha").fill(adminPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 45_000 });
  // Fluxo multi-projeto: /projetos → Entrar (vários projetos) ou atalho com um só
  const url = page.url();
  if (/\/projetos/.test(url)) {
    const entrar = page.getByRole("button", { name: /^Entrar$/ });
    const abrirPainel = page.getByRole("link", { name: /Abrir painel/i });
    if ((await entrar.count()) > 0) {
      await entrar.first().click();
    } else if ((await abrirPainel.count()) > 0) {
      await abrirPainel.first().click();
    }
  }
  await expect(page.getByRole("heading", { name: /Painel de Controle/i })).toBeVisible({
    timeout: 45_000,
  });
}

test.describe("Fluxos críticos (login, plantio, torre)", () => {
  test("login e dashboard", async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("página Plantio após login", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/planejamento");
    await expect(page.getByRole("heading", { name: /Plantio/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Calendário/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Planos/i })).toBeVisible();
  });

  test("abrir detalhe da primeira torre a partir do dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    const torreLinks = page.locator('a[href^="/torre/"]');
    const n = await torreLinks.count();
    test.skip(n === 0, "Nenhuma torre com link no dashboard (seed/banco vazio).");
    await torreLinks.first().click();
    await expect(page).toHaveURL(/\/torre\/.+/);
    await expect(page.getByRole("heading", { name: /Andares/i })).toBeVisible();
  });
});
