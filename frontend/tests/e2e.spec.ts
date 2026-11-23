import { test, expect } from "@playwright/test";

test("facilitator advances agenda and second browser follows", async ({ browser }) => {
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const p1 = await ctx1.newPage();
  const p2 = await ctx2.newPage();

  // set user u2 for both (team member)
  await p1.addInitScript(() => localStorage.setItem("uid", "u2"));
  await p2.addInitScript(() => localStorage.setItem("uid", "u2"));

  await p1.goto("/teams/team_lead");
  await p2.goto("/teams/team_lead");

  // start meeting in p1
  await p1.getByRole("button", { name: /start meeting/i }).click();
  await p1.waitForURL(/\/meetings\//);
  const url = p1.url();
  await p2.goto(url);

  // initial section 0
  await expect(p1.getByText("Scorecard (5 min)")).toBeVisible();
  await expect(p2.getByText("Scorecard (5 min)")).toBeVisible();

  // advance
  await p1.getByRole("button", { name: /next section/i }).click();
  await p2.waitForTimeout(2500);
  await expect(p2.getByText("IDS (60 min)")).toBeVisible();
  await expect(p2.getByText("IDS - Issues")).toBeVisible();

  await ctx1.close();
  await ctx2.close();
});