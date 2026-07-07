/**
 * 자막·헤드라인용 한글 폰트 = Pretendard (가이드 지정: Pretendard ExtraBold 계열).
 * 프록시 환경에서 웹폰트 CDN이 막히므로 public/fonts 로 번들해 로컬 로드한다.
 * 폰트 교체 시 public/fonts 파일과 이 정의만 바꾸면 전 씬에 반영된다.
 */
import { staticFile, continueRender, delayRender } from "remotion";

const FAMILY = "Pretendard";

const FACES: { weight: string; file: string }[] = [
  { weight: "400", file: "Pretendard-Regular.woff2" },
  { weight: "500", file: "Pretendard-Medium.woff2" },
  { weight: "700", file: "Pretendard-Bold.woff2" },
  { weight: "900", file: "Pretendard-Black.woff2" },
];

// 렌더 전에 폰트 로딩을 보장(글자 깨짐/치환 방지).
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const handle = delayRender("Loading Pretendard fonts", {
    timeoutInMilliseconds: 120000,
  });
  Promise.all(
    FACES.map(async ({ weight, file }) => {
      const face = new FontFace(
        FAMILY,
        `url(${staticFile(`fonts/${file}`)}) format("woff2")`,
        { weight, style: "normal" },
      );
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
