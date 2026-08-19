#!/usr/bin/env python3
"""쇼츠 길이가 60초를 넘는지 검사한다.

표준시 편이 60.17초로 전 세계 차단됐다. 5프레임 초과였다.

YouTube 규정(support.google.com/youtube/answer/6013276):

    길이가 1분을 넘는 Shorts 동영상에 활성 상태의 Content ID 소유권
    주장이 있는 경우 정책과 관계없이 YouTube에서 차단됩니다.

    1~3분 길이의 Shorts 동영상: 활성 소유권 주장이 적용된 경우 정책과
    관계없이 소유권 주장이 제기된 동영상이 차단됩니다.

'정책과 관계없이'가 핵심이다. 3분을 넘는 일반 동영상은 소유권자가
'수익 창출'을 걸어두면 계속 볼 수 있지만, 1~3분 쇼츠는 소유권 주장이
살아 있는 것만으로 차단된다. 곡을 바꾸는 것으로 해결되는 문제가 아니고
길이가 조건이다.

그리고 이 채널이 쓰는 Kevin MacLeod 음원은 본인이 직접 Content ID에
등록해 둔 것이다. 제3자가 자기 곡을 도둑 등록하는 것을 막으려고 그렇게
했다고 incompetech가 밝히고 있다. 표기 문구를 설명란에 넣고 이의를
제기하면 72시간 안에 풀린다. 즉 클레임 자체는 피할 수 없고, 60초를
넘기지 않는 것이 유일한 예방이다.

한계선은 59.0초로 잡았다. 규정의 경계는 60.0초지만 5프레임 때문에
한 편이 죽는 것을 이미 봤다. 자막을 한 줄 고치면 길이가 바뀌는 구조라
경계에 붙여둘 이유가 없다.

사용:  python3 scripts/check-lengths.py
       종료 코드 1이면 넘긴 편이 있다는 뜻이다.
"""
import re
import subprocess
import sys

FPS = 30
# 규정의 경계
HARD_SEC = 60.0
# 우리가 지키는 선. 자막 한 줄에 길이가 흔들리므로 여유를 둔다.
LIMIT_SEC = 59.0

# 쇼츠가 아닌 것들 — 썸네일과 채널 자산은 1프레임 정지 이미지다.
SKIP = re.compile(r"^(Thumb|Channel)")


def compositions() -> list[tuple[str, int]]:
    r = subprocess.run(
        ["npx", "remotion", "compositions"], capture_output=True, text=True
    )
    if r.returncode != 0:
        sys.exit(r.stderr[-2000:])
    out = []
    for line in r.stdout.splitlines():
        m = re.match(r"^(\S+)\s+(\d+)\s+(\d+)x(\d+)\s+(\d+)\s", line)
        if not m:
            continue
        name, frames = m.group(1), int(m.group(5))
        if SKIP.match(name):
            continue
        out.append((name, frames))
    return out


def main() -> None:
    rows = compositions()
    if not rows:
        sys.exit("컴포지션을 못 읽었다")
    over = []
    print(f"{'편':<20} {'프레임':>7} {'초':>7}   판정")
    for name, frames in sorted(rows, key=lambda r: r[1]):
        sec = frames / FPS
        if sec > HARD_SEC:
            mark = f"차단 — {sec - HARD_SEC:.2f}초 초과"
            over.append((name, sec))
        elif sec > LIMIT_SEC:
            mark = f"위험 — 경계까지 {HARD_SEC - sec:.2f}초"
            over.append((name, sec))
        else:
            mark = "괜찮음"
        print(f"{name:<20} {frames:>7} {sec:>7.2f}   {mark}")
    if over:
        print()
        print(f"{len(over)}편이 {LIMIT_SEC:.0f}초를 넘었다. "
              "Content ID 소유권 주장이 걸리면 그대로 차단된다.")
        for name, sec in over:
            print(f"  {name} — {sec:.2f}초, {sec - LIMIT_SEC:.2f}초 줄여야 한다")
        sys.exit(1)
    print("\n전부 60초 아래다.")


if __name__ == "__main__":
    main()
