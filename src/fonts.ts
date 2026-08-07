import { continueRender, delayRender, staticFile } from "remotion";

/**
 * Pretendard를 @font-face로 주입한다.
 * 프록시 환경에서 웹폰트 CDN이 막히므로 public/fonts에 번들해 로컬 로드한다.
 */
let injected = false;

export function loadFonts(): void {
  if (injected || typeof document === "undefined") return;
  injected = true;

  const handle = delayRender("Pretendard 로드");

  const faces: Array<[number, string]> = [
    [400, "Regular"],
    [700, "Bold"],
    [900, "Black"],
  ];

  const style = document.createElement("style");
  style.textContent = faces
    .map(
      ([weight, name]) => `@font-face{
  font-family:'Pretendard';
  font-weight:${weight};
  font-display:block;
  src:url('${staticFile(`fonts/Pretendard-${name}.woff2`)}') format('woff2');
}`
    )
    .join("\n");
  document.head.appendChild(style);

  Promise.all(faces.map(([w]) => document.fonts.load(`${w} 100px Pretendard`)))
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}
