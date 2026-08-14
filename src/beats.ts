/**
 * 사건 단위 타임라인.
 *
 * 지금까지는 구간(LEGS)에 초를 나눠주고 그 안에서 값을 등속으로 흘렸다.
 * 사건이 몰린 구간에서는 자막이 1초도 못 버티고 넘어간다. 임진왜란의
 * 한산도 대첩과 이치 전투는 음력으로 보름 남짓 차이라, 4개월에 9초를
 * 준 구간에서는 1.3초 만에 다음 자막으로 바뀐다. 읽을 수가 없다.
 *
 * 그래서 시간을 값이 아니라 사건에 배분한다. 사건마다 '이동'과 '체류'를
 * 갖고, 체류 시간은 몇 개월 차이든 상관없이 보장된다. 영상 길이는
 * 사건 수에 따라 결정된다 — 길이를 먼저 정하고 사건을 우겨넣는 것이
 * 애초에 순서가 틀렸다.
 */

export interface Beat {
  /** 이 사건이 가리키는 값 — 개월·일·연도 무엇이든 단조 증가하면 된다 */
  value: number;
  /** 앞 사건에서 여기까지 오는 데 쓰는 프레임 */
  travel: number;
  /** 도착한 뒤 머무는 프레임 */
  hold: number;
}

export interface Span {
  /** 이동 시작 */
  t0: number;
  /** 도착 = 체류 시작. 자막이 여기서 뜬다. */
  t1: number;
  /** 체류 끝 */
  t2: number;
  vIn: number;
  vHit: number;
  vOut: number;
}

/**
 * 비트 목록을 프레임 구간으로 편다.
 *
 * creep은 체류 중에도 값이 조금씩 나아가는 양이다(다음 사건까지 남은
 * 거리의 비율). 0으로 두면 체류 동안 지도가 완전히 멈춰 정지 화면이
 * 된다. 완급은 늦추는 것이지 세우는 것이 아니다.
 */
export function layoutBeats(beats: Beat[], start: number, creep = 0.2): Span[] {
  const spans: Span[] = [];
  let f = start;
  let cursor = beats.length > 0 ? beats[0].value : 0;

  beats.forEach((b, i) => {
    const t0 = f;
    const t1 = f + b.travel;
    const t2 = t1 + b.hold;
    const next = beats[i + 1];
    const vOut = next ? b.value + (next.value - b.value) * creep : b.value;
    spans.push({ t0, t1, t2, vIn: cursor, vHit: b.value, vOut });
    cursor = vOut;
    f = t2;
  });
  return spans;
}

/** 이동은 등속이다. 카메라만 이징하고 값이 갑자기 빨라지면 어색하다. */
export function valueAtBeats(spans: Span[], frame: number, end: number): number {
  if (spans.length === 0) return end;
  if (frame <= spans[0].t0) return spans[0].vIn;

  for (const s of spans) {
    if (frame <= s.t1) {
      const t = (frame - s.t0) / Math.max(1, s.t1 - s.t0);
      return s.vIn + (s.vHit - s.vIn) * t;
    }
    if (frame <= s.t2) {
      const t = (frame - s.t1) / Math.max(1, s.t2 - s.t1);
      return s.vHit + (s.vOut - s.vHit) * t;
    }
  }
  return spans[spans.length - 1].vOut;
}

/** 지금 어떤 비트인가 — 자막과 카메라가 같은 인덱스를 봐야 어긋나지 않는다 */
export function beatIndexAt(spans: Span[], frame: number): number {
  if (spans.length === 0) return -1;
  for (let i = 0; i < spans.length; i++) {
    // 이동 중에는 아직 앞 사건의 자막이 떠 있다
    if (frame < spans[i].t1) return i - 1;
    if (frame <= spans[i].t2) return i;
  }
  return spans.length - 1;
}

/** 사건별 체류 길이. 큰 사건에 더 준다. */
export function beatOf(
  value: number,
  impact = 0.4,
  fps = 30,
  opts: { hold?: number; bigHold?: number; travel?: number; bigTravel?: number } = {}
): Beat {
  const big = impact >= 0.85;
  return {
    value,
    travel: Math.round((big ? opts.bigTravel ?? 1.05 : opts.travel ?? 0.85) * fps),
    hold: Math.round((big ? opts.bigHold ?? 3.0 : opts.hold ?? 2.4) * fps),
  };
}
