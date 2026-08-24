import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import provinces from "./data/provinces.json";
import {
  BODY_CM,
  CAST,
  SITES,
  TOP_N,
  fmt,
} from "./data/snow";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(2.2 * FPS);

const BG = "#0B0D12";
const LAND_F = "#1C2230";
const LAND_S = "#2A3242";
/** 쌓인 눈 */
const SNOW = "#E8F0F8";
/** 눈에 잠기지 않은 사람 */
const BODY = "#8A97AD";
/** 1위 */
const HOT = "#5FA8D6";

/**
 * 한 곳에 머무는 시간(초).
 *
 * 10위에서 1위로 올라간다. 뒤로 갈수록 길게 잡는다 — 앞쪽은 눈이
 * 차오르는 것만 보이면 되고, 위로 갈수록 한 계단이 무겁다.
 */
const HOLD = [2.0, 2.0, 2.0, 2.0, 2.2, 2.4, 2.6, 3.0, 3.4, 6.4];

const SLOTS: Array<{ t0: number; t1: number }> = [];
{
  let f = HOOK;
  CAST.forEach((_, i) => {
    const len = Math.round((HOLD[i] ?? 2.4) * FPS);
    SLOTS.push({ t0: f, t1: f + len });
    f += len;
  });
}
const BODY_END = SLOTS[SLOTS.length - 1].t1;
const OUTRO = Math.round(6.5 * FPS);
export const SNOW_DURATION = BODY_END + OUTRO;

function stepAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) {
    if (frame >= SLOTS[i].t0) return i;
  }
  return 0;
}

/* ── 사람과 눈 ──────────────────────────────────────
   cm를 아무리 크게 써도 감이 안 온다. 키 170cm 사람을 세워 놓고
   눈을 실제 비율로 차오르게 한다. 잠긴 부분은 눈에 가려 안 보인다. */
/** 발이 닿는 자리 */
const GROUND = 1500;
/** 키 170cm를 몇 px로 그리나 */
const BODY_PX = 700;
/** 1cm = 몇 px */
const K = BODY_PX / BODY_CM;
const MAN_X = 300;
const HEAD = GROUND - BODY_PX;

/** 사람 실루엣. 머리·몸통·다리·팔. */
const Man: React.FC<{ fill: string }> = ({ fill }) => {
  const h = BODY_PX;
  const headR = h * 0.062;
  const shoulder = HEAD + h * 0.17;
  const hip = HEAD + h * 0.52;
  const bodyW = h * 0.115;
  const legW = h * 0.048;
  return (
    <g fill={fill}>
      <circle cx={MAN_X} cy={HEAD + headR} r={headR} />
      <rect x={MAN_X - bodyW / 2} y={shoulder} width={bodyW} height={hip - shoulder} rx={h * 0.02} />
      {/* 팔 */}
      <rect x={MAN_X - bodyW / 2 - legW * 0.9} y={shoulder + h * 0.01}
            width={legW * 0.8} height={h * 0.29} rx={legW * 0.4} />
      <rect x={MAN_X + bodyW / 2 + legW * 0.1} y={shoulder + h * 0.01}
            width={legW * 0.8} height={h * 0.29} rx={legW * 0.4} />
      {/* 다리 */}
      <rect x={MAN_X - bodyW / 2 + h * 0.004} y={hip - h * 0.01}
            width={legW} height={GROUND - hip + h * 0.01} rx={legW * 0.4} />
      <rect x={MAN_X + bodyW / 2 - legW - h * 0.004} y={hip - h * 0.01}
            width={legW} height={GROUND - hip + h * 0.01} rx={legW * 0.4} />
    </g>
  );
};

/** 눈이 사람 어디까지 오나 — 화면에 없는 것을 자막이 말한다 */
function wherePart(v: number): string {
  const r = v / BODY_CM;
  if (r >= 0.82) return "목까지";
  if (r >= 0.62) return "가슴까지";
  if (r >= 0.5) return "허리 위까지";
  if (r >= 0.4) return "허벅지까지";
  return "무릎 위까지";
}

export const ShortsSnow: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const si = stepAt(frame);
  const cur = CAST[si];
  const prev = si > 0 ? CAST[si - 1] : null;
  const inOutro = frame >= BODY_END;
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 눈이 차오르는 중 — 앞 지점 높이에서 이번 높이로 */
  const rise = interpolate(frame, [SLOTS[si].t0, SLOTS[si].t0 + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const from = prev ? prev.v : 0;
  const shown = frame < HOOK ? 0 : from + (cur.v - from) * rise;
  const snowTop = GROUND - shown * K;

  const isTop = si === CAST.length - 1;
  /** 계기판과 지도 점만 1위 색을 쓴다. 눈은 언제나 눈 색이다. */
  const c = isTop ? HOT : SNOW;
  const snowFill = isTop ? "#DCEAF7" : SNOW;

  /** 연도가 굵게 굴러간다 */
  const [yy, mm, dd] = cur.d.split("-");

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-sn.wav")} volume={0.9} />

      {/* ── 배경 지도 — 어디인지만 준다 ── */}
      <AbsoluteFill style={{ opacity: 0.85 }}>
        <svg
          viewBox="200 250 700 1000"
          preserveAspectRatio="xMidYMin slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND_F} stroke={LAND_S} strokeWidth={1.6} />
          ))}
          {frame >= HOOK &&
            CAST.slice(si).map((s, i) => {
              const now = i === 0;
              return (
                <circle
                  key={s.id}
                  cx={s.x}
                  cy={s.y}
                  r={now ? 12 : 5}
                  fill={now ? c : "#3E4757"}
                  opacity={now ? 1 : 0.7}
                />
              );
            })}
        </svg>
      </AbsoluteFill>

      {/* 지도를 깔고 그 위에 다 그린다 */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(9,11,16,0.9) 0%, rgba(9,11,16,0.72) 40%, rgba(9,11,16,0.9) 78%)",
        }}
      />

      {/* ── 사람과 눈 ── */}
      {/* 마무리에서는 통째로 접는다. 흰 눈 위에 스크림을 얹으면
          수위선 라벨이 표 뒤로 비친다. */}
      {!inOutro && (
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {/* 키 자 — 170cm */}
        <line x1={MAN_X - 128} y1={HEAD} x2={MAN_X - 74} y2={HEAD}
              stroke="#4A5466" strokeWidth={3} />
        <text x={MAN_X - 136} y={HEAD + 12} fontSize={30} fontWeight={800}
              fill="#6C7789" textAnchor="end">
          {BODY_CM}cm
        </text>

        <Man fill={BODY} />

        {/* 쌓인 눈 — 잠긴 부분은 가려진다 */}
        <rect x={0} y={snowTop} width={1080} height={1920 - snowTop} fill={snowFill} />

        {/*
          지나온 기록의 수위선.

          눈이 차오르기만 하면 앞에 뭐가 있었는지 잊는다. 지나온
          자리에 선을 남기면 '이만큼 더 왔다'가 눈에 쌓인다.
          값이 붙은 지점끼리 라벨이 겹치므로 아래에서 위로 밀어낸다.
        */}
        {frame >= HOOK &&
          (() => {
            // 위(큰 값)부터 자리를 잡고 아래로 밀어낸다. 아래에서
            // 위로 밀면 큰 값 라벨이 자기 선에서 떠 버린다.
            const MIN = 46;
            let last = -Infinity;
            return CAST.slice(0, si).slice().reverse().map((s2) => {
              const y = GROUND - s2.v * K;
              const ly = Math.max(y - 12, last + MIN);
              last = ly;
              return (
                <g key={s2.id}>
                  <line x1={0} y1={y} x2={1080} y2={y}
                        stroke="#9AAEC0" strokeWidth={2} strokeDasharray="9 11" />
                  <text x={1080 - SAFE_RIGHT} y={ly} fontSize={31} fontWeight={800}
                        fill="#68788A" textAnchor="end">
                    {s2.rank}위 {s2.name} {s2.v.toFixed(1)}cm · {s2.d.slice(0, 4)}
                  </text>
                </g>
              );
            });
          })()}

        {/* 눈 위에 값 */}
        {frame >= HOOK && (
          <>
            <text
              x={MAN_X + 96}
              y={snowTop - 30}
              fontSize={104}
              fontWeight={900}
              fill={c}
              style={{ fontVariantNumeric: "tabular-nums", paintOrder: "stroke", stroke: BG, strokeWidth: 14 }}
            >
              {shown.toFixed(1)}cm
            </text>
            {/* 오른쪽은 지나온 기록의 수위선 라벨이 쓴다. 사람 왼쪽에 붙인다. */}
            <text
              x={MAN_X - 76}
              y={snowTop + 62}
              fontSize={44}
              fontWeight={900}
              fill="#3A4658"
              textAnchor="end"
            >
              {wherePart(cur.v)}
            </text>
          </>
        )}

      </svg>
      )}

      {/* ── 계기판 — 순위·지점·언제 ── */}
      {frame >= HOOK && !inOutro && (
        <div style={{ position: "absolute", left: TEXT_X, right: SAFE_RIGHT, top: SAFE_TOP }}>
          <div
            style={{
              color: "#7C8496",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            하루에 쌓인 눈 · 전국 {TOP_N}위
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
            <span style={{ color: c, fontSize: 68, fontWeight: 900 }}>{cur.rank}위</span>
            <span style={{ color: c, fontSize: 92, fontWeight: 900 }}>{cur.name}</span>
          </div>
          {/* 몇 년인지가 이 편의 절반이다. 연도를 제일 크게 쓴다. */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 10 }}>
            <span
              style={{
                color: "#EDF2F8",
                fontSize: 96,
                fontWeight: 900,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {yy}
            </span>
            <span
              style={{
                color: "#96A0B2",
                fontSize: 52,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Number(mm)}월 {Number(dd)}일
            </span>
          </div>
        </div>
      )}

      {/* ── 자막 — 화면에 없는 것 한 줄 ── */}
      {frame >= HOOK && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 34,
            color: "#12161E",
            fontSize: 46,
            fontWeight: 900,
            lineHeight: 1.24,
            wordBreak: "keep-all",
          }}
        >
          {cur.name === "대구"
            ? "1942년 40.0도를 찍은 그 대구"
            : cur.name === "목포"
              ? "해방 이듬해 겨울, 80년째 안 깨짐"
              : cur.name === "울릉도"
                ? "동해 한복판 · 2위 대관령의 1.64배"
                : cur.name === "대관령"
                  ? "여기까지가 강원도 산"
                  : `관측 시작 ${cur.y0}년 이후 가장 많이 온 하루`}
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            backgroundColor: "rgba(9,11,16,0.94)",
            opacity: outroIn,
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
          }}
        >
          <div
            style={{
              color: "#7C8496",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 2,
              marginBottom: 16,
            }}
          >
            하루에 쌓인 눈 · 역대 전국 {TOP_N}위
          </div>
          {SITES.slice(0, TOP_N).map((s, i) => {
            const at = BODY_END + Math.round((0.3 + i * 0.17) * FPS);
            const on = interpolate(frame, [at, at + 9], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const top = i === 0;
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 16,
                  marginTop: 4,
                  opacity: on,
                  transform: `translateY(${(1 - on) * 8}px)`,
                }}
              >
                <span
                  style={{
                    color: top ? HOT : "#77808F",
                    fontSize: 34,
                    fontWeight: 900,
                    width: 56,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    color: top ? HOT : "#EDF2F8",
                    fontSize: 38,
                    fontWeight: 800,
                    width: 168,
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    color: "#77808F",
                    fontSize: 32,
                    fontWeight: 800,
                    flex: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(s.d)}
                </span>
                <span
                  style={{
                    color: top ? HOT : "#EDF2F8",
                    fontSize: 38,
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.v.toFixed(1)}cm
                </span>
              </div>
            );
          })}
          <div
            style={{
              color: "#EDF2F8",
              fontSize: 44,
              fontWeight: 900,
              lineHeight: 1.32,
              marginTop: 24,
              wordBreak: "keep-all",
              opacity: interpolate(
                frame,
                [BODY_END + Math.round(2.4 * FPS), BODY_END + Math.round(3.1 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            하루에 어른 키의 {(CAST[CAST.length - 1].body * 100).toFixed(0)}%
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: hookOut,
            backgroundColor: "rgba(8,10,14,0.5)",
            // 가운데 두면 사람 몸을 덮는다. 사람 머리 위에 올린다.
            justifyContent: "flex-start",
            padding: `${SAFE_TOP + 30}px ${SAFE_RIGHT}px 0 ${TEXT_X}px`,
          }}
        >
          <div style={{ color: HOT, fontSize: 46, fontWeight: 800, marginBottom: 10 }}>
            하루에 쌓인 눈
          </div>
          <div
            style={{
              color: "#EDF2F8",
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.16,
              wordBreak: "keep-all",
            }}
          >
            어디까지 왔을까
          </div>
        </AbsoluteFill>
      )}

      <Grain opacity={0.24} vignette={0.3} />
    </AbsoluteFill>
  );
};
