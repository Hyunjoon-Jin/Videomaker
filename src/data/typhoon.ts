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

/**
 * 울릉도·독도.
 *
 * 이 축척(위도 1°≈44px)에서 울릉도는 약 4px, 독도는 1px 미만이라
 * 최소 면적 필터에 걸려 지도에서 빠졌다. 실제 크기를 부풀려 그리면
 * 왜곡이므로 점 마커로 표시하고 라벨을 붙인다.
 */
export const ISLETS: Array<{
  name: string; lon: number; lat: number; dx: number; dy: number;
}> = [
  // 두 섬이 가까워 라벨이 겹친다. 위아래로 벌린다.
  { name: "울릉도", lon: 130.90, lat: 37.50, dx: 10, dy: -6 },
  { name: "독도", lon: 131.87, lat: 37.24, dx: 10, dy: 16 },
];

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
  /** 상륙 날짜 — 마무리에서 넷을 나란히 세울 때 쓴다 */
  landDate: string;
  /** 상륙 시 중심기압(hPa) */
  hpa: number;
  /** 대표 최대풍속 문구 */
  wind: string;
  /** 인명 피해 문구 */
  toll: string;
  /**
   * 일 최대 강수량(mm)과 관측 지점.
   * 기압만 보여주면 루사가 넷 중 가장 약해 보이는데, 루사가 피해 1위인
   * 이유는 바람이 아니라 비였다. 강수를 별도 지표로 세워야 그게 읽힌다.
   * null이면 기록이 제한적이라는 뜻이다.
   */
  rain: number | null;
  rainAt: string;
  color: string;
  /**
   * 경로 — [경도, 위도, 중심기압(hPa)].
   * 기압이 세력이다. 낮을수록 강하고, 이 값이 폭풍 반경·나선·색을 구동한다.
   * 발달 → 정점 → 상륙 → 약화의 곡선이 곧 태풍의 일생이다.
   */
  track: Array<[number, number, number]>;
  /** 상륙 지점 좌표 */
  landAt: [number, number];
  /** 최저기압 라벨 오프셋 — 넷이 비슷한 해역에서 정점을 찍어 겹친다 */
  peakDx?: number;
  peakDy?: number;
  peakAnchor?: "start" | "end";
}

export const TYPHOONS: Typhoon[] = [
  {
    id: "sarah",
    rain: null,
    rainAt: "1959년 관측망으로는 확인이 어렵다",
    name: "사라",
    year: 1959,
    period: "1959. 9. 15 ~ 9. 17",
    landfall: "남해안",
    landDate: "1959. 9. 17",
    hpa: 951.5,
    wind: "제주 최대순간풍속 46.9m/s",
    toll: "사망·실종 849명",
    color: "#C6553F",
    // 사라는 태평양에서 905hPa까지 발달한 뒤 북상하며 약해졌다
    track: [
      [131.0, 16.0, 985],
      [129.5, 20.0, 950],
      [127.5, 24.0, 920],
      [126.5, 28.0, 905],
      [127.2, 31.5, 930],
      [128.3, 34.2, 951.5],
      [129.1, 35.3, 962],
      [130.5, 37.8, 976],
      [133.0, 41.0, 990],
    ],
    landAt: [128.3, 34.6],
    peakDx: -14, peakDy: -10, peakAnchor: "end",
  },
  {
    id: "rusa",
    rain: 870.5,
    rainAt: "강릉, 일강수량 역대 1위",
    name: "루사",
    year: 2002,
    period: "2002. 8. 30 ~ 9. 1",
    landfall: "전남 고흥",
    landDate: "2002. 8. 31",
    hpa: 960,
    wind: "제주 고산 최대순간풍속 56.7m/s",
    toll: "사망·실종 246명, 재산피해 5조 원",
    color: "#C09240",
    // 루사는 정점이 낮지 않았는데도 피해가 가장 컸다. 비 때문이다.
    track: [
      [139.0, 17.0, 990],
      [135.0, 20.5, 965],
      [131.0, 24.5, 950],
      [128.5, 28.5, 955],
      [127.6, 31.5, 960],
      [127.2, 34.6, 960],
      [128.3, 37.2, 975],
      [129.8, 39.5, 985],
      [131.5, 41.5, 992],
    ],
    landAt: [127.2, 34.6],
    peakDx: 16, peakDy: 28, peakAnchor: "start",
  },
  {
    id: "maemi",
    rain: 400,
    rainAt: "강원 영동과 경남, 약 400mm",
    name: "매미",
    year: 2003,
    period: "2003. 9. 11 ~ 9. 13",
    landfall: "경남 고성",
    landDate: "2003. 9. 12",
    hpa: 955,
    wind: "제주 고산 최대순간풍속 60m/s",
    toll: "사망·실종 132명, 재산피해 4조 2천억 원",
    color: "#7FA8C4",
    // 매미는 910hPa까지 발달했고 상륙 시에도 955hPa을 유지했다
    track: [
      [140.0, 15.5, 990],
      [136.0, 19.0, 960],
      [132.0, 23.5, 930],
      [129.5, 27.5, 910],
      [128.2, 31.0, 930],
      [127.8, 33.4, 945],
      [128.5, 34.95, 955],
      [129.6, 36.8, 970],
      [131.8, 39.5, 985],
    ],
    landAt: [128.5, 34.95],
    peakDx: 16, peakDy: -4, peakAnchor: "start",
  },
  {
    id: "hinnamnor",
    rain: 342.4,
    rainAt: "포항",
    name: "힌남노",
    year: 2022,
    period: "2022. 9. 4 ~ 9. 6",
    landfall: "경남 거제",
    landDate: "2022. 9. 6",
    hpa: 950,
    wind: "상륙 시 최대풍속 43m/s",
    toll: "포항제철소 침수, 49년 만에 용광로가 멈췄다",
    color: "#8FA766",
    // 일본 남쪽에서 서진하다 북상한 특이 경로
    // 힌남노는 920hPa까지 발달한 뒤 서진했다가 북상했다
    track: [
      [141.0, 22.5, 975],
      [137.0, 22.0, 945],
      [133.0, 22.5, 920],
      [130.0, 24.0, 925],
      [128.0, 26.5, 935],
      [126.8, 29.0, 940],
      [126.9, 31.5, 945],
      [128.0, 33.5, 945],
      [128.7, 34.9, 950],
      [129.8, 36.6, 968],
      [130.6, 37.8, 978],
      [133.0, 40.2, 989],
    ],
    landAt: [128.7, 34.9],
    peakDx: -16, peakDy: 22, peakAnchor: "end",
  },
];

/** 경로 위 진행도 0..1 → 좌표와 중심기압. 점 사이는 선형 보간. */
export function trackPointAt(
  t: Typhoon,
  p: number
): { x: number; y: number; hpa: number } {
  const n = t.track.length;
  const k = Math.max(0, Math.min(1, p)) * (n - 1);
  const i = Math.min(n - 2, Math.floor(k));
  const f = k - i;
  const a = eaProject(t.track[i][0], t.track[i][1]);
  const b = eaProject(t.track[i + 1][0], t.track[i + 1][1]);
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    hpa: t.track[i][2] + (t.track[i + 1][2] - t.track[i][2]) * f,
  };
}

/**
 * 중심기압 → 폭풍 반경(px).
 * 900hPa에서 가장 크고 1000hPa에서 가장 작다. 세력이 곧 크기로 읽히게 한다.
 */
export function stormRadius(hpa: number): number {
  const k = Math.max(0, Math.min(1, (1000 - hpa) / 100));
  return 26 + k * k * 132;
}

/** 세력 0..1 — 색·불투명도·회전 속도에 함께 쓴다 */
export function intensity(hpa: number): number {
  return Math.max(0, Math.min(1, (1000 - hpa) / 95));
}

/** 강수 막대 정규화 기준 */
export const RAIN_MAX = Math.max(...TYPHOONS.map((t) => t.rain ?? 0));

/**
 * 위험반원 — 북반구 태풍은 진행 방향 오른쪽이 위험하다.
 * 회전풍(반시계)과 태풍 자체의 이동속도가 그쪽에서 더해지기 때문이다.
 * 원으로만 그리면 이 비대칭이 안 보인다.
 *
 * 화면 좌표는 y가 아래로 향하므로 진행 방향 (dx,dy)의 오른쪽 법선은
 * (-dy, dx)다. 북(0,-1) → 동(1,0)으로 검산된다.
 */
export function dangerArc(
  cx: number, cy: number, r: number, dx: number, dy: number
): string {
  const th = Math.atan2(dy, dx);
  const ax = cx + Math.cos(th) * r;
  const ay = cy + Math.sin(th) * r;
  const bx = cx + Math.cos(th + Math.PI) * r;
  const by = cy + Math.sin(th + Math.PI) * r;
  // sweep=1이면 th → th+π를 오른쪽(위험반원)으로 돈다
  return `M${ax.toFixed(1)} ${ay.toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}L${cx.toFixed(1)} ${cy.toFixed(1)}Z`;
}

/** 진행 방향 — 위험반원 방향 계산용 */
export function headingAt(t: Typhoon, p: number): { dx: number; dy: number } {
  const a = trackPointAt(t, Math.max(0, p - 0.02));
  const b = trackPointAt(t, Math.min(1, p + 0.02));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len };
}

/** 각 태풍의 최저 중심기압과 그 지점 */
export function peakOf(t: Typhoon): { x: number; y: number; hpa: number } {
  let best = t.track[0];
  for (const r of t.track) if (r[2] < best[2]) best = r;
  const q = eaProject(best[0], best[1]);
  return { ...q, hpa: best[2] };
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
