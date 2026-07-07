/**
 * 자막·헤드라인용 한글 폰트 = Pretendard (가이드 지정).
 * woff2 서브셋을 base64 데이터 URI로 임베드해 로드한다(src/fonts-data.ts).
 * → 렌더 시 로컬 폰트 서버 왕복이 없어 CPU 포화 상태에서도 delayRender 타임아웃이 없다.
 *
 * 폰트 교체: public/fonts 갱신 → scripts/subset-fonts.py → fonts-data 재생성.
 */
import { continueRender, delayRender } from "remotion";
import { PRETENDARD_FACES } from "./fonts-data";

const FAMILY = "Pretendard";

// 렌더 전에 폰트 로딩 보장(데이터 URI라 즉시 resolve).
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const handle = delayRender("Loading Pretendard fonts", {
    timeoutInMilliseconds: 60000,
  });
  Promise.all(
    PRETENDARD_FACES.map(async ({ weight, dataUrl }) => {
      const face = new FontFace(FAMILY, `url(${dataUrl}) format("woff2")`, {
        weight,
        style: "normal",
      });
      await face.load();
      (document.fonts as FontFaceSet).add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}

export const KR_FONT = `Pretendard, "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif`;

// 스코어/숫자 정렬용
export const NUM_STYLE = {
  fontFamily: KR_FONT,
  fontVariantNumeric: "tabular-nums" as const,
  fontFeatureSettings: '"tnum" 1',
};
