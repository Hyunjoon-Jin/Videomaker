/**
 * 지명 좌표 — 실제 위경도에서 계산.
 *
 * 이전 판은 해전 위치를 눈대중으로 찍었다. 역사 지도에서 좌표를 눈대중하면
 * 그 지도가 주장하는 모든 것의 신뢰가 같이 떨어진다.
 *
 * 투영식은 prep-provinces.py와 동일하다(같은 bbox·같은 스케일):
 *   cx = (경도 - 124.21) × 80.20 + 230.9
 *   cy = 1000 - (위도 - 33.20) × 101.94
 * 검산: 서울(126.98,37.57) → (453,554). provinces.json의 경기도 서울권과 일치.
 */

const LON0 = 124.21;
const LAT0 = 33.20;
const KX = 80.20;
const KY = 101.94;
const OFFX = 230.9;

export function project(lon: number, lat: number): { x: number; y: number } {
  return {
    x: Math.round(((lon - LON0) * KX + OFFX) * 10) / 10,
    y: Math.round((1000 - (lat - LAT0) * KY) * 10) / 10,
  };
}

export interface Place {
  name: string;
  x: number;
  y: number;
  /** 라벨을 점의 어느 쪽에 둘지 */
  side?: "left" | "right";
  /** 라벨 세로 오프셋. 좌표가 가까운 지점끼리 겹칠 때 쓴다 */
  dy?: number;
}

const P = (
  name: string, lon: number, lat: number,
  side?: "left" | "right", dy?: number
): Place => ({ name, ...project(lon, lat), side, dy });

/** 육상 거점 — 등장 시점(개월 인덱스)과 함께 쓴다 */
export const CITIES: Array<Place & { from: number }> = [
  { ...P("부산", 129.08, 35.18), from: 0 },
  { ...P("한양", 126.98, 37.57, "left"), from: 1 },
  { ...P("평양", 125.75, 39.02, "left"), from: 2 },
  { ...P("의주", 124.50, 40.10, "right"), from: 2 },
  { ...P("회령", 129.75, 42.44, "left"), from: 3 },
  { ...P("진주", 128.08, 35.18), from: 6 },
  { ...P("남원", 127.39, 35.42, "left"), from: 64 },
];

/** 해전 — 실제 해역 위경도 */
export const SEA_BATTLES: Record<string, Place> = {
  옥포: P("옥포", 128.70, 34.87, "right", -14),
  한산도: P("한산도", 128.48, 34.79, "right", 26),
  명량: P("명량", 126.30, 34.57, "left"),
  노량: P("노량", 127.88, 34.94, "left", 4),
};
