/**
 * 開放資料來源白名單
 *
 * 代理（/api/opendata/[source]）只會抓這裡登記的網址，不接受任意 URL，避免被當成跳板（SSRF）。
 * 每個來源都在 2026-11-06 實際下載驗證過，細節見 TownPass repo 的 docs/townpass/open-data.md。
 *
 * 新增來源的步驟：
 * 1. 在 data.taipei 找到資料集，用 dataset.view 取得 rid，實際下載確認格式、編碼、座標欄位
 * 2. 在下面加一筆（CSV 來源通常只要用 csvSource 指定經緯度欄位）
 * 3. 在作品 README §5 補上資料集名稱、連結與授權
 */
import { decodeBody, parseCsv, parseXmlRecords, toNumber, xmlText, type Encoding, type RawRecord } from "./parse.ts";
import { isInTaipeiArea, twd97ToWgs84 } from "./geo.ts";
import { mergeLohas, normalizeElderRecord } from "./normalize.ts";

export type OpenDataRecord = Record<string, unknown> & { lat?: number; lng?: number };

export interface LoadResult {
  records: OpenDataRecord[];
  /** 資料來源自己標示的更新時間（有的話） */
  sourceUpdatedAt?: string;
}

export interface OpenDataSource {
  id: string;
  title: string;
  /** data.taipei 資料集頁面（出處標示用） */
  datasetUrl: string;
  /** 快取秒數：即時資料短、靜態資料長 */
  ttl: number;
  /** 記錄裡是否有座標（可用 near 參數篩選附近） */
  hasGeo: boolean;
  load: () => Promise<LoadResult>;
}

export const LICENSE = "政府資料開放授權條款-第1版";
const DOWNLOAD = "https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=";
const DATASET = "https://data.taipei/dataset/detail?id=";
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/* ---------- 抓取 ---------- */

export async function fetchText(url: string, encoding: Encoding = "utf-8", timeoutMs = 20_000): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "townpass2026-peakqi (+https://github.com/Peakqi-com/townpass2026-peakqi)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`上游回應 ${res.status}：${url}`);
  return decodeBody(await res.arrayBuffer(), encoding);
}

/** 由兩個欄位取得經緯度；座標不合理時不附上 */
function withLatLng(record: RawRecord, latKey: string, lngKey: string): OpenDataRecord {
  const point = { lat: toNumber(record[latKey]), lng: toNumber(record[lngKey]) };
  return isInTaipeiArea(point) ? { ...record, lat: point.lat, lng: point.lng } : { ...record };
}

/** 由 TWD97 欄位換算經緯度 */
function withTwd97(record: OpenDataRecord, x: unknown, y: unknown): OpenDataRecord {
  const tx = toNumber(x);
  const ty = toNumber(y);
  if (tx === undefined || ty === undefined) return record;
  const point = twd97ToWgs84(tx, ty);
  return isInTaipeiArea(point) ? { ...record, lat: point.lat, lng: point.lng } : record;
}

/** 一般 CSV 來源：保留原始中文欄位，另外加上 lat / lng */
function csvSource(opts: {
  id: string;
  title: string;
  datasetId: string;
  rid: string;
  encoding: Encoding;
  ttl: number;
  geo?: { lat: string; lng: string };
  /** 解析後的欄位整理（例如清理欄位內換行、補上行政區） */
  transform?: (record: RawRecord) => RawRecord;
}): OpenDataSource {
  return {
    id: opts.id,
    title: opts.title,
    datasetUrl: DATASET + opts.datasetId,
    ttl: opts.ttl,
    hasGeo: Boolean(opts.geo),
    load: async () => {
      const parsed = parseCsv(await fetchText(DOWNLOAD + opts.rid, opts.encoding));
      const rows = opts.transform ? parsed.map(opts.transform) : parsed;
      const geo = opts.geo;
      return { records: geo ? rows.map((r) => withLatLng(r, geo.lat, geo.lng)) : rows };
    },
  };
}

/* ---------- 來源定義 ---------- */

const PARKING_DESC_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_alldesc.xml";
const PARKING_AVAILABLE_URL = "https://tcgbusfs.blob.core.windows.net/blobtcmsv/TCMSV_allavailable.xml";

/** 停車場描述（每月更新，獨立快取一天） */
let parkingDescCache: { at: number; records: Map<string, OpenDataRecord> } | undefined;
async function loadParkingDesc(): Promise<Map<string, OpenDataRecord>> {
  if (parkingDescCache && Date.now() - parkingDescCache.at < DAY * 1000) return parkingDescCache.records;
  const rows = parseXmlRecords(await fetchText(PARKING_DESC_URL), "PARK");
  const records = new Map<string, OpenDataRecord>();
  for (const r of rows) {
    const base: OpenDataRecord = {
      id: r.ID,
      name: r.NAME,
      area: r.AREA,
      type: r.TYPE2,
      summary: r.SUMMARY,
      address: r.ADDRESS,
      tel: r.TEL,
      payex: r.PAYEX,
      serviceTime: r.SERVICETIME,
      totalCar: toNumber(r.TOTALCAR),
      totalMotor: toNumber(r.TOTALMOTOR),
    };
    // 優先用入口座標（注意：原始資料的 Xcod 是緯度、Ycod 是經度），沒有才從 TWD97 換算
    const entrance = { lat: toNumber(r.Xcod), lng: toNumber(r.Ycod) };
    records.set(r.ID, isInTaipeiArea(entrance) ? { ...base, ...entrance } : withTwd97(base, r.TW97X, r.TW97Y));
  }
  parkingDescCache = { at: Date.now(), records };
  return records;
}

/** 剩餘車位 -9 之類的負數代表「無資料」 */
const availableOrNull = (v: string | undefined) => {
  const n = toNumber(v);
  return n === undefined || n < 0 ? null : n;
};

export const SOURCES: Record<string, OpenDataSource> = {};
const register = (s: OpenDataSource) => (SOURCES[s.id] = s);

/* 即時資料 */

register({
  id: "youbike",
  title: "YouBike2.0臺北市公共自行車即時資訊",
  datasetUrl: DATASET + "c6bc8aed-557d-41d5-bfb1-8da24f78f2fb",
  ttl: MINUTE,
  hasGeo: true,
  load: async () => {
    const rows = JSON.parse(await fetchText("https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json")) as Record<string, unknown>[];
    return {
      records: rows.map((r) => ({
        id: r.sno,
        name: String(r.sna ?? "").replace(/^YouBike2\.0_/, ""),
        area: r.sarea,
        address: r.ar,
        total: r.Quantity,
        availableRent: r.available_rent_bikes,
        availableReturn: r.available_return_bikes,
        active: r.act === "1",
        updatedAt: r.updateTime,
        lat: r.latitude as number,
        lng: r.longitude as number,
      })),
      sourceUpdatedAt: rows[0]?.updateTime as string | undefined,
    };
  },
});

register({
  id: "parking",
  title: "臺北市停車場資訊（剩餘車位＋停車場描述）",
  datasetUrl: DATASET + "d5c0656b-5250-4179-a491-c94daa56ef2c",
  ttl: MINUTE,
  hasGeo: true,
  load: async () => {
    const [desc, availableXml] = await Promise.all([loadParkingDesc(), fetchText(PARKING_AVAILABLE_URL)]);
    const available = new Map(parseXmlRecords(availableXml, "PARK").map((r) => [r.ID, r]));
    const records = [...desc.values()].map((d) => {
      const a = available.get(String(d.id));
      return { ...d, availableCar: availableOrNull(a?.AVAILABLECAR), availableMotor: availableOrNull(a?.AVAILABLEMOTOR) };
    });
    return { records, sourceUpdatedAt: xmlText(availableXml, "UPDATETIME") };
  },
});

register({
  id: "construction",
  title: "臺北市今日施工資訊",
  datasetUrl: DATASET + "c208dabd-2da0-4e6d-8dbd-a004b9782b0a",
  ttl: 10 * MINUTE,
  hasGeo: true,
  load: async () => {
    const geojson = JSON.parse(await fetchText("https://tpnco.blob.core.windows.net/blobfs/Todaywork.json")) as {
      features: { properties: Record<string, string> }[];
    };
    return {
      records: geojson.features.map(({ properties: p }) =>
        withTwd97(
          {
            id: p.Ac_no,
            applicant: p.App_Name,
            district: p.C_Name,
            address: p.Addr,
            startDate: p.Cb_Da,
            endDate: p.Ce_Da,
            workTime: p.Co_Ti,
            purpose: p.NPurp,
            contractor: p.Tc_Na,
            contact: p.Tc_Ma,
            tel: p.Tc_Tl,
          },
          p.X,
          p.Y,
        ),
      ),
    };
  },
});

register({
  id: "traffic-news",
  title: "臺北市即時交通訊息",
  datasetUrl: DATASET + "a6fae9f8-8d0f-4605-98ac-577388a7734f",
  ttl: 2 * MINUTE,
  hasGeo: false,
  load: async () => {
    const data = JSON.parse(await fetchText("https://tcgbusfs.blob.core.windows.net/dotapp/news.json")) as {
      updateTime?: string;
      News?: OpenDataRecord[];
    };
    return { records: data.News ?? [], sourceUpdatedAt: data.updateTime };
  },
});

register({
  id: "metro-arrivals",
  title: "臺北捷運列車到站站名",
  datasetUrl: DATASET + "6556e1e8-c908-42d5-b984-b3f7337b139b",
  ttl: 30,
  hasGeo: false,
  load: async () => ({
    records: JSON.parse(await fetchText("https://tcgmetro.blob.core.windows.net/stationnames/stations.json")),
  }),
});

register({
  id: "aqi",
  title: "臺北市空氣品質即時污染指標",
  datasetUrl: DATASET + "73991c2a-9ced-48cc-aa1f-6fbf60c435ff",
  ttl: 10 * MINUTE,
  hasGeo: false,
  load: async () => ({
    records: JSON.parse(await fetchText("https://tpdep.blob.core.windows.net/techdep/tldep_AQI_DAYHour.json")),
  }),
});

register(
  csvSource({
    id: "metro-accessibility-alerts",
    title: "臺北捷運車站無障礙設施異常公告",
    datasetId: "d884a9c6-f86c-4854-8da7-e6516ddbe612",
    rid: "649c44eb-60b5-4746-a353-cbdc6651fc09",
    encoding: "big5",
    ttl: 5 * MINUTE,
  }),
);

/* 地點資料（CSV，保留原始中文欄位） */

const places: Parameters<typeof csvSource>[0][] = [
  { id: "toilets", title: "臺北市公廁點位資訊", datasetId: "ca205b54-a06f-4d84-894c-d6ab5079ce79", rid: "9e0e6ad4-b9f9-4810-8551-0cffd1b915b3", encoding: "utf-8", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "nursing-rooms", title: "臺北市哺集乳室（無座標，只有地址）", datasetId: "5d1d34d8-1b81-4162-87b6-05e0896af958", rid: "4350117f-8697-4903-8a49-a7a59f30eeb1", encoding: "big5", ttl: DAY },
  { id: "aed", title: "臺北市AED自動體外心臟去顫器設置地點", datasetId: "cd050577-115f-4299-b37a-012ff490a632", rid: "438c61ad-24f6-4e54-a1cc-e2cfe0e7051e", encoding: "utf-8", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "drinking-water", title: "臺北市公共場所飲水機資訊", datasetId: "f158e1bc-8400-44c2-a93a-e09361ddb7f5", rid: "52538305-ed23-490c-8f67-3efff2d777c3", encoding: "big5", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "family-toilets", title: "臺北市親子友善廁所點位資訊", datasetId: "9d7488f5-0f19-45c3-adf9-badf686dda18", rid: "f1beebb2-b172-4e9f-8f6f-181b5f1625d5", encoding: "big5", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "gender-friendly-toilets", title: "臺北市性別友善廁所點位資訊", datasetId: "af60ee5b-4c97-437a-9db8-ec9bd6caf4ae", rid: "be9d493f-3deb-4c0f-a2d5-855938ed2e9d", encoding: "utf-8", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "garbage-truck", title: "臺北市垃圾車點位路線資訊", datasetId: "6bb3304b-4f46-4bb0-8cd1-60c66dcd1cae", rid: "a6e90031-7ec4-4089-afb5-361a4efe7202", encoding: "utf-8", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "recycling-points", title: "臺北市垃圾資源回收、廚餘回收限時收受點", datasetId: "1acf38f3-1509-4cb1-898a-9b1d4f31a3af", rid: "0263f0ce-403a-45ed-a407-c69285b6cad2", encoding: "big5", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "pharmacies", title: "臺北市藥局", datasetId: "6fa3ed67-e60e-44d9-a366-ce7008e322de", rid: "42cfc382-f2b8-4c3a-87ad-37249634f78e", encoding: "utf-8", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "libraries", title: "臺北市立圖書館各分館暨民眾閱覽室", datasetId: "43772803-6504-469c-894d-35904342a53b", rid: "fb6cc268-e2b8-43a7-86f2-e79702291a2b", encoding: "utf-8", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "sports-centers", title: "臺北市各區運動中心", datasetId: "80be7612-593f-4795-9935-a10ce0f7b75b", rid: "e7c46724-3517-4ce5-844f-5a4404897b7d", encoding: "utf-8", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "inclusive-playgrounds", title: "臺北市共融式遊戲場資訊", datasetId: "2704f07d-4d1d-4cef-b53a-c44aef326d96", rid: "c7784a9f-e11e-4145-8b72-95b44fdc7b83", encoding: "utf-8", ttl: DAY, geo: { lat: "latitude", lng: "longitude" } },
  { id: "friendly-stores", title: "友善店家（含行動裝置充電、無障礙、友善廁所等）", datasetId: "d807396c-e41f-4005-be42-0160280783a1", rid: "5a5b36e0-f870-4b7f-8378-c91ac5f57941", encoding: "utf-8", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
  { id: "metro-elevators", title: "臺北捷運車站出入口無障礙電梯、無障礙坡道GPS座標", datasetId: "0a3bb422-9eb5-459b-a9d4-138456516183", rid: "61792c82-6609-41b2-9775-3a346934826d", encoding: "big5", ttl: DAY, geo: { lat: "緯度", lng: "經度" } },
];
places.forEach((p) => register(csvSource(p)));

/* 捷運無障礙與有聲號誌（M10 視障出門）。2026-11-07 實際下載確認 */

register(
  csvSource({
    // 119 站，沒有座標（座標用 metro-elevators 的出入口電梯）；欄位是英文，多線車站用「【文湖線】…。【板南線】…」分段
    id: "metro-station-facilities",
    title: "臺北捷運車站無障礙設施資料",
    datasetId: "3c799405-4e44-40dd-b747-daed09e88cdb",
    rid: "5d45ef49-d60d-4354-b634-8dcf7d28da07",
    encoding: "big5",
    ttl: DAY,
  }),
);

register(
  csvSource({
    // 191 筆，WGS84 座標；「路口」欄位用全形空白分隔兩條路
    id: "audible-signals",
    title: "臺北市交通管制工程處無障礙設施設置資料（有聲號誌設置地點）",
    datasetId: "baf32b58-b194-448d-96a0-ba04013d164f",
    rid: "1c18341c-9f6f-4b6b-b17f-8c66b94e39a0",
    encoding: "big5",
    ttl: DAY,
    geo: { lat: "WGS84緯度座標", lng: "WGS84經度座標" },
  }),
);

/* 長輩服務（M9 附近吃飯上課）：都沒有座標，用 district（行政區）篩選，例如 ?q=中山區。2026-11-07 實際下載確認 */

const elderPlaces: (Omit<Parameters<typeof csvSource>[0], "encoding" | "ttl" | "transform"> & { address: string })[] = [
  { id: "elder-meals", title: "臺北市銀髮族服務_臺北市老人共餐單位一覽表", datasetId: "fe55795c-a220-4b88-bde1-5b994321f8af", rid: "86d839db-85c7-48b0-991b-dc86922eb093", address: "據點地址" },
  { id: "elder-care-points", title: "臺北市銀髮族服務_社區照顧關懷據點", datasetId: "d082dc87-d3fd-479d-89c6-745ff1be955a", rid: "11930dc6-4092-4bde-a42c-7722e0416462", address: "地址" },
  { id: "elder-evergreen", title: "臺北市銀髮族服務長青學苑", datasetId: "67b63404-89b8-4214-8096-3322204144e6", rid: "4b03e7ea-8007-4b95-bc65-bc359abd29ea", address: "地址" },
  { id: "elder-service-centers", title: "臺北市銀髮族服務_臺北市老人服務中心", datasetId: "78dfc9a2-36e2-4ef5-beaa-a74633ba3d26", rid: "869a27cb-65d8-4479-bde0-5781220b2016", address: "地址" },
];
elderPlaces.forEach(({ address, ...p }) =>
  register(csvSource({ ...p, encoding: "utf-8", ttl: DAY, transform: (r) => normalizeElderRecord(r, { address }) })),
);

register({
  // 同一個資料集有兩個資源：樂齡學堂（56 所）、樂齡學習中心（12 處），合併後用 kind 區分
  id: "elder-lohas",
  title: "臺北市樂齡學習據點",
  datasetUrl: DATASET + "ca59e66b-7200-4283-8c32-08bde2f5f142",
  ttl: DAY,
  hasGeo: false,
  load: async () => {
    const [schools, centers] = await Promise.all([
      fetchText(DOWNLOAD + "2cd14e6d-ed84-40bc-8523-812be0e0bf6a").then(parseCsv),
      fetchText(DOWNLOAD + "462a64a2-f999-4322-8ac9-ae241380ffc1").then(parseCsv),
    ]);
    return { records: mergeLohas(schools, centers) };
  },
});

export function getSource(id: string): OpenDataSource | undefined {
  return Object.hasOwn(SOURCES, id) ? SOURCES[id] : undefined;
}
