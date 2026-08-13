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
  ISLETS,
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

const HOOK = Math.round(4.5 * FPS);

/**
 * 태풍마다 다른 시간을 준다.
 *
 * 넷에 똑같이 7초씩 나눠주던 걸 고쳤다. 두 가지가 걸렸다.
 * 하나는 7초로는 발달에서 소멸까지가 순식간에 지나가 아무것도 안 읽힌다는 것,
 * 다른 하나는 넷이 정확히 같은 초를 먹으면 자동 생성물처럼 보인다는 것이다.
 * 실제로 넷은 할 얘기의 양이 다르다. 루사는 비 얘기가 붙어 제일 길고,
 * 사라는 1959년이라 남은 기록이 적어 제일 짧다.
 */
const SECS = [9.5, 11.5, 9.5, 10.5];
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
const DRAW = 0.72;

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
  const hookIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const mapIn = interpolate(frame, [HOOK - 10, HOOK + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outroIn = interpolate(afterHook, [BODY, BODY + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: SEA, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-ty.wav")} volume={0.9} />

      {/* ── 지도 ── */}
      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={EA_VIEWBOX}
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
              <line x1={0} y1={0} x2={0} y2={12} stroke={WARN} strokeWidth={3.4} />
            </pattern>
          </defs>

          {EA_LANDS.map((l, i) => (
            <path key={i} d={l.d} fill={LAND} stroke={LAND_S} strokeWidth={1.2} />
          ))}
          {EA_KOREA.map((d, i) => (
            <path key={`k${i}`} d={d} fill={KOREA_F} stroke={KOREA_S} strokeWidth={2} />
          ))}

          {/* 울릉도·독도 — 축척상 폴리곤으로는 안 보여 점으로 찍는다 */}
          {ISLETS.map((is) => {
            const q = eaProject(is.lon, is.lat);
            return (
              <g key={is.name}>
                <circle cx={q.x} cy={q.y} r={4} fill={KOREA_F} stroke={KOREA_S} strokeWidth={2} />
                <text
                  x={q.x + is.dx}
                  y={q.y + is.dy}
                  fontSize={17}
                  fontWeight={700}
                  fill="#7E7666"
                  style={{ paintOrder: "stroke", stroke: SEA, strokeWidth: 4 }}
                >
                  {is.name}
                </text>
              </g>
            );
          })}

          {/* 지나간 태풍은 옅게 남겨 누적을 보여준다 */}
          {TYPHOONS.map((t, i) => {
            if (inOutro) return <Track key={t.id} t={t} p={1} dim={1} frame={frame} />;
            if (i < idx) return <Track key={t.id} t={t} p={1} dim={0.3} frame={frame} />;
            if (i === idx) return <Track key={t.id} t={t} p={prog} dim={1} frame={frame} />;
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
      {mapIn > 0.5 && !inOutro && (
        <>
          <div style={{ position: "absolute", top: 110, left: 60, right: 60 }}>
            <div style={{ color: C.dim, fontSize: 31, fontWeight: 700 }}>
              {cur.period}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 4 }}>
              <span
                style={{ color: cur.color, fontSize: 126, fontWeight: 900, lineHeight: 1 }}
              >
                {cur.name}
              </span>
              <span style={{ color: C.text, fontSize: 52, fontWeight: 700 }}>
                {cur.year}
              </span>
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 258, left: 60, right: 60 }}>
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
            padding: "0 60px 272px",
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
                    fontSize: 38,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 220,
                  }}
                >
                  {t.landDate}
                </span>
                <span style={{ color: t.color, fontSize: 44, fontWeight: 900 }}>
                  {t.name}
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
            매미는 사라만큼 강했지만
            <br />
            죽은 사람은 6분의 1이었다
          </div>
        </AbsoluteFill>
      )}

      {/* ── 범례와 고지 ── */}
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", bottom: 74, left: 60, right: 60 }}>
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
          <div style={{ color: "#5E5648", fontSize: 19, lineHeight: 1.55 }}>
            상륙 지점과 중심기압은 기록값, 경로는 알려진 진로의 근사
            <br />
            점 사이는 보간이므로 시각별 정확한 위치가 아니다
            <br />
            위험반원 범위는 개념도이며 실제 강풍 반경이 아니다
          </div>
        </div>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: SEA,
            opacity: hookOut,
            justifyContent: "center",
            padding: "0 70px",
          }}
        >
          <div style={{ opacity: hookIn }}>
            <Typed
              text="1959년 추석날, 남해안"
              start={4}
              cps={30}
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
                start={32}
                cps={8}
                style={{
                  color: INK.oxideHot,
                  fontSize: 270,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              />
              <Typed
                text="명"
                start={44}
                cps={8}
                style={{ color: C.text, fontSize: 92, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="아직 깨지지 않은 태풍 인명피해 1위"
              start={62}
              cps={22}
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
const Track: React.FC<{ t: Typhoon; p: number; dim: number; frame: number }> = ({
  t,
  p,
  dim,
  frame,
}) => {
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
            strokeWidth={2}
            strokeDasharray="7 6"
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
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.14}
      />
      <path
        d={d}
        fill="none"
        stroke={t.color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 최저 중심기압 지점 — 이 태풍이 가장 강했던 곳 */}
      {p > 0.45 && (
        <g opacity={0.85}>
          <circle
            cx={peak.x}
            cy={peak.y}
            r={9}
            fill="none"
            stroke={t.color}
            strokeWidth={2}
            strokeDasharray="3 3"
          />
          <text
            x={peak.x + (t.peakDx ?? 14)}
            y={peak.y + (t.peakDy ?? 6)}
            textAnchor={t.peakAnchor ?? "start"}
            fontSize={18}
            fontWeight={900}
            fill={t.color}
            style={{ paintOrder: "stroke", stroke: SEA, strokeWidth: 5 }}
          >
            최저 {peak.hpa}hPa
          </text>
        </g>
      )}

      {/* 상륙 지점 */}
      {p > 0.62 && (
        <>
          <circle cx={land.x} cy={land.y} r={13} fill="none" stroke={t.color} strokeWidth={3} />
          <circle cx={land.x} cy={land.y} r={4} fill={t.color} />
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
              strokeWidth={2 + k * 2.6}
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
            strokeWidth={2.5 + k * 2}
          />
        </g>
      )}
    </g>
  );
};
