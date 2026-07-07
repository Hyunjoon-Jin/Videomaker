/**
 * 자막·헤드라인용 한글 폰트 = Pretendard (가이드 지정).
 * woff2 서브셋을 base64 데이터 URI로 CSS @font-face에 '직접 주입'한다.
 * → delayRender를 쓰지 않으므로, 영상 클립(OffthreadVideo) 디코딩으로 CPU가
 *   포화되어 페이지가 리로드돼도 폰트 delayRender 타임아웃이 발생하지 않는다.
 *   데이터 URI는 즉시 디코딩되고 font-display:block 이라 폴백 깜빡임도 없다.
 */
import { PRETENDARD_FACES } from "./fonts-data";

const FAMILY = "Pretendard";

if (typeof document !== "undefined") {
  const id = "pretendard-faces";
  if (!document.getElementById(id)) {
    const css = PRETENDARD_FACES.map(
      ({ weight, dataUrl }) =>
        `@font-face{font-family:'${FAMILY}';font-style:normal;font-weight:${weight};` +
        `font-display:block;src:url(${dataUrl}) format('woff2');}`,
    ).join("\n");
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }
}

export const KR_FONT = `Pretendard, "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif`;

// 스코어/숫자 정렬용
export const NUM_STYLE = {
  fontFamily: KR_FONT,
  fontVariantNumeric: "tabular-nums" as const,
  fontFeatureSettings: '"tnum" 1',
};
