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
  TYPHOONS,
  Typhoon,
  eaProject,
  intensity,
  peakOf,
  stormRadius,
  trackPathTo,
  trackPointAt,
} from "./data/typhoon";
import { C, FPS } from "./theme";
import { useFonts } from "./fonts";

const HOOK = Math.round(3 * FPS);
/** 태풍 한 편당 배분 */
const PER = Math.round(7 * FPS);
/** 마무리 — 넷을 겹쳐 보여주는 구간 */
const OUTRO = Math.round(7 * FPS);

export const TY_DURATION = HOOK + PER * TYPHOONS.length + OUTRO;

const SEA = "#0E1520";
const LAND = "#1E2634";
const LAND_S = "#2C3646";
const KOREA_F = "#2A3648";
const KOREA_S = "#4A5A72";

export const ShortsTyphoon: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  // 어느 태풍 구간인가
  const afterHook = frame - HOOK;
  const idx = Math.max(0, Math.min(TYPHOONS.length - 1, Math.floor(afterHook / PER)));
  const local = afterHook - idx * PER;
  const inOutro = afterHook >= PER * TYPHOONS.length;

  const cur = TYPHOONS[idx];
  /** 지금 이 순간의 태풍 상태 — 기압이 실시간으로 변한다 */
  const now = trackPointAt(cur, Math.max(0, Math.min(1, (local / (PER * 0.75)))));
  /** 현재 태풍의 경로 진행도 — 구간의 앞 75%에 걸쳐 그린다 */
  const prog = interpolate(local, [0, PER * 0.75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hookOut = interpolate(frame, [HOOK - 16, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const mapIn = interpolate(frame, [HOOK - 10, HOOK + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outroIn = interpolate(
    afterHook,
    [PER * TYPHOONS.length, PER * TYPHOONS.length + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

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
                  fill="#8A94A6"
                  style={{ paintOrder: "stroke", stroke: SEA, strokeWidth: 4 }}
                >
                  {is.name}
                </text>
              </g>
            );
          })}

          {/* 지나간 태풍은 옅게 남겨 누적을 보여준다 */}
          {TYPHOONS.map((t, i) => {
            if (inOutro) return <Track key={t.id} t={t} p={1} dim={outroIn < 1 ? 0.5 : 1} frame={frame} />;
            if (i < idx) return <Track key={t.id} t={t} p={1} dim={0.34} frame={frame} />;
            if (i === idx) return <Track key={t.id} t={t} p={prog} dim={1} frame={frame} />;
            return null;
          })}
        </svg>
      </AbsoluteFill>

      {/* 가독성용 상하 그라데이션 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${SEA} 0%, rgba(14,21,32,0.72) 18%, rgba(14,21,32,0) 36%, rgba(14,21,32,0) 48%, rgba(14,21,32,0.88) 68%, ${SEA} 82%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── 태풍 정보 ── */}
      {mapIn > 0.5 && !inOutro && (
        <>
          <div style={{ position: "absolute", top: 110, left: 60, right: 60 }}>
            <div style={{ color: C.dim, fontSize: 32, fontWeight: 700, letterSpacing: 2 }}>
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

          <div style={{ position: "absolute", bottom: 250, left: 60, right: 60 }}>
            <div style={{ color: C.dim, fontSize: 30, fontWeight: 700 }}>
              중심기압 · 상륙 {cur.landfall}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                marginTop: 2,
              }}
            >
              <span
                style={{
                  color: C.text,
                  fontSize: 104,
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {now.hpa.toFixed(1)}
              </span>
              <span style={{ color: C.dim, fontSize: 44, fontWeight: 700 }}>hPa</span>
            </div>
            <div style={{ color: "#C7CEDB", fontSize: 34, fontWeight: 500, marginTop: 6 }}>
              {cur.wind}
            </div>
            <div style={{ color: cur.color, fontSize: 34, fontWeight: 700, marginTop: 8 }}>
              {cur.toll}
            </div>
          </div>
        </>
      )}

      {/* ── 마무리 — 넷 다 9월 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: "0 60px 210px",
            opacity: outroIn,
          }}
        >
          <div style={{ color: C.dim, fontSize: 36, fontWeight: 700, letterSpacing: 2 }}>
            사라 · 루사 · 매미 · 힌남노
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 104,
              fontWeight: 900,
              lineHeight: 1.1,
              marginTop: 8,
            }}
          >
            넷 다 9월이었다
          </div>
          <div style={{ color: "#C7CEDB", fontSize: 36, fontWeight: 500, marginTop: 12 }}>
            최악의 태풍은 늘 가을에 왔다
          </div>
        </AbsoluteFill>
      )}

      {/* ── 범례 · 고지 ── */}
      {mapIn > 0.5 && (
        <div style={{ position: "absolute", bottom: 76, left: 60, right: 60 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
            {TYPHOONS.map((t, i) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: inOutro || i <= idx ? 1 : 0.35,
                }}
              >
                <div
                  style={{ width: 22, height: 6, borderRadius: 3, background: t.color }}
                />
                <span style={{ color: "#C7CEDB", fontSize: 24, fontWeight: 700 }}>
                  {t.name}
                </span>
              </div>
            ))}
          </div>
          <div style={{ color: "#5C6577", fontSize: 19, lineHeight: 1.5 }}>
            경로는 알려진 진로의 근사 · 상륙 지점과 중심기압은 기록값
            <br />
            점 사이는 보간이므로 시각별 정확한 위치가 아님
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
            alignItems: "center",
            padding: 60,
          }}
        >
          <div style={{ opacity: hookIn, textAlign: "center" }}>
            <div style={{ color: C.dim, fontSize: 44, fontWeight: 700, letterSpacing: 3 }}>
              한국을 때린 최악의 태풍
            </div>
            <div
              style={{
                color: "#F87171",
                fontSize: 360,
                fontWeight: 900,
                lineHeight: 1,
                marginTop: 14,
              }}
            >
              4
            </div>
            <div style={{ color: C.text, fontSize: 88, fontWeight: 900, marginTop: -4 }}>
              모두 9월
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

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
 * 경로 한 갈래 + 폭풍 본체.
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

  return (
    <g opacity={dim}>
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
        strokeDasharray="1 0"
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
