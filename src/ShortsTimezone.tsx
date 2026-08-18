import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { EA_KOREA, EA_LANDS } from "./data/typhoon";
import {
  AKASHI,
  City,
  M_ROWS,
  MERIDIANS,
  Meridian,
  PYONGYANG,
  SEOUL,
  TZ_EVENTS,
  degLabel,
  lagMin,
  meridianPath,
  meridianX,
  northAt,
  southAt,
  utcLabel,
} from "./data/timezone";
import { Shot, cameraAt } from "./mapcam";
import { beatFor, beatIndexAt, layoutBeats, valueAtBeats } from "./beats";
import { C, FPS, INK } from "./theme";
import { Grain } from "./Grain";
import { Typed } from "./Typed";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, SAFE_TOP, OUTRO_PAD, TEXT_X } from "./safe";

const HOOK = Math.round(4.5 * FPS);

/**
 * 연도 사이가 42년씩 비는 구간이 있다.
 *
 * 다른 편은 사건 간격이 고만고만해서 이동에 1초면 됐다. 여기는 1912년
 * 다음이 1954년이라, 1초에 42년이 지나가면 숫자가 그냥 튄다. 반대로
 * 2015년에서 2018년은 3년뿐이라 같은 1초가 길다.
 *
 * 간격이 큰 구간에만 이동 시간을 더 준다. 42년이 흐르는 걸 보여주는
 * 것 자체가 '그동안 아무 일도 없었다'는 정보다.
 */
const SLOW: Record<number, number> = { 2: 2.1, 4: 2.5 };
const BEATS = TZ_EVENTS.map((e, i) => {
  const b = beatFor(e.year, { title: e.title, detail: e.detail }, e.impact ?? 0.4, FPS);
  return SLOW[i] ? { ...b, travel: Math.round(SLOW[i] * FPS) } : b;
});

/**
 * creep은 0이다.
 *
 * 체류 중에 값이 조금씩 나아가게 두면 다른 편에서는 화면이 살아나지만
 * 여기서는 안 된다. 1961년에서 2015년까지 54년이 비어 있어, 0.03만
 * 줘도 체류 동안 1.6년이 흐른다. '1961년 8월 10일'이라고 써놓고 화면
 * 위 연도가 1962년을 가리키면 자막과 계기가 서로를 부정한다.
 *
 * 대신 정지 화면이 되지 않게 자오선과 시차 막대에 숨을 넣는다.
 */
const SPANS = layoutBeats(BEATS, HOOK, 0);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(11.5 * FPS);
export const TZ_DURATION = BODY_END + OUTRO;

const LAST_YEAR = TZ_EVENTS[TZ_EVENTS.length - 1].year;

/**
 * 카메라 — 자오선이 어디 있는지가 이 편의 전부다.
 *
 * 127.5°일 때는 반도로 바짝 붙는다. 그 선이 한반도 한가운데를 지나는
 * 게 보여야 한다. 135°로 넘어가는 순간 물러선다. 물러서야 그 선이
 * 반도 밖, 일본 한복판에 있다는 게 화면에 들어온다. 이 두 구도의
 * 차이가 곧 이 편의 반전이라 컷이 아니라 밀어서 보여준다.
 */
function shotOf(i: number): { cx: number; cy: number; z: number } {
  if (i >= 4) return { cx: 505, cy: 450, z: 1.95 };
  return TZ_EVENTS[i].south === 127.5
    ? { cx: 430, cy: 380, z: 2.5 }
    : { cx: 530, cy: 455, z: 1.92 };
}

const SHOTS: Shot[] = [
  { at: HOOK - 26, cx: 372, cy: 372, z: 3.5 },
  ...SPANS.flatMap((sp, i) => {
    const s = shotOf(i);
    return [
      { at: sp.t1, ...s },
      { at: sp.t2, ...s },
    ];
  }),
  // 마무리 — 두 자오선과 서울의 막대가 글자 위 절반 안에 다 들어와야 한다
  { at: BODY_END + Math.round(2.0 * FPS), cx: 505, cy: 470, z: 1.85 },
];

const LAND = "#221D16";
const COAST = "#3E3627";
const KOREA = "#2E2519";
/** 지금 쓰는 자오선 / 안 쓰는 자오선 */
const LIVE = "#7FA8C4";
const DEAD = "#4A4436";
/** 북이 따로 쓰는 자오선 — 남과 구분되어야 한다 */
const NORTH = "#D4694F";

export const ShortsTimezone: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const year = valueAtBeats(SPANS, frame, LAST_YEAR);
  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? TZ_EVENTS[bi] : null;
  /** 방금 바뀌었는가 — 바뀐 순간 선이 한 번 번쩍인다 */
  const flash = bi >= 0 ? Math.max(0, 1 - (frame - SPANS[bi].t1) / 16) : 0;

  const mS = southAt(year);
  const mN = northAt(year);
  const isSplit = mS !== mN;
  /**
   * 북을 화면에 세우기 시작하는 시점 — 2015년으로 이동을 시작할 때.
   * 마무리에서는 도로 지운다. 거기서 답해야 하는 건 서울의 32분 하나뿐이라
   * 평양의 37분이 옆에 남아 있으면 무슨 숫자를 보라는 건지 흐려진다.
   */
  const northOn =
    interpolate(frame, [SPANS[4].t0, SPANS[4].t0 + 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) *
    interpolate(frame, [BODY_END, BODY_END + 18], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const inOutro = frame >= BODY_END;
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
  /** 화면 안에 있는 x인가 — 밖에 있는 자오선의 라벨을 그리면 안 된다 */
  const inView = (x: number, pad = 70) =>
    x > cam.x + u(pad) && x < cam.x + cam.w - u(pad);
  /** 자오선 이름표가 앉는 높이. 위 계기판과 아래 자막 사이 빈 자리다. */
  const labelY = cam.y + cam.h * 0.3;

  const gauges = isSplit
    ? [
        { tag: "남", m: mS, city: SEOUL, color: LIVE },
        { tag: "북", m: mN, city: PYONGYANG, color: NORTH },
      ]
    : [{ tag: "", m: mS, city: SEOUL, color: LIVE }];

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-tz.wav")} volume={0.9} />

      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {EA_LANDS.map((l, i) => (
            <path key={i} d={l.d} fill={LAND} stroke={COAST} strokeWidth={u(1.4)} />
          ))}
          {EA_KOREA.map((d, i) => (
            <path key={`k${i}`} d={d} fill={KOREA} stroke={COAST} strokeWidth={u(2.2)} />
          ))}

          {/* ── 자오선 두 개 ──
              쓰지 않는 선도 지운 적이 없다. 그 자리에 계속 있는 선을
              골라 쓴 것뿐이라, 화면에서도 지우지 않고 어둡게 둔다. */}
          {MERIDIANS.map((m) => {
            const live = m === mS || (m === mN && northOn > 0.5);
            const byNorth = m === mN && m !== mS;
            const col = byNorth ? NORTH : live ? LIVE : DEAD;
            return (
              <g key={m}>
                {live && (
                  <path
                    d={meridianPath(m)}
                    stroke={col}
                    strokeWidth={u(16) + u(40) * flash}
                    opacity={0.09 + 0.16 * flash}
                    fill="none"
                  />
                )}
                <path
                  d={meridianPath(m)}
                  stroke={col}
                  strokeWidth={u(live ? 4.2 : 2)}
                  strokeDasharray={live ? undefined : `${u(9)} ${u(11)}`}
                  opacity={live ? 0.95 : 0.5}
                  fill="none"
                />
                {inView(meridianX(m)) && (
                  <text
                    x={meridianX(m) + u(12)}
                    y={labelY}
                    fontSize={u(27)}
                    fontWeight={900}
                    fill={live ? col : "#7A7060"}
                    style={{ paintOrder: "stroke", stroke: C.bg, strokeWidth: u(7) }}
                  >
                    동경 {m}°
                  </text>
                )}
              </g>
            );
          })}

          {/* 아카시 — 135° 위에 도시가 하나 있다는 게 이 편의 그림이다 */}
          {inView(AKASHI.x, 30) && (
            <Dot c={AKASHI} u={u} color={LIVE} dim={mS !== 135} side="right" />
          )}

          {/* ── 시차 막대 ──
              도시에서 자오선까지의 가로 거리가 곧 시차다. 경도 1도가
              4분이므로 이 막대의 길이와 옆에 적힌 분은 같은 값이다.
              자오선이 바뀌면 막대가 늘어난다 — 그게 30분이다. */}
          <Lag city={SEOUL} m={mS} u={u} color={LIVE} frame={frame} />
          {northOn > 0.02 && (
            <g opacity={northOn}>
              <Lag city={PYONGYANG} m={mN} u={u} color={isSplit ? NORTH : LIVE} frame={frame} />
            </g>
          )}
        </svg>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(21,19,16,0.94) 0%, rgba(21,19,16,0.6) 15%, rgba(21,19,16,0) 27%, rgba(21,19,16,0) 56%, rgba(21,19,16,0.76) 74%, rgba(21,19,16,0.96) 88%)",
          pointerEvents: "none",
        }}
      />

      {/* ── 계기판 ── */}
      {mapIn > 0.5 && !inOutro && (
        <div
          style={{
            position: "absolute",
            top: SAFE_TOP,
            left: TEXT_X,
            right: TEXT_X,
          }}
        >
          {/*
            연도를 값 줄에서 빼내 위 줄 오른쪽에 뒀다.
            왼쪽 여백을 68에서 104로 넓히자 '동경 127.5도 · 서울과 2분 ·
            1954년'이 한 줄에 안 들어가 '도'와 '분'이 다음 줄로 떨어졌다.
            값 줄이 폭을 다 쓰게 해야 자오선이 안 쪼개진다.
          */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
              표준 자오선
            </span>
            <span
              style={{
                color: C.text,
                fontSize: 46,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.floor(year)}년
            </span>
          </div>
            {gauges.map((g) => (
              <div
                key={g.tag || "one"}
                style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 2 }}
              >
                {g.tag && (
                  <span style={{ color: g.color, fontSize: 40, fontWeight: 900 }}>{g.tag}</span>
                )}
                <span
                  style={{
                    color: C.text,
                    fontSize: gauges.length > 1 ? 56 : 86,
                    fontWeight: 900,
                    lineHeight: 1.12,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {degLabel(g.m)}
                </span>
                <span
                  style={{
                    color: g.color,
                    fontSize: gauges.length > 1 ? 30 : 36,
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {g.city.name}과 {Math.round(lagMin(g.city.lon, g.m))}분
                </span>
              </div>
            ))}
            <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, marginTop: 4 }}>
              {gauges.map((g) => utcLabel(g.m)).join("  ·  ")}
            </div>
        </div>
      )}

      {/* ── 사건 ── */}
      {ev && mapIn > 0.5 && !inOutro && (
        <div style={{ position: "absolute", bottom: 330, left: TEXT_X, right: SAFE_RIGHT }}>
          <div
            style={{
              color: ev.split ? NORTH : INK.brass,
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
          style={{ position: "absolute", bottom: BOTTOM_INSET, left: TEXT_X, right: SAFE_RIGHT }}
        >
          <div style={{ color: "#8A8070", fontSize: 20, lineHeight: 1.5 }}>
            날짜·법령은 기록값 · 시차는 경도에서 계산한 평균값 (고정댓글)
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
              // 오른쪽은 SAFE_X가 아니라 SAFE_RIGHT다. 이 자리는 쇼츠
              // 오른쪽 버튼 기둥(y 1130~1760) 안이라 68px만 비우면 숫자가
              // 좋아요 버튼 밑으로 들어간다.
              padding: `0 ${SAFE_RIGHT}px ${OUTRO_PAD}px ${TEXT_X}px`,
              opacity: outroIn,
            }}
          >
            {/*
              두 줄이면 충분하다. 통신사 편에서 다섯 덩어리를 한 화면에
              쏟아 아무것도 안 읽혔다. 여기서 필요한 건 두 선을 나란히
              놓고 서울에서 몇 분인지 보는 것뿐이다.

              한 줄에 세 칸을 늘어놓으면 오른쪽 기둥을 피할 폭이 안 나온다.
              자오선 이름과 지나는 곳을 위아래로 포개고, 분만 오른쪽에
              크게 세운다.
            */}
            <div
              style={{
                color: C.dim,
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 12,
                opacity: interpolate(frame, [BODY_END + 12, BODY_END + 24], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
              }}
            >
              서울에서 잰 시차
            </div>
            {M_ROWS.map((r, i) => {
              const at = BODY_END + Math.round((0.9 + i * 1.5) * FPS);
              const on = interpolate(frame, [at, at + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const now = r.m === 135;
              return (
                <div
                  key={r.m}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 22,
                    marginTop: i ? 22 : 0,
                    opacity: on,
                    transform: `translateY(${(1 - on) * 16}px)`,
                    color: now ? LIVE : C.dim,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 46, fontWeight: 900 }}>{r.deg}</div>
                    <div style={{ fontSize: 34, fontWeight: 700, color: C.text, marginTop: 2 }}>
                      {r.where}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 78,
                      fontWeight: 900,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Math.round(lagMin(SEOUL.lon, r.m))}분
                  </span>
                </div>
              );
            })}

            <div
              style={{
                color: C.text,
                fontSize: 52,
                fontWeight: 800,
                lineHeight: 1.34,
                marginTop: 38,
                opacity: interpolate(
                  frame,
                  [BODY_END + Math.round(4.1 * FPS), BODY_END + Math.round(4.7 * FPS)],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              시계가 가리키는 낮 12시
              <br />
              서울의 해는 아직 동쪽
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
            padding: `0 ${TEXT_X}px`,
          }}
        >
          <div style={{ opacity: hookIn }}>
            <Typed
              text="서울, 낮 12시"
              start={4}
              cps={30}
              style={{ display: "block", color: C.dim, fontSize: 42, fontWeight: 700 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="32"
                start={22}
                cps={8}
                style={{ color: LIVE, fontSize: 300, fontWeight: 900, lineHeight: 1 }}
              />
              <Typed
                text="분"
                start={30}
                cps={8}
                style={{ color: C.text, fontSize: 96, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="해가 가장 높이 뜨기까지 남은 시간"
              start={48}
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

/** 도시 점 하나 */
const Dot: React.FC<{
  c: City;
  u: (px: number) => number;
  color: string;
  dim?: boolean;
  side?: "left" | "right";
}> = ({ c, u, color, dim, side = "left" }) => (
  <g opacity={dim ? 0.45 : 1}>
    <circle cx={c.x} cy={c.y} r={u(5.5)} fill={INK.bone} stroke={color} strokeWidth={u(2.4)} />
    <text
      x={side === "left" ? c.x - u(13) : c.x + u(13)}
      y={c.y + u(9)}
      textAnchor={side === "left" ? "end" : "start"}
      fontSize={u(25)}
      fontWeight={900}
      fill="#E7DAC0"
      style={{ paintOrder: "stroke", stroke: C.bg, strokeWidth: u(7) }}
    >
      {c.name}
    </text>
  </g>
);

/**
 * 도시에서 자오선까지 — 가로 거리가 곧 시차다.
 *
 * 이 편에서 유일하게 '설명'을 하는 그림이다. 서울이 135°에서 서쪽으로
 * 8도 떨어져 있다는 사실과 시계가 32분 앞선다는 사실이 같은 것이라는
 * 걸 말로 하면 두 문장이지만, 막대 하나면 한 번에 보인다.
 *
 * 점선이 흐르게 둔다. 연도가 멈춰 있는 체류 구간에서도 화면이 죽지
 * 않게 하는 유일한 움직임이다.
 */
const Lag: React.FC<{
  city: City;
  m: Meridian;
  u: (px: number) => number;
  color: string;
  frame: number;
}> = ({ city, m, u, color, frame }) => {
  const mx = meridianX(m);
  const mid = (city.x + mx) / 2;
  const min = Math.round(lagMin(city.lon, m));
  return (
    <g>
      <line
        x1={city.x}
        y1={city.y}
        x2={mx}
        y2={city.y}
        stroke={color}
        strokeWidth={u(3.4)}
        strokeDasharray={`${u(10)} ${u(7)}`}
        strokeDashoffset={-frame * u(1.1)}
        opacity={0.9}
      />
      {/* 양 끝 마감 — 재는 자리를 분명히 한다 */}
      {[city.x, mx].map((x) => (
        <line
          key={x}
          x1={x}
          y1={city.y - u(9)}
          x2={x}
          y2={city.y + u(9)}
          stroke={color}
          strokeWidth={u(3.4)}
        />
      ))}
      <text
        x={mid}
        y={city.y - u(17)}
        textAnchor="middle"
        fontSize={u(34)}
        fontWeight={900}
        fill={color}
        style={{ paintOrder: "stroke", stroke: C.bg, strokeWidth: u(8) }}
      >
        {min}분
      </text>
      <Dot c={city} u={u} color={color} />
    </g>
  );
};
