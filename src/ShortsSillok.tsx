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
  FATES,
  FLIGHT,
  NEW_SAGO,
  OLD_SAGO,
  S_EVENTS,
  Site,
  WATCH,
  WATCH_DAYS,
  flightPathTo,
} from "./data/sillok";
import { Shot, cameraAt } from "./mapcam";
import { beatFor, beatIndexAt, layoutBeats, valueAtBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, SAFE_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(4.5 * FPS);

/**
 * 내장산 비트만 길게 준다.
 *
 * 다른 아홉 비트는 사건이 하나씩이라 자막 길이가 시간을 정하면 된다.
 * 그런데 이 편의 답은 '옮겼다'가 아니라 '지켰다'이고, 지킨다는 것은
 * 아무 일도 일어나지 않는 날이 370번 지나갔다는 뜻이다. 그 시간을
 * 자막 길이로 재면 4초가 나오는데, 4초짜리 370일은 답이 아니라 경유지다.
 *
 * 계수기가 0에서 370까지 올라가는 것을 보여주는 데 필요한 만큼 세운다.
 */
const HOLD: Record<number, number> = { 4: 9.0 };
const BEATS = S_EVENTS.map((e, i) => {
  const b = beatFor(e.year, { title: e.title, detail: e.detail }, e.impact ?? 0.4, FPS);
  return HOLD[i] ? { ...b, hold: Math.round(HOLD[i] * FPS) } : b;
});

/**
 * creep은 0이다.
 *
 * 1445년에서 1592년까지 147년이 비어 있다. 체류 중에 값이 나아가게 두면
 * '1592년 4월 13일'이라고 써놓고 화면 위 연도가 1596년을 가리킨다.
 */
const SPANS = layoutBeats(BEATS, HOOK, 0);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(12 * FPS);
export const SILLOK_DURATION = BODY_END + OUTRO;

const LAST_YEAR = S_EVENTS[S_EVENTS.length - 1].year;
/** 370일 계수기가 도는 비트 */
const WATCH_I = S_EVENTS.findIndex((e) => e.watch);

/**
 * 카메라.
 *
 * 앞의 세 국면은 성격이 다르다. 사고가 넷 서 있을 때는 넷이 다 보여야
 * 하고, 책이 도망 다닐 때는 그 점을 따라가야 하며, 마지막에 다섯으로
 * 나눌 때는 다시 물러서야 한다. 물러섰다 붙었다 물러서는 이 세 박자가
 * 곧 이 편의 이야기다.
 */
function shotOf(i: number): { cx: number; cy: number; z: number } {
  const e = S_EVENTS[i];
  const z = e.zoom ?? 2;
  if (e.phase === "flight") {
    // 묘향산 비트에서는 지나온 길 전체가 한 화면에 들어와야 한다
    if (e.at === FLIGHT.length - 1) return { cx: 428, cy: 640, z };
    const s = FLIGHT[e.at ?? 0];
    // 점을 화면 한가운데가 아니라 조금 위에 둔다. 아래는 자막 자리다.
    return { cx: s.x, cy: s.y + 130 / z, z };
  }
  if (e.phase === "spread") return { cx: 478, cy: 620, z };
  return { cx: 502, cy: 672, z };
}

const SHOTS: Shot[] = [
  { at: HOOK - 26, cx: 447, cy: 790, z: 3.6 },
  ...SPANS.flatMap((sp, i) => {
    const s = shotOf(i);
    return [
      { at: sp.t1, ...s },
      { at: sp.t2, ...s },
    ];
  }),
  { at: BODY_END + Math.round(2.0 * FPS), cx: 470, cy: 700, z: 1.8 },
];

const LAND = "#241E17";
const LINE = "#3B342A";
/** 살아남은 것 / 불탄 것 / 책이 다닌 길 */
const ALIVE = INK.bone;
const LOST = INK.oxide;
const PATH = INK.brass;

export const ShortsSillok: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const year = valueAtBeats(SPANS, frame, LAST_YEAR);
  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? S_EVENTS[bi] : null;
  const near = bi >= 0 ? Math.max(0, 1 - (frame - SPANS[bi].t1) / 22) : 0;
  const impact = (ev?.impact ?? 0) * near;

  const inOutro = frame >= BODY_END;
  const phase = inOutro ? "spread" : ev?.phase ?? "sago";

  /** 불이 붙는 진행도 — 세 사고가 0.4초씩 밀려 꺼진다 */
  const burnAt = SPANS[2].t1;
  const burn = (k: number) =>
    interpolate(frame, [burnAt + k * 12, burnAt + k * 12 + 26], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  /** 책이 지나온 길 — 비트의 at을 프레임 사이에서 이어 붙인다 */
  const flightP = (() => {
    const n = FLIGHT.length - 1;
    let done = 0;
    for (let i = 0; i < SPANS.length; i++) {
      const e = S_EVENTS[i];
      if (e.phase !== "flight" || e.at == null) continue;
      if (frame >= SPANS[i].t1) {
        done = e.at;
        continue;
      }
      // 이동 중 — 앞 비트의 위치에서 이 비트의 위치로
      const t = interpolate(frame, [SPANS[i].t0, SPANS[i].t1], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return (done + (e.at - done) * t) / n;
    }
    return done / n;
  })();

  /** 370일 계수기 */
  const watchSpan = SPANS[WATCH_I];
  const wt = interpolate(frame, [watchSpan.t1 + 6, watchSpan.t2 - 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const onWatch = bi === WATCH_I && !inOutro;

  /** 1606년에 다섯이 다시 켜진다 */
  const spreadAt = SPANS[S_EVENTS.length - 1].t1;
  const spreadOn = (k: number) =>
    interpolate(frame, [spreadAt + k * 9, spreadAt + k * 9 + 18], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const outroIn = interpolate(frame, [BODY_END, BODY_END + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const mapIn = interpolate(frame, [HOOK - 8, HOOK + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cam = cameraAt(SHOTS, frame);
  const u = (px: number) => px / (1.08 * cam.z);
  const labelFits = (s: Site, chars: number) => {
    if (s.minZ != null && cam.z < s.minZ) return false;
    const w = u(19) * chars;
    return s.x - w > cam.x + u(14) && s.x + w < cam.x + cam.w - u(14);
  };

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-sl.wav")} volume={0.9} />

      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND} stroke={LINE} strokeWidth={u(1.6)} />
          ))}

          {/* ── 책이 다닌 길 ── */}
          {(phase === "flight" || phase === "spread") && flightP > 0.001 && (
            <>
              <path
                d={flightPathTo(flightP)}
                fill="none"
                stroke={PATH}
                strokeWidth={u(13)}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.16}
              />
              <path
                d={flightPathTo(flightP)}
                fill="none"
                stroke={PATH}
                strokeWidth={u(4.4)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* 피난지 — 지나온 곳만 찍는다 */}
          {(phase === "flight" || phase === "spread") &&
            FLIGHT.map((s, i) => {
              const reached = flightP >= i / (FLIGHT.length - 1) - 1e-6;
              if (!reached) return null;
              /*
                1606년 국면에서는 피난지 이름을 지운다. 그때 읽어야 하는
                것은 새로 나눈 다섯 곳이고, 지나온 길은 배경이다. 두 벌을
                다 띄우면 묘향산처럼 겹치는 자리에서 글자가 두 번 그려진다.
              */
              return (
                <Pin
                  key={`f${s.name}`}
                  s={s}
                  u={u}
                  color={PATH}
                  fit={labelFits}
                  r={4.6}
                  quiet={phase === "spread"}
                />
              );
            })}

          {/* ── 임진왜란 전의 네 사고 ── */}
          {(phase === "sago" || phase === "burn" || phase === "flight") &&
            OLD_SAGO.map((s, i) => {
              const k = phase === "sago" ? 0 : s.lost ? burn(i) : 0;
              return (
                <g key={s.name}>
                  {k > 0 && k < 1 && (
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={u(10) + k * u(46)}
                      fill="none"
                      stroke={LOST}
                      strokeWidth={u(3.4)}
                      opacity={(1 - k) * 0.85}
                    />
                  )}
                  <Pin
                    s={s}
                    u={u}
                    color={k > 0.5 ? LOST : ALIVE}
                    fit={labelFits}
                    r={7}
                    hollow={k > 0.5}
                    cross={k > 0.5}
                  />
                </g>
              );
            })}

          {/* ── 1606년, 다시 다섯 곳 ── */}
          {phase === "spread" &&
            NEW_SAGO.map((s, i) => {
              const on = inOutro ? 1 : spreadOn(i);
              if (on < 0.02) return null;
              return (
                <g key={`n${s.name}`} opacity={on}>
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={u(9) + (1 - on) * u(40)}
                    fill="none"
                    stroke={ALIVE}
                    strokeWidth={u(2.6)}
                    opacity={1 - on}
                  />
                  <Pin s={s} u={u} color={ALIVE} fit={labelFits} r={7} />
                </g>
              );
            })}

          {/* 지금 책이 있는 자리 — 사건이 터질 때 한 번 울린다 */}
          {phase === "flight" && impact > 0.15 && (
            <circle
              cx={FLIGHT[Math.round(flightP * (FLIGHT.length - 1))].x}
              cy={FLIGHT[Math.round(flightP * (FLIGHT.length - 1))].y}
              r={u(12) + impact * u(48)}
              fill="none"
              stroke={PATH}
              strokeWidth={u(3)}
              opacity={impact * 0.7}
            />
          )}
        </svg>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(21,19,16,0.95) 0%, rgba(21,19,16,0.6) 16%, rgba(21,19,16,0) 28%, rgba(21,19,16,0) 55%, rgba(21,19,16,0.76) 73%, rgba(21,19,16,0.96) 88%)",
          pointerEvents: "none",
        }}
      />

      {/* ── 계기판 ── */}
      {mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", top: SAFE_TOP, left: SAFE_X, right: SAFE_X }}>
          {onWatch ? (
            /*
              여기서만 계기가 바뀐다.
              연도는 1593년에 멈춰 있고, 대신 날이 센다. 이 편에서 세어야
              하는 것은 연도가 아니라 아무 일도 없던 날의 수다.
            */
            <>
              <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
                내장산에서 지킨 날
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span
                  style={{
                    color: ALIVE,
                    fontSize: 118,
                    fontWeight: 900,
                    lineHeight: 1.04,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {Math.round(wt * WATCH_DAYS)}
                </span>
                <span style={{ color: C.text, fontSize: 48, fontWeight: 800 }}>일</span>
              </div>
              <div style={{ marginTop: 14, maxWidth: 700 }}>
                {WATCH.map((w, i) => {
                  const on = interpolate(
                    frame,
                    [watchSpan.t1 + 20 + i * 14, watchSpan.t1 + 38 + i * 14],
                    [0, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
                  return (
                    <div
                      key={w.who}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginTop: i ? 10 : 0,
                        opacity: on,
                      }}
                    >
                      <span
                        style={{
                          color: C.dim,
                          fontSize: 28,
                          fontWeight: 700,
                          minWidth: 148,
                        }}
                      >
                        {w.who}
                      </span>
                      <div style={{ flex: 1, height: 16, background: "#241F18" }}>
                        <div
                          style={{
                            width: `${(w.days / WATCH_DAYS) * 100 * on}%`,
                            height: "100%",
                            background: i === 2 ? PATH : ALIVE,
                            opacity: i === 2 ? 1 : 0.9 - i * 0.18,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          color: C.text,
                          fontSize: 30,
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          minWidth: 96,
                          textAlign: "right",
                        }}
                      >
                        {w.days}일
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
                조선왕조실록
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span
                  style={{
                    color: C.text,
                    fontSize: 96,
                    fontWeight: 900,
                    lineHeight: 1.05,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {Math.floor(year)}
                </span>
                <span style={{ color: C.text, fontSize: 44, fontWeight: 800 }}>년</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 사건 ── */}
      {ev && mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 330, left: SAFE_X, right: SAFE_RIGHT }}>
          <div
            style={{
              color: ev.phase === "burn" ? LOST : PATH,
              fontSize: 32,
              fontWeight: 900,
            }}
          >
            {ev.kicker}
          </div>
          <Typed
            text={ev.title}
            start={SPANS[bi].t1}
            cps={14}
            style={{
              display: "block",
              color: C.text,
              fontSize: 84,
              fontWeight: 900,
              lineHeight: 1.08,
              marginTop: 4,
              transform: `scale(${1 + impact * 0.02})`,
              transformOrigin: "left bottom",
            }}
          />
          <Typed
            text={ev.detail}
            start={SPANS[bi].t1 + Math.ceil((ev.title.length * 30) / 14) + 5}
            cps={26}
            style={{
              display: "block",
              color: "#BDB3A0",
              fontSize: 37,
              fontWeight: 500,
              marginTop: 8,
            }}
          />
        </div>
      )}

      {/* ── 고지 ── */}
      {mapIn > 0.5 && !inOutro && (
        <div
          style={{ position: "absolute", bottom: BOTTOM_INSET, left: SAFE_X, right: SAFE_RIGHT }}
        >
          <div style={{ color: "#8A8070", fontSize: 20, lineHeight: 1.5 }}>
            날짜·일수는 기록값 · 좌표는 현재 지명 위치 · 거리는 직선 합 (고정댓글)
          </div>
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <>
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(21,19,16,0) 20%, rgba(21,19,16,0.74) 38%, rgba(21,19,16,0.96) 52%)",
              opacity: outroIn,
              pointerEvents: "none",
            }}
          />
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              // 오른쪽은 버튼 기둥을 피해 SAFE_RIGHT로 둔다
              padding: `0 ${SAFE_RIGHT}px 200px ${SAFE_X}px`,
              opacity: outroIn,
            }}
          >
            <div
              style={{
                color: C.dim,
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 14,
                opacity: interpolate(frame, [BODY_END + 12, BODY_END + 24], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              다섯 질은 지금
            </div>
            {FATES.map((f, i) => {
              const at = BODY_END + Math.round((0.9 + i * 1.2) * FPS);
              const on = interpolate(frame, [at, at + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={f.name}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 24,
                    marginTop: i ? 16 : 0,
                    opacity: on,
                    transform: `translateY(${(1 - on) * 14}px)`,
                  }}
                >
                  <span
                    style={{
                      color: f.alive ? ALIVE : C.dim,
                      fontSize: 50,
                      fontWeight: 900,
                      minWidth: 258,
                    }}
                  >
                    {f.name}
                  </span>
                  <span
                    style={{
                      color: f.alive ? C.text : "#7A7161",
                      fontSize: 40,
                      fontWeight: 700,
                    }}
                  >
                    {f.where}
                  </span>
                </div>
              );
            })}

            <div
              style={{
                color: C.text,
                fontSize: 50,
                fontWeight: 800,
                lineHeight: 1.34,
                marginTop: 40,
                opacity: interpolate(
                  frame,
                  [BODY_END + Math.round(4.6 * FPS), BODY_END + Math.round(5.2 * FPS)],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              규장각의 정족산본
              <br />
              두 사람이 지고 올라간 그 책
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: C.bg,
            opacity: hookOut,
            justifyContent: "center",
            padding: "0 70px",
          }}
        >
          <div style={{ opacity: hookIn }}>
            <Typed
              text="1592년 여름, 내장산"
              start={4}
              cps={30}
              style={{ display: "block", color: C.dim, fontSize: 42, fontWeight: 700 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="370"
                start={24}
                cps={8}
                style={{ color: PATH, fontSize: 290, fontWeight: 900, lineHeight: 1 }}
              />
              <Typed
                text="일"
                start={36}
                cps={8}
                style={{ color: C.text, fontSize: 96, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="선비 둘이 실록을 지킨 날"
              start={54}
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

/**
 * 지도 위의 점 하나.
 *
 * 불탄 사고는 채우지 않고 윤곽만 두고 빗금을 긋는다. 색만 바꾸면
 * 200px에서는 그냥 다른 점이고, 꺼졌다는 것이 안 읽힌다.
 */
const Pin: React.FC<{
  s: Site;
  u: (px: number) => number;
  color: string;
  fit: (s: Site, chars: number) => boolean;
  r: number;
  hollow?: boolean;
  cross?: boolean;
  /** 점만 찍고 이름은 띄우지 않는다 */
  quiet?: boolean;
}> = ({ s, u, color, fit, r, hollow, cross, quiet }) => (
  <g>
    <circle
      cx={s.x}
      cy={s.y}
      r={u(r)}
      fill={hollow ? C.bg : color}
      stroke={color}
      strokeWidth={u(2.6)}
    />
    {cross && (
      <>
        <line
          x1={s.x - u(r + 4)}
          y1={s.y - u(r + 4)}
          x2={s.x + u(r + 4)}
          y2={s.y + u(r + 4)}
          stroke={color}
          strokeWidth={u(3)}
        />
        <line
          x1={s.x - u(r + 4)}
          y1={s.y + u(r + 4)}
          x2={s.x + u(r + 4)}
          y2={s.y - u(r + 4)}
          stroke={color}
          strokeWidth={u(3)}
        />
      </>
    )}
    {!quiet && fit(s, s.name.length) && (
      <text
        x={s.side === "left" ? s.x - u(15) : s.x + u(15)}
        y={s.y + u(8) + u(s.dy ?? 0)}
        textAnchor={s.side === "left" ? "end" : "start"}
        fontSize={u(25)}
        fontWeight={900}
        fill={hollow ? "#8A7C6C" : "#E7DAC0"}
        style={{ paintOrder: "stroke", stroke: C.bg, strokeWidth: u(6.5) }}
      >
        {s.name}
      </text>
    )}
  </g>
);
