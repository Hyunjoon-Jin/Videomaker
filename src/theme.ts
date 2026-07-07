/**
 * 통합 제작 가이드의 색·타이포 원칙을 코드 토큰으로 고정.
 * - PART 1 뉴스: 딥블루 스튜디오 + 속보 레드
 * - PART 2 야구: 나이트 게임(섀도우 블루 / 하이라이트 웜) + 필드 그린
 * - 유니폼: 우리팀 navy&white / 상대 grey&dark red
 */
export const COLORS = {
  // 뉴스 / 속보
  breakingRed: "#D6182B",
  breakingRedDeep: "#8E0F1C",
  studioNavy: "#0A1A2F",
  studioNavyDeep: "#050E1A",

  // 공통 뉴트럴 (약간 블루 바이어스 — '선택된' 뉴트럴)
  ink: "#0B1017",
  paper: "#F4F6FA",
  mutedLine: "rgba(255,255,255,0.14)",

  // 팀 컬러 (스코어바) — 홈=최상강남(KT 위즈 레드/블랙), 원정=네이비
  homeRed: "#E4002B",
  homeRedDark: "#9E0020",
  awayNavy: "#26374D",
  awayNavyDark: "#16212F",
  // (레거시 액센트 — Scene 14/네임택 등에서 사용)
  gangnamNavy: "#1B3A8F",
  gangnamNavyLight: "#4E77D6",
  rivalsRed: "#6E1B22",
  rivalsRedLight: "#B0444C",

  // 강조 / 그래픽
  gold: "#C9A24B",
  amberCaption: "#F6C445", // 실적 자막 옐로
  fieldGreen: "#123A1E",
  fieldGreenLight: "#1F6B37",

  // 텍스트
  white: "#FFFFFF",
  offWhite: "#E9EEF6",
  subtleGrey: "#9BA7B8",
  black: "#000000",
} as const;

// 자막 폰트: 가이드의 Pretendard ExtraBold 계열 지향(웹폰트 대체는 fonts.ts).
export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 20,
} as const;

export const FPS = 30;
