import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  EA_KOREA,
  EA_LANDS,
  EA_VIEWBOX,
  RAIN_MAX,
  TYPHOONS,
  Typhoon,
  dangerArc,
  eaProject,
  headingAt,
  intensity,
  peakOf,
  stormRadius,
  trackPathTo,
  trackPointAt,
} from "./data/typhoon";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(2.2 * FPS);

/**
 * 태풍마다 다른 시간을 준다.
 *
 * 넷에 똑같이 7초씩 나눠주던 걸 고쳤다. 두 가지가 걸렸다.
 * 하나는 7초로는 발달에서 소멸까지가 순식간에 지나가 아무것도 안 읽힌다는 것,
 * 다른 하나는 넷이 정확히 같은 초를 먹으면 자동 생성물처럼 보인다는 것이다.
 * 실제로 넷은 할 얘기의 양이 다르다. 루사는 비 얘기가 붙어 제일 길고,
 * 사라는 1959년이라 남은 기록이 적어 제일 짧다.
 */
/**
 * 구간 길이는 읽을 글자 수가 정한다.
 *
 * 처음에는 [9.5, 11.5, 9.5, 10.5]로 손으로 적었는데, 재보니 사라 구간은
 * 9.5초에 읽을 글자가 88자였다. 다른 편들과 같은 병이다 — 시간을 먼저
 * 정하고 글자를 우겨넣은 것이다.
 *
 * 다만 여기는 문장이 아니라 계기판이다. 기압·강수량·풍속·인명이 각각
 * 제 칸에 있어 눈이 훑고 지나가지 한 줄씩 읽지 않는다. 그래서 본문
 * 자막(초당 6.5자)보다 빠른 초당 9자로 잡는다.
 *
 * 넷의 길이가 서로 달라야 한다는 원래 이유는 그대로 살아 있다. 할 얘기의
 * 양이 다르면 글자 수가 다르고, 글자 수가 다르면 이 식이 알아서 다른
 * 길이를 준다.
 */
const CHARS_PER_SEC = 9;
const SECS = TYPHOONS.map((t) => {
  const chars =
    t.period.length +
    t.name.length +
    4 + // 연도
    9 + // "951.5 hPa"
    (t.rain == null ? 5 : 6) +
    t.rainAt.length +
    t.wind.length +
    t.toll.length;
  // 경로가 그려지는 동안은 지도를 보므로 최소 8초는 준다
  return Math.max(8, chars / CHARS_PER_SEC + 1.2);
});
const SEG = SECS.map((s) => Math.round(s * FPS));
/** 각 구간의 시작 프레임(훅 이후 기준) */
const STARTS = SEG.reduce<number[]>(
  (acc, f, i) => [...acc, (acc[i - 1] ?? 0) + (SEG[i - 1] ?? 0)],
  []
);
const BODY = SEG.reduce((a, b) => a + b, 0);

const OUTRO = Math.round(8.5 * FPS);
export const TY_DURATION = HOOK + BODY + OUTRO;

/** 경로를 구간의 앞 몇 할에 걸쳐 그릴지 — 나머지는 결과를 보는 시간 */
const DRAW = 0.84;

const SEA = "#101519";
const LAND = "#26251F";
const LAND_S = "#39392F";
const KOREA_F = "#38352B";
const KOREA_S = "#6E6755";

/** 위험반원 — 태풍별 색과 섞이면 안 되므로 따로 고정한다 */
const WARN = "#C4402C";
/**
 * 위험반원 반경 배수.
 * 눈 주변 반경(stormRadius)은 눈벽 규모지 강풍 반경이 아니다.
 * 실제 강풍 영향권은 그보다 훨씬 넓어 배수를 두되, 정확한 폭풍 반경을
 * 주장하지 않는다는 걸 화면 아래 고지에 적는다.
 */
const DANGER_K = 2.4;

export const ShortsTyphoon: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const afterHook = frame - HOOK;
  const inOutro = afterHook >= BODY;

  // 구간 길이가 제각각이라 나눗셈으로는 못 찾는다
  let idx = 0;
  while (idx < SEG.length - 1 && afterHook >= STARTS[idx + 1]) idx++;
  const local = afterHook - STARTS[idx];
  const seg = SEG[idx];

  const cur = TYPHOONS[idx];
  /** 현재 태풍의 경로 진행도 */
  const prog = interpolate(local, [0, seg * DRAW], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 지금 이 순간의 태풍 상태 — 기압이 실시간으로 변한다 */
  const now = trackPointAt(cur, prog);

  const hookOut = interpolate(frame, [HOOK - 16, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 훅 글자는 페이드인하지 않는다. 0프레임이 곧 완성된 화면이어야 한다. */
  const hookIn = 1;
  /**
   * 지도는 0프레임부터 떠 있다.
   *
   * 전에는 훅이 끝나는 4.5초까지 검은 화면이었다. 재보니 0초에 화면이
   * 0.0%, 1.5초에 1.0%, 2.5초에 2.1% 차 있었다. 피드에서 넘길지 말지는
   * 1~2초에 정해지는데 그 구간을 통째로 빈 화면으로 쓰고 있었다.
   *
   * 이제 첫 프레임이 완성된 그림이다. 훅 글자는 그 위에 얹힌다.
   */
  const mapIn = 1;
  /** 계기판·자막이 서는 시점 — 훅 글자가 걷히고 나서 */
  const uiOn = frame >= HOOK - 4;

  const outroIn = interpolate(afterHook, [BODY, BODY + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /*
   * 카메라 — 태풍을 따라간다.
   *
   * 지금까지는 동아시아 전체를 고정으로 놓고 그 안에서 작은 점이
   * 움직이는 화면이었다. 태풍은 움직이는 물체라 카메라가 따라붙는 게
   * 당연한데 그러지 않고 있었다.
   *
   * 완전히 중심에 물리면 지도가 같이 흘러서 어디인지 알 수 없다.
   * 폭풍과 지도 중심을 섞어서, 따라가되 육지를 놓치지 않게 한다.
   */
  const camZ = inOutro
    ? 1.06
    : interpolate(prog, [0, 0.4, 0.78, 1], [1.14, 1.45, 2.1, 1.5], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  /*
   * 경로를 다 그린 뒤에도 폭풍을 계속 따라가면 소멸 지점인 빈 바다를
   * 보게 된다. 뒤쪽에서는 상륙 지점으로 시선을 옮겨 결과를 보여준다.
   */
  const landQ = eaProject(cur.landAt[0], cur.landAt[1]);
  const settle = interpolate(prog, [0.72, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fx = now.x * (1 - settle) + landQ.x * settle;
  const fy = now.y * (1 - settle) + landQ.y * settle;
  const camX = inOutro ? 500 : fx * 0.7 + 500 * 0.3;
  const camY = inOutro ? 760 : fy * 0.82 + 820 * 0.18;
  const camW = 1000 / camZ;
  const camH = (camW * 1920) / 1080;
  const viewBox = `${(camX - camW / 2).toFixed(1)} ${(camY - camH / 2).toFixed(1)} ${camW.toFixed(1)} ${camH.toFixed(1)}`;
  /** 화면 픽셀 → 지도 단위. 확대해도 선과 글자가 굵어지지 않게 한다. */
  const u = (px: number) => px / (1.08 * camZ);

  return (
    <AbsoluteFill style={{ backgroundColor: SEA, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-ty.wav")} volume={0.9} />

      {/* ── 지도 ── */}
      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <defs>
            {/* 빗금 — 위험 구역을 통짜로 칠하는 대신 지도 관용 표기를 쓴다 */}
            <pattern
              id="tyHatch"
              width={12}
              height={12}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1={0} y1={0} x2={0} y2={12} stroke={WARN} strokeWidth={u(4.4)} />
            </pattern>
          </defs>

          {EA_LANDS.map((l, i) => (
            <path key={i} d={l.d} fill={LAND} stroke={LAND_S} strokeWidth={u(1.6)} />
          ))}
          {EA_KOREA.map((d, i) => (
            <path key={`k${i}`} d={d} fill={KOREA_F} stroke={KOREA_S} strokeWidth={u(2.6)} />
          ))}

          {/* 지나간 태풍은 옅게 남겨 누적을 보여준다 */}
          {TYPHOONS.map((t, i) => {
            if (inOutro) return <Track key={t.id} t={t} p={1} dim={1} frame={frame} u={u} />;
            if (i < idx) return <Track key={t.id} t={t} p={1} dim={0.3} frame={frame} u={u} />;
            if (i === idx) return <Track key={t.id} t={t} p={prog} dim={1} frame={frame} u={u} />;
            return null;
          })}
        </svg>
      </AbsoluteFill>

      {/* 가독성용 상하 어둠 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${SEA} 0%, rgba(16,21,25,0) 34%, rgba(16,21,25,0) 46%, ${SEA} 80%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── 태풍 정보 ── */}
      {uiOn && !inOutro && (
        <>
          <div style={{ position: "absolute", top: SAFE_TOP, left: TEXT_X, right: TEXT_X }}>
            <div style={{ color: C.dim, fontSize: 31, fontWeight: 700 }}>
              {cur.period}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 4 }}>
              <Typed
                text={cur.name}
                start={HOOK + STARTS[idx] + 2}
                cps={7}
                style={{ color: cur.color, fontSize: 126, fontWeight: 900, lineHeight: 1 }}
              />
              <span style={{ color: C.text, fontSize: 52, fontWeight: 700 }}>
                {cur.year}
              </span>
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 330, left: TEXT_X, right: SAFE_RIGHT }}>
            <Rule />
            <div style={{ display: "flex", alignItems: "flex-end", gap: 44 }}>
              {/* 바람 */}
              <div style={{ flex: "0 0 auto" }}>
                <div style={{ color: C.dim, fontSize: 27, fontWeight: 700 }}>
                  중심기압
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span
                    style={{
                      color: C.text,
                      fontSize: 90,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1.06,
                    }}
                  >
                    {now.hpa.toFixed(1)}
                  </span>
                  <span style={{ color: C.dim, fontSize: 36, fontWeight: 700 }}>hPa</span>
                </div>
              </div>

              {/* 비 — 기압만 보면 루사가 넷 중 제일 약해 보인다 */}
              <div style={{ flex: 1 }}>
                <div style={{ color: C.dim, fontSize: 27, fontWeight: 700 }}>
                  일 최대 강수량
                </div>
                {cur.rain == null ? (
                  <div
                    style={{
                      color: "#6E6657",
                      fontSize: 44,
                      fontWeight: 800,
                      lineHeight: 1.62,
                    }}
                  >
                    기록 없음
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span
                      style={{
                        color: C.text,
                        fontSize: 90,
                        fontWeight: 900,
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1.06,
                      }}
                    >
                      {Math.round(cur.rain * prog)}
                    </span>
                    <span style={{ color: C.dim, fontSize: 36, fontWeight: 700 }}>mm</span>
                  </div>
                )}
              </div>
            </div>

            {/* 강수 비교 — 지나간 태풍은 눈금으로 남겨 크기가 비교되게 */}
            <div
              style={{
                position: "relative",
                height: 13,
                background: "#241F19",
                marginTop: 10,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${((cur.rain ?? 0) * prog * 100) / RAIN_MAX}%`,
                  background: cur.color,
                }}
              />
              {TYPHOONS.map((t, i) =>
                i < idx && t.rain != null ? (
                  <div
                    key={t.id}
                    style={{
                      position: "absolute",
                      top: -4,
                      bottom: -4,
                      left: `${(t.rain * 100) / RAIN_MAX}%`,
                      width: 3,
                      background: t.color,
                    }}
                  />
                ) : null
              )}
            </div>
            <div style={{ color: "#6E6657", fontSize: 25, fontWeight: 600, marginTop: 7 }}>
              {cur.rainAt}
            </div>

            <div style={{ color: "#BDB3A0", fontSize: 32, fontWeight: 500, marginTop: 12 }}>
              {cur.wind}
            </div>
            <div style={{ color: cur.color, fontSize: 32, fontWeight: 700, marginTop: 6 }}>
              {cur.toll}
            </div>
          </div>
        </>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: `0 ${TEXT_X}px ${OUTRO_PAD}px`,
            opacity: outroIn,
          }}
        >
          <div style={{ marginBottom: 26 }}>
            {TYPHOONS.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 20,
                  marginTop: 6,
                }}
              >
                <span
                  style={{
                    color: C.dim,
                    fontSize: 36,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 210,
                  }}
                >
                  {t.landDate}
                </span>
                <span
                  style={{
                    color: t.color,
                    fontSize: 44,
                    fontWeight: 900,
                    minWidth: 152,
                  }}
                >
                  {t.name}
                </span>
                {/* 마무리 문장이 이 숫자들의 합에 기대므로 화면에 세워둔다.
                    안 보여주면 '390명'이 어디서 나온 값인지 알 수 없다. */}
                <span
                  style={{
                    color: t.id === "sarah" ? C.text : "#9A9080",
                    fontSize: 38,
                    fontWeight: t.id === "sarah" ? 900 : 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {t.dead}명
                </span>
              </div>
            ))}
          </div>
          <Rule />
          <div
            style={{
              color: C.text,
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.34,
              marginTop: 14,
            }}
          >
            사라 849명,
            <br />
            뒤의 셋을 다 합쳐도 390명
          </div>
        </AbsoluteFill>
      )}

      {/* ── 범례와 고지 ── */}
      {uiOn && (
        <div style={{ position: "absolute", bottom: BOTTOM_INSET, left: TEXT_X, right: SAFE_RIGHT }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
            {TYPHOONS.map((t, i) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: inOutro || i <= idx ? 1 : 0.32,
                }}
              >
                <div style={{ width: 20, height: 5, background: t.color }} />
                <span style={{ color: "#BDB3A0", fontSize: 24, fontWeight: 700 }}>
                  {t.name}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width={20} height={13}>
                <rect width={20} height={13} fill={WARN} opacity={0.28} />
                <line x1={0} y1={13} x2={13} y2={0} stroke={WARN} strokeWidth={2.4} />
                <line x1={7} y1={13} x2={20} y2={0} stroke={WARN} strokeWidth={2.4} />
              </svg>
              <span style={{ color: "#BDB3A0", fontSize: 24, fontWeight: 700 }}>
                위험반원
              </span>
            </div>
          </div>
          <div style={{ color: "#5E5648", fontSize: 20 }}>
            상륙값은 기록, 경로와 위험반원은 근사 (자세한 설명은 고정댓글)
          </div>
        </div>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(18,32,44,0.58) 0%, rgba(18,32,44,0.5) 60%, rgba(18,32,44,0.4) 100%)",
            opacity: hookOut,
            justifyContent: "center",
            padding: `0 ${TEXT_X}px`,
          }}
        >
          <div style={{ opacity: hookIn }}>
            <Typed
              text="1959년 추석날, 남해안"
              start={-20}
              cps={400}
              style={{
                display: "block",
                color: C.dim,
                fontSize: 40,
                fontWeight: 700,
              }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="849"
                start={-20}
                cps={400}
                style={{
                  color: INK.oxideHot,
                  fontSize: 270,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              />
              <Typed
                text="명"
                start={-20}
                cps={400}
                style={{ color: C.text, fontSize: 92, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="광복 이후 가장 많은 태풍 사망·실종자"
              start={-20}
              cps={400}
              style={{
                display: "block",
                color: C.text,
                fontSize: 50,
                fontWeight: 700,
                marginTop: 10,
              }}
            />
          </div>
        </AbsoluteFill>
      )}

      <Grain />
    </AbsoluteFill>
  );
};

/** 얇은 구분선 — 인쇄물의 괘선 */
const Rule: React.FC = () => (
  <div style={{ height: 1, background: "#3B342A", marginBottom: 14 }} />
);

/**
 * 로그 나선 팔 — 태풍처럼 보이게 하는 최소 요소.
 * 북반구 태풍은 반시계로 돈다.
 */
function spiralArm(cx: number, cy: number, r: number, rot: number, turns = 1.1): string {
  const pts: string[] = [];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const th = rot + u * turns * Math.PI * 2;
    // 안쪽은 촘촘하고 바깥으로 갈수록 벌어지는 지수 나선
    const rr = r * (0.16 + 0.84 * (Math.exp(u * 1.9) - 1) / (Math.exp(1.9) - 1));
    pts.push(`${(cx + Math.cos(th) * rr).toFixed(1)} ${(cy + Math.sin(th) * rr).toFixed(1)}`);
  }
  return "M" + pts.join("L");
}

/**
 * 경로 한 갈래 + 폭풍 본체 + 위험반원.
 *
 * 눈 크기를 고정해두면 태풍이 살아있지 않다. 실제로는 따뜻한 바다에서
 * 발달해 정점을 찍고 북상하며 약해진다. 중심기압으로 반경·나선 팔의
 * 밝기·회전 속도를 전부 구동해 그 일생이 보이게 한다.
 */
const Track: React.FC<{
  t: Typhoon;
  p: number;
  dim: number;
  frame: number;
  u: (px: number) => number;
}> = ({ t, p, dim, frame, u }) => {
  const d = trackPathTo(t, p);
  if (!d) return null;
  const head = trackPointAt(t, p);
  const land = eaProject(t.landAt[0], t.landAt[1]);
  const peak = peakOf(t);
  const live = p > 0 && p < 1 && dim >= 1;

  const r = stormRadius(head.hpa);
  const k = intensity(head.hpa);
  // 강할수록 빠르게 돈다. 프레임 기반이라 결정적이다.
  const rot = -frame * (0.026 + k * 0.05);

  // 위험반원 — 진행 방향 오른쪽. 회전풍과 이동속도가 그쪽에서 더해진다.
  const hd = headingAt(t, p);
  const arc = dangerArc(head.x, head.y, r * DANGER_K, hd.dx, hd.dy);
  const clipId = `dz-${t.id}`;

  return (
    <g opacity={dim}>
      {live && (
        <>
          <defs>
            <clipPath id={clipId}>
              <path d={arc} />
            </clipPath>
          </defs>
          <path d={arc} fill={WARN} opacity={0.045} />
          <path
            d={arc}
            fill="none"
            stroke={WARN}
            strokeWidth={u(2.6)}
            strokeDasharray={`${u(9)} ${u(8)}`}
            opacity={0.42}
          />
          {/* 위험반원에 들어간 땅을 빗금으로 덮는다 — 어디가 위험한지가 요점 */}
          <g clipPath={`url(#${clipId})`}>
            {EA_KOREA.map((dd, i) => (
              <path key={i} d={dd} fill={WARN} opacity={0.42} />
            ))}
            {EA_KOREA.map((dd, i) => (
              <path key={`h${i}`} d={dd} fill="url(#tyHatch)" opacity={0.8} />
            ))}
            {EA_LANDS.map((l, i) => (
              <path key={`l${i}`} d={l.d} fill={WARN} opacity={0.2} />
            ))}
          </g>
        </>
      )}

      <path
        d={d}
        fill="none"
        stroke={t.color}
        strokeWidth={u(15)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.14}
      />
      <path
        d={d}
        fill="none"
        stroke={t.color}
        strokeWidth={u(5)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 최저 중심기압 지점 — 이 태풍이 가장 강했던 곳 */}
      {p > 0.45 && (
        <g opacity={0.85}>
          <circle
            cx={peak.x}
            cy={peak.y}
            r={u(12)}
            fill="none"
            stroke={t.color}
            strokeWidth={u(2.6)}
            strokeDasharray={`${u(4)} ${u(4)}`}
          />
          <text
            x={peak.x + u(t.peakDx ?? 14)}
            y={peak.y + u(t.peakDy ?? 6)}
            textAnchor={t.peakAnchor ?? "start"}
            fontSize={u(24)}
            fontWeight={900}
            fill={t.color}
            style={{ paintOrder: "stroke", stroke: SEA, strokeWidth: u(6) }}
          >
            최저 {peak.hpa}hPa
          </text>
        </g>
      )}

      {/* 상륙 지점 */}
      {p > 0.62 && (
        <>
          <circle cx={land.x} cy={land.y} r={u(17)} fill="none" stroke={t.color} strokeWidth={u(4)} />
          <circle cx={land.x} cy={land.y} r={u(5)} fill={t.color} />
        </>
      )}

      {/* 폭풍 본체 — 반경과 밝기가 세력을 따라 변한다 */}
      {live && (
        <g>
          <circle cx={head.x} cy={head.y} r={r} fill={t.color} opacity={0.07 + k * 0.06} />
          <circle
            cx={head.x}
            cy={head.y}
            r={r * 0.66}
            fill={t.color}
            opacity={0.08 + k * 0.09}
          />
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={spiralArm(head.x, head.y, r * 0.92, rot + (i * Math.PI * 2) / 3)}
              fill="none"
              stroke={t.color}
              strokeWidth={u(2.6 + k * 3.4)}
              strokeLinecap="round"
              opacity={0.32 + k * 0.44}
            />
          ))}
          {/* 눈 — 강할수록 또렷하고 작다 */}
          <circle
            cx={head.x}
            cy={head.y}
            r={Math.max(4, r * (0.14 - k * 0.05))}
            fill={SEA}
            stroke={t.color}
            strokeWidth={u(3.2 + k * 2.6)}
          />
        </g>
      )}
    </g>
  );
};
