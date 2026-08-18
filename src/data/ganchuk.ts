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
 * 대신 **방조제(실좌표) + 만 안쪽 가장자리**로 닫힌 도형을 만든다.
 * 방조제는 손대지 않고 안쪽 가장자리만 방조제 선에서 떨어진 거리를
 * 배율로 조절해, 도형의 넓이가 기록값과 정확히 같아지게 맞춘다
 * (shoelace로 재서 확인한다).
 *
 * 그러니 이 도형은 만의 모양을 따르고 넓이는 기록값이다. 정밀 측량은
 * 아니므로 경계의 잔굽이는 없다. 화면과 고정댓글에 그렇게 밝힌다.
 *
 * 4) 네 번째 판에서 경계를 선으로 두르고 바다색이 땅색으로 바뀌게 했다.
 *    "대충 칠해 놓은 느낌이라 얼마나 넓어진 건지 안 와닿는다"는 말을
 *    들었다. 면만 칠하면 얼룩이고, 테두리가 있어야 영역이 된다.
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
  /** 방조제 길이 — 기록값 */
  len: string;
  /** 방조제. 실좌표이고 여러 점을 지날 수 있다(새만금은 섬 넷). */
  dike: Array<[number, number]>;
  /** 막힌 물의 안쪽 가장자리. 만의 모양을 따른다. */
  shore: Array<[number, number]>;
  side?: "left" | "right";
  dy?: number;
}

/**
 * 그리는 다섯 곳.
 *
 * 방조제 양 끝은 기록된 지명이다.
 *  계화도    부안 동진면 문포 ~ 계화도
 *  서산 B    서산 부석면 창리 ~ 태안 남면 당암리 (부남호)
 *  서산 A    서산 부석면 간월도리 ~ 홍성 서부면 궁리 (간월호)
 *  시화      시흥 오이도 ~ 안산 대부도
 *  새만금    군산 비응도 ~ 야미도 ~ 신시도 ~ 가력도 ~ 부안 대항리
 *
 * 처음에 A지구와 B지구를 서로 바꿔 적고 위치도 북쪽 대산 앞바다로
 * 잘못 찍었다. 둘 다 천수만이다. A지구가 간월호(6,458m), B지구가
 * 부남호(1,228m)다.
 */
export const ZONES: Zone[] = [
  {
    id: "gyehwa", name: "계화도", year: 1968, km2: 39.68, len: "9,254m + 3,556m",
    dike: [[126.705, 35.775], [126.672, 35.782], [126.645, 35.792], [126.612, 35.802]],
    shore: [
      [126.612, 35.818], [126.624, 35.834], [126.646, 35.840],
      [126.668, 35.836], [126.686, 35.824], [126.698, 35.802],
    ],
    side: "right", dy: -86,
  },
  {
    id: "seosanB", name: "서산 B지구", year: 1982, km2: 57.82, len: "1,228m",
    dike: [[126.372, 36.612], [126.359, 36.607]],
    shore: [
      [126.348, 36.628], [126.344, 36.652], [126.352, 36.676], [126.368, 36.696],
      [126.392, 36.702], [126.414, 36.690], [126.428, 36.670], [126.424, 36.646],
      [126.408, 36.628],
    ],
    side: "right",
  },
  {
    id: "seosanA", name: "서산 A지구", year: 1984, km2: 96.26, len: "6,458m",
    dike: [[126.388, 36.572], [126.404, 36.558], [126.420, 36.543], [126.437, 36.528]],
    shore: [
      [126.472, 36.530], [126.500, 36.544], [126.516, 36.566], [126.512, 36.592],
      [126.496, 36.614], [126.470, 36.626], [126.440, 36.626], [126.412, 36.612],
      [126.394, 36.594],
    ],
    side: "right", dy: 20,
  },
  {
    id: "sihwa", name: "시화", year: 1994, km2: 123.02, len: "12.7km",
    dike: [[126.682, 37.342], [126.655, 37.312], [126.630, 37.282], [126.602, 37.249]],
    shore: [
      [126.620, 37.236], [126.646, 37.230], [126.678, 37.234], [126.704, 37.242],
      [126.726, 37.258], [126.746, 37.278], [126.758, 37.300], [126.752, 37.326],
      [126.734, 37.346], [126.710, 37.346],
    ],
    side: "right",
  },
  {
    id: "saemangeum", name: "새만금", year: 2010, km2: 409, len: "33.9km",
    dike: [
      [126.518, 35.952], [126.500, 35.905], [126.478, 35.855], [126.470, 35.828],
      [126.466, 35.802], [126.492, 35.772], [126.545, 35.745], [126.575, 35.728],
      [126.602, 35.716],
    ],
    shore: [
      [126.626, 35.726], [126.650, 35.742], [126.670, 35.762], [126.686, 35.784],
      [126.702, 35.810], [126.712, 35.838], [126.710, 35.864], [126.694, 35.890],
      [126.672, 35.912], [126.650, 35.930], [126.630, 35.946],
    ],
    side: "right", dy: 34,
  },
];

/**
 * 닫힌 테두리를 굴린다.
 *
 * 꼭짓점을 이어 놓기만 하면 해안이 각져서 사람이 그은 선처럼 보인다.
 * 방조제만 사람이 그은 선이고 나머지는 물가라 굽어야 한다. 첫 점과
 * 끝 점을 이어 감아 돌리는 Catmull-Rom이고, `front.ts`의 것과 달리
 * 끝이 열려 있지 않다.
 */
function smoothClosed(
  pts: Array<{ x: number; y: number }>,
  steps = 8
): Array<{ x: number; y: number }> {
  const n = pts.length;
  const out: Array<{ x: number; y: number }> = [];
  const at = (i: number) => pts[((i % n) + n) % n];
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
}

/** 다각형 넓이(km²) — shoelace */
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
  const D = z.dike.map(([lo, la]) => project(lo, la));
  const S = z.shore.map(([lo, la]) => project(lo, la));
  const a = D[0];
  const b = D[D.length - 1];
  const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / L;
  const ny = (b.x - a.x) / L;
  /*
   * 방조제는 실좌표라 손대지 않고, 물가 쪽 점만 방조제 선에서 떨어진
   * 거리를 k배 해서 넓이를 기록값에 맞춘다. 만의 모양은 그대로 두고
   * 깊이만 조절하는 셈이다. 굴린 뒤의 넓이로 맞춰야 화면에 보이는
   * 도형의 넓이가 기록값이 된다.
   */
  const shaped = (k: number) =>
    smoothClosed(
      D.concat(
        S.map((p) => {
          const t = (p.x - a.x) * nx + (p.y - a.y) * ny;
          return { x: p.x + nx * t * (k - 1), y: p.y + ny * t * (k - 1) };
        })
      )
    );
  let lo = 0.05;
  let hi = 6;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    if (areaKm2(shaped(m)) < z.km2) lo = m;
    else hi = m;
  }
  const poly = shaped((lo + hi) / 2);
  const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
  let dikeKm = 0;
  for (let i = 1; i < D.length; i++) {
    dikeKm += Math.hypot(D[i].x - D[i - 1].x, D[i].y - D[i - 1].y) * KM_PER_UNIT;
  }
  return { ...z, D, poly, x: cx, y: cy, drawnKm2: areaKm2(poly), dikeKm };
});

/** 막힌 물 전체의 테두리 */
export function polyPath(z: (typeof ZONE_XY)[number]): string {
  return (
    z.poly.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("") + "Z"
  );
}

/** 사람이 그은 쪽만 — 방조제 */
export function dikePath(z: (typeof ZONE_XY)[number], t = 1): string {
  const pts = z.D;
  const total = pts.length - 1;
  const upto = Math.max(0, Math.min(total, t * total));
  const n = Math.floor(upto);
  const f = upto - n;
  const head =
    n >= total
      ? pts[total]
      : {
          x: pts[n].x + (pts[n + 1].x - pts[n].x) * f,
          y: pts[n].y + (pts[n + 1].y - pts[n].y) * f,
        };
  const seg = pts.slice(0, n + 1).concat([head]);
  return seg.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");
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
  /** 언제, 어디 */
  kicker: string;
  /** 무엇이 얼마나 */
  title: string;
  /** 곁들일 사실 하나 */
  detail: string;
  impact?: number;
  zoom?: number;
  zone?: string;
  /** 1984년 — 물길에 가라앉힌 유조선 */
  tanker?: boolean;
}

/**
 * 자막은 담백하게.
 *
 * 처음에는 '계화도부터 막기 시작했다', '시화호를 막는 데 7년이 걸렸다'로
 * 썼다. 데이터를 문장인 척 부풀린 것이다. 서술어를 떼면 남는 것은
 * '계화도 39.7km²'뿐인데, 그게 이 편이 할 말의 전부다.
 *
 * 지명과 수량은 명사구로 그냥 놓는다. '~다'로 억지로 닫지 않는다.
 */
export const G_EVENTS: GEvent[] = [
  {
    year: 1968, zone: "gyehwa", kicker: "1968년 · 전북 부안",
    title: "계화도 39.7km²",
    detail: "최초의 대규모 간척 · 방조제 9,254m + 3,556m", impact: 0.9, zoom: 7.5,
  },
  {
    year: 1982, zone: "seosanB", kicker: "1982년 · 충남 서산",
    title: "서산 B지구 57.8km²",
    detail: "방조제 1,228m", impact: 0.7, zoom: 8.5,
  },
  {
    year: 1984, zone: "seosanA", kicker: "1984년 · 충남 서산",
    title: "서산 A지구 96.3km²",
    detail: "22만 6천 톤 폐유조선으로 물막이 · 방조제 6,458m", impact: 1, zoom: 7.0, tanker: true,
  },
  {
    year: 1994, zone: "sihwa", kicker: "1994년 · 경기 시흥·안산",
    title: "시화 123.0km²",
    detail: "1987년 착공, 1994년 1월 24일 물막이 · 방조제 12.7km", impact: 0.9, zoom: 7.0,
  },
  {
    year: 2010, zone: "saemangeum", kicker: "2010년 · 전북 군산·부안",
    title: "새만금 409km²",
    detail: "토지 291km² + 담수호 118km² · 방조제 33.9km", impact: 1, zoom: 4.2,
  },
  {
    year: 2010.6, kicker: "세계 최장",
    title: "새만금 방조제 33.9km",
    detail: "네덜란드 자위더르해 32.5km", impact: 1, zoom: 2.4,
  },
];

/** 유조선 — 크리어워터베이, 22만 6천 톤, 길이 322m. A지구 방조제 물막이 자리. */
export const TANKER = { lon: 126.412, lat: 36.550 };
