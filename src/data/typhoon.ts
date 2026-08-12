/**
 * 한국을 때린 태풍 — 사라·루사·매미·힌남노.
 *
 * 전쟁 두 편 뒤에 또 전쟁이면 채널이 '전쟁 지도'로 좁아진다. 성격이 다른
 * 소재를 골랐는데, 태풍은 마침 폴리라인 모델의 원래 용도에 가깝다.
 * 전선처럼 면을 추정할 필요 없이 경로 자체가 관측된 점열이기 때문이다.
 *
 * 서사 축: 넷 다 9월이다. 최악의 태풍은 늘 가을에 왔다.
 *
 * ── 정직하게 ────────────────────────────────────────
 * 경로는 각 태풍의 알려진 진로를 위경도로 옮긴 근사다. 상륙 지점과 상륙
 * 시 중심기압처럼 기록으로 남은 값은 그대로 쓰되, 점 사이는 보간이므로
 * 시간별 정확한 위치를 주장하지 않는다. 화면에 그렇게 밝힌다.
 */
import ea from "./eastasia.json";

export const EA_VIEWBOX: string = ea.viewBox;
export const EA_LANDS: Array<{ iso: string; d: string }> = ea.lands;
export const EA_KOREA: string[] = ea.korea;

/** 동아시아 창 전용 투영 — prep-eastasia.py와 같은 식 */
export function eaProject(lon: number, lat: number): { x: number; y: number } {
  return {
    x: (lon - ea.lon[0]) * ea.kx * ea.scale + ea.offx,
    y: ea.h - ((lat - ea.lat[0]) * ea.scale + ea.offy),
  };
}

export interface Typhoon {
  id: string;
  name: string;
  year: number;
  /** 화면에 띄울 기간 */
  period: string;
  /** 상륙 지점 이름 */
  landfall: string;
  /** 상륙 시 중심기압(hPa) */
  hpa: number;
  /** 대표 최대풍속 문구 */
  wind: string;
  /** 인명 피해 문구 */
  toll: string;
  color: string;
  /** 경로 — 남쪽에서 북쪽으로 */
  track: Array<[number, number]>;
  /** 상륙 지점 좌표 */
  landAt: [number, number];
}

export const TYPHOONS: Typhoon[] = [
  {
    id: "sarah",
    name: "사라",
    year: 1959,
    period: "1959. 9. 15 ~ 9. 17",
    landfall: "남해안",
    hpa: 951.5,
    wind: "부산 통과 시 951.5hPa",
    toll: "사망·실종 849명",
    color: "#F87171",
    track: [
      [131.0, 16.0], [129.5, 20.0], [127.5, 24.0], [126.5, 28.0],
      [127.2, 31.5], [128.3, 34.2], [129.1, 35.3], [130.5, 37.8], [133.0, 41.0],
    ],
    landAt: [128.3, 34.6],
  },
  {
    id: "rusa",
    name: "루사",
    year: 2002,
    period: "2002. 8. 30 ~ 9. 1",
    landfall: "전남 고흥",
    hpa: 962.6,
    wind: "최대순간풍속 56.7m/s",
    toll: "사망·실종 246명 · 재산피해 5조 원",
    color: "#FBBF24",
    track: [
      [139.0, 17.0], [135.0, 20.5], [131.0, 24.5], [128.5, 28.5],
      [127.6, 31.5], [127.2, 34.6], [128.3, 37.2], [129.8, 39.5], [131.5, 41.5],
    ],
    landAt: [127.2, 34.6],
  },
  {
    id: "maemi",
    name: "매미",
    year: 2003,
    period: "2003. 9. 11 ~ 9. 13",
    landfall: "경남 고성",
    hpa: 955,
    wind: "제주 고산 최대순간풍속 60m/s",
    toll: "사망·실종 132명 · 재산피해 4조 2천억 원",
    color: "#A78BFA",
    track: [
      [140.0, 15.5], [136.0, 19.0], [132.0, 23.5], [129.5, 27.5],
      [128.2, 31.0], [127.8, 33.4], [128.5, 34.95], [129.6, 36.8], [131.8, 39.5],
    ],
    landAt: [128.5, 34.95],
  },
  {
    id: "hinnamnor",
    name: "힌남노",
    year: 2022,
    period: "2022. 9. 4 ~ 9. 6",
    landfall: "부산 인근",
    hpa: 955,
    wind: "상륙 직전 중심기압 950hPa대",
    toll: "포항제철소 침수 — 49년 만의 용광로 정지",
    color: "#34D399",
    // 일본 남쪽에서 서진하다 북상한 특이 경로
    track: [
      [141.0, 22.5], [137.0, 22.0], [133.0, 22.5], [130.0, 24.0],
      [128.0, 26.5], [126.8, 29.0], [126.9, 31.5], [128.0, 33.5],
      [129.2, 35.1], [130.5, 37.5], [133.0, 40.0],
    ],
    landAt: [129.2, 35.1],
  },
];

/** 경로 위 진행도 0..1 → 좌표. 점 사이는 선형 보간. */
export function trackPointAt(t: Typhoon, p: number): { x: number; y: number } {
  const pts = t.track.map(([lo, la]) => eaProject(lo, la));
  const n = pts.length;
  const k = Math.max(0, Math.min(1, p)) * (n - 1);
  const i = Math.min(n - 2, Math.floor(k));
  const f = k - i;
  return {
    x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
    y: pts[i].y + (pts[i + 1].y - pts[i].y) * f,
  };
}

/** 진행도까지의 경로 path */
export function trackPathTo(t: Typhoon, p: number): string {
  const pts = t.track.map(([lo, la]) => eaProject(lo, la));
  const n = pts.length;
  const k = Math.max(0, Math.min(1, p)) * (n - 1);
  const upto = Math.floor(k);
  const head = trackPointAt(t, p);
  const use = pts.slice(0, upto + 1).concat([head]);
  if (use.length < 2) return "";
  return use.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join("");
}
