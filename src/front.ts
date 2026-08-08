/**
 * 전선(前線)을 곡선으로.
 *
 * 행정 경계에 색을 맞추면 도 하나가 통째로 켜졌다 꺼졌다 한다. 실제 전쟁은
 * 그렇게 굴러가지 않는다 — 전선은 지형과 전황을 따라 구불구불하게, 조금씩
 * 밀리고 밀어낸다. 그래서 도 폴리곤을 칠하는 대신, 가로로 놓인 곡선 하나를
 * 위아래로 움직이고 그 아래를 점령권으로 칠한다.
 *
 * ── 전라도 문제 ──────────────────────────────────────
 * "곡선 아래가 점령"이라는 단순 모델은 1592년 전라도를 점령으로 만든다.
 * 전라도는 남서쪽인데 그 위의 충청·경기는 실제로 점령됐기 때문에, 곡선을
 * 어디에 두든 전라도가 같이 딸려 들어간다.
 * 그래서 점령권에서 전라도 영역을 별도의 닫힌 곡선으로 빼낸다. 이 구멍은
 * 1597년 남원 함락과 함께 닫힌다.
 *
 * 좌표계는 provinces.json과 동일(0..1000).
 */

/** 전선 제어점의 x 위치 — 서해안에서 동해안까지 */
const XS = [140, 280, 400, 510, 620, 730, 860];

/** [개월, 각 x에서의 전선 y] — y가 작을수록 북쪽 */
const KEYS: Array<[number, number[]]> = [
  [0,  [1010, 1010, 1010, 1000, 800, 830, 1010]], // 1592.4 부산 상륙
  [1,  [980, 900, 640, 560, 570, 620, 900]],      // 5월 한양 함락
  [2,  [700, 400, 390, 430, 480, 520, 800]],      // 6월 평양 함락 (의주는 북쪽에 남음)
  [3,  [420, 370, 340, 300, 80, 20, 350]],        // 7월 가토, 함경도 회령까지
  [7,  [430, 380, 350, 310, 95, 35, 365]],        // 12월 교착
  [9,  [480, 470, 450, 430, 300, 200, 500]],      // 1593.1 평양성 탈환
  [10, [590, 580, 560, 540, 450, 380, 620]],      // 2월 행주 이후
  [12, [830, 840, 810, 790, 770, 750, 830]],      // 4월 한양 수복
  [60, [845, 855, 825, 800, 780, 760, 840]],      // 1594~96 소강
  [64, [720, 700, 670, 650, 710, 740, 830]],      // 1597.8 남원 함락
  [65, [670, 655, 625, 605, 665, 705, 810]],      // 9월 직산
  [66, [810, 820, 790, 770, 770, 745, 825]],      // 명량 이후 남하
  [78, [850, 860, 830, 805, 785, 765, 845]],      // 1598.10
  [79, [1030, 1030, 1030, 1030, 1030, 1030, 1030]], // 11월 철수
];

/** 개월 → 전선 y 배열 */
function frontYs(month: number): number[] {
  if (month <= KEYS[0][0]) return KEYS[0][1];
  for (let i = 1; i < KEYS.length; i++) {
    const [m1, v1] = KEYS[i];
    if (month <= m1) {
      const [m0, v0] = KEYS[i - 1];
      const t = (month - m0) / (m1 - m0);
      // 부드럽게 — 전황이 계단식으로 튀지 않도록
      const k = t * t * (3 - 2 * t);
      return v0.map((v, j) => v + (v1[j] - v) * k);
    }
  }
  return KEYS[KEYS.length - 1][1];
}

/** Catmull-Rom을 통과하는 부드러운 곡선 좌표열 */
export function smooth(pts: Array<[number, number]>, steps = 14): Array<[number, number]> {
  const ext = [pts[0], ...pts, pts[pts.length - 1]];
  const out: Array<[number, number]> = [];
  for (let i = 1; i < ext.length - 2; i++) {
    const [x0, y0] = ext[i - 1];
    const [x1, y1] = ext[i];
    const [x2, y2] = ext[i + 1];
    const [x3, y3] = ext[i + 2];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(x0, x1, x2, x3), f(y0, y1, y2, y3)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** 점령권 = 전선 아래. 화면 밖까지 닫아 채운다. */
export function frontPath(month: number): string {
  const ys = frontYs(month);
  const pts: Array<[number, number]> = XS.map((x, i) => [x, ys[i]]);
  // 양끝을 화면 밖으로 연장해 해안까지 확실히 덮는다
  pts.unshift([-80, ys[0]]);
  pts.push([1080, ys[ys.length - 1]]);

  const c = smooth(pts);
  const d = c.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  return `${d}L1080 1120L-80 1120Z`;
}

/** 전선 자체(선만) */
export function frontLine(month: number): string {
  const ys = frontYs(month);
  const pts: Array<[number, number]> = XS.map((x, i) => [x, ys[i]]);
  pts.unshift([-80, ys[0]]);
  pts.push([1080, ys[ys.length - 1]]);
  return smooth(pts)
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join("");
}

/**
 * 전라도 미점령 구멍.
 * 중심과 반경으로 만든 닫힌 곡선이라 크기가 부드럽게 줄어든다.
 * 1597년 남원 함락(m=64) 무렵 닫힌다.
 */
const HOLE_CX = 424;
const HOLE_CY = 858;
const HOLE_R = [104, 112, 122, 116, 100, 88, 94, 100]; // 각도별 반경 — 원이 아니라 덩어리

export function holeScale(month: number): number {
  if (month < 62) return 1;
  if (month >= 64.6) return 0;
  const t = (month - 62) / 2.6;
  return 1 - t * t * (3 - 2 * t);
}

export function holePath(month: number): string {
  const s = holeScale(month);
  if (s <= 0.01) return "";
  const n = HOLE_R.length;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = HOLE_R[i] * s;
    pts.push([HOLE_CX + Math.cos(a) * r * 1.15, HOLE_CY + Math.sin(a) * r * 0.85]);
  }
  // 닫힌 곡선이므로 앞뒤를 이어 붙여 순환시킨다
  const loop = [pts[n - 1], ...pts, pts[0], pts[1]];
  const c = smooth(loop);
  return c.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + "Z";
}

/* ── 재사용 가능한 전선 생성기 ───────────────────────────
 * 임진왜란은 남쪽에서 올라오므로 "곡선 아래"가 점령이지만,
 * 6·25는 북쪽에서 내려오므로 "곡선 위"가 점령이다.
 * 방향을 인자로 받아 두 경우를 같은 코드로 처리한다.
 */

export interface FrontModel {
  /** t 시점의 점령 영역 path */
  areaAt(t: number): string;
  /** t 시점의 전선 자체 */
  lineAt(t: number): string;
}

export function makeFront(
  xs: number[],
  keys: Array<[number, number[]]>,
  /** 점령 방향 — "south"면 곡선 아래, "north"면 곡선 위 */
  dir: "south" | "north" = "south"
): FrontModel {
  const ysAt = (t: number): number[] => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1];
        const p = (t - t0) / (t1 - t0);
        const k = p * p * (3 - 2 * p);
        return v0.map((v, j) => v + (v1[j] - v) * k);
      }
    }
    return keys[keys.length - 1][1];
  };

  const curve = (t: number): Array<[number, number]> => {
    const ys = ysAt(t);
    const pts: Array<[number, number]> = xs.map((x, i) => [x, ys[i]]);
    pts.unshift([-80, ys[0]]);
    pts.push([1080, ys[ys.length - 1]]);
    return smooth(pts);
  };

  const toD = (c: Array<[number, number]>) =>
    c.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

  return {
    areaAt(t) {
      const d = toD(curve(t));
      // 화면 밖까지 닫아 채운다. 방향에 따라 위/아래로 닫는다.
      return dir === "south"
        ? `${d}L1080 1120L-80 1120Z`
        : `${d}L1080 -120L-80 -120Z`;
    },
    lineAt(t) {
      return toD(curve(t));
    },
  };
}
