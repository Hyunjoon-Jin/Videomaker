import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { BEATS, HOLD, LAND, MAP, SHIPS, STOPS } from "./data/odyssey";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(2.2 * FPS);

/** 바탕이 바다다 */
const BG = "#0E1418";
const SEA_LAND = "#4E4333";
/** 지금 가는 길 */
const HOT = "#D4694F";
const INK = "#EDE5D4";
const DIM = "#8E8474";
/** 지나온 길 */
const PAST = "#6B5A46";

const SLOTS: Array<{ t0: number; t1: number }> = [];
{
  let f = HOOK;
  HOLD.forEach((h) => {
    const len = Math.round(h * FPS);
    SLOTS.push({ t0: f, t1: f + len });
    f += len;
  });
}
const BODY_END = SLOTS[SLOTS.length - 1].t1;
const OUTRO = Math.round(6.0 * FPS);
export const ODYSSEY_DURATION = BODY_END + OUTRO;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

const MSCALE = MAP.scale;
const mx = (x: number) => MAP.left + x * MSCALE;
const my = (y: number) => MAP.top + y * MSCALE;

/** 배가 다음 자리로 옮겨 가는 데 걸리는 시간 */
const SAILF = Math.round(0.8 * FPS);

/* ── 남은 배 ────────────────────────────────────────
   트로이를 떠날 때 12척. 라이스트리고네스에서 11척이 한꺼번에 죽고,
   벼락에 마지막 한 척이 부서진다. 열두 칸이 꺼지는 것으로 보인다. */
const SHIP_X = TEXT_X;
const SHIP_Y = 372;
const SHIP_W = 26;
const SHIP_H = 34;
const SHIP_GAP = 8;

/**
 * 한 걸음의 길을 진행도만큼 그린다.
 *
 * 점 번호가 아니라 **길이로** 나눈다. 뱃길은 마디 길이가 제각각이라
 * 번호로 나누면 배가 좁은 해협에서 갑자기 빨라진다.
 */
function drawn(route: [number, number][], g: number): [number, number][] {
  const n = route.length;
  if (n < 2) return route;
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < n - 1; i++) {
    const d = Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
    seg.push(d);
    total += d;
  }
  let want = g * total;
  const out: [number, number][] = [route[0]];
  for (let i = 0; i < n - 1; i++) {
    if (want >= seg[i]) {
      want -= seg[i];
      out.push(route[i + 1]);
      continue;
    }
    const t = seg[i] === 0 ? 0 : want / seg[i];
    out.push([
      route[i][0] + (route[i + 1][0] - route[i][0]) * t,
      route[i][1] + (route[i + 1][1] - route[i][1]) * t,
    ]);
    break;
  }
  return out;
}

export const ShortsOdyssey: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const c = BEATS[bi];
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const age = frame - SLOTS[bi].t0;
  /** 배가 이번 구간을 지나는 진행도 */
  const sail = interpolate(age, [4, 4 + SAILF], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 배가 닿고 나서 사건 한 줄이 뜨는 정도 */
  const say = interpolate(age, [4 + SAILF - 6, 4 + SAILF + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const here = drawn(c.route, sail);
  const ship = here[here.length - 1];
  const ships = inOutro ? 0 : sail >= 1 ? c.ships : bi === 0 ? SHIPS : BEATS[bi - 1].ships;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-od.wav")} volume={0.85} />

      {/* ── 지도 — 0프레임부터 지중해가 떠 있다 ── */}
      <svg
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <g transform={`translate(${MAP.left} ${MAP.top}) scale(${MSCALE})`}>
          {LAND.map((d, i) => (
            <path key={i} d={d} fill={SEA_LAND} stroke={BG} strokeWidth={1.2} />
          ))}
        </g>
      </svg>

      {/* 위아래 글자 자리를 눌러 지도가 글씨를 안 갉아먹게 한다.
          길과 배는 이 덮개 위에 그린다 — 눌리면 동선이 안 보인다 */}
      <AbsoluteFill
        style={{
          background:
            `linear-gradient(180deg, ${BG} 0%, ${BG}F2 20%, ${BG}00 24%,` +
            ` ${BG}00 66%, ${BG}E6 72%, ${BG} 76%)`,
        }}
      />

      <svg
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {/* 정거장. 채운 점은 본문의 실재 지명, 빈 점은 비정이다 */}
        {STOPS.map((s) => (
          <circle
            key={s.name}
            cx={mx(s.x)}
            cy={my(s.y)}
            r={8}
            fill={s.sure ? DIM : BG}
            stroke={DIM}
            strokeWidth={3}
          />
        ))}

        {/* 지나온 길은 옅게 남는다 */}
        {BEATS.map((b, i) => {
          if (!started || frame < SLOTS[i].t0) return null;
          const cur = i === bi && !inOutro;
          const pts = cur ? here : b.route;
          const prev = i === 0 ? null : BEATS[i - 1].at;
          const head = prev ? [prev, ...pts] : pts;
          return (
            <polyline
              key={"r" + i}
              points={head.map((p) => `${mx(p[0])},${my(p[1])}`).join(" ")}
              fill="none"
              stroke={cur ? HOT : PAST}
              strokeWidth={cur ? 5 : 3}
              strokeLinejoin="round"
              opacity={cur ? 1 : 0.75}
            />
          );
        })}

        {/* 배 */}
        {started && !inOutro && (
          <circle cx={mx(ship[0])} cy={my(ship[1])} r={13} fill={INK} />
        )}

        {/* 이번 자리 이름표. 배가 닿을 때 켠다.
            오케아노스 끝은 지도 밖이라 서쪽 가장자리로 당겨 놓는다 */}
        {started && !inOutro && (
          <text
            x={Math.min(1000, Math.max(60, mx(c.mark[0]))) +
               (c.mark[0] > 620 ? -22 : 22)}
            y={my(c.mark[1]) + 13}
            fontSize={40}
            fontWeight={900}
            fill={INK}
            textAnchor={c.mark[0] > 620 ? "end" : "start"}
            stroke={BG}
            strokeWidth={7}
            paintOrder="stroke"
            opacity={say}
          >
            {c.title}
          </text>
        )}
      </svg>

      {/* ── 남은 배 ── */}
      {started && !inOutro && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {Array.from({ length: SHIPS }).map((_, i) => (
            <rect
              key={i}
              x={SHIP_X + i * (SHIP_W + SHIP_GAP)}
              y={SHIP_Y}
              width={SHIP_W}
              height={SHIP_H}
              rx={4}
              fill={i < ships ? HOT : "none"}
              stroke={i < ships ? HOT : "#3A342B"}
              strokeWidth={3}
            />
          ))}
          <text
            x={SHIP_X + SHIPS * (SHIP_W + SHIP_GAP) + 14}
            y={SHIP_Y + SHIP_H - 4}
            fontSize={34}
            fontWeight={900}
            fill={ships ? HOT : DIM}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {ships}척
          </text>
        </svg>
      )}

      {/* ── 무슨 일이 있었는지 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 84,
            opacity: say,
          }}
        >
          <div
            style={{
              color: INK,
              fontSize: 46,
              fontWeight: 900,
              lineHeight: 1.32,
              textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
            }}
          >
            {c.what.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <div style={{ color: DIM, fontSize: 27, fontWeight: 800, marginTop: 8 }}>
            {c.cite}
          </div>
        </div>
      )}

      {/* 화면 고지 — 무엇이 기록이고 무엇이 근사인지 */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 20,
            color: DIM,
            fontSize: 25,
            fontWeight: 700,
          }}
        >
          빈 점은 널리 쓰이는 비정
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(14,20,24,0.06) 0%," +
              " rgba(14,20,24,0.12) 55%, rgba(14,20,24,0.90) 70%," +
              " rgba(14,20,24,0.97) 78%)",
            opacity: outroIn,
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
          }}
        >
          <div
            style={{
              color: DIM,
              fontSize: 27,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            호메로스 오디세이아 · 숫자는 권.행 · 빈 점은 널리 쓰이는 비정
          </div>
          <div
            style={{
              color: INK,
              fontSize: 54,
              fontWeight: 900,
              lineHeight: 1.28,
              marginTop: 14,
              opacity: interpolate(
                frame,
                [BODY_END + Math.round(0.6 * FPS), BODY_END + Math.round(1.4 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            <div>배 12척으로 떠나</div>
            <div>혼자 돌아오기까지 20년</div>
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <>
          <AbsoluteFill
            style={{ opacity: hookOut, backgroundColor: "rgba(14,20,24,0.34)" }}
          />
          <div
            style={{
              position: "absolute",
              left: TEXT_X,
              right: SAFE_RIGHT,
              bottom: BOTTOM_INSET + 60,
              opacity: hookOut,
            }}
          >
            <div
              style={{
                color: HOT,
                fontSize: 150,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -2,
                fontVariantNumeric: "tabular-nums",
                textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
              }}
            >
              12척
            </div>
            <div
              style={{
                color: INK,
                fontSize: 50,
                fontWeight: 900,
                lineHeight: 1.22,
                marginTop: 14,
                textShadow: `0 0 24px ${BG}`,
              }}
            >
              <div>트로이를 떠난 배</div>
              <div>20년 뒤 돌아온 사람 1명</div>
            </div>
          </div>
        </>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
