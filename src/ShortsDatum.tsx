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
  ARROW_X,
  DATUM_BEATS,
  FOCUS,
  M_PER_UNIT,
  SITES,
  SPAN,
  YEAR_FROM,
} from "./data/datum";
import { Shot, cameraAt } from "./mapcam";
import { beatFor, beatIndexAt, layoutBeats, valueAtBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(2.2 * FPS);

/**
 * 확대 비트와 화살표 비트는 글자보다 그림이 오래 걸린다. beatFor는 글자
 * 수만 보고 체류를 정하므로, 그림이 다 그려지기 전에 자막이 넘어간다.
 * 그래서 이 둘에만 따로 얹는다.
 */
const EXTRA = [0, 0, 1.6, 1.2, 0, 0];

const BEATS = DATUM_BEATS.map((e, i) => {
  const b = beatFor(e.year, { title: e.title, detail: e.detail }, e.impact, FPS);
  return { ...b, hold: b.hold + Math.round(EXTRA[i] * FPS) };
});

/**
 * creep 0.
 *
 * 이 편의 계기판은 연도인데 1910에서 2001까지 91년이 비어 있다. creep을
 * 주면 체류 중에도 연도가 흘러, 자막이 "1910년 토지조사사업"인데 계기판은
 * 1919년을 가리킨다. 일출 편에서 겪은 그대로다. 여기서는 사건이 있는
 * 해에만 연도가 서 있어야 하므로 0으로 둔다 — 대신 이동 구간이 길어서
 * 정지 화면이 되지는 않는다.
 */
const SPANS = layoutBeats(BEATS, HOOK, 0);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(9.0 * FPS);
export const DATUM_DURATION = BODY_END + OUTRO;

/** 옛 기준 — 바래고 물러난 색 */
const OLD = "#8A6A4A";
/** 새 기준 */
const NEW = INK.bone;
const SEA = "#12100D";
const LAND_F = "#2A241C";
const LAND_S = "#463C30";

/**
 * 카메라.
 *
 * 확대 비트에서 경복궁 쪽으로 밀고 들어간다. 지도 1단위가 1.1km라
 * z를 아무리 올려도 365m는 안 보인다 — 그래서 확대는 카메라가 아니라
 * 미터 좌표계로 따로 그린 판이 맡는다. 카메라가 미는 것은 그 판이
 * 열리는 동안 뒤에서 계속 밀어주기 위해서다. 둘이 같이 움직여야
 * 판이 '끼어든 그림'이 아니라 '더 들어간 것'으로 읽힌다.
 */
const ZOOM_I = DATUM_BEATS.findIndex((b) => b.zoom);
const ARROW_I = DATUM_BEATS.findIndex((b) => b.arrows);

const SHOTS: Shot[] = [
  { at: HOOK - 26, cx: 500, cy: 520, z: 1.06 },
  { at: SPANS[ZOOM_I].t0, cx: 500, cy: 520, z: 1.06 },
  { at: SPANS[ZOOM_I].t2, cx: FOCUS.x, cy: FOCUS.y, z: 3.6 },
  { at: SPANS[ARROW_I].t1, cx: 500, cy: 520, z: 1.06 },
  { at: BODY_END, cx: 500, cy: 520, z: 1.02 },
];

/**
 * 마무리 표는 거리순으로 세운다.
 *
 * 처음에는 SITES 순서 그대로 뒀는데, 357·393·367·374…로 오르내려서
 * '고르지 않다'가 안 읽히고 그냥 어수선했다. 세워 놓으면 357에서
 * 401까지 한 줄로 벌어지는 게 보인다.
 *
 * 대신 '남쪽일수록 크다'고는 쓰지 않는다. 독도(위도 37.24)가 393m로
 * 대전(36.35)보다 크다 — 동쪽으로 멀어서다. 위도만의 법칙이 아니다.
 * 목록을 세워놓고 규칙을 말하려면 그 규칙이 목록 전부에서 성립하는지
 * 따로 봐야 한다.
 */
const ORDERED = [...SITES].sort((a, b) => a.dist - b.dist);

/** 확대 판이 덮는 실제 거리 */
const PANEL_M = 900;
/** 미터 → 판 좌표(0..1000) */
const pm = (m: number) => (m / PANEL_M) * 1000;

export const ShortsDatum: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? DATUM_BEATS[bi] : null;
  const inOutro = frame >= BODY_END;

  const yearF = valueAtBeats(SPANS, frame, YEAR_FROM);
  const year = Math.round(yearF);

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const uiOn = frame >= HOOK - 4;

  /** 확대 판 — 열리고, 화살표 비트가 시작되면 닫힌다 */
  const zs = SPANS[ZOOM_I];
  const panel = interpolate(
    frame,
    [zs.t1 - 6, zs.t1 + 12, zs.t2 + 4, zs.t2 + 18],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  /** 판 안에서 옛 좌표 점이 미끄러져 나가는 진행 */
  const slide = interpolate(frame, [zs.t1 + 16, zs.t1 + Math.round(1.5 * FPS)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 전국 화살표 */
  const arrows = interpolate(
    frame,
    [SPANS[ARROW_I].t1, SPANS[ARROW_I].t1 + Math.round(0.9 * FPS)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const outroIn = interpolate(frame, [BODY_END, BODY_END + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cam = cameraAt(SHOTS, frame);
  const u = (px: number) => px / (1.08 * cam.z);

  return (
    <AbsoluteFill style={{ backgroundColor: SEA, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-dt.wav")} volume={0.9} />

      {/* ── 전국 지도 ── */}
      <AbsoluteFill style={{ opacity: 1 - panel * 0.86 }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <defs>
            <marker
              id="dtHead"
              markerWidth={6}
              markerHeight={6}
              refX={5}
              refY={3}
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 z" fill={OLD} />
            </marker>
          </defs>

          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND_F} stroke={LAND_S} strokeWidth={u(1.6)} />
          ))}

          {/*
            전국 화살표.

            방향은 남동이다 — 옛 좌표를 새 지도에 찍었을 때 어디로
            어긋나는가를 그린다. 데이터(north·east)는 그 반대 방향이라
            여기서 부호를 뒤집는다. 뒤집는 자리는 이 한 곳뿐이어야 한다.
          */}
          {arrows > 0 &&
            !inOutro &&
            SITES.map((s) => {
              const dx = (-s.east / M_PER_UNIT) * ARROW_X * arrows;
              const dy = (s.north / M_PER_UNIT) * ARROW_X * arrows;
              // 독도는 오른쪽 끝이라 거리를 오른쪽에 달면 화면 밖으로 나간다
              const flip = s.x > 700;
              return (
                <g key={s.name}>
                  <line
                    x1={s.x}
                    y1={s.y}
                    x2={s.x + dx}
                    y2={s.y + dy}
                    stroke={OLD}
                    strokeWidth={u(3.4)}
                    markerEnd="url(#dtHead)"
                    opacity={0.95}
                  />
                  <circle cx={s.x} cy={s.y} r={u(5)} fill={NEW} />
                  <text
                    x={s.x + dx + u(flip ? -12 : 12)}
                    y={s.y + dy + u(9)}
                    fontSize={u(24)}
                    fontWeight={900}
                    fill={NEW}
                    textAnchor={flip ? "end" : "start"}
                    style={{ paintOrder: "stroke", stroke: SEA, strokeWidth: u(7) }}
                  >
                    {Math.round(s.dist)}m
                  </text>
                  <text
                    x={s.x + u(flip ? 12 : -12)}
                    y={s.y + u(flip ? -10 : 9)}
                    fontSize={u(22)}
                    fontWeight={700}
                    fill={C.dim}
                    textAnchor={flip ? "start" : "end"}
                    style={{ paintOrder: "stroke", stroke: SEA, strokeWidth: u(7) }}
                  >
                    {s.short}
                  </text>
                </g>
              );
            })}

          {/* 확대할 자리를 미리 표시해 둔다 — 판이 어디서 나왔는지 알려준다.
              판이 열리면 지운다. 판 안의 '근정전'과 겹쳐 읽힌다. */}
          {arrows === 0 && !inOutro && panel < 0.3 && (
            <g opacity={1 - panel / 0.3}>
              <circle cx={FOCUS.x} cy={FOCUS.y} r={u(7)} fill={NEW} />
              <text
                x={FOCUS.x + u(16)}
                y={FOCUS.y + u(9)}
                fontSize={u(24)}
                fontWeight={800}
                fill={C.dim}
                style={{ paintOrder: "stroke", stroke: SEA, strokeWidth: u(7) }}
              >
                경복궁
              </text>
            </g>
          )}
        </svg>
      </AbsoluteFill>

      {/* ── 확대 판 — 미터 좌표계 ── */}
      {panel > 0 && (
        <AbsoluteFill
          style={{
            opacity: panel,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <svg
            viewBox="0 0 1000 1000"
            style={{ width: "100%", height: 1080, display: "block" }}
          >
            {/* 100m 격자 — 눈금이 있어야 365m가 길이로 읽힌다 */}
            {[...Array(10)].map((_, i) => (
              <g key={i} stroke={LAND_S} strokeWidth={1.2} opacity={0.55}>
                <line x1={pm(i * 100)} y1={0} x2={pm(i * 100)} y2={1000} />
                <line x1={0} y1={pm(i * 100)} x2={1000} y2={pm(i * 100)} />
              </g>
            ))}

            {/* 경복궁 궁역 모식도 — 동서 500m, 남북 780m */}
            <rect
              x={500 - pm(250)}
              y={500 + pm(250) - pm(780)}
              width={pm(500)}
              height={pm(780)}
              fill="none"
              stroke={NEW}
              strokeWidth={3}
              opacity={0.5}
            />
            {/* 궁역 위쪽 변은 판 밖으로 나간다. 라벨은 아래쪽 변 안에 붙인다. */}
            <text
              x={500 - pm(250) + 14}
              y={500 + pm(250) - 18}
              fontSize={30}
              fontWeight={700}
              fill={C.dim}
            >
              경복궁 궁역 (모식도)
            </text>

            {/* 기록 자리 — 근정전 */}
            <circle cx={500} cy={500} r={12} fill={NEW} />
            <text x={500 + 22} y={500 - 14} fontSize={34} fontWeight={800} fill={NEW}>
              근정전
            </text>

            {/* 옛 좌표로 찍은 자리 — 남동으로 밀린다 */}
            {(() => {
              const ex = 500 + pm(-FOCUS.east) * slide;
              const ey = 500 + pm(FOCUS.north) * slide;
              return (
                <g opacity={slide}>
                  <line
                    x1={500}
                    y1={500}
                    x2={ex}
                    y2={ey}
                    stroke={OLD}
                    strokeWidth={5}
                    strokeDasharray="14 10"
                  />
                  <circle cx={ex} cy={ey} r={12} fill={OLD} />
                  {/* 오른쪽에 달면 화면 밖으로 나간다. 점 아래 왼쪽으로 뺀다. */}
                  <text
                    x={ex + 18}
                    y={ey + 48}
                    fontSize={32}
                    fontWeight={800}
                    fill={OLD}
                    textAnchor="end"
                  >
                    옛 좌표로 찍은 자리
                  </text>
                  <text
                    x={(500 + ex) / 2 - 14}
                    y={(500 + ey) / 2}
                    fontSize={58}
                    fontWeight={900}
                    fill={NEW}
                    textAnchor="end"
                    style={{ paintOrder: "stroke", stroke: SEA, strokeWidth: 12 }}
                  >
                    {Math.round(FOCUS.dist)}m
                  </text>
                </g>
              );
            })()}

            {/* 눈금자 */}
            <g>
              <line
                x1={pm(50)}
                y1={pm(830)}
                x2={pm(50) + pm(100)}
                y2={pm(830)}
                stroke={C.dim}
                strokeWidth={4}
              />
              <text x={pm(50)} y={pm(830) - 14} fontSize={28} fontWeight={700} fill={C.dim}>
                100m
              </text>
            </g>
          </svg>
        </AbsoluteFill>
      )}

      {/* ── 계기판 — 연도 ── */}
      {uiOn && !inOutro && (
        <div style={{ position: "absolute", top: SAFE_TOP, left: TEXT_X, right: SAFE_RIGHT }}>
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            좌표의 기준
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span
              style={{
                color: C.text,
                fontSize: 96,
                fontWeight: 900,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {year}
            </span>
            <span style={{ color: C.dim, fontSize: 40, fontWeight: 800 }}>년</span>
          </div>
        </div>
      )}

      {/* 화살표 과장 배율 — 과장했으면 반드시 적는다 */}
      {arrows > 0 && !inOutro && (
        <div
          style={{
            position: "absolute",
            right: SAFE_RIGHT,
            top: SAFE_TOP + 6,
            textAlign: "right",
            color: C.dim,
            fontSize: 26,
            fontWeight: 700,
            opacity: arrows * 0.9,
          }}
        >
          화살표 {ARROW_X}배 과장
          <br />
          거리는 계산값
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
          <div style={{ color: INK.brass, fontSize: 30, fontWeight: 800, marginBottom: 4 }}>
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

      {/* ── 마무리 ── */}
      {inOutro && (
        <AbsoluteFill
          style={{
            // 표가 지도 위에 겹치면 둘 다 안 읽힌다. 지도는 뒤로 물린다.
            backgroundColor: "rgba(18,16,13,0.74)",
            opacity: outroIn,
          }}
        />
      )}
      {inOutro && (
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
            }}
          >
            옛 좌표가 새 지도에서 어긋나는 거리
          </div>

          {ORDERED.map((s, i) => {
            const at = BODY_END + Math.round((0.6 + i * 0.34) * FPS);
            const on = interpolate(frame, [at, at + 10], [0, 1], {
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
                  marginTop: 6,
                  opacity: on,
                  transform: `translateY(${(1 - on) * 12}px)`,
                }}
              >
                <span style={{ color: C.text, fontSize: 40, fontWeight: 800, flex: 1 }}>
                  {s.short}
                </span>
                <span
                  style={{
                    color: C.text,
                    fontSize: 46,
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {Math.round(s.dist)}m
                </span>
              </div>
            );
          })}

          <div
            style={{
              color: C.text,
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1.34,
              marginTop: 24,
              opacity: interpolate(
                frame,
                [BODY_END + Math.round(4.4 * FPS), BODY_END + Math.round(5.1 * FPS)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            한 덩어리로 밀린 게 아니라
            <br />
            {ORDERED[0].short} {Math.round(SPAN.min)}m,{" "}
            {ORDERED[ORDERED.length - 1].short} {Math.round(SPAN.max)}m
            <br />
            곳마다 다르게 벌어진 어긋남
          </div>
        </AbsoluteFill>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: hookOut,
            backgroundColor: "rgba(18,16,13,0.52)",
            justifyContent: "center",
            padding: `0 ${SAFE_RIGHT}px 0 ${TEXT_X}px`,
          }}
        >
          <div style={{ color: INK.brass, fontSize: 46, fontWeight: 800, marginBottom: 10 }}>
            2010년
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ color: C.text, fontSize: 210, fontWeight: 900, lineHeight: 1 }}>
              365
            </span>
            <span style={{ color: C.text, fontSize: 92, fontWeight: 800 }}>m</span>
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 54,
              fontWeight: 800,
              marginTop: 18,
              wordBreak: "keep-all",
            }}
          >
            우리나라 좌표가 한꺼번에 움직인 거리
          </div>
        </AbsoluteFill>
      )}

      <Grain />
    </AbsoluteFill>
  );
};
