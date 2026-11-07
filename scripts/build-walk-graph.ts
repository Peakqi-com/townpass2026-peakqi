/**
 * 步行路網預處理（開發時執行一次，結果放進 public/，執行階段不呼叫任何外部服務）
 *
 *   node scripts/build-walk-graph.ts            # 從 Overpass API 抓 OSM 資料
 *   node scripts/build-walk-graph.ts osm.json   # 改用已下載的 Overpass JSON（離線重建）
 *   OVERPASS_URL=<鏡像>/api/interpreter node scripts/build-walk-graph.ts   # 主站連不上時
 *
 * 輸出 public/walk/tianmu.json，給 src/lib/elder/walk.ts 在 WebView 裡算路線（飛航模式也能用）。
 *
 * 資料授權：© OpenStreetMap contributors，ODbL 1.0。畫面上要顯示這行標註。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** 範圍：會場（臺北市立大學天母校區）周邊，含明德站、芝山站。換範圍時改這裡 */
const BBOX = { south: 25.1, west: 121.515, north: 25.122, east: 121.54 };
const OUTPUT = "public/walk/tianmu.json";
/** 主站連不上時可改用鏡像：OVERPASS_URL=https://maps.mail.ru/osm/tools/overpass/api/interpreter */
const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

/** 人可以走的道路類型（不含高速公路、快速道路） */
const WALKABLE =
  "footway|pedestrian|path|steps|living_street|residential|service|unclassified|" +
  "tertiary|tertiary_link|secondary|secondary_link|primary|primary_link|corridor|track";

interface OsmNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}
interface OsmWay {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}
type OsmElement = OsmNode | OsmWay;

/** 邊的旗標（位元） */
export const EDGE_STEPS = 1; // 有樓梯
export const EDGE_SIDEWALK = 2; // 獨立的人行道（footway=sidewalk）
export const EDGE_CROSSING = 4; // 斑馬線（footway=crossing）

/** 節點旗標 */
export const NODE_CROSSING = 1; // 行人穿越道
export const NODE_SIGNALS = 2; // 有號誌（行人穿越道或路口）

function canWalk(tags: Record<string, string>): boolean {
  if (tags.foot === "no" || tags.foot === "private") return false;
  const footOk = tags.foot === "yes" || tags.foot === "designated" || tags.foot === "permissive";
  if ((tags.access === "no" || tags.access === "private") && !footOk) return false;
  if (tags.area === "yes" && tags.highway !== "pedestrian") return false;
  return true;
}

function distance(a: OsmNode, b: OsmNode): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function fetchOsm(): Promise<OsmElement[]> {
  const { south, west, north, east } = BBOX;
  const query = `[out:json][timeout:90];
way["highway"~"^(${WALKABLE})$"](${south},${west},${north},${east});
(._;>;);
out body;`;
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "townpass2026-peakqi build-walk-graph" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass 回應 ${res.status}：${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { elements: OsmElement[] }).elements;
}

async function main() {
  const input = process.argv[2];
  const elements: OsmElement[] = input
    ? ((JSON.parse(await readFile(input, "utf8")) as { elements: OsmElement[] }).elements)
    : await fetchOsm();

  const osmNodes = new Map<number, OsmNode>();
  for (const e of elements) if (e.type === "node") osmNodes.set(e.id, e);

  const index = new Map<number, number>(); // OSM node id → 輸出的節點編號
  const nodes: [number, number][] = [];
  const nodeFlags: number[] = [];
  const names: string[] = [""];
  const nameIndex = new Map<string, number>([["", 0]]);
  const edges: [number, number, number, number, number][] = []; // [a, b, 公尺, 路名編號, 旗標]

  const nodeId = (id: number): number => {
    let i = index.get(id);
    if (i !== undefined) return i;
    const n = osmNodes.get(id)!;
    i = nodes.length;
    index.set(id, i);
    nodes.push([Number(n.lat.toFixed(6)), Number(n.lon.toFixed(6))]);
    const t = n.tags ?? {};
    let flags = 0;
    if (t.highway === "crossing" || t.crossing) flags |= NODE_CROSSING;
    if (t.highway === "traffic_signals" || t.crossing === "traffic_signals" || t["crossing:signals"] === "yes") flags |= NODE_SIGNALS;
    nodeFlags.push(flags);
    return i;
  };

  for (const e of elements) {
    if (e.type !== "way") continue;
    const tags = e.tags ?? {};
    if (!canWalk(tags)) continue;
    const name = tags.name ?? "";
    let ni = nameIndex.get(name);
    if (ni === undefined) {
      ni = names.length;
      names.push(name);
      nameIndex.set(name, ni);
    }
    let flags = 0;
    if (tags.highway === "steps") flags |= EDGE_STEPS;
    if (tags.footway === "sidewalk") flags |= EDGE_SIDEWALK;
    if (tags.footway === "crossing") flags |= EDGE_CROSSING;

    for (let k = 1; k < e.nodes.length; k++) {
      const a = osmNodes.get(e.nodes[k - 1]);
      const b = osmNodes.get(e.nodes[k]);
      if (!a || !b) continue;
      edges.push([nodeId(a.id), nodeId(b.id), Math.round(distance(a, b) * 10) / 10, ni, flags]);
    }
  }

  const graph = {
    attribution: "© OpenStreetMap contributors（ODbL 1.0）",
    license: "https://opendatacommons.org/licenses/odbl/1-0/",
    source: "https://www.openstreetmap.org/",
    bbox: BBOX,
    generatedAt: new Date().toISOString(),
    nodes,
    nodeFlags,
    names,
    edges,
  };
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(graph));
  const size = Buffer.byteLength(JSON.stringify(graph));
  console.log(`節點 ${nodes.length}、邊 ${edges.length}、路名 ${names.length - 1} → ${OUTPUT}（${(size / 1024).toFixed(0)} KB）`);
}

await main();
