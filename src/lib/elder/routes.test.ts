import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PAGE_ROUTES, offlineRoutes } from "./routes.ts";
import { SERVICES, phoneOf } from "./services.ts";
import { callTargets } from "./subsidy.ts";

const APP_DIR = join(import.meta.dirname, "../../app");

test("PAGE_ROUTES 的每個路徑都有對應的 page.tsx（避免預載不存在的頁面）", () => {
  for (const route of PAGE_ROUTES) {
    const file = join(APP_DIR, route === "/" ? "" : route, "page.tsx");
    assert.ok(existsSync(file), `${route} 找不到 ${file}`);
  }
});

test("offlineRoutes：包含所有功能頁面，不包含開發用的 /dev", () => {
  const routes = offlineRoutes();
  for (const route of ["/", "/mode", "/find", "/health", "/ride", "/benefits", "/benefits/subsidy", "/family", "/family/setup", "/text", "/help", "/card/clinic", "/community", "/vision"]) {
    assert.ok(routes.includes(route), `少了 ${route}`);
  }
  assert.ok(!routes.includes("/dev"));
});

test("offlineRoutes：包含每個撥號確認頁（服務清單與 12 區社會課）", () => {
  const routes = offlineRoutes();
  for (const s of SERVICES.filter((s) => phoneOf(s))) assert.ok(routes.includes(`/call/${s.id}`), `少了 /call/${s.id}`);
  for (const t of callTargets()) assert.ok(routes.includes(`/benefits/call/${t.id}`), `少了 /benefits/call/${t.id}`);
});

test("offlineRoutes：沒有重複", () => {
  const routes = offlineRoutes();
  assert.equal(new Set(routes).size, routes.length);
});
