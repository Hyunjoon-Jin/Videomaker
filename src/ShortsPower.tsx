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
  CUT,
  FED_FROM_NORTH,
  FEEDS,
  PLANT_XY,
  P_EVENTS,
  SOUTH_KW,
  TOTAL_KW,
  capacityAt,
  radiusOf,
  shareLabel,
  yearLabel,
} from "./data/power";
import { project } from "./data/places";
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
 * 체류 시간을 자막 길이에서 뽑는다.
 * impact만 보고 2.4초를 주면 40자짜리 자막에서 읽을 시간이 0.4초밖에
 * 안 남는다. beatFor가 타자 시간과 읽는 시간 중 큰 쪽을 쓴다.
 */
const BEATS = P_EVENTS.map((e) =>
  beatFor(e.year, { title: e.title, detail: e.detail }, e.impact ?? 0.4, FPS)
);
const SPANS = layoutBeats(BEATS, HOOK, 0.22);
const BODY_END = SPANS[SPANS.length - 1].t2;
const OUTRO = Math.round(10 * FPS);
export const POWER_DURATION = BODY_END + OUTRO;

/** 마무리 — 해방 당시 설비를 남북으로 갈라 세운다 */
const SPLIT: Array<[string, string]> = [
  ["수력", "158만 6천kW · 그중 남한 6만 2천"],
  ["화력", "13만 7천kW · 전부 남한"],
  ["합계", "172만 3천kW · 남한 몫 11.5%"],
];

function yearAt(frame: number): number {
  return valueAtBeats(SPANS, frame, 1949);
}

function frameOfEvent(i: number): number {
  return SPANS[i]?.t1 ?? HOOK;
}

const SHOTS: Shot[] = [
  { at: HOOK - 24, cx: 470, cy: 500, z: 1.5 },
  ...SPANS.flatMap((sp, i) => {
    const e = P_EVENTS[i];
    if (!e.focus) return [];
    const q = project(e.focus[0], e.focus[1]);
    return [
      { at: sp.t1, cx: q.x, cy: q.y, z: e.zoom ?? 2.4 },
      { at: sp.t2, cx: q.x, cy: q.y, z: e.zoom ?? 2.4 },
    ];
  }),
  { at: BODY_END + Math.round(1.8 * FPS), cx: 462, cy: 560, z: 1.45 },
];

const LAND = "#221E16";
const COAST = "#4E4736";
/** 살아 있는 발전소 */
const LIVE = INK.flame;
/** 끊긴 뒤의 북측 */
const DEAD = "#6A6252";

export const ShortsPower: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();

  const year = yearAt(frame);
  const cut = year >= CUT;
  const bi = beatIndexAt(SPANS, frame);
  const ev = bi >= 0 ? P_EVENTS[bi] : null;
  const near = bi >= 0 ? Math.max(0, 1 - (frame - SPANS[bi].t1) / 26) : 0;
  const impact = (ev?.impact ?? 0) * near;

  const inOutro = frame >= BODY_END;
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

  const cam = cameraAt(SHOTS, frame);
  const u = (px: number) => px / (1.08 * cam.z);
  const labelFits = (x: number, chars: number) => {
    const w = u(20) * chars;
    return x - w > cam.x + u(16) && x + w < cam.x + cam.w - u(16);
  };

  /** 발전소는 살아 있는 동안 미세하게 뛴다 */
  const pulse = 1 + 0.05 * Math.sin(frame / 7);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, fontFamily: "Pretendard" }}>
      <Audio src={staticFile("bgm-pw.wav")} volume={0.9} />

      <AbsoluteFill style={{ opacity: mapIn }}>
        <svg
          viewBox={cam.viewBox}
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          {PROVINCES.map((p) => (
            <path key={p.id} d={p.d} fill={LAND} stroke={COAST} strokeWidth={u(1.6)} />
          ))}

          {/* 북에서 남으로 오던 전기. 실제 선로가 아니라 공급 관계다. */}
          {FEEDS.filter((f) => year >= f.from).map((f) => (
            <path
              key={f.id}
              d={f.d}
              fill="none"
              stroke={cut ? DEAD : LIVE}
              strokeWidth={u(cut ? 2.4 : 3.4)}
              strokeDasharray={cut ? `${u(10)} ${u(12)}` : undefined}
              strokeLinecap="round"
              opacity={cut ? 0.5 : 0.55}
            />
          ))}

          {PLANT_XY.filter((p) => year >= p.from).map((p) => {
            const off = p.north && cut;
            const r = u(radiusOf(p.kw)) * (off ? 1 : pulse);
            const col = off ? DEAD : p.ship ? INK.indigoHot : LIVE;
            // 단전 뒤에는 배가 주역이다. 그냥 두면 6,900kW짜리 점이라
            // 화면에서 아무 일도 안 일어난 것처럼 보인다.
            const halo = p.ship && cut;
            if (p.ship) {
              // 원으로 그리면 발전소와 구분이 안 되고, 이름만 띄우면
              // '자코나'가 지명처럼 읽힌다. 배 모양으로 그리고 라벨도
              // 이름이 아니라 '발전함'이라고 쓴다. 이름은 자막이 말한다.
              const w = u(19);
              const h = u(9);
              return (
                <g key={`${p.name}${p.lon}`}>
                  {halo && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={u(24) + u(14) * (0.5 + 0.5 * Math.sin(frame / 6))}
                      fill="none"
                      stroke={INK.indigoHot}
                      strokeWidth={u(2.4)}
                      opacity={0.5}
                    />
                  )}
                  {/* 선체 */}
                  <path
                    d={`M${p.x - w} ${p.y}L${p.x + w} ${p.y}L${p.x + w * 0.72} ${p.y + h}L${p.x - w * 0.72} ${p.y + h}Z`}
                    fill={INK.indigoHot}
                    opacity={0.9}
                  />
                  {/* 선실과 굴뚝 */}
                  <rect
                    x={p.x - w * 0.34}
                    y={p.y - h * 0.95}
                    width={w * 0.68}
                    height={h * 0.95}
                    fill={INK.indigoHot}
                    opacity={0.75}
                  />
                  <rect
                    x={p.x - u(1.6)}
                    y={p.y - h * 1.9}
                    width={u(3.2)}
                    height={h * 0.95}
                    fill={INK.indigoHot}
                  />
                  {labelFits(p.x, 3) && (
                    <text
                      x={p.x - w - u(9)}
                      y={p.y + u(6) + u(p.dy ?? 0)}
                      textAnchor="end"
                      fontSize={u(26)}
                      fontWeight={900}
                      fill="#9FC2DA"
                      style={{ paintOrder: "stroke", stroke: "#100E0A", strokeWidth: u(6) }}
                    >
                      발전함
                    </text>
                  )}
                </g>
              );
            }
            return (
              <g key={p.name}>
                <circle cx={p.x} cy={p.y} r={r} fill={col} opacity={off ? 0.22 : 0.28} />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill="none"
                  stroke={col}
                  strokeWidth={u(3)}
                  opacity={off ? 0.6 : 1}
                />
                <circle cx={p.x} cy={p.y} r={u(4)} fill={col} />
                {labelFits(p.x, p.name.length) && (
                  <text
                    x={p.side === "left" ? p.x - r - u(9) : p.x + r + u(9)}
                    y={p.y + u(8) + u(p.dy ?? 0)}
                    textAnchor={p.side === "left" ? "end" : "start"}
                    fontSize={u(26)}
                    fontWeight={900}
                    fill={off ? "#8E8474" : p.ship ? "#9FC2DA" : "#FFE0A0"}
                    style={{ paintOrder: "stroke", stroke: "#100E0A", strokeWidth: u(6) }}
                  >
                    {/* "커 보인다"까지는 원 크기가 하고, "몇 퍼센트인지"는
                        숫자가 해야 한다. 이 편의 주제가 비율이다. */}
                    {`${p.name} ${shareLabel(p.kw)}`}
                  </text>
                )}
              </g>
            );
          })}

          {/* 38선 — 이 편의 사건은 이 선을 넘어오던 전기가 끊긴 것이다 */}
          <line
            x1={0}
            y1={project(127, 38).y}
            x2={1000}
            y2={project(127, 38).y}
            stroke={cut ? INK.oxide : "#5A5344"}
            strokeWidth={u(cut ? 2.6 : 1.6)}
            strokeDasharray={`${u(11)} ${u(9)}`}
            opacity={cut ? 0.7 : 0.4}
          />
        </svg>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,8,6,0.94) 0%, rgba(10,8,6,0.55) 12%, rgba(10,8,6,0) 22%, rgba(10,8,6,0) 60%, rgba(10,8,6,0.74) 76%, rgba(10,8,6,0.95) 88%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 44%, ${
            ev?.cut ? "rgba(179,58,43," : "rgba(217,116,31,"
          }${impact * 0.2}) 0%, rgba(0,0,0,0) 58%)`,
          pointerEvents: "none",
        }}
      />

      {/* 위 읽을거리가 막대 둘까지 늘어나 지도 라벨과 겹쳤다.
          그라데이션만으로는 못 이겨서 판을 하나 깐다. */}
      {uiOn && !inOutro && (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(10,8,6,0.96) 0%, rgba(10,8,6,0.94) 16%, rgba(10,8,6,0.86) 24%, rgba(10,8,6,0) 32%)",
            pointerEvents: "none",
          }}
        />
      )}
      {uiOn && !inOutro && (
        <div style={{ position: "absolute", top: SAFE_TOP, left: TEXT_X, right: TEXT_X }}>
          {/* 이 자리는 이 영상이 무엇을 보는 중인지 계속 말해준다.
              전에는 '한반도 발전설비'라고만 적혀 있어 연표처럼 읽혔다. */}
          <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
            {cut ? "북에서 오던 전기가 끊긴 뒤" : "전기를 만드는 곳"}
          </div>
          <div
            style={{
              color: C.text,
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.05,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {yearLabel(year)}
          </div>
          <ShareBar year={year} cut={cut} />
          {cut && <DemandBar />}
        </div>
      )}

      {ev && uiOn && !inOutro && (
        <div style={{ position: "absolute", bottom: 330, left: TEXT_X, right: SAFE_RIGHT }}>
          <div style={{ color: ev.cut ? "#D4694F" : INK.flame, fontSize: 34, fontWeight: 900 }}>
            {ev.cut
              ? "1948년 5월 14일 정오"
              : year >= CUT
                ? "단전 이후"
                : ev.side === "north"
                  ? "북쪽"
                  : ev.side === "south"
                    ? "남쪽"
                    : "남과 북"}
          </div>
          <Typed
            text={ev.title}
            start={frameOfEvent(bi)}
            cps={14}
            style={{
              display: "block",
              color: C.text,
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.06,
              marginTop: 4,
              transform: `scale(${1 + impact * 0.02})`,
              transformOrigin: "left bottom",
            }}
          />
          {ev.detail && (
            <Typed
              text={ev.detail}
              start={frameOfEvent(bi) + Math.ceil((ev.title.length * 30) / 14) + 5}
              cps={26}
              style={{
                display: "block",
                color: "#BDB3A0",
                fontSize: 38,
                fontWeight: 500,
                marginTop: 8,
              }}
            />
          )}
        </div>
      )}

      {inOutro && (
        <>
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(10,8,6,0) 26%, rgba(10,8,6,0.72) 42%, rgba(10,8,6,0.95) 56%)",
              opacity: outroIn,
              pointerEvents: "none",
            }}
          />
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              padding: `0 ${TEXT_X}px ${OUTRO_PAD}px`,
              opacity: outroIn,
            }}
          >
            <div style={{ color: C.dim, fontSize: 30, fontWeight: 700, marginBottom: 14 }}>
              해방 당시 한반도 발전설비
            </div>
            {SPLIT.map(([k, v], i) => (
              <div
                key={k}
                style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 6 }}
              >
                <span
                  style={{
                    color: C.dim,
                    fontSize: 38,
                    fontWeight: 700,
                    minWidth: 110,
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    color: i === 2 ? C.text : INK.flame,
                    fontSize: 44,
                    fontWeight: 900,
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
            <div style={{ height: 1, background: "#3B342A", margin: "26px 0 16px" }} />
            <div style={{ color: C.text, fontSize: 50, fontWeight: 800, lineHeight: 1.34 }}>
              압록강 수풍 하나가 60만kW,
              <br />
              남한 전체를 합친 것의 세 배였다
            </div>
          </AbsoluteFill>
        </>
      )}

      {uiOn && !inOutro && (
        <div style={{ position: "absolute", bottom: BOTTOM_INSET, left: TEXT_X, right: SAFE_RIGHT }}>
          <div style={{ display: "flex", gap: 22, marginBottom: 10, flexWrap: "wrap" }}>
            <Key color={LIVE} label="가동 중" />
            <Key color={DEAD} label="끊긴 공급" />
            <Key color={INK.indigoHot} label="발전함 (8척 중 둘)" ship />
            <span style={{ color: C.dim, fontSize: 23, fontWeight: 700 }}>
              원 크기 = 설비용량
            </span>
          </div>
          <div style={{ color: "#8A8070", fontSize: 20 }}>
            용량과 연도는 기록값 · 선은 실제 선로가 아니라 공급 관계
          </div>
        </div>
      )}

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
              text="1948년 5월 14일 정오, 끊긴 전기"
              start={-20}
              cps={400}
              style={{ display: "block", color: C.dim, fontSize: 40, fontWeight: 700 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 2 }}>
              <Typed
                text="11.5"
                start={-20}
                cps={400}
                style={{
                  color: INK.flame,
                  fontSize: 240,
                  fontWeight: 900,
                  lineHeight: 1,
                }}
              />
              <Typed
                text="%"
                start={-20}
                cps={400}
                style={{ color: C.text, fontSize: 118, fontWeight: 800 }}
              />
            </div>
            <Typed
              text="그때 남한에 있던 발전설비의 몫"
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

/**
 * 남북 비율 막대.
 *
 * 원 크기만으로는 "북쪽이 크다"까지밖에 안 간다. 이 편의 질문은
 * "전기를 만드는 곳이 어느 쪽에 얼마나 있었나"이므로 그 비율 자체가
 * 화면에 상주해야 한다. 발전소가 하나 들어설 때마다 막대가 움직인다.
 *
 * 합계는 기록값(172만 3천kW)과 맞춘 값이라 1944년에 정확히 88.5 : 11.5가
 * 된다. 자막이 말하는 숫자와 막대가 서로 다른 말을 하면 안 된다.
 */
const ShareBar: React.FC<{ year: number; cut: boolean }> = ({ year, cut }) => {
  const { north, south, total } = capacityAt(year);
  if (total <= 0) return null;
  // 분모는 항상 172만 3천kW다. 그래야 발전소 라벨의 퍼센트와 같은 자를 쓴다.
  // 막대의 빈 부분은 아직 안 지어진 설비고, 1944년에 꽉 찬다.
  const ns = (north / TOTAL_KW) * 100;
  const ss = (south / TOTAL_KW) * 100;
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          display: "flex",
          height: 26,
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid #4A4234",
          background: "#241F17",
        }}
      >
        <div style={{ width: `${ns}%`, background: cut ? DEAD : LIVE, opacity: cut ? 0.5 : 0.95 }} />
        <div style={{ width: `${ss}%`, background: C.text, opacity: 0.9 }} />
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 8, alignItems: "baseline" }}>
        <span
          style={{
            color: cut ? "#8E8474" : INK.flame,
            fontSize: 30,
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          북 {ns.toFixed(1)}%
        </span>
        <span
          style={{
            color: C.text,
            fontSize: 30,
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          남 {ss.toFixed(1)}%
        </span>
        <span
          style={{
            color: C.dim,
            fontSize: 25,
            fontWeight: 700,
            marginLeft: "auto",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {(total / 10_000).toFixed(0)} / 172만kW
        </span>
      </div>
    </div>
  );
};

/**
 * 수요 막대 — 단전 뒤에만 뜬다.
 *
 * "전차가 섰다"를 글로 쓰는 것으로는 얼마나 큰일인지 안 보인다. 쓰던
 * 전기의 3분의 2가 꺼지는 것을 눈으로 봐야 전차도 공장도 쌀도 설명이
 * 된다. 위 막대(설비가 어디 있었나)와 분모가 다르므로 제목을 따로 단다.
 *
 * 자료가 60~66%로 폭을 두므로 막대는 가운데값(63%)으로 긋고 글자에는
 * 범위를 적는다.
 */
const DemandBar: React.FC = () => {
  const mid = (FED_FROM_NORTH[0] + FED_FROM_NORTH[1]) / 2;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ color: C.dim, fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
        남한이 쓰던 전기
      </div>
      <div
        style={{
          display: "flex",
          height: 26,
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid #4A4234",
        }}
      >
        <div style={{ width: `${mid}%`, background: "#3A322A" }} />
        <div style={{ width: `${100 - mid}%`, background: LIVE, opacity: 0.95 }} />
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
        <span style={{ color: "#B3452F", fontSize: 30, fontWeight: 900 }}>
          꺼짐 {FED_FROM_NORTH[0]}~{FED_FROM_NORTH[1]}%
        </span>
        <span style={{ color: INK.flame, fontSize: 30, fontWeight: 900 }}>
          남은 것 {100 - FED_FROM_NORTH[1]}~{100 - FED_FROM_NORTH[0]}%
        </span>
      </div>
    </div>
  );
};

const Key: React.FC<{ color: string; label: string; ship?: boolean }> = ({ color, label, ship }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
    <svg width={24} height={24}>
      {ship ? (
        <>
          <path d="M3 14L21 14L17 20L7 20Z" fill={color} opacity={0.9} />
          <rect x={9} y={9} width={6} height={5} fill={color} opacity={0.75} />
          <rect x={11.2} y={4} width={1.6} height={5} fill={color} />
        </>
      ) : (
        <>
          <circle cx={12} cy={12} r={9} fill={color} opacity={0.28} />
          <circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={2.6} />
        </>
      )}
    </svg>
    <span style={{ color: "#BDB3A0", fontSize: 23, fontWeight: 700 }}>{label}</span>
  </div>
);
