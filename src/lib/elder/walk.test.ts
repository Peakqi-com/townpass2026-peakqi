import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EDGE_STEPS,
  NODE_CROSSING,
  NODE_SIGNALS,
  buildGraph,
  buildSteps,
  busTimingSentence,
  findRoute,
  guidanceAt,
  locateOnRoute,
  markAudibleSignals,
  nowSentence,
  pointAt,
  shortestPath,
  spokenMeters,
  stepSentence,
  turnAngle,
  type Route,
  type WalkGraphFile,
} from "./walk.ts";

// 步行導航：用一個小的假路網測演算法（真的路網 public/walk/tianmu.json 由 scripts/build-walk-graph.ts 產生）。

const BASE = { lat: 25.1146, lng: 121.537 };
/** 從 BASE 往北 north 公尺、往東 east 公尺 */
const at = (north: number, east: number): [number, number] => [
  BASE.lat + north / 110_574,
  BASE.lng + east / (111_320 * Math.cos((BASE.lat * Math.PI) / 180)),
];

/**
 *   3 ── 4        0 往北走到 2（忠誠路），在 2 右轉往東（天母東路）到 4。
 *   │             1 是有號誌的行人穿越道。
 *   2 ─────── 5   2 到 5 另有一條樓梯捷徑（steps）。
 *   │
 *   1（號誌）
 *   │
 *   0
 */
function sampleGraph(): WalkGraphFile {
  return {
    attribution: "test",
    nodes: [at(0, 0), at(50, 0), at(100, 0), at(100, 40), at(100, 80), at(40, 80)],
    nodeFlags: [0, NODE_CROSSING | NODE_SIGNALS, 0, 0, 0, 0],
    names: ["", "忠誠路二段", "天母東路", ""],
    edges: [
      [0, 1, 50, 1, 0],
      [1, 2, 50, 1, 0],
      [2, 3, 40, 2, 0],
      [3, 4, 40, 2, 0],
      [0, 5, 85, 3, EDGE_STEPS],
      [5, 4, 60, 3, EDGE_STEPS],
    ],
  };
}

const graph = buildGraph(sampleGraph());
const ok = (r: ReturnType<typeof findRoute>): Route => {
  assert.ok(r.ok, "應該找得到路");
  return r.route;
};

test("turnAngle：往北轉往東是右轉 90 度，往北轉往西是左轉", () => {
  assert.equal(turnAngle(0, 90), 90);
  assert.equal(turnAngle(0, 270), -90);
  assert.equal(turnAngle(350, 10), 20);
});

test("shortestPath：樓梯比較短也盡量避開（樓梯成本加重）", () => {
  const legs = shortestPath(graph, 0, 4);
  assert.ok(legs);
  assert.deepEqual(
    legs.map((l) => l.to),
    [1, 2, 3, 4],
  );
});

test("findRoute：過有號誌的路口、右轉進入天母東路、抵達", () => {
  const route = ok(findRoute(graph, { lat: at(0, 0)[0], lng: at(0, 0)[1] }, { lat: at(100, 80)[0], lng: at(100, 80)[1] }));
  assert.equal(route.meters, 180);
  assert.deepEqual(
    route.steps.map((s) => [s.kind, Math.round(s.atMeters), s.road, s.signals]),
    [
      ["cross", 50, "", true],
      ["right", 100, "天母東路", undefined],
      ["arrive", 180, "", undefined],
    ],
  );
  assert.equal(stepSentence(route.steps[1], 50), "直走 50 公尺，右轉進入天母東路");
});

test("buildSteps：轉彎點落在路口前（還在原本那條路上）時，不會說「進入」原本的路", () => {
  // 0→1→2 是忠誠路，2 前面 3 公尺有個小轉折節點 6；右轉後是天母東路
  const file = sampleGraph();
  file.nodes.push(at(97, 1));
  file.nodeFlags.push(0);
  file.edges[1] = [1, 6, 47, 1, 0];
  file.edges.push([6, 2, 3, 1, 0]);
  const g = buildGraph(file);
  const legs = shortestPath(g, 0, 4);
  assert.ok(legs);
  const turn = buildSteps(g, legs).steps.find((s) => s.kind === "right");
  assert.equal(turn?.road, "天母東路");
});

test("buildSteps：過斑馬線的兩個轉彎都進入同一條路時，只念一次", () => {
  // 0 往西到 1，右轉斜過斑馬線到 2，再右轉往北上忠誠路到 3
  const g = buildGraph({
    attribution: "test",
    nodes: [at(0, 100), at(0, 0), at(15, -10), at(80, -10)],
    nodeFlags: [0, 0, 0, 0],
    names: ["", "忠誠路二段207巷", "忠誠路二段"],
    edges: [
      [0, 1, 100, 1, 0],
      [1, 2, 18, 0, 0],
      [2, 3, 65, 2, 0],
    ],
  });
  const legs = shortestPath(g, 0, 3);
  assert.ok(legs);
  const turns = buildSteps(g, legs).steps.filter((s) => s.kind === "right");
  assert.deepEqual(
    turns.map((s) => s.road),
    ["忠誠路二段"],
  );
});

test("findRoute：起點離路網太遠（不在 Demo 範圍）時說明原因，不亂算", () => {
  const r = findRoute(graph, { lat: 25.0375, lng: 121.5637 }, { lat: at(100, 80)[0], lng: at(100, 80)[1] });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, "outside");
});

test("locateOnRoute、pointAt：路線上走了幾公尺，來回換算一致；偏離路線算得出距離", () => {
  const route = ok(findRoute(graph, { lat: at(0, 0)[0], lng: at(0, 0)[1] }, { lat: at(100, 80)[0], lng: at(100, 80)[1] }));
  for (const m of [0, 30, 100, 150, 180]) {
    const { along, offRoute } = locateOnRoute(route, pointAt(route, m));
    assert.ok(Math.abs(along - m) < 1, `${m} → ${along}`);
    assert.ok(offRoute < 1);
  }
  const [lat, lng] = at(50, 30); // 在忠誠路東邊 30 公尺
  const off = locateOnRoute(route, { lat, lng });
  assert.ok(Math.abs(off.offRoute - 30) < 1);
  assert.ok(Math.abs(off.along - 50) < 1);
});

test("guidanceAt：40 公尺前先提醒，到了說「現在」並震動，同一句不重複", () => {
  const route = ok(findRoute(graph, { lat: at(0, 0)[0], lng: at(0, 0)[1] }, { lat: at(100, 80)[0], lng: at(100, 80)[1] }));
  const said = new Set<string>();
  const texts = (along: number) => guidanceAt(route, along, said, "站牌").map((g) => `${g.haptic ? "📳" : ""}${g.text}`);
  assert.deepEqual(texts(5), []);
  assert.deepEqual(texts(15), ["直走 40 公尺，要過馬路，等綠燈再走"]);
  assert.deepEqual(texts(16), []);
  assert.deepEqual(texts(45), ["📳現在要過馬路，等綠燈再走"]);
  assert.deepEqual(texts(65), ["直走 40 公尺，右轉進入天母東路"]);
  assert.deepEqual(texts(95), ["📳現在右轉，進入天母東路"]);
  assert.deepEqual(texts(170), ["📳到了，站牌就在附近"]);
  assert.deepEqual(texts(180), []);
});

test("markAudibleSignals：過馬路的地方 30 公尺內有有聲號誌，就提醒聽嗶嗶聲；太遠的不算", () => {
  const route = ok(findRoute(graph, { lat: at(0, 0)[0], lng: at(0, 0)[1] }, { lat: at(100, 80)[0], lng: at(100, 80)[1] }));
  const [lat, lng] = at(55, 5);
  const [farLat, farLng] = at(100, 40);
  const marked = markAudibleSignals(route, [
    { name: "忠誠路二段／207巷", lat, lng },
    { name: "太遠的路口", lat: farLat + 0.001, lng: farLng },
  ]);
  assert.equal(marked.steps[0].audible, "忠誠路二段／207巷");
  assert.equal(marked.steps[1].audible, undefined, "單純轉彎不用過馬路，不標");
  assert.equal(route.steps[0].audible, undefined, "不改原本的路線");
  assert.equal(nowSentence(marked.steps[0]), "現在要過馬路，這裡有有聲號誌，聽到嗶嗶聲再走");
  assert.equal(stepSentence(marked.steps[0], 40), "直走 40 公尺，要過馬路，這裡有有聲號誌，聽到嗶嗶聲再走");
});

test("spokenMeters：長輩聽得懂的距離", () => {
  assert.equal(spokenMeters(8), "幾步路");
  assert.equal(spokenMeters(37), "40 公尺");
  assert.equal(spokenMeters(123), "100 公尺");
  assert.equal(spokenMeters(130), "150 公尺");
  assert.equal(spokenMeters(9350), "9.4 公里");
  assert.equal(spokenMeters(2000), "2 公里");
});

test("busTimingSentence：來得及就說慢慢走；趕不上不叫長輩用跑的；沒有公車時間只說走多久", () => {
  assert.equal(busTimingSentence(5, 9 * 60), "走到站牌大約 5 分鐘，公車還有 9 分鐘，來得及，慢慢走就好。");
  assert.equal(busTimingSentence(5, 5 * 60), "走到站牌大約 5 分鐘，公車還有 5 分鐘，這一班可能趕不上，不要用跑的，等下一班。");
  assert.equal(busTimingSentence(5, 30), "走到站牌大約 5 分鐘，公車快到了，這一班可能趕不上，不要用跑的，等下一班。");
  assert.equal(busTimingSentence(5, null), "走到站牌大約 5 分鐘。");
  assert.equal(busTimingSentence(5, -3), "走到站牌大約 5 分鐘。");
});
