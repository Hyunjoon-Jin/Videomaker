import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/**
 * 한 글자씩 써 내려가는 텍스트.
 *
 * 훅에서 문장이 통째로 나타났다 사라지면 눈이 한 번에 다 읽고 끝난다.
 * 글자가 붙어 나가면 다음 글자를 기다리게 되고, 그 기다림이 몇 초를 번다.
 *
 * 프레임에서 글자 수를 계산할 뿐 상태를 두지 않는다. 어느 프레임을 단독으로
 * 렌더해도 같은 결과가 나와야 한다 — 렌더러는 프레임을 순서대로 그리지 않는다.
 */
export const Typed: React.FC<{
  text: string;
  /** 이 프레임부터 쓰기 시작한다 */
  start: number;
  /** 초당 글자 수. 큰 글씨는 느리게 써야 무게가 산다. */
  cps?: number;
  style?: React.CSSProperties;
}> = ({ text, start, cps = 26, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = frame - start;
  const n = elapsed <= 0 ? 0 : Math.floor((elapsed * cps) / fps);
  const typing = elapsed > 0 && n < text.length;
  // 커서는 쓰는 동안만. 다 쓰고도 깜빡이면 시선이 거기 묶인다.
  const blink = Math.floor(frame / 7) % 2 === 0;

  return (
    <span style={style}>
      {text.slice(0, n)}
      {/* 다 쓰면 커서 자리도 없앤다. 자리만 남기면 뒤 글자가 밀려 있는다.
          깜빡일 때는 자리를 유지해야 글자가 떨지 않으므로 opacity로만 끈다. */}
      {typing && <span style={{ opacity: blink ? 0.55 : 0 }}>|</span>}
    </span>
  );
};
