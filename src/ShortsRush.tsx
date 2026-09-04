import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  AVG_N,
  BEATS,
  DAY_RANK,
  DAYS,
  GANGNAM_N,
  HOLD,
  HOOK_SEC,
  HOURS,
  LAND,
  OUTRO_SEC,
  PEAK_HOUR,
  PEAK_PER_SEC,
  SEG,
  SEOUL,
  STAR,
  STATIONS,
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
/** 타는 사람 — 동네에서 빠져나간다 */
const HOT = "#F2603C";
/** 내리는 사람 — 동네로 돌아온다 */
const COOL = "#5FB9EA";
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
  w: (SEOUL_BOX.x1 - SEOUL_BOX.x0) * 1.22,
};
const PX = CAM.w / 1080;
const VX = CAM.cx - CAM.w / 2;
/** 지도를 화면 위쪽에 올려 밑에 시계와 글자 자리를 남긴다 */
const VY = CAM.cy - 731 * PX;
const VIEW = `${VX} ${VY} ${CAM.w} ${CAM.w * ASPECT}`;
const sx = (x: number) => (x - VX) / PX;
const sy = (y: number) => (y - VY) / PX;

/* 거품 반지름. **넓이가 인원에 비례하도록** 제곱근을 쓴다.
   정점(11,479명)이 화면에서 32px가 되게 맞췄다 — 더 키우면 이웃
   역들과 뭉쳐 한 덩어리가 되고, 그러면 1위가 1위로 안 보인다. */
const K = 0.0195;
const rOf = (n: number | null) => (n && n > 0 ? Math.sqrt(n) * K : 0);

/** 훅에서는 첫차 시간대다. 아직 아무도 안 움직인다 */
const CALM = 0;

const STAR_I = STATIONS.findIndex((s) => s.name === STAR);

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
  const settle = interpolate(age, [2, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outroIn = interpolate(frame, [BODY_END, BODY_END + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cur = BEATS[bi];
  const prev = bi > 0 ? BEATS[bi - 1] : null;

  /* 거품이 앞 걸음에서 이번 걸음으로 자란다. **시간이 흐르는 화면이라
     값이 튀면 안 된다.** 마무리에서는 정점(08시)으로 되돌아간다 */
  const grow = interpolate(age, [0, Math.round(0.7 * FPS)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const from = started
    ? prev
      ? { hour: prev.hour, on: prev.on }
      : { hour: CALM, on: true }
    : { hour: CALM, on: true };
  const to = started ? { hour: cur.hour, on: cur.on } : from;
  const warm = inOutro ? true : to.on;

  /** 승차에서 하차로 넘어가는 걸음 */
  const flip = started && from.on !== to.on;

  const radius = (s: (typeof STATIONS)[number]) => {
    if (inOutro) return rOf(s.on[PEAK_HOUR]) * outroIn;
    if (!started) return rOf(s.on[CALM]);
    const b = rOf((to.on ? s.on : s.off)[to.hour]);
    /* **세는 값이 바뀌면 크기를 잇지 않는다.** 승차 값에서 하차
       값으로 이어 붙이면 그 0.7초 동안 화면에 뜬 원은 어느 쪽도
       아닌 숫자다. 0에서 새로 자라게 한다 */
    if (flip) return b * grow;
    const a = rOf((from.on ? s.on : s.off)[from.hour]);
    return a + (b - a) * grow;
  };

  /* 마무리에서는 정점(08시 승차)으로 되돌아간다. **시계도 같이
     되돌린다** — 화면은 8시인데 시계만 23시에 멈춰 있으면 거짓말이다 */
  const showHour = inOutro ? PEAK_HOUR : cur.hour;
  const showOn = inOutro ? true : cur.on;
  const tint = warm ? HOT : COOL;
  const star = STATIONS[STAR_I];
  const leadI = STATIONS.findIndex((s) => s.name === cur.lead);
  const lead = STATIONS[leadI];
  const showLead = started && !inOutro && cur.lead !== STAR;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Pretendard" }}>
      {HAS_BGM && <Audio src={staticFile("bgm-rs.wav")} volume={0.4} />}
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

        {/* 거품 — 그 시간대에 탄(내린) 사람.
            **한 번에 한 값만 센다.** 승차와 하차를 같이 띄우지 않는다 */}
        {STATIONS.map((s, i) => {
          const r = radius(s);
          if (r <= 0) return null;
          return (
            <circle
              key={s.name}
              cx={s.x}
              cy={s.y}
              r={r}
              fill={tint}
              /* 속을 옅게 두고 테를 두른다. **겹쳐도 원이 원으로
                 보이게** 하려는 것이다 — 꽉 채우면 이웃끼리 뭉쳐
                 얼룩이 된다 */
              fillOpacity={started && (i === STAR_I || i === leadI) ? 0.88 : 0.12}
              stroke={tint}
              strokeWidth={PX * 1.3}
              strokeOpacity={started && (i === STAR_I || i === leadI) ? 1 : 0.34}
            />
          );
        })}

        {/* 걸음이 시작되면 주인공에 테를 두른다. 32위로 내려앉은
            걸음에서도 어디 있는지 놓치면 안 된다.

            **훅에서는 안 두른다.** 「어디일까요?」라고 묻는 화면에
            답이 표시돼 있으면 물음이 아니다 */}
        {started && (
          <circle
            cx={star.x}
            cy={star.y}
            r={Math.max(radius(star), PX * 9)}
            fill="none"
            stroke={INK}
            strokeWidth={PX * 2.4}
          />
        )}
        {showLead && (
          <circle
            cx={lead.x}
            cy={lead.y}
            r={Math.max(radius(lead), PX * 9)}
            fill="none"
            stroke={DIM}
            strokeWidth={PX * 2.2}
          />
        )}
      </svg>

      {/* 역 이름표. 화면 좌표에 얹어야 배율과 무관하게 읽힌다 */}
      {started && (
        <Tag
          x={sx(star.x)}
          y={sy(star.y) - radius(star) / PX - 46}
          text={STAR}
          color={INK}
        />
      )}
      {showLead && (
        <Tag
          x={sx(lead.x)}
          y={sy(lead.y) - radius(lead) / PX - 42}
          text={cur.lead}
          color={DIM}
          small
        />
      )}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 900,
          background: `linear-gradient(to bottom, ${BG}00 0%, ${BG}D8 26%, ${BG} 46%)`,
        }}
      />

      {/* ── 시계 ── */}
      {started && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            top: 1132,
            display: "flex",
            alignItems: "baseline",
            gap: 18,
          }}
        >
          <div
            style={{
              color: INK,
              fontSize: 78,
              fontWeight: 900,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {hourLabel(showHour)}
          </div>
          <div style={{ color: tint, fontSize: 46, fontWeight: 900 }}>
            {showOn ? "승차" : "하차"}
          </div>
        </div>
      )}

      {/* 첫차에서 막차까지. 지금 어디쯤인지만 알려준다 */}
      {started && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            top: 1246,
            width: 1080 - TEXT_X - 180,
            display: "flex",
            gap: 5,
          }}
        >
          {HOURS.map((h, i) => (
            <div
              key={h}
              style={{
                flex: 1,
                height: 14,
                borderRadius: 3,
                background: i === showHour ? tint : INK,
                opacity: i === showHour ? 1 : i < showHour ? 0.3 : 0.12,
              }}
            />
          ))}
        </div>
      )}
      {started && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            top: 1272,
            width: 1080 - TEXT_X - 180,
            display: "flex",
            justifyContent: "space-between",
            color: DIM,
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          <span>첫차</span>
          <span>막차</span>
        </div>
      )}

      {/* ── 자막 ── */}
      {started && !inOutro && (
        <div
          style={{
            position: "absolute",
            left: TEXT_X,
            right: SAFE_RIGHT,
            bottom: BOTTOM_INSET + 56,
            opacity: settle,
          }}
        >
          <div style={cap}>서울 {cur.starRank}위</div>
          <div style={big}>{STAR}</div>
          <div style={{ ...note, color: tint }}>
            {cur.starN.toLocaleString()}명
            {cur.hour === PEAK_HOUR && ` · 1초에 ${PEAK_PER_SEC}명`}
          </div>
          {cur.hour === PEAK_HOUR && (
            <div style={sub}>
              241역 평균 {AVG_N.toLocaleString()}명 · 강남{" "}
              {GANGNAM_N.toLocaleString()}명
            </div>
          )}
          {showLead && (
            <div style={sub}>
              1위 {cur.lead} {cur.leadN.toLocaleString()}명
            </div>
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
            bottom: BOTTOM_INSET + 56,
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
              하루 총량 서울 <span style={{ color: DIM }}>{DAY_RANK}위</span>
            </div>
            <div>
              아침 1시간만 <span style={{ color: HOT }}>1위</span>
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
            bottom: BOTTOM_INSET + 56,
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
        원 넓이가 인원 · 서울교통공사 1~8호선 241역 · 2024년 평일 {DAYS}일 평균
      </div>

      <Grain opacity={0.26} vignette={0.34} />
    </AbsoluteFill>
  );
};

const Tag: React.FC<{
  x: number;
  y: number;
  text: string;
  color: string;
  small?: boolean;
}> = ({ x, y, text, color, small }) => {
  const w = 260;
  return (
    <div
      style={{
        position: "absolute",
        left: Math.min(Math.max(x - w / 2, TEXT_X - 40), 1080 - w - 40),
        top: y,
        width: w,
        textAlign: "center",
        color,
        fontSize: small ? 30 : 40,
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
  fontSize: 92,
  fontWeight: 900,
  lineHeight: 1.06,
  marginTop: 2,
};
const note: React.CSSProperties = {
  fontSize: 44,
  fontWeight: 900,
  marginTop: 10,
  fontVariantNumeric: "tabular-nums",
};
const sub: React.CSSProperties = {
  color: DIM,
  fontSize: 30,
  fontWeight: 800,
  marginTop: 8,
  fontVariantNumeric: "tabular-nums",
};
