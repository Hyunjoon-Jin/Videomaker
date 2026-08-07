/**
 * 임진왜란·정유재란 주요 전투 — 개별 좌표.
 *
 * 도 단위 색칠만으로는 해상도가 9개뿐이다. 전쟁의 실제 밀도는 개별 전투에
 * 있고, 전투는 하나하나 사료로 확인되는 대상이다. 점령 범위는 도 단위로
 * 근사하되, 그 위에 전투를 실좌표로 찍어 밀도를 만든다.
 *
 * 좌표는 places.ts의 project()와 동일한 투영식으로 위경도에서 계산한다.
 * 날짜는 음력, month는 1592년 4월 = 0인 개월 인덱스.
 */
import { project } from "./places";

export type Side = "japan" | "joseon";

export interface Battle {
  name: string;
  /** 개월 인덱스 (1592.4 = 0) */
  month: number;
  /** 승자 */
  won: Side;
  /** 해전 여부 */
  sea?: boolean;
  x: number;
  y: number;
  /** 큰 전투 — 이름표를 붙인다 */
  major?: boolean;
  side?: "left" | "right";
  dy?: number;
}

const B = (
  name: string, month: number, won: Side, lon: number, lat: number,
  opt: { sea?: boolean; major?: boolean; side?: "left" | "right"; dy?: number } = {}
): Battle => ({ name, month, won, ...project(lon, lat), ...opt });

export const BATTLES: Battle[] = [
  // ── 1592 일본군 북상 ──
  B("부산진성", 0, "japan", 129.03, 35.13, { major: true, side: "right", dy: -16 }),
  B("동래성", 0.1, "japan", 129.09, 35.21, { side: "right", dy: 20 }),
  B("상주", 0.4, "japan", 128.16, 36.41),
  B("탄금대", 0.5, "japan", 127.92, 37.00, { major: true, side: "right" }),
  B("옥포", 1.4, "joseon", 128.70, 34.87, { sea: true, major: true, side: "left", dy: -14 }),
  B("사천", 1.6, "joseon", 128.06, 35.00, { sea: true }),
  B("당포", 2.0, "joseon", 128.35, 34.85, { sea: true }),
  B("평양", 2.0, "japan", 125.75, 39.02, { major: true, side: "left" }),
  B("한산도", 3.0, "joseon", 128.48, 34.79, { sea: true, major: true, side: "right", dy: 26 }),
  B("안골포", 3.2, "joseon", 128.68, 35.08, { sea: true }),
  B("웅치", 3.5, "joseon", 127.30, 35.85),
  B("이치", 3.6, "joseon", 127.25, 36.05, { major: true, side: "left" }),
  B("청주성", 4.0, "joseon", 127.49, 36.64),
  B("금산", 4.2, "japan", 127.49, 36.11),
  B("부산포", 5.0, "joseon", 129.03, 35.10, { sea: true }),
  B("진주성", 6.0, "joseon", 128.08, 35.19, { major: true, side: "left" }),

  // ── 1592 북부·중부 ──
  // 지도 위쪽 절반이 사건 없이 색만 변하던 구간을 채운다.
  B("임진강", 1.2, "japan", 126.77, 37.88, { side: "left" }),
  // 해정창 — 가토가 함경도 조선군(한극함)을 무너뜨린 전투
  B("해정창", 3.3, "japan", 129.78, 40.66, { side: "left" }),
  // 명 요동군 조승훈의 1차 평양 공격은 실패했다. 명군이 처음부터
  // 구원자로 등장한 것처럼 그리면 사실과 다르다.
  B("조승훈 패퇴", 3.5, "japan", 125.75, 39.02, { major: true, side: "left", dy: 24 }),
  // 연안성 — 이정암이 소수로 황해도 요충을 지켜냈다
  B("연안성", 4.5, "joseon", 126.20, 37.87, { major: true, side: "left" }),
  // 북관대첩: 1592.9~1593.2 경성·장평·임명·백탑교 승첩의 통칭.
  // 대표 지점 둘만 찍어 함경도가 회복되는 과정을 보인다.
  B("경성 수복", 5.6, "joseon", 129.60, 41.55, { side: "right", dy: 22 }),
  B("백탑교", 8.5, "joseon", 129.30, 40.85, { major: true, side: "left" }),
  // 독성산성 — 권율의 행주 전초전
  B("독성산성", 8.0, "joseon", 127.05, 37.17, { side: "right" }),

  // ── 1593 반격 ──
  B("평양성 탈환", 9.0, "joseon", 125.75, 39.02, { major: true, side: "left", dy: 22 }),
  B("벽제관", 9.5, "japan", 126.85, 37.72, { side: "left" }),
  B("행주산성", 10.5, "joseon", 126.83, 37.60, { major: true, side: "left", dy: 24 }),
  B("2차 진주성", 14.0, "japan", 128.08, 35.19, { major: true, side: "left", dy: 22 }),

  // ── 1597 정유재란 ──
  B("칠천량", 63.0, "japan", 128.65, 35.03, { sea: true, major: true, side: "right" }),
  B("남원성", 64.0, "japan", 127.39, 35.42, { major: true, side: "left" }),
  B("명량", 65.0, "joseon", 126.30, 34.57, { sea: true, major: true, side: "left" }),
  B("직산", 65.2, "joseon", 127.15, 36.85, { side: "left" }),
  B("울산왜성", 68.0, "joseon", 129.35, 35.56, { side: "right" }),

  // ── 1598 종결 ──
  B("사천왜성", 78.0, "japan", 128.07, 35.02),
  B("순천왜교성", 78.5, "joseon", 127.50, 34.88, { side: "left" }),
  B("노량", 79.0, "joseon", 127.88, 34.94, { sea: true, major: true, side: "left", dy: 4 }),
];

/** month까지 벌어진 전투 */
export function battlesUpTo(month: number): Battle[] {
  return BATTLES.filter((b) => b.month <= month);
}

/** 지금 막 벌어진 전투(강조용) */
export function freshBattles(month: number, window = 0.8): Battle[] {
  return BATTLES.filter((b) => b.month <= month && month - b.month < window);
}

export const BATTLE_COUNT = BATTLES.length;
