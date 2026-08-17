/**
 * 서해안 간척 — 1968~2010.
 *
 * 질문 하나: 바다를 막아 땅을 얼마나 만들었나.
 *
 * ── 세 번 고쳐 그렸다 ───────────────────────────────
 * 1) 방조제를 선으로 그렸다. 안 보였다. 이 축척에서 1px이 약 1.1km라
 *    아산만방조제 2,564m는 2px이다. 선 굵기보다 짧다.
 * 2) 넓이를 원으로 그렸다. 보이기는 하는데 원은 간척지가 아니다.
 *    "제대로 간척된 영역을 선을 긋고 영역에 색을 칠해서" 보여달라는
 *    말을 들었고 맞는 말이었다. 이 편은 넓이가 아니라 땅에 대한 편이다.
 * 3) 지금 것 — 방조제는 선으로 긋고 그 안쪽을 면으로 칠한다.
 *
 * ── 없는 데이터를 짓지 않으면서 면을 칠하는 법 ──────
 * 시대별 해안선 폴리곤이 없다. 그래서 옛 해안선을 그리지 않는다.
 * 대신 방조제 선에서 안쪽으로 **기록된 넓이만큼** 면을 채운다. 선은
 * 실좌표고 면은 그 선에서 뻗은 사각형이다. 폭은 방조제 길이와 √넓이 중
 * 큰 쪽, 깊이는 넓이 ÷ 폭이다. 만은 입구보다 안쪽이 넓어서, 길이로만
 * 나누면 서산 B지구처럼 1.2km 폭에 48km 깊이짜리 바늘이 나온다.
 *
 * 그러니 이 면은 간척지의 모양이 아니라 넓이의 그림이다. 넓이는 기록값과
 * 같고(shoelace로 재서 확인한다) 어느 바다를 막았는지도 실좌표다. 다만
 * 경계의 굽이는 없다. 화면과 고정댓글에 그렇게 밝힌다.
 */
import { project } from "./places";

/** 전국 간척지 누계와 견줄 것 */
export const TOTAL_KM2 = 1351;
export const SEOUL_KM2 = 605.21;
export const SEOUL_TIMES = TOTAL_KM2 / SEOUL_KM2;

/** 지도 1단위가 몇 km인가 — project()에서 경도 1도 = 80.2단위, 위도 36도에서 1도 ≈ 90km */
const KM_PER_UNIT = 90 / 80.2;

export interface Zone {
  id: string;
  name: string;
  year: number;
  /** 총 매립면적(km²) — 기록값 */
  km2: number;
  /** 방조제 길이 — 자막에 쓴다 */
  len: string;
  /** 방조제 양 끝 [경도, 위도] — 실좌표 */
  a: [number, number];
  b: [number, number];
  /**
   * 안쪽이 어느 쪽인가. 방조제 선의 법선 둘 중 땅이 생긴 쪽을 부호로 준다.
   */
  inward: 1 | -1;
  side: "left" | "right";
  dy?: number;
}

/**
 * 그리는 다섯 개. 면적이 기록으로 확인되는 것만 골랐다.
 *
 *  계화도   총 매립 39.68km² (농경지 27.04 + 저수지·수로 12.64)
 *  서산 B   57.82km² (담수호 15.62 포함)
 *  서산 A   96.26km² (담수호 27.33 포함)
 *  시화     1단계 2,452ha + 2단계 9,850ha = 123.02km²
 *  새만금   409km² (토지 291 + 담수호 118)
 *
 * 방조제 양 끝은 기록된 지명을 위경도로 옮긴 값이다.
 *  계화도    부안 동진면 ~ 계화도
 *  서산 B    서산 대산 ~ 태안 이원
 *  서산 A    서산 부석면 창리 ~ 태안 남면 당암리
 *  시화      시흥 오이도 ~ 안산 대부도
 *  새만금    군산 비응도 ~ 부안 대항리
 *
 * 직선 길이가 기록된 방조제 길이보다 짧은 곳이 있다. 실제 방조제는
 * 굽어 있고 새만금은 섬 넷을 지나기 때문이다(직선 28km, 실제 33.9km).
 * 자막에는 기록된 길이를 쓴다.
 */
export const ZONES: Zone[] = [
  {
    id: "gyehwa", name: "계화도", year: 1968, km2: 39.68, len: "9,254m + 3,556m",
    a: [126.705, 35.775], b: [126.612, 35.802], inward: -1, side: "right", dy: -62,
  },
  {
    id: "seosanB", name: "서산 B지구", year: 1982, km2: 57.82, len: "1,228m",
    a: [126.372, 36.902], b: [126.360, 36.898], inward: 1, side: "left",
  },
  {
    id: "seosanA", name: "서산 A지구", year: 1984, km2: 96.26, len: "6,476m",
    a: [126.442, 36.712], b: [126.369, 36.708], inward: 1, side: "left", dy: 30,
  },
  {
    id: "sihwa", name: "시화", year: 1994, km2: 123.02, len: "12.7km",
    a: [126.682, 37.342], b: [126.602, 37.249], inward: -1, side: "right",
  },
  {
    id: "saemangeum", name: "새만금", year: 2010, km2: 409, len: "33.9km",
    a: [126.518, 35.952], b: [126.602, 35.716], inward: -1, side: "left", dy: 54,
  },
];

function distKm(p: { x: number; y: number }, q: { x: number; y: number }): number {
  return Math.hypot(q.x - p.x, q.y - p.y) * KM_PER_UNIT;
}

/** 다각형 넓이(km²) — shoelace. 그린 면이 기록값과 맞는지 검산한다. */
function areaKm2(pts: Array<{ x: number; y: number }>): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    s += p.x * q.y - q.x * p.y;
  }
  return Math.abs(s / 2) * KM_PER_UNIT * KM_PER_UNIT;
}

export const ZONE_XY = ZONES.map((z) => {
  const A = project(z.a[0], z.a[1]);
  const B = project(z.b[0], z.b[1]);
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * z.inward;
  const ny = (dx / L) * z.inward;
  /*
   * 폭은 방조제 길이와 √넓이 중 큰 쪽으로 잡는다.
   *
   * 길이로만 나누면 입구가 좁은 곳이 터무니없어진다. 서산 B지구는
   * 방조제가 1.2km인데 넓이가 57.8km²라, 그대로 나누면 1.2km 폭에
   * 48km 깊이짜리 바늘이 나온다. 만은 입구보다 안쪽이 넓다.
   * 폭을 √넓이까지 벌리면 정사각에 가까워지고, 깊이는 넓이 ÷ 폭이라
   * 넓이는 그대로 기록값이다.
   */
  const dikeKmLen = L * KM_PER_UNIT;
  const wKm = Math.max(dikeKmLen, Math.sqrt(z.km2));
  const depthKm = z.km2 / wKm;
  const w = wKm / KM_PER_UNIT;
  const depth = depthKm / KM_PER_UNIT;
  const ux = dx / L;
  const uy = dy / L;
  const cx = (A.x + B.x) / 2;
  const cy = (A.y + B.y) / 2;
  const P0 = { x: cx - ux * (w / 2), y: cy - uy * (w / 2) };
  const P1 = { x: cx + ux * (w / 2), y: cy + uy * (w / 2) };
  const poly = [
    P0,
    P1,
    { x: P1.x + nx * depth, y: P1.y + ny * depth },
    { x: P0.x + nx * depth, y: P0.y + ny * depth },
  ];
  return {
    ...z,
    A,
    B,
    poly,
    x: cx + (nx * depth) / 2,
    y: cy + (ny * depth) / 2,
    drawnKm2: areaKm2(poly),
    dikeKm: distKm(A, B),
  };
});

export function polyPath(z: (typeof ZONE_XY)[number]): string {
  return (
    z.poly.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("") + "Z"
  );
}

/** 그 해까지의 누계 면적 */
export function areaUpTo(year: number): number {
  return ZONES.filter((z) => z.year <= year + 0.001).reduce((s, z) => s + z.km2, 0);
}

export const FIVE_KM2 = ZONES.reduce((s, z) => s + z.km2, 0);

export function yearLabel(y: number): string {
  return `${Math.floor(y)}년`;
}

export interface GEvent {
  year: number;
  title: string;
  detail: string;
  impact?: number;
  zoom?: number;
  zone?: string;
  /** 1984년 — 물길에 가라앉힌 유조선 */
  tanker?: boolean;
}

export const G_EVENTS: GEvent[] = [
  {
    year: 1968, zone: "gyehwa", title: "계화도부터 막기 시작했다",
    detail: "섬이던 계화도가 육지에 붙었다", impact: 0.9, zoom: 3.2,
  },
  {
    year: 1982, zone: "seosanB", title: "서산에서 58km²를 얻었다",
    detail: "1,228m를 막고 바다를 걷어냈다", impact: 0.7, zoom: 3.0,
  },
  {
    year: 1984, zone: "seosanA", title: "여기서 유조선을 가라앉혔다",
    detail: "물살이 10톤 바위를 쓸어가자 배로 막았다", impact: 1, zoom: 3.2, tanker: true,
  },
  {
    year: 1994, zone: "sihwa", title: "시화호를 막는 데 7년이 걸렸다",
    detail: "1994년 1월 24일 물길이 끊겼다", impact: 0.9, zoom: 2.8,
  },
  {
    year: 2010, zone: "saemangeum", title: "새만금 하나가 409km²다",
    detail: "앞의 넷을 합친 것보다 넓고 계화도를 품었다", impact: 1, zoom: 2.2,
  },
  {
    year: 2010.6, title: "방조제는 33.9km, 세계에서 제일 길다",
    detail: "네덜란드 자위더르해의 32.5km를 넘어섰다", impact: 1, zoom: 1.9,
  },
];

/** 유조선 — 크리어워터베이, 22만 6천 톤, 길이 322m */
export const TANKER = { lon: 126.30, lat: 36.70 };
