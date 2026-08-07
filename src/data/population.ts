/**
 * 시군구 인구 시계열 데이터 레이어.
 *
 * ⚠ 실제 통계는 아직 연결되지 않았다.
 *   KOSIS 인증키가 없어 `scripts/fetch-population.py`를 아직 돌리지 못했고,
 *   그때까지는 아래 합성 데이터로 엔진만 검증한다.
 *   합성 데이터가 쓰이는 동안 화면에 경고 배지가 강제로 표시된다(Root에서 제어).
 *
 * 실제 데이터가 들어오면 `src/data/population.json`이 생기고,
 * 이 모듈은 자동으로 그쪽을 쓴다. 컴포넌트 코드는 손댈 필요 없다.
 */
import { REGIONS } from "./regions";
import real from "./population.json";

export const START_YEAR = 1975;
export const END_YEAR = 2025;

/** year → { 시군구코드: 인구 } */
export type PopulationSeries = Record<number, Record<string, number>>;

/**
 * 실데이터 존재 여부.
 * population.json이 비어 있으면(초기 상태 `{}`) 합성 데이터로 떨어지고,
 * 화면에 "샘플 데이터" 경고 배지가 강제로 붙는다.
 */
export const IS_REAL_DATA = Object.keys(real).length > 0;

const series: PopulationSeries = IS_REAL_DATA
  ? (real as unknown as PopulationSeries)
  : synth();

/**
 * 합성 시계열. 실제 추세를 흉내내되 어디까지나 엔진 검증용이다.
 * 시도 코드로 대도시/비대도시를 갈라 수도권 집중과 지방 감소를 재현한다.
 * 코드 해시 기반이라 렌더마다 동일한 값이 나온다(결정적).
 */
function synth(): PopulationSeries {
  const METRO = new Set(["11", "21", "22", "23", "24", "25", "26", "31"]);
  const out: PopulationSeries = {};

  for (let y = START_YEAR; y <= END_YEAR; y++) {
    const t = (y - START_YEAR) / (END_YEAR - START_YEAR); // 0..1
    const row: Record<string, number> = {};

    for (const r of REGIONS) {
      // 코드 기반 결정적 해시 → 지역별 고유 변주
      let h = 0;
      for (let i = 0; i < r.code.length; i++) h = (h * 31 + r.code.charCodeAt(i)) >>> 0;
      const jitter = ((h % 1000) / 1000 - 0.5) * 0.5; // -0.25..0.25

      const base = 40_000 + (h % 260_000);
      const growth = METRO.has(r.sido)
        ? 1 + (1.1 + jitter) * t // 수도권·광역시: 증가
        : 1 - (0.55 + jitter * 0.6) * t; // 그 외: 감소

      row[r.code] = Math.max(3_000, Math.round(base * growth));
    }
    out[y] = row;
  }
  return out;
}

export const POPULATION = series;

/** 해당 연도 인구. 없으면 0. */
export function popAt(year: number, code: string): number {
  return POPULATION[year]?.[code] ?? 0;
}

/** 1975년 대비 증감률(-1..+n). 기준이 0이면 0. */
export function changeRatio(year: number, code: string): number {
  const base = popAt(START_YEAR, code);
  if (!base) return 0;
  return popAt(year, code) / base - 1;
}
