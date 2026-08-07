/**
 * 시군구 지오메트리 (scripts/prep-map.py 산출물).
 * 원본: southkorea/southkorea-maps · 통계청 2018년 경계 · 250개 시군구.
 */
import paths from "./korea-paths.json";

export interface Region {
  /** 시군구 코드 (앞 2자리가 시도) */
  code: string;
  name: string;
  /** 시도 코드 2자리 */
  sido: string;
  /** SVG path d */
  d: string;
  /** 라벨용 근사 중심 */
  cx: number;
  cy: number;
  area: number;
}

export const VIEW_BOX: string = paths.viewBox;
export const REGIONS: Region[] = paths.regions;

/** 시도 코드 → 이름 */
export const SIDO: Record<string, string> = {
  "11": "서울", "21": "부산", "22": "대구", "23": "인천", "24": "광주",
  "25": "대전", "26": "울산", "29": "세종", "31": "경기", "32": "강원",
  "33": "충북", "34": "충남", "35": "전북", "36": "전남", "37": "경북",
  "38": "경남", "39": "제주",
};
