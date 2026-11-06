import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceMeters, isInTaipeiArea, twd97ToWgs84 } from "./geo.ts";

// 基準資料：data.taipei「臺北市河濱自行車租借站」同時提供 TWD97 與 WGS84 座標（2026-11-06 下載）。
// 排除了原始資料本身兩組座標不一致的「大佳站」「馬場町站」。
const FIXTURES = [
  { name: "關渡站", x: 296599.9263, y: 2779290.401, lng: 121.462111, lat: 25.121278 },
  { name: "大稻埕站", x: 301181.9444, y: 2772042.359, lng: 121.507277, lat: 25.055694 },
  { name: "美堤站", x: 306651.9458, y: 2774297.79, lng: 121.561583, lat: 25.075861 },
  { name: "景福站", x: 303335.3692, y: 2767167.497, lng: 121.528431, lat: 25.01161 },
  { name: "木柵站", x: 308542.7143, y: 2765806.258, lng: 121.579964, lat: 24.999128 },
  { name: "觀山站", x: 307390.7704, y: 2773775.414, lng: 121.568885, lat: 25.071117 },
  { name: "彩虹站", x: 307890.0658, y: 2771773.779, lng: 121.57375, lat: 25.053028 },
];

for (const f of FIXTURES) {
  test(`TWD97 → WGS84：${f.name} 誤差 < 30 公尺`, () => {
    const p = twd97ToWgs84(f.x, f.y);
    const err = distanceMeters(p, { lat: f.lat, lng: f.lng });
    assert.ok(err < 30, `誤差 ${err.toFixed(1)}m，換算結果 ${p.lat},${p.lng}`);
  });
}

test("distanceMeters：臺北車站到臺北 101 約 5.3 公里", () => {
  const d = distanceMeters({ lat: 25.0478, lng: 121.517 }, { lat: 25.0339, lng: 121.5645 });
  assert.ok(d > 4900 && d < 5100, `${d}`);
});

test("isInTaipeiArea：排除 0 與經緯度對調", () => {
  assert.equal(isInTaipeiArea({ lat: 25.03, lng: 121.56 }), true);
  assert.equal(isInTaipeiArea({ lat: 0, lng: 0 }), false);
  assert.equal(isInTaipeiArea({ lat: 121.56, lng: 25.03 }), false);
  assert.equal(isInTaipeiArea({ lat: undefined, lng: 121.5 }), false);
});
