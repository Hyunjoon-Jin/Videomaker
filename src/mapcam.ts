/**
 * 지도 카메라.
 *
 * 네 편 다 40초 내내 같은 구도였다. 지도를 통째로 놓고 그 안에서
 * 뭔가가 변하는 걸 멀리서 지켜보는 화면이다. 정보는 다 들어 있지만
 * 볼 이유가 없다 — 3초면 이 영상이 어디로 갈지 다 알기 때문이다.
 *
 * 카메라가 붙으면 같은 자료가 다르게 읽힌다. 부산에 상륙할 때 부산으로
 * 밀고 들어가면 그 순간이 사건이 되고, 전선이 압록강에 닿을 때 확 빠지면
 * 그 거리가 실감된다. 화면이 어디를 보라고 말해주는 것이다.
 *
 * 지도 내용은 전부 0..1000 좌표계에 있으므로 viewBox만 프레임마다 바꾸면
 * 된다. 별도의 변환이나 레이어가 필요 없다.
 */

export interface Shot {
  /** 이 프레임에 이 구도가 완성된다 */
  at: number;
  /** 지도 좌표계에서의 화면 중심 */
  cx: number;
  cy: number;
  /**
   * 배율. 1이면 지도 폭 1000이 화면 폭에 꽉 찬다.
   * 2면 절반만 보이므로 두 배로 크게 보인다.
   */
  z: number;
  /**
   * 이 샷으로 넘어가는 방식.
   * 기본은 부드럽게 미는 것이고, cut이면 즉시 바뀐다.
   * 컷은 음악의 타격과 맞출 때만 쓴다. 남발하면 정신없다.
   */
  cut?: boolean;
}

/** 부드럽게 시작하고 부드럽게 멈춘다. 등속 이동은 기계처럼 보인다. */
function ease(t: number): number {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
}

export interface CameraFrame {
  viewBox: string;
  /**
   * 현재 배율. 선 굵기와 글자 크기를 이걸로 나눠야 확대해도
   * 굵어지지 않는다. 안 나누면 줌인할 때 지도가 크레용 그림이 된다.
   */
  z: number;
}

/**
 * 샷 목록과 프레임에서 viewBox를 만든다.
 *
 * aspect는 화면의 세로/가로 비다. 쇼츠는 1920/1080이라 1.78이다.
 * viewBox를 정사각으로 두면 좌우가 잘리거나 남으므로 화면 비에 맞춘다.
 */
export function cameraAt(
  shots: Shot[],
  frame: number,
  aspect = 1920 / 1080
): CameraFrame {
  const box = (cx: number, cy: number, z: number): CameraFrame => {
    const w = 1000 / z;
    const h = w * aspect;
    return {
      viewBox: `${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`,
      z,
    };
  };

  if (shots.length === 0) return box(500, 500, 1);
  if (frame <= shots[0].at) return box(shots[0].cx, shots[0].cy, shots[0].z);

  for (let i = 0; i < shots.length - 1; i++) {
    const a = shots[i];
    const b = shots[i + 1];
    if (frame >= b.at) continue;
    if (b.cut) return box(a.cx, a.cy, a.z);
    const t = ease((frame - a.at) / Math.max(1, b.at - a.at));
    // 배율은 로그로 보간한다. 선형으로 하면 1→3 이동에서 앞부분이
    // 훅 커지고 뒤가 느려져 줌이 고르지 않게 느껴진다.
    const z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t);
    return box(a.cx + (b.cx - a.cx) * t, a.cy + (b.cy - a.cy) * t, z);
  }

  const last = shots[shots.length - 1];
  return box(last.cx, last.cy, last.z);
}


/**
 * 연표에서 샷 목록을 만든다.
 *
 * 사건마다 샷을 하나만 두면 카메라가 도착하자마자 다음 사건을 향해
 * 떠난다. 자막은 아직 그 사건을 말하고 있는데 화면은 벌써 다른 데로
 * 흐르는 것이다. 그래서 사건마다 둘을 넣는다 — 자막보다 lead만큼 먼저
 * 도착하는 샷, 그리고 hold만큼 그 자리에 머무는 같은 위치의 샷.
 *
 * 사건이 붙어 있으면 머무는 샷이 다음 도착 샷을 넘어설 수 있다.
 * 그때는 머무는 시간을 잘라 순서를 지킨다. 순서가 뒤집히면 카메라가
 * 뒤로 갔다가 다시 오는 것처럼 보인다.
 */
export function shotsFromEvents(
  items: Array<{ frame: number; cx: number; cy: number; z: number }>,
  opts: { lead?: number; hold?: number; first?: Shot } = {}
): Shot[] {
  const lead = opts.lead ?? 16;
  const hold = opts.hold ?? 26;
  const sorted = [...items].sort((a, b) => a.frame - b.frame);
  const out: Shot[] = opts.first ? [opts.first] : [];

  sorted.forEach((it, i) => {
    const next = sorted[i + 1];
    const arrive = it.frame - lead;
    const nextArrive = next ? next.frame - lead : Infinity;
    // 다음 샷이 출발하기 전까지만 머문다
    const stay = Math.min(it.frame + hold, nextArrive - 2);
    out.push({ at: arrive, cx: it.cx, cy: it.cy, z: it.z });
    if (stay > arrive) out.push({ at: stay, cx: it.cx, cy: it.cy, z: it.z });
  });

  // at이 단조 증가해야 보간이 성립한다
  let last = -Infinity;
  return out.filter((sh) => {
    if (sh.at <= last) return false;
    last = sh.at;
    return true;
  });
}
