import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  BIG,
  FEW,
  TIMES,
  TOP_DONG,
  TOP_DOTS,
  HOLD,
  HOOK_SEC,
  OUTRO_SEC,
  PER_DOT,
  STEPS,
  UNITS,
  VOICE,
  VOICE_ESTIMATED,
} from "./data/few";
import { REGIONS } from "./data/regions";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, OUTRO_PAD, SAFE_RIGHT, TEXT_X } from "./safe";

const HOOK = Math.round(HOOK_SEC * FPS);

/** BGM을 아직 안 골랐으면 안 건다 */
const HAS_BGM = false;

const BG = "#0E1418";
/** 나머지 전국 */
const LAND = "#2F2820";
/** 이번 지자체 */
const HOT = "#D4694F";
const INK = "#EDE5D4";
const DIM = "#8E8474";

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
const OUTRO = Math.round(OUTRO_SEC * FPS);
export const FEW_DURATION = BODY_END + OUTRO;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

const ASPECT = 1920 / 1080;

/**
 * 카메라가 겨누는 자리가 화면 세로 어디에 오는지.
 * 한가운데에 두면 아래 글자 블록이 그림 밑동을 덮는다.
 */
const CENTER_Y = 800;

/** 옮겨 가는 데 걸리는 시간 */
const FLY = Math.round(0.7 * FPS);

const ease = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

interface Cam {
  cx: number;
  cy: number;
  w: number;
}

/**
 * 그 지자체가 화면에 꽉 차게 카메라를 잡는다.
 *
 * **경계가 아니라 점이 담기게 잡는다.** 울릉군은 독도까지 넣으면
 * 가로가 149단위인데, 사람이 사는 울릉도 본섬은 그 10분의 1이다.
 * 경계에 맞추면 정작 볼 것이 점만 해진다.
 *
 * 21편은 배율을 다섯 걸음 내내 묶었다. 그쪽은 넓이를 견주는
 * 편이라 그래야 했고, **이 편은 점 개수를 세는 편이라 묶을 까닭이
 * 없다.** 오히려 꽉 채워야 점이 또렷하다.
 */
function camOf(u: { dots: [number, number][] }): Cam {
  const xs = u.dots.map((p) => p[0]);
  const ys = u.dots.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const w = Math.max((x1 - x0) * 1.35, ((y1 - y0) * 1.35) / ASPECT, 16);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w };
}

const AT: Cam[] = STEPS.map(camOf);
const WIDE: Cam = { cx: 500, cy: 470, w: 980 };

function blend(a: Cam, b: Cam, t: number, arc: number): Cam {
  const e = ease(t);
  const lift = Math.sin(Math.PI * e) * arc;
  return {
    cx: a.cx + (b.cx - a.cx) * e,
    cy: a.cy + (b.cy - a.cy) * e,
    w: Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * e + lift),
  };
}

function camAt(frame: number): Cam {
  if (frame < HOOK) return WIDE;
  if (frame >= BODY_END) {
    const t = (frame - BODY_END) / Math.round(2.4 * FPS);
    return blend(AT[AT.length - 1], WIDE, t, 0);
  }
  const i = beatAt(frame);
  const from = i === 0 ? WIDE : AT[i - 1];
  const t = (frame - SLOTS[i].t0) / FLY;
  return blend(from, AT[i], t, 0);
}

export const ShortsFew: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 12, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const c = STEPS[bi];
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const age = frame - SLOTS[bi].t0;

  const settle = interpolate(age, [FLY - 6, FLY + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 점이 하나씩 찍히는 정도. 세는 그림이라 한꺼번에 안 띄운다 */
  const fill = interpolate(age, [FLY, FLY + Math.round(1.1 * FPS)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outFill = interpolate(
    frame,
    [BODY_END + Math.round(1.2 * FPS), BODY_END + Math.round(3.4 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const outroIn = interpolate(
    frame,
    [BODY_END + Math.round(1.6 * FPS), BODY_END + Math.round(2.4 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cam = camAt(frame);
  const camH = cam.w * ASPECT;
  const px = cam.w / 1080;
  const viewBox = `${cam.cx - cam.w / 2} ${cam.cy - CENTER_Y * px} ${cam.w} ${camH}`;

  const shown = c;
  const n = Math.round(shown.dots.length * fill);
  /** 점은 화면에서 늘 같은 크기다. 배율이 달라도 세는 눈이 안 흔들린다 */
  const dotR = px * 7;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      {HAS_BGM && <Audio src={staticFile("bgm-fw.wav")} volume={0.4} />}
      {/* 나레이션. 걸음마다 한 줄씩 제자리에서 튼다.
          **아직 음성 파일이 없으면 안 건다.** 지금은 음절로 길이만
          어림해 화면을 짜 뒀고, 녹음이 오면 다시 재서 갈아 끼운다 */}
      {!VOICE_ESTIMATED &&
        VOICE.map((v, i) => {
          const at =
            i === 0 ? 0 : i <= STEPS.length ? SLOTS[i - 1].t0 + 4 : BODY_END + 6;
          return (
            <Audio
              key={v.file}
              src={staticFile(v.file)}
              startFrom={0}
              volume={(f) =>
                f >= at && f < at + Math.round(v.sec * FPS) + 4 ? 1 : 0
              }
            />
          );
        })}

      <svg
        viewBox={viewBox}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {REGIONS.map((r) => (
          <path key={r.code} d={r.d} fill={LAND} stroke={BG} strokeWidth={px} />
        ))}

        {/* 이번 자리 */}
        {started && !inOutro &&
          shown.d.map((d, j) => (
            <path
              key={shown.name + j}
              d={d}
              fill="#3C3327"
              stroke={HOT}
              strokeWidth={px * 2}
              opacity={inOutro ? outroIn : settle}
            />
          ))}

        {/* 점 하나가 100명 */}
        {started && !inOutro &&
          shown.dots
            .slice(0, n)
            .map((p, j) => (
              <circle key={j} cx={p[0]} cy={p[1]} r={dotR} fill={HOT} />
            ))}
      </svg>

      {/* ── 딴 섬 ──
          **울릉군은 독도까지가 울릉군이다.** 카메라를 사람 사는
          본섬에 맞추니 95km 동쪽 독도가 화면 밖으로 잘렸다.
          한켠에 따로 그려 땅이 빠지지 않게 한다.

          거리는 화면에 안 쓴다. 여기 잰 값은 점이 몰린 자리
          한가운데에서 잰 것이라, 도동 기준 87.4km라는 기록값과
          다르다. 섞으면 안 되니 고정댓글로 뺀다 */}
      {started && !inOutro && c.away && (
        <svg
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          opacity={settle}
        >
          <rect
            x={716}
            y={398}
            width={230}
            height={200}
            rx={14}
            fill={`${BG}E6`}
            stroke={DIM}
            strokeWidth={2}
          />
          <g
            transform={`translate(831 502) scale(${74 / c.away.w})`}
          >
            {c.away.d.map((d, j) => (
              <path
                key={j}
                d={d}
                fill={HOT}
                stroke={INK}
                strokeWidth={(c.away!.w / 74) * 1.5}
              />
            ))}
          </g>
          <text
            x={831}
            y={578}
            fontSize={34}
            fontWeight={900}
            fill={INK}
            textAnchor="middle"
          >
            {c.away.label}
          </text>
        </svg>
      )}

      {/* ── 순위 · 이름 · 인구 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 66,
            opacity: settle,
          }}
        >
          <div
            style={{
              color: HOT,
              fontSize: 34,
              fontWeight: 900,
              letterSpacing: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.rank}위
          </div>
          <div
            style={{
              color: INK,
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.1,
              marginTop: 4,
              textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
            }}
          >
            {c.sido} {c.name}
          </div>
          <div
            style={{
              color: INK,
              fontSize: 56,
              fontWeight: 900,
              marginTop: 6,
              fontVariantNumeric: "tabular-nums",
              textShadow: `0 0 30px ${BG}`,
            }}
          >
            {c.pop.toLocaleString()}명
          </div>
        </div>
      )}

      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 18,
            color: DIM,
            fontSize: 25,
            fontWeight: 700,
          }}
        >
          점 하나 {PER_DOT}명 · 주민등록 2026년 7월
        </div>
      )}

      {/* ── 마무리 ──
          **간결하게.** 중앙값도 퍼센트도 뺐다. 두 덩어리와 배수
          하나만 남긴다.

          **끝을 열어 둔다.** 지금까지는 「틀린 곳 알려주세요」로
          닫았는데 그건 초대가 아니라 마침표다 */}
      {inOutro && (
        <AbsoluteFill style={{ backgroundColor: `${BG}F2`, opacity: outroIn }}>
          <svg
            viewBox="0 0 1080 1920"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            {/* 칸 수를 맞춰 두면 높이가 곧 배수다 */}
            {([
              [FEW[0].dots.length, 122, `${FEW[0].sido} ${FEW[0].name}`,
               FEW[0].pop, HOT],
              [TOP_DOTS, 560, `${TOP_DONG.sigungu} ${TOP_DONG.name}`,
               TOP_DONG.pop, DIM],
            ] as const).map(([count, x0, label, pop, col]) => (
              <g key={label}>
                <text x={x0} y={556} fontSize={34} fontWeight={900} fill={col}>
                  {label}
                </text>
                <text
                  x={x0}
                  y={610}
                  fontSize={48}
                  fontWeight={900}
                  fill={col}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {pop.toLocaleString()}명
                </text>
                {Array.from({ length: count }).map((_, i) => {
                  if (i >= Math.round(count * outFill)) return null;
                  return (
                    <circle
                      key={i}
                      cx={x0 + 5 + (i % 30) * 11}
                      cy={649 + Math.floor(i / 30) * 11}
                      r={4}
                      fill={col}
                    />
                  );
                })}
              </g>
            ))}
          </svg>

          <div
            style={{
              position: "absolute",
              left: TEXT_X,
              right: SAFE_RIGHT,
              bottom: OUTRO_PAD,
            }}
          >
            <div
              style={{
                color: HOT,
                fontSize: 120,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: -2,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {TIMES}배
            </div>
            <div
              style={{
                color: INK,
                fontSize: 52,
                fontWeight: 900,
                lineHeight: 1.2,
                marginTop: 14,
              }}
            >
              여러분 동네는 몇 명인가요?
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 — 답이 아니라 질문이다 ── */}
      {hookOut > 0 && (
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
              color: INK,
              fontSize: 78,
              fontWeight: 900,
              lineHeight: 1.18,
              textShadow: `0 0 40px ${BG}, 0 0 18px ${BG}`,
            }}
          >
            <div>사람이 제일 적은</div>
            <div>지자체</div>
          </div>
          <div
            style={{
              color: HOT,
              fontSize: 78,
              fontWeight: 900,
              lineHeight: 1.18,
              marginTop: 6,
            }}
          >
            몇 명일까요?
          </div>
        </div>
      )}

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};
