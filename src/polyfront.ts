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

/** 재표본화 점 개수. 전선의 굴곡을 담기에 충분하고 렌더도 가볍다. */
const N = 96;

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

  return {
    lineAt(t) {
      return d(smoothPts(at(t)));
    },
    areaAt(t) {
      const pts = smoothPts(at(t));
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
