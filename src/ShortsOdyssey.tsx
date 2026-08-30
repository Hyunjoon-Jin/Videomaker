import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { BEATS, HOLD, LAND, LAST, MAP, SHIPS, STOPS } from "./data/odyssey";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { OdysseyFigure } from "./OdysseyFigure";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(2.8 * FPS);

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
const OUTRO = Math.round(5.0 * FPS);
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

/** 이보다 오른쪽에 있는 이름표는 왼쪽으로 편다. 안 그러면 화면을 넘는다 */
const RIGHTISH = 560;

/* ── 괴물 실루엣 ────────────────────────────────────
   맞닥뜨린 것을 **그 자리 옆에** 놓는다. 한켠에 몰아 두면 무엇을
   만났는지는 알아도 어디서 벌어진 일인지가 안 붙는다.

   자리는 손으로 잡았다. 이름표와 안 겹치고, 뭍보다 바다 쪽으로
   민다. 위 352px·아래·오른쪽 180px은 쇼츠 UI가 덮으니 그 안에
   다 들어가야 한다(`src/safe.ts`). 왼쪽 위 모서리 화면 좌표다. */
const FIG_W = 150;
const FIG_AT: Record<string, [number, number]> = {
  전사: [735, 645],     // 이스마로스 이름표 아래, 에게해
  로토스: [225, 900],    // 제르바 위 바다
  키클롭스: [420, 900],  // 시칠리아 동쪽 이오니아해
  자루: [700, 900],      // 이타카 남쪽 바다
  거인: [160, 880],      // 트라파니 아래 시칠리아 해협
  돼지: [250, 645],      // 몬테 치르체오 아래 바다
  스킬라: [520, 880],    // 메시나 남쪽 바다
  소: [350, 1030],       // 몰타 남쪽 바다
};

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

  /**
   * i번째 줄이 지금 얼마나 보이는지.
   *
   * 걸음의 남은 시간을 글자 수로 나눠 한 줄씩 갈아 끼운다.
   * 마지막 줄은 걸음이 끝날 때까지 남는다.
   */
  const lineOn = (i: number) => {
    const n = c.what.length;
    if (n === 1) return say;
    const t0 = 4 + SAILF;
    const span = SLOTS[bi].t1 - SLOTS[bi].t0 - t0;
    const chars = c.what.map((l) => l.length);
    const total = chars.reduce((a, b) => a + b, 0);
    let head = t0;
    for (let k = 0; k < i; k++) head += (span * chars[k]) / total;
    const tail = head + (span * chars[i]) / total;
    const inn = interpolate(age, [head - 6, head + 6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    if (i === n - 1) return Math.min(inn, say);
    const outt = interpolate(age, [tail - 6, tail + 6], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return Math.min(inn, outt, say);
  };

  const here = drawn(c.route, sail);
  const ship = here[here.length - 1];
  /** 마무리에서 마지막 이타카행이 그려지는 정도 */
  const lastG = interpolate(frame, [BODY_END, BODY_END + Math.round(1.6 * FPS)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lastPts = drawn(LAST, lastG);
  const lastShip = lastPts[lastPts.length - 1];
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

        {/* 마무리에서 마지막 이타카행을 이어 동선을 닫는다 */}
        {inOutro && (
          <>
            <polyline
              points={lastPts.map((p) => `${mx(p[0])},${my(p[1])}`).join(" ")}
              fill="none"
              stroke={HOT}
              strokeWidth={5}
              strokeLinejoin="round"
            />
            <text
              x={mx(LAST[LAST.length - 1][0]) - 22}
              y={my(LAST[LAST.length - 1][1]) + 13}
              fontSize={40}
              fontWeight={900}
              fill={INK}
              textAnchor="end"
              stroke={BG}
              strokeWidth={7}
              paintOrder="stroke"
              opacity={lastG}
            >
              이타카
            </text>
          </>
        )}

        {/* 배 */}
        {started && (
          <circle
            cx={mx(inOutro ? lastShip[0] : ship[0])}
            cy={my(inOutro ? lastShip[1] : ship[1])}
            r={13}
            fill={INK}
          />
        )}

        {/* 이번 자리 이름표. 배가 닿을 때 켠다 */}
        {started && !inOutro && (
          <text
            x={Math.min(1000, Math.max(60, mx(c.mark[0]))) +
               (c.mark[0] > RIGHTISH ? -22 : 22)}
            y={my(c.mark[1]) + 13}
            fontSize={40}
            fontWeight={900}
            fill={INK}
            textAnchor={c.mark[0] > RIGHTISH ? "end" : "start"}
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

      {/* ── 맞닥뜨린 것 ── */}
      {started && !inOutro && FIG_AT[c.fig] && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <defs>
            {/* 지도가 밝은 자리에 걸려도 실루엣이 읽히게 뒤를 눌러 둔다 */}
            <radialGradient id="figveil">
              <stop offset="0%" stopColor={BG} stopOpacity={0.85} />
              <stop offset="58%" stopColor={BG} stopOpacity={0.6} />
              <stop offset="100%" stopColor={BG} stopOpacity={0} />
            </radialGradient>
          </defs>
          <g opacity={say}>
            <ellipse
              cx={FIG_AT[c.fig][0] + FIG_W / 2}
              cy={FIG_AT[c.fig][1] + FIG_W / 2}
              rx={FIG_W * 0.76}
              ry={FIG_W * 0.72}
              fill="url(#figveil)"
            />
            <g
              transform={`translate(${FIG_AT[c.fig][0]} ${FIG_AT[c.fig][1]}) scale(${FIG_W / 100})`}
            >
              <OdysseyFigure name={c.fig} />
            </g>
          </g>
        </svg>
      )}

      {/* ── 무슨 일이 있었는지 ──
           **한 번에 한 줄이다.** 두세 줄을 한꺼번에 띄우면 눈이
           어디를 읽을지 고르느라 지도를 못 본다. 한 줄씩 갈아 끼우면
           읽는 데가 늘 같은 자리다.
           줄마다 머무는 시간은 글자 수로 나눈다 — 12자짜리와
           23자짜리에 같은 시간을 주면 하나는 늘어지고 하나는 놓친다 */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 76,
          }}
        >
          {c.what.map((line, i) => (
            <div
              key={line}
              style={{
                position: i === 0 ? "relative" : "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                color: INK,
                // 한 줄이 23자까지 간다. 50이면 글자 자리를 넘는다
                fontSize: 44,
                fontWeight: 900,
                lineHeight: 1.34,
                textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
                opacity: lineOn(i),
              }}
            >
              {line}
            </div>
          ))}
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
          빈 점은 추정 위치
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
            호메로스 오디세이아 · 빈 점은 추정 위치
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
            <div>12척으로 떠나</div>
            <div>20년 만에 혼자 돌아오다</div>
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
              <div>트로이 전쟁을 끝내고</div>
              <div>이타카로 돌아가는 길</div>
            </div>
          </div>
        </>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
