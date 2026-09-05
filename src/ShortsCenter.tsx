import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  APPROX_KM,
  AS_OF,
  CAP_PCT,
  DIST_KM,
  DOTS,
  HOLD,
  HOOK_SEC,
  LAND,
  OUTRO_SEC,
  PCT_OF_SPAN,
  PLACES,
  PPL,
  SPAN_KM,
  TOTAL,
  TO_BUSAN,
  TO_SEOUL,
  VOICE,
  VOICE_ESTIMATED,
  pullOf,
} from "./data/center";
import { REGIONS } from "./data/regions";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, TEXT_X } from "./safe";

/** 나레이션이 없어도 다른 편들처럼 BGM은 깐다 */
const HAS_BGM = true;

const BG = "#0E1116";
const LAND_FILL = "#1E242B";
/** 사람 — 인구 쪽은 따뜻하게 */
const HOT = "#F2603C";
/** 땅 — 국토 쪽은 차갑게 */
const COLD = "#6FA8C7";
const INK = "#EDE5D4";
const DIM = "#8B94A0";

const HOOK = Math.round(HOOK_SEC * FPS);

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
export const CENTER_DURATION = BODY_END + Math.round(OUTRO_SEC * FPS);

const ASPECT = 1920 / 1080;

/* ── 카메라는 안 움직인다 ──
   **이 편의 그림은 「두 점이 얼마나 가까운가」다.** 확대해 들어가면
   그 가까움이 안 보인다. 전국을 통째로 잡아 둔다.

   전국 지도는 0..1000 상자에 세로가 꽉 차게 들어 있다(`prep-map.py`).
   세로를 화면에 맞추면 가로는 남는다 — 남는 자리에 글자를 두지 않고
   지도를 크게 쓴다. */
/* 한반도는 0..1000 상자에서 세로 32.6~967.4를 쓰고 가로는 절반쯤만
   쓴다. **세로에 맞춰 키우면 가로는 알아서 남는다** — 남는 자리를
   글자로 채우지 않고 지도를 크게 쓴다 */
const MAP_Y0 = 32.6;
const MAP_Y1 = 967.4;
const MAP_TOP = 356;
const MAP_H = 1150;
const PX = (MAP_Y1 - MAP_Y0) / MAP_H;
const VX = 500 - (1080 / 2) * PX;
const VY = MAP_Y0 - MAP_TOP * PX;
const VIEW = `${VX} ${VY} ${1080 * PX} ${1080 * PX * ASPECT}`;
const sx = (x: number) => (x - VX) / PX;
const sy = (y: number) => (y - VY) / PX;

/* 거품 반지름. **넓이가 인구에 비례하도록** 제곱근을 쓴다.
   가장 큰 자리(서울 928만)가 화면에서 40px다 */
const K = 0.0107;
const rOf = (n: number) => (n > 0 ? Math.sqrt(n) * K : 0);

/** 걸음마다 무엇을 켜나 */
const STEPS = [
  { key: "land" },
  { key: "ppl" },
  { key: "far" },
  { key: "cap" },
  { key: "gyeonggi", sido: "경기" },
  { key: "busan", sido: "부산" },
] as const;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

export const ShortsCenter: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const hookOut = interpolate(frame, [HOOK - 12, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bi = beatAt(frame);
  const started = frame >= HOOK;
  const inOutro = frame >= BODY_END;
  const age = frame - SLOTS[bi].t0;
  const settle = interpolate(age, [2, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 점이 미끄러지는 데 걸리는 시간 */
  const slide = interpolate(age, [6, 6 + Math.round(1.1 * FPS)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const step = STEPS[bi].key;
  const sido = "sido" in STEPS[bi] ? (STEPS[bi] as { sido: string }).sido : null;
  const pull = sido ? pullOf(sido) : null;

  /* 인구 거품은 걸음 2부터 깔린다. 걸음 5·6에서는 뺀 시도가 꺼진다 */
  const dotsOn = started && bi >= 1;
  const dimSido = !inOutro && pull ? pull.sido : null;
  /** 걸음 4에서는 수도권만 밝다 */
  const capOnly = !inOutro && step === "cap";

  /* 사람의 한가운데 자리. 걸음 1에서 땅에서 사람으로 미끄러지고,
     걸음 5·6에서는 그 시도를 뺀 자리로 다시 미끄러진다 */
  const to = pull ? { x: pull.x, y: pull.y } : PPL;
  const from = bi === 1 ? LAND : PPL;
  const on = started && bi >= 1;
  const now = inOutro
    ? PPL
    : {
        x: from.x + (to.x - from.x) * slide,
        y: from.y + (to.y - from.y) * slide,
      };

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      {HAS_BGM && <Audio src={staticFile("bgm-ct.wav")} volume={0.4} />}
      {!VOICE_ESTIMATED &&
        VOICE.map((v, i) => {
          const at =
            i === 0 ? 0 : i <= SLOTS.length ? SLOTS[i - 1].t0 + 4 : BODY_END + 6;
          return (
            <Audio
              key={v.file}
              src={staticFile(v.file)}
              volume={(f) =>
                f >= at && f < at + Math.round(v.sec * FPS) + 4 ? 1 : 0
              }
            />
          );
        })}

      <svg
        viewBox={VIEW}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {REGIONS.map((r) => (
          <path
            key={r.code}
            d={r.d}
            fill={LAND_FILL}
            stroke={BG}
            strokeWidth={PX * 1.1}
          />
        ))}

        {/* 인구 거품. 속을 옅게 두고 테를 둘러 **겹쳐도 원이 원으로
            보이게** 한다 — 꽉 채우면 수도권이 한 덩어리가 된다 */}
        {dotsOn &&
          DOTS.map((d) => {
            const off = d.sido === dimSido;
            const cap = ["서울", "인천", "경기"].includes(d.sido);
            const lit = capOnly ? cap : !off;
            return (
              <circle
                key={d.sido + d.name}
                cx={d.x}
                cy={d.y}
                r={rOf(d.pop) * (off ? 1 - slide : 1)}
                fill={HOT}
                fillOpacity={lit ? 0.2 : 0.05}
                stroke={HOT}
                strokeWidth={PX * 1.2}
                strokeOpacity={lit ? 0.55 : 0.14}
              />
            );
          })}

        {/* 두 한가운데를 잇는 선. **이 선의 길이가 이 편의 수치다** */}
        {on && (
          <line
            x1={LAND.x}
            y1={LAND.y}
            x2={now.x}
            y2={now.y}
            stroke={INK}
            strokeWidth={PX * 2.2}
            strokeDasharray={`${PX * 7} ${PX * 5}`}
            strokeLinecap="round"
            opacity={0.75}
          />
        )}

        {/* 땅의 한가운데 — 훅에서는 안 켠다 */}
        {started && (
          <>
            <circle cx={LAND.x} cy={LAND.y} r={PX * 9} fill={COLD} />
            <circle
              cx={LAND.x}
              cy={LAND.y}
              r={PX * 20}
              fill="none"
              stroke={COLD}
              strokeWidth={PX * 2.2}
            />
          </>
        )}

        {/* 사람의 한가운데 */}
        {on && (
          <>
            <circle cx={now.x} cy={now.y} r={PX * 11} fill={HOT} />
            <circle
              cx={now.x}
              cy={now.y}
              r={PX * 24}
              fill="none"
              stroke={INK}
              strokeWidth={PX * 2.6}
            />
          </>
        )}
      </svg>

      {/* 이름표. 화면 좌표에 얹어야 배율과 무관하게 읽힌다 */}
      {started && (
        <Tag x={sx(LAND.x)} y={sy(LAND.y) + 34} text="땅의 한가운데" color={COLD} />
      )}
      {on && (
        <Tag
          x={sx(now.x)}
          y={sy(now.y) - 74}
          text="사람의 한가운데"
          color={INK}
          big
        />
      )}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 640,
          background: `linear-gradient(to bottom, ${BG}00 0%, ${BG}E0 32%, ${BG} 58%)`,
        }}
      />

      {/* ── 자막 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 100,
            opacity: settle,
          }}
        >
          {step === "land" && (
            <>
              <div style={cap}>땅만 놓고 재면</div>
              <div style={{ ...big, color: COLD }}>{spaced(LAND.where)}</div>
              <div style={note}>국토의 무게중심</div>
            </>
          )}
          {step === "ppl" && (
            <>
              <div style={cap}>5,108만 명을 얹으면</div>
              <div style={big}>{spaced(PPL.where)}</div>
              <div style={{ ...note, color: HOT }}>
                북서쪽으로 {DIST_KM}km
              </div>
            </>
          )}
          {step === "far" && (
            <>
              <div style={cap}>사람의 한가운데에서</div>
              <div style={big}>
                서울 {TO_SEOUL}km · 부산 {TO_BUSAN}km
              </div>
            </>
          )}
          {step === "cap" && (
            <>
              <div style={cap}>수도권 인구</div>
              <div style={{ ...big, color: HOT }}>{CAP_PCT}%</div>
              <div style={note}>그런데 중심은 {DIST_KM}km밖에 안 올라왔다</div>
            </>
          )}
          {pull && (
            <>
              <div style={cap}>
                {pull.sido} {Math.round(pull.pop / 10000).toLocaleString()}만 명을 빼면
              </div>
              <div style={big}>
                <span style={{ color: pull.north ? COLD : HOT }}>
                  {pull.km}km {pull.north ? "북쪽" : "남쪽"}
                </span>
              </div>
              <div style={note}>{spaced(pull.where)}</div>
            </>
          )}
        </div>
      )}

      {/* ── 마무리는 질문으로 연다 ── */}
      {inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 100,
            opacity: outroIn,
          }}
        >
          <div
            style={{
              color: INK,
              fontSize: 50,
              fontWeight: 900,
              lineHeight: 1.24,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <div>
              두 한가운데 사이 <span style={{ color: HOT }}>{DIST_KM}km</span>
            </div>
            <div>
              국토 남북 {SPAN_KM}km의{" "}
              <span style={{ color: HOT }}>{PCT_OF_SPAN}%</span>
            </div>
          </div>
          <div
            style={{
              color: INK,
              fontSize: 46,
              fontWeight: 900,
              marginTop: 24,
              lineHeight: 1.2,
            }}
          >
            여러분 동네는 그 점에서 몇 km인가요?
          </div>
        </div>
      )}

      {/* ── 훅 — 답이 아니라 질문이다 ── */}
      {hookOut > 0 && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 100,
            opacity: hookOut,
          }}
        >
          <div
            style={{ color: INK, fontSize: 72, fontWeight: 900, lineHeight: 1.18 }}
          >
            <div>대한민국</div>
            <div>사람의 한가운데</div>
          </div>
          <div
            style={{
              color: HOT,
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.18,
              marginTop: 4,
            }}
          >
            어디일까요?
          </div>
        </div>
      )}

      {/* 무엇을 세고 어떻게 잰 값인지는 다 적는다 */}
      <div
        style={{
          position: "absolute",
          left: TEXT_X,
          right: SAFE_RIGHT,
          bottom: BOTTOM_INSET + 12,
          color: DIM,
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.35,
        }}
      >
        원 넓이가 인구 · 시·군 {PLACES}자리에 {TOTAL.toLocaleString()}명 ·{" "}
        {AS_OF}
        <br />
        광역시는 한 자리로 봤다 · 행정동으로 쪼개면 중심이 {APPROX_KM}km 움직임
      </div>

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};

/** 경계 자료의 이름이 「청주시흥덕구」처럼 붙어 있다. 읽기 좋게 띄운다 */
const spaced = (s: string) => s.replace(/(시)(?=[^\s]*[구군])/, "$1 ");

const Tag: React.FC<{
  x: number;
  y: number;
  text: string;
  color: string;
  big?: boolean;
}> = ({ x, y, text, color, big }) => {
  const w = 320;
  return (
    <div
      style={{
        position: "absolute",
        left: Math.min(Math.max(x - w / 2, 40), 1080 - w - 40),
        top: y,
        width: w,
        textAlign: "center",
        color,
        fontSize: big ? 36 : 28,
        fontWeight: 900,
        textShadow: `0 0 24px ${BG}, 0 0 9px ${BG}`,
      }}
    >
      {text}
    </div>
  );
};

const cap: React.CSSProperties = {
  color: DIM,
  fontSize: 36,
  fontWeight: 900,
};
const big: React.CSSProperties = {
  color: INK,
  fontSize: 68,
  fontWeight: 900,
  lineHeight: 1.1,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums",
};
const note: React.CSSProperties = {
  color: DIM,
  fontSize: 34,
  fontWeight: 800,
  marginTop: 10,
  fontVariantNumeric: "tabular-nums",
};
