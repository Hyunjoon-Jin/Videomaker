import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  STEPS,
  DAYS,
  HOLD,
  HOLDER_PTS,
  HOLDERS,
  HOOK_SEC,
  LAND,
  OUTRO_SEC,
  PEAK_HOUR,
  PEAK_PER_SEC,
  SEG,
  SEOUL,
  STATIONS,
  SWAPS,
  VOICE,
  VOICE_ESTIMATED,
  hourLabel,
} from "./data/rush";
import { styleOf } from "./data/lines";
import { FPS } from "./theme";
import { Grain } from "./Grain";
import { useFonts } from "./fonts";
import { BOTTOM_INSET, SAFE_RIGHT, TEXT_X } from "./safe";

/** 나레이션이 없어도 다른 편들처럼 BGM은 깐다 */
const HAS_BGM = true;

const BG = "#0D1116";
/** 노선망이 닿는 바깥 시군구. 물러나 있다 */
const OUT_LAND = "#171C22";
const SEOUL_LAND = "#232A32";
const HOT = "#F2603C";
const INK = "#EDE5D4";
const DIM = "#8B94A0";

const HOOK = Math.round(HOOK_SEC * FPS);

/* 첫차부터 막차까지 **열아홉 칸을 다 지나간다.** 나레이션이 붙는
   여섯 칸만 오래 머물고 나머지는 0.7초씩 스쳐 지나가며 순위가
   갈아엎힌다 — 시간대를 건너뛰면 그게 안 보인다. */
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
export const RUSH_DURATION = BODY_END + Math.round(OUTRO_SEC * FPS);

const ASPECT = 1920 / 1080;

/* ── 카메라는 안 움직인다 ──
   **이 편의 그림은 「서울이 시각마다 다르게 부푼다」다.** 역 하나씩
   확대해 들어가면 그게 안 보인다. 한 번 잡아 두고 거품만 바꾼다.

   **역 전체에 맞추면 안 된다.** 5호선이 하남까지, 8호선이 성남까지
   뻗어서 그 폭에 맞추면 서울이 화면 구석으로 밀리고 긴 선 하나가
   화면을 통째로 가로지른다 — 24편에서 이미 한 번 당한 일이다.
   **서울 25구에 맞추고 바깥은 화면 밖으로 내보낸다.** 1위는 늘 서울
   안이고, 무엇을 센 값인지는 아래에 적어 둔다. */
const SEOUL_BOX = { x0: 296.7, x1: 354.4, y0: 187.6, y1: 233.9 };
const CAM = {
  cx: (SEOUL_BOX.x0 + SEOUL_BOX.x1) / 2,
  cy: (SEOUL_BOX.y0 + SEOUL_BOX.y1) / 2,
  /* 순위표가 여섯 줄이라 지도를 그만큼 줄여야 한다. 폭을 넓게 잡으면
     같은 화면 높이에 지도가 작게 들어간다 */
  w: (SEOUL_BOX.x1 - SEOUL_BOX.x0) * 1.3,
};
const PX = CAM.w / 1080;
const VX = CAM.cx - CAM.w / 2;
/** 지도를 화면 위쪽에 올려 밑에 시계와 순위표 자리를 남긴다 */
const VY = CAM.cy - 700 * PX;
const VIEW = `${VX} ${VY} ${CAM.w} ${CAM.w * ASPECT}`;
const sx = (x: number) => (x - VX) / PX;
const sy = (y: number) => (y - VY) / PX;

/* 거품 반지름. **넓이가 인원에 비례하도록** 제곱근을 쓴다.
   하루 정점(11,479명)이 화면에서 30px가 되게 맞췄다 — 더 키우면
   이웃 역들과 뭉쳐 한 덩어리가 되고, 그러면 1위가 1위로 안 보인다. */
const K = 0.0182;
const rOf = (n: number | null) => (n && n > 0 ? Math.sqrt(n) * K : 0);

/** 훅에서는 첫차 시간대다. 아직 아무도 안 움직인다 */
const CALM = 0;

/** 순위표 자리 */
const LIST_TOP = 1216;
const LEAD_H = 82;
const ROW_H = 60;
/** 오른쪽 기둥(930~1080)을 피해 숫자를 여기에 맞춰 세운다 */
const NUM_RIGHT = 1080 - SAFE_RIGHT;

function beatAt(frame: number): number {
  for (let i = SLOTS.length - 1; i >= 0; i--) if (frame >= SLOTS[i].t0) return i;
  return 0;
}

export const ShortsRush: React.FC = () => {
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
  /** 스쳐 지나가는 칸은 21프레임밖에 안 되니 페이드도 그만큼 짧다 */
  const span = SLOTS[bi].t1 - SLOTS[bi].t0;
  const quick = Math.min(8, Math.max(3, Math.round(span * 0.35)));
  const settle = interpolate(age, [1, quick], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cur = STEPS[bi];
  const prev = bi > 0 ? STEPS[bi - 1] : null;

  /* 거품이 앞 칸에서 이번 칸으로 자란다. **시간이 흐르는 화면이라
     값이 튀면 안 된다.** 칸이 짧으면 자라는 시간도 짧다 */
  const grow = interpolate(age, [0, Math.min(Math.round(0.7 * FPS), span - 2)],
    [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fromHour = started ? (prev ? prev.hour : CALM) : CALM;
  const toHour = started ? cur.hour : CALM;

  const radius = (s: (typeof STATIONS)[number]) => {
    const b = rOf(s.on[toHour]);
    if (!started) return rOf(s.on[CALM]);
    const a = rOf(s.on[fromHour]);
    return a + (b - a) * grow;
  };

  /* 이번 걸음 TOP 5만 진하게 채운다.

     **마무리에서는 아무 역도 안 채운다.** 마무리 그림은 하루 전체인데
     거품 크기는 한 시각의 값이라, 채워서 강조하면 그 시각 값을 하루의
     값처럼 읽게 된다. 여섯 자리에 테만 두른다 */
  const litNames = new Set(
    inOutro ? [] : started ? cur.top.map((r) => r.name) : []
  );
  const lead = cur.top[0];
  const leadStation = STATIONS.find((s) => s.name === lead.name)!;
  const showHour = inOutro ? PEAK_HOUR : cur.hour;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      {HAS_BGM && <Audio src={staticFile("bgm-rs.wav")} volume={0.4} />}
      {!VOICE_ESTIMATED &&
        VOICE.map((v, i) => {
          /* 줄 하나가 어느 칸에서 나오는지는 `say`가 정한다.
             칸이 열아홉인데 줄은 여덟이라 번호가 안 맞는다 */
          const k = STEPS.findIndex((s) => s.say === i);
          const at =
            i === 0 ? 0 : k >= 0 ? SLOTS[k].t0 + 4 : BODY_END + 6;
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
        {LAND.map((d, i) => (
          <path key={i} d={d} fill={OUT_LAND} stroke={BG} strokeWidth={PX} />
        ))}
        {SEOUL.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={SEOUL_LAND}
            stroke={BG}
            strokeWidth={PX * 1.2}
          />
        ))}

        {/* 노선망. **배경이다.** 24편에서 이게 주인공 행세를 하자
            화면이 뒤엉켰다 — 얇게 깔고 물러나 있게 한다 */}
        {SEG.map((s, i) => (
          <line
            key={i}
            x1={s[0]}
            y1={s[1]}
            x2={s[2]}
            y2={s[3]}
            stroke={styleOf(s[4]).c}
            strokeWidth={PX * 1.8}
            strokeLinecap="round"
            opacity={0.34}
          />
        ))}

        {/* 거품 — 그 시간대에 탄 사람.
            **한 값만 센다.** 하차는 이 편에 없다.
            속을 옅게 두고 테를 둘러 **겹쳐도 원이 원으로 보이게** 한다.
            꽉 채우면 이웃끼리 뭉쳐 얼룩이 된다 */}
        {/* 마무리에서는 거품을 걷는다. 그림이 하루 전체인데 크기는
            한 시각의 값이라, 남겨 두면 그 시각을 하루로 읽게 된다 */}
        <g opacity={inOutro ? 1 - outroIn : 1}>
        {STATIONS.map((s) => {
          const r = radius(s);
          if (r <= 0) return null;
          const lit = started && litNames.has(s.name);
          return (
            <circle
              key={s.name}
              cx={s.x}
              cy={s.y}
              r={r}
              fill={HOT}
              fillOpacity={lit ? 0.85 : 0.12}
              stroke={HOT}
              strokeWidth={PX * 1.3}
              strokeOpacity={lit ? 1 : 0.32}
            />
          );
        })}
        </g>

        {/* 1위에만 테를 두른다.

            **훅에서는 안 두른다.** 「어디일까요?」라고 묻는 화면에
            답이 표시돼 있으면 물음이 아니다 */}
        {started && !inOutro && (
          <circle
            cx={lead.x}
            cy={lead.y}
            r={radius(leadStation)}
            fill="none"
            stroke={INK}
            strokeWidth={PX * 2.4}
          />
        )}
        {inOutro &&
          HOLDER_PTS.map((p) => (
            <g key={p.name} opacity={outroIn}>
              <circle cx={p.x} cy={p.y} r={PX * 9} fill={HOT} />
              <circle
                cx={p.x}
                cy={p.y}
                r={PX * 22}
                fill="none"
                stroke={INK}
                strokeWidth={PX * 2.4}
              />
            </g>
          ))}
      </svg>

      {/* 1위 이름표. 화면 좌표에 얹어야 배율과 무관하게 읽힌다 */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(sx(lead.x) - 130, 64), 1080 - 260 - 64),
            top: sy(lead.y) - rOf(lead.n) / PX - 48,
            width: 260,
            textAlign: "center",
            color: INK,
            fontSize: 40,
            fontWeight: 900,
            opacity: settle,
            textShadow: `0 0 24px ${BG}, 0 0 9px ${BG}`,
          }}
        >
          {lead.name}
        </div>
      )}
      {inOutro &&
        HOLDER_PTS.map((p) => (
          <div
            key={p.name}
            style={{
              position: "absolute",
              left: Math.min(Math.max(sx(p.x) - 110, 40), 1080 - 220 - 40),
              top: sy(p.y) - 62,
              width: 220,
              textAlign: "center",
              color: INK,
              fontSize: 30,
              fontWeight: 900,
              opacity: outroIn,
              textShadow: `0 0 22px ${BG}, 0 0 8px ${BG}`,
            }}
          >
            {p.name}
          </div>
        ))}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 960,
          background: `linear-gradient(to bottom, ${BG}00 0%, ${BG}D8 24%, ${BG} 44%)`,
        }}
      />

      {/* ── 시계 ── */}
      {started && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            top: 1050,
            display: "flex",
            alignItems: "baseline",
            gap: 18,
          }}
        >
          <div
            style={{
              color: INK,
              fontSize: 70,
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {inOutro ? "하루" : hourLabel(showHour)}
          </div>
          <div style={{ color: HOT, fontSize: 42, fontWeight: 900 }}>
            {inOutro ? "승차 1위" : "승차"}
          </div>
        </div>
      )}

      {/* 첫차에서 막차까지. 지금 어디쯤인지만 알려준다 */}
      {started && (
        <>
          <div
            style={{
              position: "absolute",
              left: TEXT_X,
              top: 1150,
              width: NUM_RIGHT - TEXT_X,
              display: "flex",
              gap: 5,
            }}
          >
            {STEPS.map((st, i) => (
              <div
                key={st.hour}
                style={{
                  flex: 1,
                  height: 13,
                  borderRadius: 3,
                  background: inOutro || i === bi ? HOT : INK,
                  opacity: inOutro ? 0.75 : i === bi ? 1 : i < bi ? 0.3 : 0.12,
                }}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: TEXT_X,
              top: 1174,
              width: NUM_RIGHT - TEXT_X,
              display: "flex",
              justifyContent: "space-between",
              color: DIM,
              fontSize: 21,
              fontWeight: 700,
            }}
          >
            <span>첫차</span>
            <span>막차</span>
          </div>
        </>
      )}

      {/* ── 순위표 ── */}
      {started && !inOutro && (
        <div style={{ opacity: settle }}>
          {cur.top.map((r, i) => (
            <Row
              key={r.name}
              y={LIST_TOP + (i === 0 ? 0 : LEAD_H + (i - 1) * ROW_H)}
              rank={`${i + 1}`}
              name={r.name}
              n={r.n}
              lead={i === 0}
              tail={
                i === 0 && cur.hour === PEAK_HOUR
                  ? `1초에 ${PEAK_PER_SEC}명`
                  : undefined
              }
            />
          ))}
          {/* **자를 표 안에 둔다.** 241역 평균을 순위 밑에 같은 줄로
              세우면 「1위가 평균의 몇 배인가」를 눈이 바로 잰다 */}
          {/* 순위와 자 사이에 실선 하나. 평균이 6위처럼 읽히면 안 된다 */}
          <div
            style={{
              position: "absolute",
              left: TEXT_X,
              top: LIST_TOP + LEAD_H + 4 * ROW_H + 2,
              width: NUM_RIGHT - TEXT_X,
              height: 2,
              background: DIM,
              opacity: 0.3,
            }}
          />
          <Row
            y={LIST_TOP + LEAD_H + 4 * ROW_H + 16}
            rank=""
            name="241역 평균"
            n={cur.avg}
            faint
          />
        </div>
      )}

      {/* ── 마무리는 질문으로 연다 ── */}
      {inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 116,
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
              1위 자리를 나눠 가진{" "}
              <span style={{ color: HOT }}>{HOLDERS.length}개 역</span>
            </div>
            <div>
              하루에 <span style={{ color: HOT }}>{SWAPS}번</span> 바뀜
            </div>
          </div>
          <div
            style={{
              color: INK,
              fontSize: 48,
              fontWeight: 900,
              marginTop: 26,
              lineHeight: 1.2,
            }}
          >
            여러분 동네 역은 몇 시에 가장 붐비나요?
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
            bottom: BOTTOM_INSET + 116,
            opacity: hookOut,
          }}
        >
          <div
            style={{ color: INK, fontSize: 72, fontWeight: 900, lineHeight: 1.18 }}
          >
            <div>아침 8시</div>
            <div>가장 많이 타는 역</div>
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

      {/* 무엇을 세고 어디서 잰 값인지는 다 적는다 */}
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
        원 넓이가 인원 · 서울교통공사 1~8호선 241역
        <br />
        2024년 평일 {DAYS}일 평균 · 13-14시간대 제외
      </div>

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};

/** 순위표 한 줄. 이름은 왼쪽, 숫자는 오른쪽에 세로로 맞춰 세운다 */
const Row: React.FC<{
  y: number;
  rank: string;
  name: string;
  n: number;
  lead?: boolean;
  faint?: boolean;
  tail?: string;
}> = ({ y, rank, name, n, lead, faint, tail }) => {
  const size = lead ? 54 : faint ? 32 : 38;
  const ink = lead ? INK : faint ? DIM : "#C6CBD2";
  return (
    <div
      style={{
        position: "absolute",
        left: TEXT_X,
        top: y,
        width: NUM_RIGHT - TEXT_X,
        display: "flex",
        alignItems: "baseline",
        gap: 16,
        color: ink,
        fontWeight: 900,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ color: DIM, fontSize: lead ? 34 : 26, width: 34 }}>
        {rank}
      </span>
      <span style={{ fontSize: size }}>{name}</span>
      {tail && (
        <span style={{ color: HOT, fontSize: 32, marginLeft: -4 }}>{tail}</span>
      )}
      <span
        style={{
          marginLeft: "auto",
          fontSize: lead ? 50 : faint ? 30 : 36,
          color: lead ? HOT : ink,
        }}
      >
        {n.toLocaleString()}
        {lead ? "명" : ""}
      </span>
    </div>
  );
};
