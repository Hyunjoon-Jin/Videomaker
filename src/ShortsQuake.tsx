import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  BAND,
  KINDS,
  KM_TO_DEEP,
  KM_TO_SEOUL,
  MAP_KOREA,
  MAP_LANDS,
  MARKED,
  MAX_DEPTH,
  PROFILE,
  QUAKES,
  Q_EVENTS,
  Quake,
  SEOUL,
  TRENCH_LON,
  colorOf,
  lonX,
  px,
  radiusOf,
} from "./data/quake";
import { Shot, cameraAt } from "./mapcam";
import { beatFor, beatIndexAt, layoutBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(2.2 * FPS);

/**
 * 단면이 처음 서는 비트는 길게 준다.
 *
 * 거기서 화면이 통째로 바뀐다 — 지도가 위로 올라가고 아래에서 단면이
 * 올라오고, 깊이선이 0에서 700km까지 훑고 내려가며 점이 켜진다. 자막
 * 길이로 재면 5초인데 그 안에 이 셋을 다 보여줄 수 없다.
 */
const HOLD: Record<number, number> = { 4: 8.5 };
const BEATS = Q_EVENTS.map((e, i) => {
  const b = beatFor(i, { title: e.title, detail: e.detail }, e.impact ?? 0.4, FPS);
  return HOLD[i] ? { ...b, hold: Math.round(HOLD[i] * FPS) } : b;
});
const SPANS = layoutBeats(BEATS, HOOK, 0);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(11.5 * FPS);
export const QUAKE_DURATION = BODY_END + OUTRO;

/** 단면이 처음 서는 비트 */
const P0 = Q_EVENTS.findIndex((e) => e.profile);

/* ── 화면 배치 ──────────────────────────────────────
   단면이 서면 지도가 띠가 된다. 가로는 둘 다 경도 124~147도를 1080px에
   걸치므로, 지도 위 진앙에서 그대로 아래로 내려오면 그 지진의 깊이다.

   단면 상자를 378px로 잡은 것은 축척을 맞추기 위해서다. 가로 1000단위가
   실제 2,001km이고 세로 350단위가 700km이니 단위당 2.00km 대 1.99km,
   거의 1:1이다. 단면에서 보이는 29도 기울기가 실제 기울기다. */
const MAP_TOP = 470;
const MAP_H = 510;
const PROF_TOP = 1010;
const PROF_H = 378;
/** 단면 viewBox 높이 — 1080px에 1000단위를 걸치는 비례 그대로 */
const PROF_VB = (PROF_H / 1080) * 1000;

const LAND = "#241E17";
const LINE = "#3B342A";
const KOREA = "#2F281E";

const SHOTS: Shot[] = [
  { at: HOOK - 26, cx: px(129.2, 36).x, cy: px(129.2, 36).y, z: 5.2 },
  ...SPANS.flatMap((sp, i) => {
    const e = Q_EVENTS[i];
    const s = { cx: e.cx, cy: e.cy, z: e.z };
    return [
      { at: sp.t1, ...s },
      { at: sp.t2, ...s },
    ];
  }),
  { at: BODY_END + Math.round(2.0 * FPS), cx: 500, cy: 430, z: 1.0 },
];

export const ShortsQuake: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? Q_EVENTS[bi] : null;
  const near = bi >= 0 ? Math.max(0, 1 - (frame - SPANS[bi].t1) / 22) : 0;
  const impact = (ev?.impact ?? 0) * near;

  const inOutro = frame >= BODY_END;
  /** 단면이 올라온 정도 */
  const split = interpolate(
    frame,
    [SPANS[P0].t0, SPANS[P0].t0 + Math.round(1.1 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  /** 깊이선이 훑고 내려가는 정도 — 단면이 처음 설 때 한 번 */
  const sweep = interpolate(
    frame,
    [SPANS[P0].t1 + 6, SPANS[P0].t1 + Math.round(4.6 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const sweepD = sweep * MAX_DEPTH;
  const sweeping = frame >= SPANS[P0].t1 && sweep < 1;

  const outroIn = interpolate(frame, [BODY_END, BODY_END + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
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

  // 지도 상자가 전체 화면에서 띠로 줄어든다
  const mapTop = split * MAP_TOP;
  const mapH = 1920 - split * (1920 - MAP_H);
  const cam = cameraAt(SHOTS, frame, mapH / 1080);
  const u = (n: number) => n / (1.08 * cam.z);

  /** 화면 밖 진앙은 그리지 않는다 — 2,678개를 매 프레임 다 그릴 이유가 없다 */
  const visible = (q: Quake) => {
    const p = px(q.lon, q.lat);
    return (
      p.x > cam.x - 20 && p.x < cam.x + cam.w + 20 &&
      p.y > cam.y - 20 && p.y < cam.y + cam.h + 20
    );
  };

  const marked = ev?.mark ? MARKED[ev.mark] : null;

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-qk.wav")} volume={0.9} />

      {/* ── 평면 ── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: mapTop,
          height: mapH,
          opacity: mapIn,
          overflow: "hidden",
        }}
      >
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {MAP_LANDS.map((l, i) => (
            <path key={i} d={l.d} fill={LAND} stroke={LINE} strokeWidth={u(1.4)} />
          ))}
          {MAP_KOREA.map((d, i) => (
            <path key={`k${i}`} d={d} fill={KOREA} stroke={LINE} strokeWidth={u(2)} />
          ))}

          {/* 단면으로 자른 띠 — 어디를 자른 것인지 평면에 그려둔다 */}
          {split > 0.02 && (
            <g opacity={split * 0.5}>
              {BAND.map((la) => (
                <line
                  key={la}
                  x1={cam.x}
                  y1={px(130, la).y}
                  x2={cam.x + cam.w}
                  y2={px(130, la).y}
                  stroke={INK.bone}
                  strokeWidth={u(1.6)}
                  strokeDasharray={`${u(9)} ${u(9)}`}
                />
              ))}
            </g>
          )}

          {QUAKES.filter(visible).map((q, i) => {
            const p = px(q.lon, q.lat);
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={u(radiusOf(q.m)) * 0.95}
                fill={colorOf(q.d)}
                opacity={0.5}
              />
            );
          })}

          {/* 해구 */}
          {ev?.trench && (
            <g opacity={split}>
              <line
                x1={lonX(TRENCH_LON)}
                y1={cam.y}
                x2={lonX(TRENCH_LON)}
                y2={cam.y + cam.h}
                stroke={INK.bone}
                strokeWidth={u(2.4)}
                opacity={0.6}
              />
            </g>
          )}

          {/* 이 비트가 가리키는 지진 */}
          {marked && (
            <g>
              <circle
                cx={px(marked.lon, marked.lat).x}
                cy={px(marked.lon, marked.lat).y}
                r={u(10) + impact * u(46)}
                fill="none"
                stroke={colorOf(marked.d)}
                strokeWidth={u(3)}
                opacity={0.35 + impact * 0.5}
              />
              <circle
                cx={px(marked.lon, marked.lat).x}
                cy={px(marked.lon, marked.lat).y}
                r={u(radiusOf(marked.m)) * 1.1}
                fill={colorOf(marked.d)}
              />
            </g>
          )}
        </svg>
      </div>

      {/* ── 단면 ── */}
      {split > 0.02 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: PROF_TOP,
            height: PROF_H,
            opacity: split,
            transform: `translateY(${(1 - split) * 60}px)`,
          }}
        >
          <svg
            viewBox={`0 0 1000 ${PROF_VB.toFixed(1)}`}
            preserveAspectRatio="none"
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            <rect x={0} y={0} width={1000} height={PROF_VB} fill="#191510" />
            {/* 깊이 눈금 */}
            {[200, 400, 600].map((d) => (
              <g key={d}>
                <line
                  x1={0}
                  y1={(d / MAX_DEPTH) * PROF_VB}
                  x2={1000}
                  y2={(d / MAX_DEPTH) * PROF_VB}
                  stroke="#3B342A"
                  strokeWidth={1}
                />
                <text
                  x={8}
                  y={(d / MAX_DEPTH) * PROF_VB - 5}
                  fontSize={13}
                  fontWeight={700}
                  fill="#6E6455"
                >
                  {d}km
                </text>
              </g>
            ))}

            {PROFILE.map((q, i) => {
              const on = q.d <= sweepD || !sweeping;
              if (!on) return null;
              const justLit = sweeping && sweepD - q.d < 22;
              return (
                <circle
                  key={i}
                  cx={lonX(q.lon)}
                  cy={(q.d / MAX_DEPTH) * PROF_VB}
                  r={radiusOf(q.m) * (justLit ? 1.25 : 0.72)}
                  fill={colorOf(q.d)}
                  opacity={justLit ? 1 : 0.55}
                />
              );
            })}

            {/* 훑고 내려가는 깊이선 */}
            {sweeping && (
              <line
                x1={0}
                y1={(sweepD / MAX_DEPTH) * PROF_VB}
                x2={1000}
                y2={(sweepD / MAX_DEPTH) * PROF_VB}
                stroke={INK.bone}
                strokeWidth={1.6}
                opacity={0.5}
              />
            )}

            {/* 해구와 서울 — 가로축이 지도와 같으므로 여기 세워도 어긋나지 않는다 */}
            {ev?.trench && (
              <>
                <line
                  x1={lonX(TRENCH_LON)}
                  y1={0}
                  x2={lonX(TRENCH_LON)}
                  y2={PROF_VB}
                  stroke={INK.bone}
                  strokeWidth={2}
                  opacity={0.6}
                />
                <text
                  x={lonX(TRENCH_LON) - 8}
                  y={PROF_VB - 10}
                  fontSize={15}
                  fontWeight={900}
                  textAnchor="end"
                  fill="#E7DAC0"
                  style={{ paintOrder: "stroke", stroke: "#191510", strokeWidth: 4 }}
                >
                  일본해구
                </text>
                <line
                  x1={lonX(SEOUL.lon)}
                  y1={0}
                  x2={lonX(SEOUL.lon)}
                  y2={PROF_VB}
                  stroke="#6E6455"
                  strokeWidth={1.6}
                  strokeDasharray="6 6"
                />
                <text
                  x={lonX(SEOUL.lon) + 8}
                  y={PROF_VB - 10}
                  fontSize={15}
                  fontWeight={900}
                  fill="#9A8F7C"
                  style={{ paintOrder: "stroke", stroke: "#191510", strokeWidth: 4 }}
                >
                  서울
                </text>
              </>
            )}

            {/* 재는 구간 — 해구에서 여기까지 몇 km인가 */}
            {ev?.span && (() => {
              const x0 = lonX(TRENCH_LON);
              const x1 = ev.span === "deep" ? lonX(MARKED.deepest.lon) : lonX(SEOUL.lon);
              const y = PROF_VB - 34;
              const km = ev.span === "deep" ? KM_TO_DEEP : KM_TO_SEOUL;
              return (
                <g opacity={0.9}>
                  <line x1={x0} y1={y} x2={x1} y2={y} stroke={INK.brass} strokeWidth={2} />
                  {[x0, x1].map((x) => (
                    <line key={x} x1={x} y1={y - 7} x2={x} y2={y + 7} stroke={INK.brass} strokeWidth={2} />
                  ))}
                  <text
                    x={(x0 + x1) / 2}
                    y={y - 12}
                    fontSize={19}
                    fontWeight={900}
                    textAnchor="middle"
                    fill={INK.brass}
                    style={{ paintOrder: "stroke", stroke: "#191510", strokeWidth: 5 }}
                  >
                    {km.toLocaleString()}km
                  </text>
                </g>
              );
            })()}

            {marked && (
              <circle
                cx={lonX(marked.lon)}
                cy={(marked.d / MAX_DEPTH) * PROF_VB}
                r={9 + impact * 22}
                fill="none"
                stroke={colorOf(marked.d)}
                strokeWidth={2.4}
                opacity={0.4 + impact * 0.5}
              />
            )}
          </svg>
        </div>
      )}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(21,19,16,0.95) 0%, rgba(21,19,16,0.5) 14%, rgba(21,19,16,0) 24%, rgba(21,19,16,0) 62%, rgba(21,19,16,0.82) 76%, rgba(21,19,16,0.97) 88%)",
          pointerEvents: "none",
        }}
      />

      {/* ── 깊이 범례 ── */}
      {uiOn && !inOutro && (
        <div style={{ position: "absolute", top: SAFE_TOP, left: TEXT_X, right: TEXT_X }}>
          <div style={{ color: C.dim, fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
            진앙 깊이
          </div>
          <div style={{ display: "flex", gap: 26, marginTop: 10 }}>
            {[
              ["70km 미만", "#D4694F"],
              ["70~300km", "#C09240"],
              ["300km 이상", "#7FA8C4"],
            ].map(([t, col]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, background: col }} />
                <span style={{ color: "#BDB3A0", fontSize: 26, fontWeight: 700 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 사건 ── */}
      {ev && uiOn && !inOutro && (
        <div style={{ position: "absolute", bottom: 320, left: TEXT_X, right: SAFE_RIGHT }}>
          <div style={{ color: INK.brass, fontSize: 31, fontWeight: 900 }}>{ev.kicker}</div>
          <Typed
            text={ev.title}
            start={SPANS[bi].t1}
            cps={14}
            style={{
              display: "block",
              color: C.text,
              fontSize: 78,
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
              fontSize: 35,
              fontWeight: 500,
              marginTop: 8,
            }}
          />
        </div>
      )}

      {/* ── 고지 ── */}
      {uiOn && !inOutro && (
        <div
          style={{ position: "absolute", bottom: BOTTOM_INSET, left: TEXT_X, right: SAFE_RIGHT }}
        >
          <div style={{ color: "#8A8070", fontSize: 20, lineHeight: 1.5 }}>
            USGS 지진 목록 · 핵실험·붕괴 제외 · 단면은 북위 36~44도 (고정댓글)
          </div>
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <>
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(21,19,16,0) 18%, rgba(21,19,16,0.76) 36%, rgba(21,19,16,0.97) 50%)",
              opacity: outroIn,
              pointerEvents: "none",
            }}
          />
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
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
              한반도에서 나는 두 가지 지진
            </div>
            {KINDS.map((k, i) => {
              const at = BODY_END + Math.round((0.9 + i * 1.4) * FPS);
              const on = interpolate(frame, [at, at + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={k.who}
                  style={{
                    marginTop: i ? 22 : 0,
                    opacity: on,
                    transform: `translateY(${(1 - on) * 14}px)`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
                    <span
                      style={{
                        color: k.near ? "#D4694F" : "#7FA8C4",
                        fontSize: 48,
                        fontWeight: 900,
                        minWidth: 268,
                      }}
                    >
                      {k.who}
                    </span>
                    <span style={{ color: C.text, fontSize: 42, fontWeight: 800 }}>{k.where}</span>
                  </div>
                  <div style={{ color: "#8A8070", fontSize: 30, fontWeight: 700, marginTop: 2 }}>
                    {k.ex}
                  </div>
                </div>
              );
            })}

            <div
              style={{
                color: C.text,
                fontSize: 48,
                fontWeight: 800,
                lineHeight: 1.34,
                marginTop: 38,
                opacity: interpolate(
                  frame,
                  [BODY_END + Math.round(4.4 * FPS), BODY_END + Math.round(5.0 * FPS)],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              발밑 645km에서 흔들린 것은
              <br />
              {KM_TO_DEEP.toLocaleString()}km 밖에서 내려온 판
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(21,19,16,0.58) 0%, rgba(21,19,16,0.5) 60%, rgba(21,19,16,0.4) 100%)",
            opacity: hookOut,
            justifyContent: "center",
            padding: `0 ${TEXT_X}px`,
          }}
        >
          <div style={{ opacity: hookIn }}>
            <Typed
              text="경주 지진 13km · 포항 10km"
              start={-20}
              cps={400}
              style={{ display: "block", color: C.dim, fontSize: 40, fontWeight: 700 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="645"
                start={-20}
                cps={400}
                style={{ color: "#7FA8C4", fontSize: 280, fontWeight: 900, lineHeight: 1 }}
              />
              <Typed
                text="km"
                start={-20}
                cps={400}
                style={{ color: C.text, fontSize: 96, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="한반도에서 지진이 난 가장 깊은 곳"
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
