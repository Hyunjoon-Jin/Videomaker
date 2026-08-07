/**
 * 진격로를 곡선으로 만들고, 곡선 위 모든 점에 "경과일"을 매긴다.
 *
 * 직선 폴리라인은 꺾이는 지점이 각져서 행군처럼 안 보인다.
 * Catmull-Rom 스플라인은 주어진 경유지를 반드시 지나면서(=사료의 경로를
 * 훼손하지 않으면서) 사이를 부드럽게 잇는다. 베지에와 달리 제어점을
 * 따로 찍을 필요가 없어 경유지 목록만으로 곡선이 나온다.
 *
 * 샘플마다 day를 들고 다니므로, "day 시점의 군 위치"를 곡선 위에서
 * 정확히 찾을 수 있다 — 날짜 단위 마커와 선두 위치가 같은 소스를 쓴다.
 */
import { REGIONS } from "./data/regions";
import { Division } from "./data/imjin";

const CENTER = new Map(REGIONS.map((r) => [r.code, { x: r.cx, y: r.cy }]));

export interface Sample {
  x: number;
  y: number;
  day: number;
}

/** 경유지 하나당 샘플 수. 곡선 해상도. */
const STEPS = 36;

function catmull(
  p0: number, p1: number, p2: number, p3: number, t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * 경유지 → 곡선 샘플열. 양끝은 端점을 복제해 곡선이 밖으로 튀지 않게 한다.
 * 계산이 무겁지 않지만 day와 무관하므로 사단별로 한 번만 만든다.
 */
export function sampleRoute(div: Division): Sample[] {
  const pts = div.path
    .map((w) => {
      const c = CENTER.get(w.code);
      return c ? { x: c.x, y: c.y, day: w.day } : null;
    })
    .filter((p): p is { x: number; y: number; day: number } => p !== null);

  if (pts.length < 2) return pts.map((p) => ({ ...p }));

  // 양끝 복제 — Catmull-Rom은 이웃 2개가 필요하다
  const ext = [pts[0], ...pts, pts[pts.length - 1]];
  const out: Sample[] = [];

  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1];
    const p1 = ext[i];
    const p2 = ext[i + 1];
    const p3 = ext[i + 2];

    for (let s = 0; s < STEPS; s++) {
      const t = s / STEPS;
      out.push({
        x: catmull(p0.x, p1.x, p2.x, p3.x, t),
        y: catmull(p0.y, p1.y, p2.y, p3.y, t),
        // day는 경유지 사이를 선형으로 — 곡선 길이가 아니라 사료의 날짜를 따른다
        day: p1.day + (p2.day - p1.day) * t,
      });
    }
  }
  out.push({ ...pts[pts.length - 1] });
  return out;
}

/** 사단별 샘플 캐시 — 프레임마다 다시 만들 이유가 없다. */
const CACHE = new Map<string, Sample[]>();

export function routeOf(div: Division): Sample[] {
  let s = CACHE.get(div.id);
  if (!s) {
    s = sampleRoute(div);
    CACHE.set(div.id, s);
  }
  return s;
}

/** day 시점의 곡선 위 위치. 범위를 벗어나면 양끝으로 클램프. */
export function positionAt(div: Division, day: number): Sample | null {
  const s = routeOf(div);
  if (s.length === 0) return null;
  if (day <= s[0].day) return s[0];
  if (day >= s[s.length - 1].day) return s[s.length - 1];

  for (let i = 1; i < s.length; i++) {
    if (s[i].day >= day) {
      const a = s[i - 1];
      const b = s[i];
      const span = b.day - a.day;
      const t = span <= 0 ? 0 : (day - a.day) / span;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, day };
    }
  }
  return s[s.length - 1];
}

/** day까지 그린 곡선의 SVG path. 선두는 정확한 위치로 마감한다. */
export function pathUpTo(div: Division, day: number): string {
  const s = routeOf(div);
  const pts = s.filter((p) => p.day <= day);
  const head = positionAt(div, day);
  if (head && (pts.length === 0 || pts[pts.length - 1].day < day)) pts.push(head);
  if (pts.length < 2) return "";
  return "M" + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L");
}
