/**
 * 한반도 철도 1899 ~ 2026.
 *
 * 앞의 세 편은 전쟁 둘과 재난 하나였다. 채널이 '나쁜 일 지도'로 굳으면
 * 안 되므로 성격이 다른 소재를 골랐다. 철도는 마침 이 엔진에 제일 잘 맞는다.
 * 선이 실제로 자라나고, 자란 순서가 곧 시간이기 때문이다.
 *
 * 이야기의 축은 발전이 아니라 절단이다. 1899년부터 46년 동안 선은
 * 신의주와 회령까지 뻗었다가, 1945년에 한 번에 끊긴다. 지도 위에서
 * 그 순간이 그대로 보인다.
 *
 * ── 정직하게 ────────────────────────────────────────
 * 연도는 각 노선의 전 구간 개통 기준이다. 부분 개통은 그보다 빠르다.
 * 선형은 실제 궤도가 아니라 주요 정차역의 실좌표를 이은 근사다. 산을
 * 돌아가는 실제 노선보다 짧고 곧다. 화면에 그렇게 밝힌다.
 */
import { project } from "./places";

export interface RailLine {
  id: string;
  name: string;
  /** 전 구간 개통 연도 */
  year: number;
  /** 화면에 띄울 구간 설명 */
  span: string;
  /** 주요 정차역 실좌표 [경도, 위도] */
  pts: Array<[number, number]>;
  /** 38선 이북으로 넘어가는 노선 — 1945년에 끊긴다 */
  north?: boolean;
  /** 고속선은 따로 칠한다 */
  fast?: boolean;
}

export const LINES: RailLine[] = [
  {
    id: "gyeongin", name: "경인선", year: 1899, span: "노량진 ~ 제물포",
    pts: [[126.94, 37.51], [126.89, 37.49], [126.73, 37.48], [126.63, 37.47]],
  },
  {
    id: "gyeongbu", name: "경부선", year: 1905, span: "서울 ~ 부산",
    pts: [[126.97, 37.55], [127.03, 37.27], [127.10, 36.79], [127.38, 36.33],
          [127.90, 36.11], [128.60, 35.87], [128.90, 35.55], [129.04, 35.15]],
  },
  {
    id: "gyeongui", name: "경의선", year: 1906, span: "용산 ~ 신의주", north: true,
    pts: [[126.97, 37.55], [126.79, 37.86], [126.55, 37.97], [125.76, 38.51],
          [125.75, 39.02], [125.62, 39.62], [125.02, 39.93], [124.40, 40.10]],
  },
  {
    id: "honam", name: "호남선", year: 1914, span: "대전 ~ 목포",
    pts: [[127.38, 36.33], [127.00, 35.95], [126.86, 35.57], [126.79, 35.14],
          [126.72, 35.03], [126.39, 34.79]],
  },
  {
    id: "gyeongwon", name: "경원선", year: 1914, span: "용산 ~ 원산", north: true,
    pts: [[126.97, 37.55], [127.05, 37.74], [127.31, 38.25], [127.42, 38.78],
          [127.44, 39.16]],
  },
  {
    id: "hamgyeong", name: "함경선", year: 1928, span: "원산 ~ 회령", north: true,
    pts: [[127.44, 39.16], [127.54, 39.92], [128.32, 40.23], [129.00, 40.85],
          [129.78, 41.80], [129.75, 42.44]],
  },
  {
    id: "jeolla", name: "전라선", year: 1936, span: "익산 ~ 여수",
    pts: [[127.00, 35.95], [127.15, 35.82], [127.39, 35.42], [127.46, 35.20],
          [127.49, 34.95], [127.66, 34.76]],
  },
  {
    id: "jungang", name: "중앙선", year: 1942, span: "청량리 ~ 경주",
    pts: [[127.05, 37.58], [127.51, 37.48], [127.95, 37.35], [128.19, 37.13],
          [128.73, 36.57], [128.94, 35.97], [129.22, 35.84]],
  },
  {
    id: "yeongam", name: "영암선", year: 1955, span: "영주 ~ 철암",
    pts: [[128.62, 36.81], [128.73, 36.89], [128.90, 37.02], [129.05, 37.13]],
  },
  {
    id: "taebaek", name: "태백선", year: 1963, span: "제천 ~ 태백",
    pts: [[128.19, 37.13], [128.46, 37.18], [128.73, 37.14], [128.99, 37.16]],
  },
  {
    id: "dorasan", name: "도라산 연장", year: 2002, span: "문산 ~ 도라산",
    pts: [[126.79, 37.86], [126.74, 37.88], [126.71, 37.90]],
  },
  {
    id: "ktx", name: "경부고속선", year: 2004, span: "서울 ~ 동대구", fast: true,
    pts: [[126.97, 37.55], [127.10, 36.79], [127.33, 36.62], [127.38, 36.33],
          [128.00, 36.05], [128.63, 35.88], [129.04, 35.15]],
  },
  {
    id: "honamhigh", name: "호남고속선", year: 2015, span: "오송 ~ 광주송정", fast: true,
    pts: [[127.33, 36.62], [127.06, 36.42], [127.00, 35.95], [126.86, 35.57],
          [126.79, 35.14]],
  },
  {
    id: "gangneung", name: "강릉선", year: 2017, span: "서울 ~ 강릉", fast: true,
    pts: [[126.97, 37.55], [127.34, 37.42], [127.90, 37.36], [128.39, 37.55],
          [128.55, 37.67], [128.90, 37.76]],
  },
];

/**
 * 서울역에서 기차로 갈 수 있던 최북단.
 *
 * 이 편의 지표다. 총 연장이나 노선 수보다 이게 낫다. 46년 동안 북으로
 * 올라가다가 1945년에 한 번에 떨어지고, 그 뒤로 80년이 지나도 회복되지
 * 않는다. 숫자 하나로 이 영상의 내용 전부가 들어온다.
 */
export const NORTHMOST: Array<{
  year: number; name: string; lat: number; lon: number; why: string;
}> = [
  { year: 1899, name: "서울", lat: 37.55, lon: 126.97, why: "경인선 개통" },
  { year: 1906, name: "신의주", lat: 40.10, lon: 124.40, why: "경의선 개통" },
  { year: 1928, name: "회령", lat: 42.44, lon: 129.75, why: "함경선 개통" },
  { year: 1945, name: "개성", lat: 37.97, lon: 126.55, why: "38선으로 남북이 갈리다" },
  { year: 1953, name: "문산", lat: 37.86, lon: 126.79, why: "개성이 북쪽으로 넘어가다" },
  { year: 2002, name: "도라산", lat: 37.90, lon: 126.71, why: "도라산역 개통" },
];

export function northmostAt(year: number) {
  let cur = NORTHMOST[0];
  for (const n of NORTHMOST) if (n.year <= year) cur = n;
  return cur;
}

/** 연표 — 화면 아래에 뜨는 사건 */
export interface RailEvent {
  year: number;
  title: string;
  detail: string;
  /** 0..1 — 강조 세기 */
  impact?: number;
  /** 끊기는 사건인가 */
  cut?: boolean;
}

export const RAIL_EVENTS: RailEvent[] = [
  { year: 1899, title: "경인선 개통", detail: "노량진에서 제물포까지 33km", impact: 0.7 },
  { year: 1905, title: "경부선 개통", detail: "서울과 부산이 하루 거리가 되다", impact: 0.8 },
  { year: 1906, title: "경의선 개통", detail: "서울역에서 신의주행 표를 팔기 시작하다", impact: 0.9 },
  { year: 1914, title: "호남선·경원선 개통", detail: "목포와 원산이 같은 해에 이어지다", impact: 0.6 },
  { year: 1928, title: "함경선 개통", detail: "회령까지, 기차가 닿은 가장 북쪽", impact: 0.9 },
  { year: 1936, title: "전라선 개통", detail: "익산에서 여수까지", impact: 0.5 },
  { year: 1942, title: "중앙선 개통", detail: "청량리에서 경주까지 내륙을 관통하다", impact: 0.6 },
  { year: 1945, title: "38선", detail: "북으로 가던 세 노선이 한꺼번에 끊기다", impact: 1, cut: true },
  { year: 1950, title: "6·25 전쟁", detail: "남은 선로마저 부서지다", impact: 0.8, cut: true },
  { year: 1955, title: "영암선 개통", detail: "광복 이후 처음으로 새로 놓은 노선", impact: 0.7 },
  { year: 1963, title: "태백선 개통", detail: "석탄을 실어 나르려 산으로 들어가다", impact: 0.5 },
  { year: 2002, title: "도라산역 개통", detail: "서울에서 갈 수 있는 가장 북쪽 역", impact: 0.9 },
  { year: 2004, title: "KTX 개통", detail: "서울에서 부산까지 2시간대", impact: 0.9 },
  { year: 2015, title: "호남고속선 개통", detail: "오송에서 광주송정까지", impact: 0.5 },
  { year: 2017, title: "강릉선 개통", detail: "태백을 뚫고 동해까지", impact: 0.6 },
];

export function railEventAt(year: number): RailEvent | null {
  let cur: RailEvent | null = null;
  for (const e of RAIL_EVENTS) if (e.year <= year) cur = e;
  return cur;
}

/** 38선 — 잘린 자리를 표시한다 */
export const LAT_38 = 38.0;

/**
 * 폴리라인을 진행도 p(0..1)만큼만 그린다.
 * 선이 한 번에 나타나면 '놓인' 것이 아니라 '있는' 것으로 보인다.
 * 길이 기준으로 잘라야 구간이 긴 노선이 오래 그려진다.
 */
export function partialPath(pts: Array<[number, number]>, p: number): string {
  const q = pts.map(([lo, la]) => project(lo, la));
  if (q.length < 2) return "";
  const segs = q.slice(1).map((b, i) => Math.hypot(b.x - q[i].x, b.y - q[i].y));
  const total = segs.reduce((a, b) => a + b, 0);
  let want = Math.max(0, Math.min(1, p)) * total;
  const out = [`M${q[0].x} ${q[0].y}`];
  for (let i = 0; i < segs.length; i++) {
    if (want >= segs[i]) {
      out.push(`L${q[i + 1].x} ${q[i + 1].y}`);
      want -= segs[i];
      continue;
    }
    const f = segs[i] === 0 ? 0 : want / segs[i];
    out.push(
      `L${(q[i].x + (q[i + 1].x - q[i].x) * f).toFixed(1)} ` +
      `${(q[i].y + (q[i + 1].y - q[i].y) * f).toFixed(1)}`
    );
    break;
  }
  return out.length > 1 ? out.join("") : "";
}

/**
 * 끊긴 경계의 위도.
 *
 * 1945년에는 38선이지만, 정전 뒤 군사분계선은 서부에서 38선보다 남쪽으로
 * 내려온다. 개성이 북쪽으로 넘어간 것이 그 결과다. 두 단계로 나눈다.
 */
export function cutLatAt(year: number): number {
  return year >= 1953 ? 37.9 : LAT_38;
}

/**
 * 노선을 경계 위도에서 둘로 자른다.
 *
 * 끊긴 노선을 통째로 회색으로 칠하면 틀린 그림이 된다. 경의선은 분단
 * 뒤에도 서울에서 개성까지는 다녔다. 끊긴 것은 노선이 아니라 그 위쪽이다.
 * 경계를 지나는 구간에는 경계 위의 점을 만들어 붙여야 선이 벌어지지 않는다.
 */
export function splitAt(
  pts: Array<[number, number]>,
  lat: number
): { south: string; north: string } {
  const south: Array<[number, number]> = [];
  const north: Array<[number, number]> = [];
  for (let i = 0; i < pts.length; i++) {
    const [lo, la] = pts[i];
    if (i > 0) {
      const [plo, pla] = pts[i - 1];
      // 경계를 넘는 구간이면 교점을 양쪽에 모두 넣는다
      if ((pla < lat) !== (la < lat)) {
        const f = (lat - pla) / (la - pla);
        const cross: [number, number] = [plo + (lo - plo) * f, lat];
        south.push(cross);
        north.push(cross);
      }
    }
    (la < lat ? south : north).push([lo, la]);
  }
  const toPath = (a: Array<[number, number]>) =>
    a.length < 2
      ? ""
      : a
          .map(([lo, la], i) => {
            const q = project(lo, la);
            return `${i ? "L" : "M"}${q.x} ${q.y}`;
          })
          .join("");
  return { south: toPath(south), north: toPath(north) };
}
