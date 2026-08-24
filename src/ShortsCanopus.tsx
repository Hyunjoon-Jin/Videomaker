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
  ALL_SITES,
  CAN_BEATS,
  DRIFT,
  FROM,
  JEJU,
  LIMIT,
  LIMIT_DMS,
  NOW,
  REFRACTION,
  SEOUL,
  SEOUL_GAP,
  SITES,
  deg,
  gapKm,
  latY,
  limitAt,
} from "./data/canopus";
import { beatFor, beatIndexAt, layoutBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const PROVINCES: Array<{ id: string; d: string }> = provinces.provinces;

const HOOK = Math.round(2.2 * FPS);

/**
 * 그림이 글자보다 오래 걸리는 비트에 따로 얹는다. 하늘 판이 열리고
 * 경계선이 626년을 내려오는 데는 자막 읽는 시간보다 오래 든다.
 */
const EXTRA = [0.8, 1.6, 1.2, 2.6, 3.2];

const BEATS = CAN_BEATS.map((e, i) => {
  const b = beatFor(i, { title: e.line }, e.impact, FPS);
  return { ...b, hold: b.hold + Math.round(EXTRA[i] * FPS) };
});
const SPANS = layoutBeats(BEATS, HOOK, 0);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(6.5 * FPS);
export const CANOPUS_DURATION = BODY_END + OUTRO;

const BG = "#0C0E14";
const LAND_F = "#2A3040";
const LAND_S = "#3C4356";
/** 별빛 — 카노푸스는 흰색에 가깝다 */
const STARLIGHT = "#F2ECDC";
/** 경계선 */
const EDGE = "#C08A2E";

/**
 * 확대 판.
 *
 * 전국 지도에서 서울과 수원은 27px 떨어져 있다. 이 편이 다루는 차이가
 * 0.3도라 그 축척으로는 라벨이 통째로 겹친다. 12편에서 365m를 미터
 * 좌표계로 따로 그린 것과 같은 자리다 — 작은 차이는 확대 판이 맡는다.
 *
 * 37.15~37.68도를 세로 760px에 편다. 1도가 1434px이라 서울과 수원이
 * 450px 벌어진다.
 */
const ZL_TOP = 37.68;
const ZL_BOT = 37.15;
const Z_TOP = 640;
const Z_H = 760;
const zy = (lat: number) => Z_TOP + ((ZL_TOP - lat) / (ZL_TOP - ZL_BOT)) * Z_H;
/** 확대 판에 세우는 넷 — 경계선 양쪽으로 갈린다 */
const ZOOM_NAMES = ["서울", "인천", "원주", "수원"];

/** 남쪽 하늘 판 */
const SKY_TOP = 660;
const SKY_H = 400;
const SKY_L = TEXT_X;
const SKY_R = 1080 - SAFE_RIGHT;
/** 판 안에서 고도 1도가 몇 px인가. 위로 6도까지 담는다. */
const SKY_DEG = 46;
/** 지평선 자리 — 판 아래쪽에 두고 위로 하늘을 준다 */
const HORIZON = SKY_TOP + SKY_H - 92;

export const ShortsCanopus: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const bi = Math.max(0, beatIndexAt(SPANS, frame));
  const ev = CAN_BEATS[bi];
  const inOutro = frame >= BODY_END;

  const hookOut = interpolate(frame, [HOOK - 14, HOOK], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const uiOn = frame >= HOOK - 4;

  const outroIn = interpolate(frame, [BODY_END, BODY_END + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /** 확대 판 */
  const zi = CAN_BEATS.findIndex((b) => b.zoom);
  const zoom = interpolate(
    frame,
    [SPANS[zi].t1 - 8, SPANS[zi].t1 + 12, SPANS[zi].t2 + 2, SPANS[zi].t2 + 14],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  /** 남쪽 하늘 판 — 열렸다가 다음 비트에서 닫힌다 */
  const si = CAN_BEATS.findIndex((b) => b.sky);
  const sky = interpolate(
    frame,
    [SPANS[si].t1 - 8, SPANS[si].t1 + 14, SPANS[si].t2 + 2, SPANS[si].t2 + 16],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  /**
   * 경계선이 내려오는 비트.
   *
   * 626년을 거꾸로 훑는다 — 지금에서 1400년으로 갔다가 다시 돌아오면
   * 무엇이 원래 자리인지 헷갈린다. 1400년에서 시작해 지금으로 온다.
   */
  const di = CAN_BEATS.findIndex((b) => b.drift);
  const ds = SPANS[di];
  const driftOn = frame >= ds.t1 - 6;
  const driftP = interpolate(frame, [ds.t1, ds.t2 - 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const year = driftOn && !inOutro ? Math.round(FROM + (NOW - FROM) * driftP) : NOW;
  const lim = limitAt(year);

  const shown = inOutro ? SITES.length : ev.n;
  const lineY = latY(lim);

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-cn.wav")} volume={0.9} />

      {/* ── 지도와 경계선 ── */}
      <AbsoluteFill style={{ opacity: 1 - Math.max(sky, zoom) }}>
        <svg
          viewBox="200 250 700 1000"
          preserveAspectRatio="xMidYMin slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <defs>
            {/* 선 위쪽은 별이 안 뜨는 땅이다. 덮어서 갈라 보인다. */}
            <linearGradient id="cnDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#05060A" stopOpacity={0.82} />
              <stop offset="100%" stopColor="#05060A" stopOpacity={0.28} />
            </linearGradient>
          </defs>

          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND_F} stroke={LAND_S} strokeWidth={1.6} />
          ))}

          {/* 훅이 '이 선'이라고 말한다. 0프레임에 선이 이미 있어야 한다. */}
          <>
            <rect x={0} y={0} width={1000} height={lineY} fill="url(#cnDark)" />
            <line x1={0} y1={lineY} x2={1000} y2={lineY} stroke={EDGE} strokeWidth={3.2} />
          </>

          {uiOn && (
            <>
              {/* 서울까지 몇 km인지는 선에 붙여야 읽힌다. 계기판에 뒀더니
                  세 줄이 되면서 지도의 서울 라벨과 붙었다. */}
              {driftOn && !inOutro && (
                <text
                  x={730}
                  y={lineY - 18}
                  fontSize={26}
                  fontWeight={900}
                  fill={EDGE}
                  textAnchor="end"
                  style={{ paintOrder: "stroke", stroke: BG, strokeWidth: 7 }}
                >
                  서울까지 {gapKm(SEOUL.lat, year).toFixed(1)}km
                </text>
              )}
            </>
          )}

          {SITES.slice(0, shown).map((s) => {
            const hero = s.name === "서울" || s.name === "수원";
            const up = s.lat < lim;
            // 서울과 수원은 위도가 0.31도 차이다. 지도에서 32px 떨어져
            // 있어 라벨이 겹친다. 서울은 위로, 수원은 아래로 벌려 각자
            // 경계선 제 쪽에 붙여 둔다.
            const dy = s.name === "서울" ? -26 : s.name === "수원" ? 34 : 8;
            // 남중고도는 그 해의 한계 위도에서 위도를 뺀 값이다. 연도가
            // 흐르는 비트에서 값이 고정되어 있으면 화면이 스스로를 뒤집는다.
            const alt = lim - s.lat;
            return (
              <g key={s.name}>
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={hero ? 9 : 6}
                  fill={up ? STARLIGHT : "#5D6373"}
                />
                {/* 마무리에서는 표가 같은 값을 다시 세운다. 지도 라벨을
                    남겨 두면 표와 겹쳐 읽힌다. 점만 남긴다. */}
                {!inOutro && (
                  <text
                    x={s.x + 15}
                    y={s.y + dy}
                    fontSize={hero ? 26 : 23}
                    fontWeight={hero ? 900 : 700}
                    fill={up ? STARLIGHT : "#7E8496"}
                    style={{ paintOrder: "stroke", stroke: BG, strokeWidth: 7 }}
                  >
                    {s.name} {deg(alt)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>

      {/* ── 확대 판 — 경계선 언저리 0.5도 ── */}
      {zoom > 0 && (
        <AbsoluteFill style={{ opacity: zoom }}>
          <svg viewBox="0 0 1080 1920" style={{ width: "100%", height: "100%", display: "block" }}>
            {/* 지도가 비쳐 보이면 두 축척이 겹쳐 읽힌다. 통째로 덮는다. */}
            <rect x={0} y={0} width={1080} height={1920} fill="#080A10" />

            {/* 판이 바뀐 것을 알려야 두 축척이 안 헷갈린다 */}
            <text x={TEXT_X} y={Z_TOP - 96} fontSize={34} fontWeight={900} fill="#6B7183">
              경계선 언저리 확대
            </text>

            {/* 선 위쪽 — 안 뜨는 땅 */}
            <rect x={TEXT_X} y={Z_TOP} width={1080 - SAFE_RIGHT - TEXT_X} height={zy(LIMIT) - Z_TOP} fill="#12141C" />
            <line
              x1={TEXT_X}
              y1={zy(LIMIT)}
              x2={1080 - SAFE_RIGHT}
              y2={zy(LIMIT)}
              stroke={EDGE}
              strokeWidth={3.4}
            />
            {/* 왼쪽은 원주 이름, 오른쪽은 원주 값이 차지한다. 가운데가 빈다. */}
            <text
              x={540}
              y={zy(LIMIT) - 18}
              fontSize={30}
              fontWeight={900}
              fill={EDGE}
              textAnchor="middle"
            >
              북위 {LIMIT.toFixed(3)}°
            </text>

            {ZOOM_NAMES.map((n) => {
              const s2 = ALL_SITES.find((x) => x.name === n)!;
              const y = zy(s2.lat);
              const up = s2.alt > 0;
              return (
                <g key={n}>
                  <circle cx={TEXT_X + 18} cy={y} r={9} fill={up ? STARLIGHT : "#5D6373"} />
                  <text
                    x={TEXT_X + 44}
                    y={y + 13}
                    fontSize={40}
                    fontWeight={900}
                    fill={up ? STARLIGHT : "#8A90A2"}
                  >
                    {n}
                  </text>
                  <text
                    x={1080 - SAFE_RIGHT}
                    y={y + 13}
                    fontSize={40}
                    fontWeight={900}
                    fill={up ? STARLIGHT : "#8A90A2"}
                    textAnchor="end"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {deg(s2.alt)}
                  </text>
                </g>
              );
            })}

            {/* 자 — 이 판이 얼마짜리인지 */}
            <text x={TEXT_X} y={Z_TOP + Z_H + 54} fontSize={26} fontWeight={700} fill="#6B7183">
              세로 0.53° = 59km
            </text>
          </svg>
        </AbsoluteFill>
      )}

      {/* ── 남쪽 하늘 판 — 같은 시각 같은 방위를 두 곳에서 ── */}
      {sky > 0 && (
        <AbsoluteFill style={{ opacity: sky }}>
          <svg viewBox="0 0 1080 1920" style={{ width: "100%", height: "100%", display: "block" }}>
            <rect x={0} y={0} width={1080} height={1920} fill="#080A10" />
            {[SEOUL, JEJU].map((s, i) => {
              const top = SKY_TOP + i * (SKY_H + 44);
              const hz = top + SKY_H - 110;
              /*
                기하학적 고도로 그린다.
                굴절을 넣은 겉보기 고도(서울 +0.29°)로 그렸더니 앞 화면에서
                '서울 -0.28°, 안 뜸'이라고 해놓고 여기서는 지평선 위에
                별이 떠 있었다. 화면이 스스로를 뒤집는다. 굴절 이야기는
                고정댓글로 옮긴다.
              */
              const sy = hz - s.alt * SKY_DEG;
              const above = s.alt > 0;
              const cx = (SKY_L + SKY_R) / 2;
              return (
                <g key={s.name}>
                  <rect x={SKY_L} y={top} width={SKY_R - SKY_L} height={SKY_H} fill="#0D1018" />
                  {/* 땅 */}
                  <rect x={SKY_L} y={hz} width={SKY_R - SKY_L} height={top + SKY_H - hz} fill="#191D27" />
                  <line x1={SKY_L} y1={hz} x2={SKY_R} y2={hz} stroke="#586074" strokeWidth={2.6} />

                  {above ? (
                    <>
                      <circle cx={cx} cy={sy} r={44} fill={STARLIGHT} opacity={0.1} />
                      <circle cx={cx} cy={sy} r={14} fill={STARLIGHT} />
                    </>
                  ) : (
                    // 지평선 아래 — 땅에 묻힌 자리를 점선으로만 남긴다
                    <circle
                      cx={cx}
                      cy={sy}
                      r={13}
                      fill="none"
                      stroke="#6B7183"
                      strokeWidth={3}
                      strokeDasharray="7 6"
                    />
                  )}

                  <text x={SKY_L + 22} y={top + 52} fontSize={38} fontWeight={900} fill={C.text}>
                    {s.name}
                  </text>
                  <text
                    x={SKY_R - 22}
                    y={top + 52}
                    fontSize={38}
                    fontWeight={900}
                    fill={above ? STARLIGHT : "#6B7183"}
                    textAnchor="end"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {deg(s.alt)}
                  </text>
                  <text x={SKY_L + 22} y={hz + 44} fontSize={26} fontWeight={700} fill="#79808F">
                    {above ? "남쪽 지평선" : "남쪽 지평선 — 안 올라옴"}
                  </text>
                </g>
              );
            })}
          </svg>
        </AbsoluteFill>
      )}

      {/* ── 계기판 ── */}
      {uiOn && !inOutro && (
        <div style={{ position: "absolute", top: SAFE_TOP, left: TEXT_X, right: SAFE_RIGHT }}>
          <div style={{ color: C.dim, fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
            {driftOn ? "노인성이 뜨는 북쪽 한계" : "노인성이 뜨는 북쪽 한계"}
          </div>
          {driftOn ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <span
                style={{
                  color: C.text,
                  fontSize: 96,
                  fontWeight: 900,
                  lineHeight: 1.08,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {year}
              </span>
              <span
                style={{
                  color: EDGE,
                  fontSize: 44,
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {lim.toFixed(3)}°N
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <span
                style={{
                  color: C.text,
                  fontSize: 96,
                  fontWeight: 900,
                  lineHeight: 1.08,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {LIMIT.toFixed(3)}°N
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── 자막 — 한 줄 ── */}
      {uiOn && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 56,
          }}
        >
          <Typed
            text={ev.line}
            start={SPANS[bi].t1}
            cps={13}
            style={{
              display: "block",
              color: C.text,
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1.24,
            }}
          />
        </div>
      )}

      {/* ── 마무리 ── */}
      {inOutro && (
        <>
          <AbsoluteFill style={{ backgroundColor: "rgba(10,12,18,0.86)", opacity: outroIn }} />
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
                marginBottom: 16,
              }}
            >
              남중고도 · {NOW}년
            </div>
            {["서울", "수원", "대전", "부산", "제주"].map((n, i) => {
              const s = SITES.find((x) => x.name === n)!;
              const at = BODY_END + Math.round((0.5 + i * 0.3) * FPS);
              const on = interpolate(frame, [at, at + 10], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={n}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 22,
                    marginTop: 8,
                    opacity: on,
                    transform: `translateY(${(1 - on) * 12}px)`,
                  }}
                >
                  <span
                    style={{
                      color: s.up ? STARLIGHT : "#6B7183",
                      fontSize: 46,
                      fontWeight: 800,
                      flex: 1,
                    }}
                  >
                    {n}
                  </span>
                  <span
                    style={{
                      color: s.up ? STARLIGHT : "#6B7183",
                      fontSize: 50,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {deg(s.alt)}
                  </span>
                </div>
              );
            })}
            <div
              style={{
                color: C.text,
                fontSize: 46,
                fontWeight: 900,
                lineHeight: 1.32,
                marginTop: 26,
                wordBreak: "keep-all",
                opacity: interpolate(
                  frame,
                  [BODY_END + Math.round(3.0 * FPS), BODY_END + Math.round(3.7 * FPS)],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              서울과 수원 사이에 그어진 선
            </div>
          </AbsoluteFill>
        </>
      )}

      {/* ── 훅 ── */}
      {hookOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: hookOut,
            // 0.7이면 지도가 안 보인다. 훅이 '이 선'을 가리키니 선과
            // 땅이 같이 읽혀야 한다.
            backgroundColor: "rgba(10,12,18,0.42)",
            justifyContent: "center",
            padding: `0 ${SAFE_RIGHT}px 0 ${TEXT_X}px`,
          }}
        >
          <div style={{ color: EDGE, fontSize: 46, fontWeight: 800, marginBottom: 10 }}>
            북위 {LIMIT.toFixed(1)}도
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.16,
              wordBreak: "keep-all",
            }}
          >
            이 선 위에서는
            <br />
            안 보이는 별
          </div>
        </AbsoluteFill>
      )}

      <Grain />
    </AbsoluteFill>
  );
};
