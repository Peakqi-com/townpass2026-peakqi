import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadEstimates, loadRoutes, loadStops } from "./data.ts";

// 用 fixtures/ 的 gzip 檔（真實資料的子集）驗證：只抓白名單網址 → gunzip → JSON → 解析
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("loadRoutes／loadStops／loadEstimates：抓公運處 blob 的 gzip，第二次用快取", async () => {
  const requested: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requested.push(url);
    const name = url.split("/").pop()!;
    return new Response(new Uint8Array(fixture(name)), { status: 200 });
  }) as typeof fetch;

  const routes = await loadRoutes("tpe");
  assert.ok(routes.some((r) => r.name === "307" && r.id === 16111));
  const stops = await loadStops("tpe");
  assert.ok(stops.some((s) => s.id === 15276 && s.goBack === 0));
  const { value: estimates, stale } = await loadEstimates("tpe");
  assert.equal(stale, false);
  assert.ok(estimates.some((e) => e.stopId === 15276 && e.seconds === 731));

  await loadRoutes("tpe");
  assert.deepEqual(requested, [
    "https://tcgbusfs.blob.core.windows.net/blobbus/GetRoute.gz",
    "https://tcgbusfs.blob.core.windows.net/blobbus/GetStop.gz",
    "https://tcgbusfs.blob.core.windows.net/blobbus/GetEstimateTime.gz",
  ]);
});
