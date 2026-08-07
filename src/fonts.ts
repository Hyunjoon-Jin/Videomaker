import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

/**
 * Pretendard를 @font-face로 주입한다.
 * 프록시 환경에서 웹폰트 CDN이 막히므로 public/fonts에 번들해 로컬 로드한다.
 *
 * ⚠ delayRender는 반드시 React 렌더 사이클 안에서 호출해야 한다.
 *   모듈 최상위에서 부르면 번들 평가 시점에 핸들이 생겨 렌더가 실패한다.
 *   그래서 훅으로 노출한다.
 */
const FACES: Array<[number, string]> = [
  [400, "Regular"],
  [700, "Bold"],
  [900, "Black"],
];

let injected = false;

/** @font-face 주입은 부작용이 없으므로 한 번만, 동기로 처리한다. */
function injectCss(): void {
  if (injected || typeof document === "undefined") return;
  injected = true;

  const style = document.createElement("style");
  style.textContent = FACES.map(
    ([weight, name]) => `@font-face{
  font-family:'Pretendard';
  font-weight:${weight};
  font-display:block;
  src:url('${staticFile(`fonts/Pretendard-${name}.woff2`)}') format('woff2');
}`
  ).join("\n");
  document.head.appendChild(style);
}

/** 폰트가 실제로 로드될 때까지 렌더를 지연시킨다. */
export function useFonts(): void {
  const [handle] = useState(() => delayRender("Pretendard 로드"));

  useEffect(() => {
    injectCss();
    Promise.all(FACES.map(([w]) => document.fonts.load(`${w} 100px Pretendard`)))
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
}
