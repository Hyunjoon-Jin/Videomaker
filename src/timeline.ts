/**
 * 애니매틱 타임라인의 단일 진실 소스(Single Source of Truth).
 * 씬 순서·길이·메타데이터를 여기서 관리하고, Root.tsx(개별 컴포지션)와
 * FullAnimatic.tsx(전체 통합)가 이 배열을 공유한다.
 *
 * 길이 수정 → 이 파일만 고치면 개별 씬과 전체 영상 양쪽에 반영.
 */
import { FPS } from "./theme";

export type ScenePart = "PART1" | "BRIDGE" | "PART2";
export type SceneKind = "graphic" | "placeholder";

export interface SceneMeta {
  /** Remotion composition id (개별 렌더 시 사용) */
  id: string;
  /** 씬 번호 라벨 (예: "Scene 1", "브릿지") */
  label: string;
  /** 한글 제목 */
  title: string;
  seconds: number;
  part: ScenePart;
  /** graphic = 실제 구현 / placeholder = 실사·Veo 대체 예정 */
  kind: SceneKind;
  /** 플레이스홀더에 표시할 제작 방식 요약 */
  note?: string;
}

export const SCENES: SceneMeta[] = [
  // ─── PART 1. 긴급 뉴스 속보 오프닝 (약 70초) ───
  {
    id: "S01-Breaking",
    label: "Scene 1",
    title: "속보 인트로",
    seconds: 5,
    part: "PART1",
    kind: "graphic",
    note: "속보 오프닝 그래픽 · 지구본 회전 · BREAKING NEWS 배너",
  },
  {
    id: "S02-Anchor",
    label: "Scene 2",
    title: "AI 앵커 브리핑",
    seconds: 20,
    part: "PART1",
    kind: "placeholder",
    note: "HeyGen 앵커 아바타(그린스크린) + Veo 스튜디오 배경 합성",
  },
  {
    id: "S03-PresidentA",
    label: "Scene 3",
    title: "가상 정상 축전 ① 아메리카나 합중국 대통령",
    seconds: 12,
    part: "PART1",
    kind: "placeholder",
    note: "HeyGen 가상 대통령 아바타 · 위성 중계 프레임 오버레이",
  },
  {
    id: "S04-PresidentB",
    label: "Scene 4",
    title: "가상 정상 축전 ② 유로피아 연방 총리",
    seconds: 12,
    part: "PART1",
    kind: "placeholder",
    note: "HeyGen 가상 총리 아바타 · 위성 프레임 재사용 · 차분한 대비 톤",
  },
  {
    id: "S05-Bumunjang",
    label: "Scene 5 ★",
    title: "김봉균 부문장님 축전",
    seconds: 20,
    part: "PART1",
    kind: "placeholder",
    note: "실촬영 권장(정면 4K) 또는 HeyGen Photo Avatar · 우주정거장 배경 합성",
  },
  {
    id: "BR-Bridge",
    label: "브릿지",
    title: "PART 1 → PART 2 전환",
    seconds: 3,
    part: "BRIDGE",
    kind: "graphic",
    note: "뉴스 스크린 줌인 → 야구장 부감샷으로 세계관 이동",
  },

  // ─── PART 2. 야구 경기 컨셉 (약 90초) ───
  {
    id: "S06-Stadium",
    label: "Scene 6",
    title: "경기 시작",
    seconds: 5,
    part: "PART2",
    kind: "placeholder",
    note: "박진감 있는 경기 시작 다이나믹 샷 · 스코어바 상시 노출 시작",
  },
  {
    id: "S06B-Lineup",
    label: "Scene 6B",
    title: "선발 라인업 소개",
    seconds: 8,
    part: "PART2",
    kind: "graphic",
    note: "방송 라인업 카드(코드 그래픽)",
  },
  {
    id: "S06C-Manager",
    label: "Scene 6C",
    title: "감독 작전 지시",
    seconds: 6,
    part: "PART2",
    kind: "placeholder",
    note: "김봉균 부문장=감독, 덕아웃 사인",
  },
  {
    id: "S07-Homerun",
    label: "Scene 7",
    title: "홈런 몽타주: 대형 수주",
    seconds: 20,
    part: "PART2",
    kind: "placeholder",
    note: "타격→궤적→세리머니 8초 클립 3종 조립 · 실적 자막",
  },
  {
    id: "S07D-Homerun2",
    label: "Scene 7D",
    title: "홈런 ② 대형 수주",
    seconds: 8,
    part: "PART2",
    kind: "placeholder",
    note: "업로드 홈런 영상 ② · 4번째 수주(4점) · 원본 그래픽 블러",
  },
  {
    id: "S07C-BatFlip",
    label: "Scene 7C",
    title: "배트 플립(빠던)",
    seconds: 5,
    part: "PART2",
    kind: "placeholder",
    note: "홈런 직후 KBO식 배트 플립",
  },
  {
    id: "S07B-Crowd",
    label: "Scene 7B",
    title: "관중 응원",
    seconds: 5,
    part: "PART2",
    kind: "placeholder",
    note: "KT 팬 함성·응원",
  },
  {
    id: "S08-Steal",
    label: "Scene 8",
    title: "도루: 고객사 탈환",
    seconds: 10,
    part: "PART2",
    kind: "placeholder",
    note: "헤드퍼스트 슬라이딩 슬로모 → 세이프 콜",
  },
  {
    id: "S08B-Defense",
    label: "Scene 8B",
    title: "호수비 · 위기 방어",
    seconds: 8,
    part: "PART2",
    kind: "placeholder",
    note: "다이빙 캐치 = 리스크 대응",
  },
  {
    id: "S09-Strikeout",
    label: "Scene 9",
    title: "삼진: 연속 수주 행진",
    seconds: 10,
    part: "PART2",
    kind: "placeholder",
    note: "투구→미트 임팩트+헛스윙 반복 · K 마크 누적 그래픽",
  },
  {
    id: "S10B-RivalRun",
    label: "Scene 10B",
    title: "상대의 반격",
    seconds: 6,
    part: "PART2",
    kind: "placeholder",
    note: "RIVALS 연속 득점 → 4-7 역전(뒤지게 된 이유)",
  },
  {
    id: "S10-Losing",
    label: "Scene 10",
    title: "그러나… 뒤지는 스코어",
    seconds: 10,
    part: "PART2",
    kind: "placeholder",
    note: "침묵하는 덕아웃 · 스코어바 확대 애니메이션(RIVALS 리드)",
  },
  {
    id: "S11-Eighth",
    label: "Scene 11",
    title: "약속의 8회 말",
    seconds: 10,
    part: "PART2",
    kind: "placeholder",
    note: "'8회 말' 타이핑 → 일어서는 선수들 → 주먹 인사",
  },
  {
    id: "S11B-Mound",
    label: "Scene 11B",
    title: "마운드 작전 회의",
    seconds: 6,
    part: "PART2",
    kind: "placeholder",
    note: "마지막 승부 전 전략 회의",
  },
  {
    id: "S12-FullCount",
    label: "Scene 12",
    title: "2사 만루, 풀카운트",
    seconds: 15,
    part: "PART2",
    kind: "placeholder",
    note: "투수/타자/그립 클로즈업 교차 · 풀카운트 스코어바",
  },
  {
    id: "S12B-BasesLoaded",
    label: "Scene 12B",
    title: "만루!",
    seconds: 5,
    part: "PART2",
    kind: "placeholder",
    note: "1·2·3루 주자 분할화면(헬멧·리드 자세) · 결의에 찬 표정",
  },
  {
    id: "S13-Swing",
    label: "Scene 13",
    title: "타격의 순간",
    seconds: 10,
    part: "PART2",
    kind: "placeholder",
    note: "실제 타격 컨택 → 공이 쭉쭉 뻗어 담장으로 → 관중 환호 → 페이드아웃(여운)",
  },
  {
    id: "S14-Ending",
    label: "Scene 14",
    title: "엔딩 카피",
    seconds: 10,
    part: "PART2",
    kind: "graphic",
    note: "100% 그래픽 · 타이핑 카피 → 슬로건 팝 → KT 로고",
  },
];

export const secToFrames = (s: number) => Math.round(s * FPS);

export const TOTAL_SECONDS = SCENES.reduce((a, s) => a + s.seconds, 0);
export const TOTAL_FRAMES = secToFrames(TOTAL_SECONDS);

/** 특정 씬이 전체 타임라인에서 시작하는 프레임 오프셋 */
export const sceneStartFrame = (id: string): number => {
  let f = 0;
  for (const s of SCENES) {
    if (s.id === id) return f;
    f += secToFrames(s.seconds);
  }
  return f;
};
