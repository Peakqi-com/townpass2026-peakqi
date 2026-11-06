/**
 * 座標工具
 * - 部分臺北市資料（今日施工、停車場、公園設施）使用 TWD97 二度分帶座標（TM2，中央經線 121°），
 *   要轉成 WGS84 經緯度才能畫在 Leaflet / MapLibre 上。
 * - TWD97 使用 GRS80 橢球，與 WGS84 差距在公分等級，可直接視為 WGS84。
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const A = 6378137; // GRS80 長半軸
const F = 1 / 298.257222101; // GRS80 扁率
const E2 = F * (2 - F); // 第一偏心率平方
const K0 = 0.9999; // 尺度比
const LNG0 = (121 * Math.PI) / 180; // 中央經線
const FALSE_EASTING = 250000;

/** TWD97 TM2（121 分帶）轉 WGS84 經緯度 */
export function twd97ToWgs84(x: number, y: number): LatLng {
  const ep2 = E2 / (1 - E2);
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));

  const m = y / K0;
  const mu = m / (A * (1 - E2 / 4 - (3 * E2 ** 2) / 64 - (5 * E2 ** 3) / 256));
  const fp =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinFp = Math.sin(fp);
  const cosFp = Math.cos(fp);
  const c1 = ep2 * cosFp ** 2;
  const t1 = Math.tan(fp) ** 2;
  const r1 = (A * (1 - E2)) / (1 - E2 * sinFp ** 2) ** 1.5;
  const n1 = A / Math.sqrt(1 - E2 * sinFp ** 2);
  const d = (x - FALSE_EASTING) / (n1 * K0);

  const lat =
    fp -
    ((n1 * Math.tan(fp)) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ep2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 3 * c1 ** 2 - 252 * ep2) * d ** 6) / 720);
  const lng =
    LNG0 +
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ep2 + 24 * t1 ** 2) * d ** 5) / 120) /
      cosFp;

  return { lat: (lat * 180) / Math.PI, lng: (lng * 180) / Math.PI };
}

/** 兩點距離（公尺，haversine） */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371008.8;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 是否落在大臺北範圍內（用來排除 0、對調或明顯錯誤的座標） */
export function isInTaipeiArea(p: Partial<LatLng>): p is LatLng {
  return (
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    p.lat > 24.6 &&
    p.lat < 25.4 &&
    p.lng > 121.2 &&
    p.lng < 122.1
  );
}
