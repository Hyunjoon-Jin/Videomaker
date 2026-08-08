/**
 * 전선을 폴리라인으로.
 *
 * ── 왜 y = f(x)를 버렸나 ────────────────────────────────
 * 제어점 7개짜리 "각 x에서의 전선 높이" 모델은 구조적 한계가 있었다.
 * 하나의 x에 하나의 y만 줄 수 있으므로
 *   · 세로로 선 구간(낙동강 방어선의 서쪽 변)
 *   · 되접히는 돌출부(철의 삼각지대)
 * 를 아예 표현할 수 없다. 제어점을 늘려도 못 한다.
 *
 * 그래서 전선을 '한쪽 끝에서 반대쪽 끝까지 이어지는 점열'로 바꾼다.
 * 실제 전선이 지나간 지점을 위경도로 찍으면 그대로 궤적이 된다.
 *
 * ── 시점 사이 보간 ──────────────────────────────────────
 * 키프레임마다 점 개수가 다르므로 그냥 짝지어 섞을 수 없다.
 * 각 폴리라인을 호길이 기준으로 같은 개수(N)로 재표본화한 뒤 대응시킨다.
 * 그래야 전선이 형태를 유지하며 흘러간다.
 *
 * 폴리라인은 바다 위를 지나도 된다. 육지 클립이 가려주므로,
 * 시작점을 화면 아래 바다에 두면 닫힘 처리가 깔끔해진다.
 */
import { project } from "./data/places";

/**
 * 재표본화 점 개수. 잔굴곡을 100회 가까이 담으려면 굴곡당 4점 이상이
 * 필요해 넉넉히 잡는다.
 */
const N = 440;

/**
 * ── 잔굴곡에 대하여 ────────────────────────────────────
 * 실제 전선은 매끈한 곡선이 아니라 지형을 따라 잘게 꺾인다. 매끈하게
 * 그리면 '누가 그린 선'처럼 보이고 전선으로 읽히지 않는다.
 *
 * 다만 이 잔굴곡은 사료에서 나온 것이 아니라 생성한 것이다. 경유지
 * (마산·왜관·철원 등)는 문헌 기반이지만 그 사이의 톱니는 지형을 흉내낸
 * 장식이며, 개별 돌출부가 실제 돌출부에 대응하지 않는다. 화면에도 그렇게
 * 밝힌다.
 *
 * 입력은 '선 위의 위치'다. 프레임마다 난수를 뽑으면 선이 떨리므로
 * 결정적 함수여야 하고, 위치 기반이어야 전선이 이동해도 굴곡이 유지된다.
 */
const BEND_FREQ = 26;   // 기본 굴곡 수. 옥타브가 겹쳐 실제로는 100회 안팎
const BEND_AMP = 9.5;   // 진폭(0..1000 좌표계). 반도 높이의 1% 정도

function hash1(i: number): number {
  const h = Math.sin(i * 127.1) * 43758.5453;
  return h - Math.floor(h);
}

/** 1차원 값 노이즈 — 정수 격자 사이를 부드럽게 잇는다 */
function vnoise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) * (1 - u) + hash1(i + 1) * u;
}

/** 옥타브를 겹쳐 큰 굴곡 위에 잔굴곡을 얹는다 */
function fbm(x: number, octaves = 4): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * (vnoise(x * freq) * 2 - 1);
    freq *= 2.07; // 정수배를 피해야 옥타브가 겹쳐 보이지 않는다
    amp *= 0.5;
  }
  return sum;
}

/**
 * 폴리라인을 진행 방향의 법선으로 밀어 잔굴곡을 만든다.
 * 양 끝은 진폭을 0으로 좁혀 해안에 붙은 채로 둔다.
 */
function roughen(pts: Pt[]): Pt[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const s = i / (n - 1);
    // 끝에서 0, 가운데에서 1 — 해안 접점이 흔들리지 않게
    const taper = Math.sin(Math.PI * s) ** 0.6;
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // 법선 = 진행 방향을 90도 돌린 것
    const nx = -dy / len;
    const ny = dx / len;
    const off = fbm(s * BEND_FREQ) * BEND_AMP * taper;
    return { x: p.x + nx * off, y: p.y + ny * off };
  });
}

export type LonLat = [number, number];
export interface Pt {
  x: number;
  y: number;
}

/** 위경도 점열 → 화면 좌표 점열 */
function toXY(pts: LonLat[]): Pt[] {
  return pts.map(([lon, lat]) => project(lon, lat));
}

/** 호길이 기준 균등 재표본화 — 서로 다른 모양의 전선을 대응시키기 위해 */
function resample(pts: Pt[], n: number): Pt[] {
  if (pts.length < 2) return Array.from({ length: n }, () => pts[0] ?? { x: 0, y: 0 });

  const seg: number[] = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(total);
  }
  if (total === 0) return Array.from({ length: n }, () => pts[0]);

  const out: Pt[] = [];
  let j = 1;
  for (let i = 0; i < n; i++) {
    const d = (i / (n - 1)) * total;
    while (j < seg.length - 1 && seg[j] < d) j++;
    const t = (d - seg[j - 1]) / Math.max(1e-9, seg[j] - seg[j - 1]);
    out.push({
      x: pts[j - 1].x + (pts[j].x - pts[j - 1].x) * t,
      y: pts[j - 1].y + (pts[j].y - pts[j - 1].y) * t,
    });
  }
  return out;
}

/** Catmull-Rom으로 모서리를 눅인다. 전선은 각지지 않는다. */
function smoothPts(pts: Pt[], steps = 4): Pt[] {
  const e = [pts[0], ...pts, pts[pts.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < e.length - 2; i++) {
    const [p0, p1, p2, p3] = [e[i - 1], e[i], e[i + 1], e[i + 2]];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export interface PolyFront {
  lineAt(t: number): string;
  areaAt(t: number): string;
}

/**
 * 키프레임 폴리라인들로 전선 모델을 만든다.
 * @param keys [시각, 위경도 점열] — 점열은 한쪽 끝에서 반대쪽 끝까지 한 방향
 * @param dir  점령 방향. "north"면 폴리라인 위쪽이 점령
 */
export function makePolyFront(
  keys: Array<[number, LonLat[]]>,
  dir: "north" | "south" = "north"
): PolyFront {
  // 키프레임을 미리 재표본화해 둔다. 프레임마다 다시 할 이유가 없다.
  const frames = keys.map(([t, pts]) => [t, resample(toXY(pts), N)] as [number, Pt[]]);

  const at = (t: number): Pt[] => {
    if (t <= frames[0][0]) return frames[0][1];
    for (let i = 1; i < frames.length; i++) {
      const [t1, b] = frames[i];
      if (t <= t1) {
        const [t0, a] = frames[i - 1];
        const p = (t - t0) / (t1 - t0);
        const k = p * p * (3 - 2 * p);
        return a.map((v, j) => ({
          x: v.x + (b[j].x - v.x) * k,
          y: v.y + (b[j].y - v.y) * k,
        }));
      }
    }
    return frames[frames.length - 1][1];
  };

  const d = (pts: Pt[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("");

  // 잔굴곡은 보간 '후'에 얹는다. 키프레임마다 따로 얹으면 시점 사이에서
  // 굴곡이 서로 섞여 뭉개진다.
  const shaped = (t: number) => smoothPts(roughen(at(t)), 2);

  return {
    lineAt(t) {
      return d(shaped(t));
    },
    areaAt(t) {
      const pts = shaped(t);
      const first = pts[0];
      const last = pts[pts.length - 1];
      // 양 끝을 화면 밖으로 빼고 위(또는 아래)로 닫는다.
      const edge = dir === "north" ? -120 : 1120;
      return (
        `M${-80} ${first.y.toFixed(1)}` +
        d(pts).slice(1) +
        `L1080 ${last.y.toFixed(1)}L1080 ${edge}L${-80} ${edge}Z`
      );
    },
  };
}


/* ── 포켓(교두보·포위) ──────────────────────────────────
 * 전선을 선 하나로 그리면 '적진 속 아군 지역'을 표현할 수 없다.
 * 흥남 철수 때 흥남은 중공군에 둘러싸인 채 유엔군이 지키던 교두보였고,
 * 인천상륙 직후의 인천·서울도 낙동강 방어선과 떨어진 별개 지역이었다.
 * 선만으로는 둘 다 적 영역으로 칠해진다.
 *
 * 그래서 닫힌 영역을 따로 두고 점령색에서 도로 빼낸다.
 * 시점마다 모양이 바뀌므로 전선과 같은 재표본화 방식으로 보간한다.
 */

export interface PocketModel {
  /** t 시점의 닫힌 영역 path. 없으면 빈 문자열 */
  pathAt(t: number): string;
  /** t 시점의 표시 강도 0..1 — 생기고 사라지는 구간을 부드럽게 */
  alphaAt(t: number): number;
}

export function makePocket(
  keys: Array<[number, LonLat[]]>,
  /** 등장·소멸 시각. 이 밖에서는 그리지 않는다 */
  from: number,
  to: number,
  /** 생성·소멸에 쓰는 시간 폭 */
  fade = 4
): PocketModel {
  const M = 72;
  const frames = keys.map(([t, pts]) => [t, resample(toXY(pts), M)] as [number, Pt[]]);

  const at = (t: number): Pt[] => {
    if (t <= frames[0][0]) return frames[0][1];
    for (let i = 1; i < frames.length; i++) {
      const [t1, b] = frames[i];
      if (t <= t1) {
        const [t0, a] = frames[i - 1];
        const p = (t - t0) / (t1 - t0);
        const k = p * p * (3 - 2 * p);
        return a.map((v, j) => ({
          x: v.x + (b[j].x - v.x) * k,
          y: v.y + (b[j].y - v.y) * k,
        }));
      }
    }
    return frames[frames.length - 1][1];
  };

  return {
    alphaAt(t) {
      if (t <= from || t >= to) return 0;
      return Math.min(1, Math.min(t - from, to - t) / fade);
    },
    pathAt(t) {
      if (t <= from || t >= to) return "";
      const pts = smoothPts(at(t), 3);
      return (
        pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("") +
        "Z"
      );
    },
  };
}
