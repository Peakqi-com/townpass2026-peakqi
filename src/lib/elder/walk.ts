/**
 * 步行導航：在預先產生的 OSM 步行路網（public/walk/*.json）上算路線，產生「直走 120 公尺，右轉進入天母東路」這類指引。
 *
 * - 全部在網頁（WebView）裡算，不呼叫路線規劃服務，飛航模式也能用。
 * - 路網由 scripts/build-walk-graph.ts 產生，資料 © OpenStreetMap contributors（ODbL 1.0），畫面要標註。
 * - 演算法：A*（啟發函數是直線距離），樓梯的成本加重，盡量避開。
 */
import { distanceMeters, type LatLng } from "../opendata/geo.ts";

/** public/walk/*.json 的格式（見 scripts/build-walk-graph.ts） */
export interface WalkGraphFile {
  attribution: string;
  nodes: [number, number][];
  nodeFlags: number[];
  names: string[];
  /** [a, b, 公尺, 路名編號, 旗標] */
  edges: [number, number, number, number, number][];
}

export const EDGE_STEPS = 1;
export const EDGE_SIDEWALK = 2;
export const EDGE_CROSSING = 4;
export const NODE_CROSSING = 1;
export const NODE_SIGNALS = 2;

/** 樓梯的成本倍數：長輩、推輪椅、拿助行器都不方便 */
const STEPS_PENALTY = 4;

interface Neighbor {
  to: number;
  meters: number;
  name: number;
  flags: number;
}

export interface WalkGraph {
  attribution: string;
  points: LatLng[];
  nodeFlags: number[];
  names: string[];
  adjacency: Neighbor[][];
}

export function buildGraph(file: WalkGraphFile): WalkGraph {
  const adjacency: Neighbor[][] = file.nodes.map(() => []);
  for (const [a, b, meters, name, flags] of file.edges) {
    adjacency[a].push({ to: b, meters, name, flags });
    adjacency[b].push({ to: a, meters, name, flags });
  }
  return {
    attribution: file.attribution,
    points: file.nodes.map(([lat, lng]) => ({ lat, lng })),
    nodeFlags: file.nodeFlags,
    names: file.names,
    adjacency,
  };
}

/** 離某個點最近、而且有連到路網的節點 */
export function nearestNode(graph: WalkGraph, p: LatLng): number {
  let best = -1;
  let bestDist = Infinity;
  graph.points.forEach((q, i) => {
    if (graph.adjacency[i].length === 0) return;
    const d = distanceMeters(p, q);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/** 最小堆積（A* 的待處理清單） */
class MinHeap {
  private items: [number, number][] = [];
  get size() {
    return this.items.length;
  }
  push(priority: number, value: number) {
    const a = this.items;
    a.push([priority, value]);
    let i = a.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (a[parent][0] <= a[i][0]) break;
      [a[parent], a[i]] = [a[i], a[parent]];
      i = parent;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0][1];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/** 一段路（兩個節點之間） */
export interface Leg {
  from: number;
  to: number;
  meters: number;
  name: string;
  flags: number;
}

/** A* 找成本最低的路徑，回傳經過的每一段；走不到時回傳 null */
export function shortestPath(graph: WalkGraph, start: number, goal: number): Leg[] | null {
  const cost = new Map<number, number>([[start, 0]]);
  const came = new Map<number, { prev: number; edge: Neighbor }>();
  const open = new MinHeap();
  const goalPoint = graph.points[goal];
  open.push(distanceMeters(graph.points[start], goalPoint), start);
  const done = new Set<number>();

  while (open.size > 0) {
    const node = open.pop();
    if (node === goal) break;
    if (done.has(node)) continue;
    done.add(node);
    for (const edge of graph.adjacency[node]) {
      const next = cost.get(node)! + edge.meters * (edge.flags & EDGE_STEPS ? STEPS_PENALTY : 1);
      if (next < (cost.get(edge.to) ?? Infinity)) {
        cost.set(edge.to, next);
        came.set(edge.to, { prev: node, edge });
        open.push(next + distanceMeters(graph.points[edge.to], goalPoint), edge.to);
      }
    }
  }
  if (start !== goal && !came.has(goal)) return null;

  const legs: Leg[] = [];
  for (let n = goal; n !== start; ) {
    const { prev, edge } = came.get(n)!;
    legs.push({ from: prev, to: n, meters: edge.meters, name: graph.names[edge.name], flags: edge.flags });
    n = prev;
  }
  return legs.reverse();
}

/** 方位角（度，北 = 0，順時針） */
export function bearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** 轉向角度：-180～180，正數是右轉 */
export function turnAngle(inBearing: number, outBearing: number): number {
  return ((outBearing - inBearing + 540) % 360) - 180;
}

export type StepKind = "left" | "right" | "cross" | "arrive";

export interface Step {
  kind: StepKind;
  /** 從起點走到這裡的距離（公尺） */
  atMeters: number;
  point: LatLng;
  /** 轉進去的路名（沒有名字的人行道會往後找；找不到就是空字串） */
  road: string;
  /** 過馬路的地方有沒有號誌 */
  signals?: boolean;
  /** 這裡是有聲號誌路口（data.taipei〈有聲號誌設置地點〉），值是路口名稱 */
  audible?: string;
}

export interface Route {
  points: LatLng[];
  /** 每個點離起點的距離（公尺） */
  cumulative: number[];
  meters: number;
  steps: Step[];
}

/** 低於這個角度視為直走；人行道在路口常有小轉折，太小的角度不念 */
const TURN_DEGREES = 50;
/** 計算轉向時，往前、往後各看多遠（公尺），避免 OSM 線段的小鋸齒被當成轉彎 */
const LOOK_METERS = 12;
/** 兩個指引距離太近時合併（例如：轉彎後馬上過斑馬線） */
const MERGE_METERS = 15;
/** 連續兩個轉彎進入同一條路，在這個距離內只念第一個 */
const SAME_ROAD_MERGE_METERS = 30;

/** 在路徑上，從第 i 個點往前或往後走 meters 公尺，回傳那個點 */
function pointAlong(points: LatLng[], cumulative: number[], i: number, meters: number): LatLng {
  const target = cumulative[i] + meters;
  if (meters >= 0) {
    for (let k = i + 1; k < points.length; k++) if (cumulative[k] >= target) return points[k];
    return points[points.length - 1];
  }
  for (let k = i - 1; k >= 0; k--) if (cumulative[k] <= target) return points[k];
  return points[0];
}

/**
 * 轉彎後要進入的路：從第 legIndex 段開始，往後 60 公尺內找第一個「跟現在這條不同」的路名。
 * 轉彎點有時會落在路口前一個節點（OSM 線段有小轉折），不排除現在的路名就會念成「右轉進入（原本這條路）」。
 */
function roadAhead(legs: Leg[], legIndex: number): string {
  const current = legs.slice(0, legIndex).findLast((l) => l.name)?.name ?? "";
  let walked = 0;
  for (let k = legIndex; k < legs.length && walked < 60; k++) {
    if (legs[k].name && legs[k].name !== current) return legs[k].name;
    walked += legs[k].meters;
  }
  return "";
}

/** 把路徑整理成轉彎、過馬路、抵達的指引 */
export function buildSteps(graph: WalkGraph, legs: Leg[]): Route {
  const nodeIds = legs.length > 0 ? [legs[0].from, ...legs.map((l) => l.to)] : [];
  const points = nodeIds.map((n) => graph.points[n]);
  const cumulative = [0];
  for (const leg of legs) cumulative.push(cumulative[cumulative.length - 1] + leg.meters);
  const meters = cumulative[cumulative.length - 1] ?? 0;

  const steps: Step[] = [];
  const add = (step: Step) => {
    const last = steps[steps.length - 1];
    // 過斑馬線時常是「轉進斑馬線、再轉上大路」兩個轉彎，進入的是同一條路就只念一次
    // （中間可能夾著一個「過馬路」，所以往回找上一個轉彎）
    const isTurn = (s: Step) => s.kind === "left" || s.kind === "right";
    const lastTurn = steps.findLast(isTurn);
    if (
      lastTurn &&
      isTurn(step) &&
      step.atMeters - lastTurn.atMeters < SAME_ROAD_MERGE_METERS &&
      (!step.road || step.road === lastTurn.road)
    ) {
      if (step.signals !== undefined) lastTurn.signals ||= step.signals;
      return;
    }
    if (last && step.atMeters - last.atMeters < MERGE_METERS) {
      // 轉彎優先（「右轉」比「過馬路」更需要先知道），過馬路的資訊併進去
      if (last.kind === "cross" && step.kind !== "cross") steps[steps.length - 1] = { ...step, signals: last.signals };
      else if (step.kind === "cross" && last.kind !== "cross") last.signals = step.signals;
      return;
    }
    steps.push(step);
  };

  for (let i = 1; i < points.length - 1; i++) {
    const before = pointAlong(points, cumulative, i, -LOOK_METERS);
    const after = pointAlong(points, cumulative, i, LOOK_METERS);
    const angle = turnAngle(bearing(before, points[i]), bearing(points[i], after));
    const flags = graph.nodeFlags[nodeIds[i]];
    const entersCrossing = legs[i].flags & EDGE_CROSSING && !(legs[i - 1].flags & EDGE_CROSSING);

    if (flags & NODE_CROSSING || entersCrossing) {
      add({ kind: "cross", atMeters: cumulative[i], point: points[i], road: "", signals: Boolean(flags & NODE_SIGNALS) });
    }
    if (Math.abs(angle) >= TURN_DEGREES) {
      add({ kind: angle > 0 ? "right" : "left", atMeters: cumulative[i], point: points[i], road: roadAhead(legs, i) });
    }
  }
  if (points.length > 0) steps.push({ kind: "arrive", atMeters: meters, point: points[points.length - 1], road: "" });
  return { points, cumulative, meters, steps };
}

/** 起點或終點離路網超過這個距離，就當作不在路網範圍內（路網只涵蓋 Demo 周邊） */
export const COVERAGE_METERS = 150;

export type RouteResult =
  | { ok: true; route: Route }
  | { ok: false; reason: "outside" | "no-path"; straightMeters: number };

/** 從 from 走到 to；兩點都會先對到最近的路網節點 */
export function findRoute(graph: WalkGraph, from: LatLng, to: LatLng): RouteResult {
  const straightMeters = distanceMeters(from, to);
  const start = nearestNode(graph, from);
  const goal = nearestNode(graph, to);
  if (
    start < 0 ||
    goal < 0 ||
    distanceMeters(from, graph.points[start]) > COVERAGE_METERS ||
    distanceMeters(to, graph.points[goal]) > COVERAGE_METERS
  ) {
    return { ok: false, reason: "outside", straightMeters };
  }
  const legs = shortestPath(graph, start, goal);
  return legs ? { ok: true, route: buildSteps(graph, legs) } : { ok: false, reason: "no-path", straightMeters };
}

/* ---------- 跟著走：目前走到路線的哪裡 ---------- */

/** 把經緯度換成以 origin 為原點的平面座標（公尺）；幾公里內誤差可以忽略 */
function toLocal(origin: LatLng, p: LatLng): { x: number; y: number } {
  const k = Math.cos((origin.lat * Math.PI) / 180);
  return { x: (p.lng - origin.lng) * 111_320 * k, y: (p.lat - origin.lat) * 110_574 };
}

/**
 * 目前位置投影到路線上：along 是已經走了幾公尺，offRoute 是離路線多遠。
 * hint：上一次的 along，只在它附近找，避免路線繞回來時跳到另一段。
 */
export function locateOnRoute(route: Route, p: LatLng, hint = 0): { along: number; offRoute: number } {
  let best = { along: 0, offRoute: Infinity };
  for (let i = 1; i < route.points.length; i++) {
    if (route.cumulative[i] < hint - 50) continue;
    const a = toLocal(p, route.points[i - 1]);
    const b = toLocal(p, route.points[i]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len2));
    const off = Math.hypot(a.x + t * dx, a.y + t * dy);
    if (off < best.offRoute) {
      best = { along: route.cumulative[i - 1] + t * (route.cumulative[i] - route.cumulative[i - 1]), offRoute: off };
    }
  }
  return best;
}

/** 路線上走了 meters 公尺的位置（模擬行走用） */
export function pointAt(route: Route, meters: number): LatLng {
  const { points, cumulative } = route;
  if (meters <= 0) return points[0];
  for (let i = 1; i < points.length; i++) {
    if (cumulative[i] >= meters) {
      const span = cumulative[i] - cumulative[i - 1];
      const t = span === 0 ? 0 : (meters - cumulative[i - 1]) / span;
      return {
        lat: points[i - 1].lat + t * (points[i].lat - points[i - 1].lat),
        lng: points[i - 1].lng + t * (points[i].lng - points[i - 1].lng),
      };
    }
  }
  return points[points.length - 1];
}

/** 離路線超過這個距離，就重新找路（市區 GPS 誤差常有 10～20 公尺，不能設太小） */
export const OFF_ROUTE_METERS = 35;
/** 提早多遠先說一次（「直走 40 公尺，右轉…」） */
const SOON_METERS = 40;
/** 到了多近說「現在右轉」 */
const NOW_METERS = 12;

/**
 * 走到 along 公尺時該念哪些話。已經念過的記在 said（key 是「第幾步:soon／now」），同一句不重複。
 * 回傳 haptic：轉彎、過馬路、抵達的當下要震動。
 */
export function guidanceAt(
  route: Route,
  along: number,
  said: Set<string>,
  destination: string,
): { text: string; haptic: boolean }[] {
  const out: { text: string; haptic: boolean }[] = [];
  const index = route.steps.findIndex((s) => s.atMeters > along - 5);
  if (index < 0) return out;
  const step = route.steps[index];
  const away = step.atMeters - along;
  if (away <= (step.kind === "arrive" ? 15 : NOW_METERS)) {
    if (!said.has(`${index}:now`)) {
      said.add(`${index}:now`);
      said.add(`${index}:soon`);
      out.push({ text: nowSentence(step, destination), haptic: true });
    }
  } else if (away <= SOON_METERS && !said.has(`${index}:soon`)) {
    said.add(`${index}:soon`);
    out.push({ text: stepSentence(step, away, destination), haptic: false });
  }
  return out;
}

/** 到了轉彎、過馬路的地方，當下要說的話 */
export function nowSentence(step: Step, destination = "目的地"): string {
  switch (step.kind) {
    case "left":
    case "right": {
      const dir = step.kind === "left" ? "左轉" : "右轉";
      return `現在${dir}${step.road ? `，進入${step.road}` : ""}${crossingNote(step)}`;
    }
    case "cross":
      return `現在${crossingNote(step).slice(1)}`;
    case "arrive":
      return `到了，${destination}就在附近`;
  }
}

/** 長輩步行速度（公尺／秒）。保守估計，未查證出處，不要寫成「研究指出」 */
export const ELDER_WALK_SPEED = 0.8;

export function walkMinutes(meters: number): number {
  return Math.max(1, Math.ceil(meters / ELDER_WALK_SPEED / 60));
}

/**
 * 走到站牌要多久，跟公車還有幾分鐘到比一比。
 * 永遠不叫長輩用跑的：趕不上就說等下一班。
 */
export function busTimingSentence(walkMin: number, busSeconds: number | null | undefined): string {
  const walk = `走到站牌大約 ${walkMin} 分鐘`;
  if (busSeconds === null || busSeconds === undefined || busSeconds < 0) return `${walk}。`;
  const busMin = Math.floor(busSeconds / 60);
  if (busSeconds >= walkMin * 60 + 60) return `${walk}，公車還有 ${busMin} 分鐘，來得及，慢慢走就好。`;
  return `${walk}，公車${busMin <= 0 ? "快到了" : `還有 ${busMin} 分鐘`}，這一班可能趕不上，不要用跑的，等下一班。`;
}

/** 長輩聽得懂的距離：50 公尺以下取 10 的倍數，以上取 50 的倍數，1 公里以上用公里 */
export function spokenMeters(m: number): string {
  if (m < 15) return "幾步路";
  if (m >= 1000) return `${Math.round(m / 100) / 10} 公里`;
  const rounded = m < 50 ? Math.round(m / 10) * 10 : Math.round(m / 50) * 50;
  return `${rounded} 公尺`;
}

/** 過馬路的提醒（開頭是逗號）；轉彎沒有過馬路時是空字串 */
function crossingNote(step: Step): string {
  if (step.audible) return "，要過馬路，這裡有有聲號誌，聽到嗶嗶聲再走";
  if (step.kind !== "cross" && step.signals === undefined) return "";
  return step.signals ? "，要過馬路，等綠燈再走" : "，要過馬路，請走斑馬線，左右看清楚";
}

/** 有聲號誌路口離過馬路的地方這麼近，就當作同一個路口 */
const AUDIBLE_MATCH_METERS = 30;

/**
 * 把有聲號誌路口標到路線上要過馬路的地方（M10 的資料）。
 * 回傳新的路線，不改原本的。
 */
export function markAudibleSignals(route: Route, signals: readonly (LatLng & { name: string })[]): Route {
  const steps = route.steps.map((step) => {
    if (step.kind === "arrive" || (step.kind !== "cross" && step.signals === undefined)) return step;
    let best: { name: string; d: number } | undefined;
    for (const s of signals) {
      const d = distanceMeters(step.point, s);
      if (d <= AUDIBLE_MATCH_METERS && (!best || d < best.d)) best = { name: s.name, d };
    }
    return best ? { ...step, audible: best.name } : step;
  });
  return { ...route, steps };
}

/** 一個指引的句子，例如「直走 120 公尺，右轉進入天母東路」 */
export function stepSentence(step: Step, metersAway: number, destination = "目的地"): string {
  const lead = metersAway < 15 ? "" : `直走 ${spokenMeters(metersAway)}，`;
  switch (step.kind) {
    case "left":
    case "right": {
      const dir = step.kind === "left" ? "左轉" : "右轉";
      const road = step.road ? `進入${step.road}` : "";
      return `${lead}${dir}${road}${crossingNote(step)}`;
    }
    case "cross":
      return `${lead}${crossingNote(step).slice(1)}`;
    case "arrive":
      return metersAway < 15 ? `到了，${destination}就在附近` : `直走 ${spokenMeters(metersAway)}，就到${destination}`;
  }
}
