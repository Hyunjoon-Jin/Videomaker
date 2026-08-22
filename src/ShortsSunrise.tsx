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
  DAYS,
  ISLANDS,
  ISLAND_LEAD,
  ISLAND_WINS,
  LAND,
  SHARE,
  SUN_BEATS,
  WINTER,
  YEAR,
  dayAt,
  hm,
  mdLabel,
  orderAt,
} from "./data/sunrise";
import { Shot, cameraAt } from "./mapcam";
import { beatFor, beatIndexAt, layoutBeats, valueAtBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(2.2 * FPS);

const BEATS = SUN_BEATS.map((e) =>
  beatFor(e.at, { title: e.title, detail: e.detail }, e.impact, FPS)
);
/**
 * creep 0.35.
 *
 * 다른 편들은 체류 중에 값이 서면 정지 화면이 되는 게 문제였는데, 여기는
 * 반대다. 값(날짜)이 멈추면 순위표도 멈춘다. 이 편의 그림이 '순위가
 * 바뀌는 것'이라 체류 중에도 날짜가 계속 가야 줄이 계속 미끄러진다.
 * 자막의 날짜는 비트가 도착한 날이고, 계기판은 그 뒤로도 흐른다.
 */
const SPANS = layoutBeats(BEATS, HOOK, 0.35);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(10.5 * FPS);
export const SUNRISE_DURATION = BODY_END + OUTRO;

/** 해가 뜨는 쪽 — 이 편의 주색 */
const DAWN = "#E0A75C";
const SEA = "#0E1418";
const LAND_F = "#1E2A25";
const LAND_S = "#33463C";

/**
 * 카메라.
 *
 * 본문은 동해안에 붙는다. 마무리에서만 물러서서 독도를 들인다.
 * 독도는 동경 131.87도라 반도 투영에서 x=845에 있다. 본문 구도(cx 560)
 * 로는 화면 밖이라 안 보인다 — 그게 이 편의 구조다. 물러서는 그 동작
 * 자체가 반전이다.
 */
const SHOTS: Shot[] = [
  { at: HOOK - 26, cx: 560, cy: 560, z: 2.0 },
  ...SPANS.flatMap((sp) => [
    { at: sp.t1, cx: 560, cy: 560, z: 2.0 },
    { at: sp.t2, cx: 560, cy: 560, z: 2.0 },
  ]),
  { at: BODY_END + Math.round(3.2 * FPS), cx: 660, cy: 600, z: 1.12 },
];

/** 순위표 한 줄이 앉는 높이 */
const ROW_H = 74;

export const ShortsSunrise: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? SUN_BEATS[bi] : null;
  const inOutro = frame >= BODY_END;

  /** 지금 며칠인가 — 비트 사이를 잇는다 */
  const dayF = valueAtBeats(SPANS, frame, DAYS.length - 1);
  const di = Math.max(0, Math.min(DAYS.length - 1, Math.round(dayF)));
  const today = dayAt(di);
  const order = orderAt(di);
  const first = today.first;

  const outroIn = interpolate(frame, [BODY_END, BODY_END + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 독도가 켜지는 시점 — 육지 표를 먼저 읽히고 나서 */
  const islandOn = interpolate(
    frame,
    [BODY_END + Math.round(4.2 * FPS), BODY_END + Math.round(5.0 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  /** 훅 글자는 페이드인하지 않는다. 0프레임이 곧 완성된 화면이어야 한다. */
  const hookIn = 1;
  const mapIn = 1;
  const uiOn = frame >= HOOK - 4;

  const cam = cameraAt(SHOTS, frame);
  const u = (px: number) => px / (1.08 * cam.z);

  /** 1등인 곳에서 빛이 시작된다 — 설명 없이 '여기가 먼저'가 읽힌다 */
  const lead = LAND[first];

  return (
    <AbsoluteFill style={{ backgroundColor: SEA, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-sr.wav")} volume={0.9} />

      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <defs>
            {/* 동쪽에서 드는 빛. 1등인 곳을 중심으로 퍼진다. */}
            <radialGradient id="srGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={DAWN} stopOpacity={0.34} />
              <stop offset="60%" stopColor={DAWN} stopOpacity={0.09} />
              <stop offset="100%" stopColor={DAWN} stopOpacity={0} />
            </radialGradient>
          </defs>

          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND_F} stroke={LAND_S} strokeWidth={u(1.6)} />
          ))}

          {/* 새벽빛 */}
          <circle cx={lead.x} cy={lead.y} r={u(520)} fill="url(#srGlow)" />

          {/* 육지 넷 */}
          {LAND.map((s, i) => {
            const on = i === first;
            const rank = order.indexOf(i);
            return (
              <g key={s.name}>
                {on && (
                  <circle cx={s.x} cy={s.y} r={u(26)} fill={DAWN} opacity={0.22} />
                )}
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={u(on ? 9 : 6)}
                  fill={on ? DAWN : "#6F7A72"}
                />
                <text
                  x={s.x + u(16)}
                  y={s.y + u(8)}
                  fontSize={u(24)}
                  fontWeight={on ? 900 : 700}
                  fill={on ? DAWN : "#8C958B"}
                  style={{ paintOrder: "stroke", stroke: SEA, strokeWidth: u(7) }}
                >
                  {s.name}
                  {on ? "  1등" : ""}
                </text>
                {/* 순위를 지도에도 얹어 표와 지도가 같은 것을 말하게 한다 */}
                {!on && (
                  <text
                    x={s.x - u(16)}
                    y={s.y + u(8)}
                    fontSize={u(20)}
                    fontWeight={800}
                    fill="#5E6862"
                    textAnchor="end"
                  >
                    {rank + 1}
                  </text>
                )}
              </g>
            );
          })}

          {/* 독도 — 마무리에서만 */}
          {islandOn > 0 &&
            ISLANDS.map((s) => (
              <g key={s.name} opacity={islandOn}>
                <circle cx={s.x} cy={s.y} r={u(30)} fill={DAWN} opacity={0.28} />
                <circle cx={s.x} cy={s.y} r={u(9)} fill={DAWN} />
                <text
                  x={s.x - u(16)}
                  y={s.y + u(8)}
                  fontSize={u(26)}
                  fontWeight={900}
                  fill={DAWN}
                  textAnchor="end"
                  style={{ paintOrder: "stroke", stroke: SEA, strokeWidth: u(7) }}
                >
                  {s.name}
                </text>
              </g>
            ))}
        </svg>
      </AbsoluteFill>

      {/* ── 계기판 — 날짜 ── */}
      {uiOn && !inOutro && (
        <div style={{ position: "absolute", top: SAFE_TOP, left: TEXT_X, right: SAFE_RIGHT }}>
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            {YEAR}년
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ color: C.text, fontSize: 92, fontWeight: 900, lineHeight: 1.1 }}>
              {mdLabel(today.md)}
            </span>
          </div>
        </div>
      )}

      {/* ── 순위표 — 이 편의 그림 ── */}
      {uiOn && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 210,
            height: ROW_H * LAND.length,
          }}
        >
          {LAND.map((s, i) => {
            const rank = order.indexOf(i);
            const on = i === first;
            return (
              <div
                key={s.name}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  // 줄이 자리를 옮기는 것이 이 편의 핵심이다. 값만 바뀌고
                  // 줄이 가만히 있으면 순위가 바뀐 것이 안 읽힌다.
                  top: rank * ROW_H,
                  transition: "top 220ms",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 20,
                  color: on ? DAWN : C.dim,
                }}
              >
                <span style={{ fontSize: 34, fontWeight: 800, minWidth: 44 }}>
                  {rank + 1}
                </span>
                <span style={{ fontSize: 46, fontWeight: on ? 900 : 700, minWidth: 190 }}>
                  {s.name}
                </span>
                <span
                  style={{
                    fontSize: 52,
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {hm(today.t[i])}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 자막 ── */}
      {ev && uiOn && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 56,
          }}
        >
          <div style={{ color: DAWN, fontSize: 30, fontWeight: 800, marginBottom: 4 }}>
            {ev.kicker}
          </div>
          <Typed
            text={ev.title}
            start={SPANS[bi].t1}
            cps={14}
            style={{ display: "block", color: C.text, fontSize: 58, fontWeight: 900 }}
          />
          <Typed
            text={ev.detail}
            start={SPANS[bi].t1 + Math.ceil((ev.title.length * 30) / 14) + 5}
            cps={26}
            style={{ display: "block", color: C.dim, fontSize: 34, fontWeight: 700, marginTop: 4 }}
          />
        </div>
      )}

      {/* 꼭짓점에서만 — 겨울 순위를 겹쳐 '뒤집혔다'를 눈으로 보인다 */}
      {ev?.compare && uiOn && !inOutro && (
        <div
          style={{
            position: "absolute",
            right: SAFE_RIGHT,
            top: SAFE_TOP + 210,
            textAlign: "right",
            opacity: 0.75,
          }}
        >
          <div style={{ color: "#7FA8C4", fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
            12월 22일 동지
          </div>
          {WINTER.order.map((k, r) => (
            <div key={k} style={{ color: "#8C958B", fontSize: 26, fontWeight: 700 }}>
              {r + 1} {LAND[k].name}
            </div>
          ))}
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
            opacity: outroIn,
          }}
        >
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>
            {YEAR}년 1등을 한 날
          </div>
          {LAND.map((s, i) => {
            const at = BODY_END + Math.round((0.7 + i * 0.55) * FPS);
            const on = interpolate(frame, [at, at + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 22,
                  marginTop: 8,
                  opacity: on,
                  transform: `translateY(${(1 - on) * 14}px)`,
                }}
              >
                <span style={{ color: C.text, fontSize: 44, fontWeight: 800, flex: 1 }}>
                  {s.name}
                </span>
                <span
                  style={{
                    color: C.text,
                    fontSize: 52,
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {SHARE[i]}일
                </span>
              </div>
            );
          })}

          {/* 다섯째 줄이 끼어든다 — 넷의 다툼이 화면에 남아 있어야 커진다 */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 22,
              marginTop: 18,
              opacity: islandOn,
              transform: `translateY(${(1 - islandOn) * 18}px)`,
              color: DAWN,
            }}
          >
            <span style={{ fontSize: 52, fontWeight: 900, flex: 1 }}>독도</span>
            <span
              style={{ fontSize: 62, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}
            >
              {ISLAND_WINS}일
            </span>
          </div>

          <div
            style={{
              color: C.text,
              fontSize: 50,
              fontWeight: 800,
              lineHeight: 1.34,
              marginTop: 26,
              opacity: interpolate(
                frame,
                [BODY_END + Math.round(6.0 * FPS), BODY_END + Math.round(6.7 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            넷이 나눠 가진 한 해,
            <br />
            독도는 한 번도 안 내준 자리
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(14,20,24,0.58) 0%, rgba(14,20,24,0.5) 60%, rgba(14,20,24,0.4) 100%)",
            opacity: hookOut,
            justifyContent: "center",
            padding: `0 ${TEXT_X}px`,
          }}
        >
          <div style={{ opacity: hookIn }}>
            <Typed
              text="1월 1일 · 간절곶 07:32 · 호미곶 07:33"
              start={-20}
              cps={400}
              style={{ display: "block", color: C.dim, fontSize: 38, fontWeight: 700 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="1"
                start={-20}
                cps={400}
                style={{
                  color: DAWN,
                  fontSize: 250,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: -6,
                }}
              />
              <Typed
                text="분"
                start={-20}
                cps={400}
                style={{ color: C.text, fontSize: 88, fontWeight: 800, marginLeft: 10 }}
              />
            </div>
            <Typed
              text="두 곳이 서로 가장 먼저라고 다투는 차이"
              start={-20}
              cps={400}
              style={{
                display: "block",
                color: C.text,
                fontSize: 44,
                fontWeight: 700,
                marginTop: 10,
              }}
            />
          </div>
        </AbsoluteFill>
      )}

      {/* ── 고지 ── */}
      {uiOn && (
        <div
          style={{
            position: "absolute",
            bottom: BOTTOM_INSET,
            left: TEXT_X,
            right: SAFE_RIGHT,
            color: "#5E6862",
            fontSize: 20,
          }}
        >
          {inOutro
            ? `일출은 계산값 · 고도 -0.833도 기준 · ${YEAR}년`
            : `육지 기준 · 일출은 계산값 · 고도 -0.833도 기준 · ${YEAR}년`}
        </div>
      )}

      <Grain />
    </AbsoluteFill>
  );
};
