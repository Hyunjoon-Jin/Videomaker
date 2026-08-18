"""쇼츠 UI가 덮는 자리를 렌더된 화면 위에 그려본다.

1080×1920 캔버스에 다 그려놓고 '다 보인다'고 여긴 게 화근이었다.
실제 재생 화면에서는 위쪽 칩 줄과 아래쪽 채널명·설명 줄과 오른쪽 버튼
기둥이 영상을 덮는다. 그 자리를 붉게 칠해 얹으면 무엇이 죽는지 바로 보인다.

수치의 근거는 src/safe.ts에 적어뒀다.

사용:  python3 scripts/safe.py out/still.png
출력:  out/still.safe.png
"""
import sys

import numpy as np

from grid import read_png, write_png

# 디자인 좌표(1080×1920) 기준으로 덮이는 자리
# 잰 값이 아니라 '여기까지는 비워둔다'는 기준선이다. 잰 값은 위 238,
# 아래 1807이었는데 기기마다 칩 줄 높이가 다르고 아래는 제목이 두 줄이
# 되면 그만큼 올라와서, 여유를 얹은 값으로 검사한다.
ZONES = [
    ("위쪽 칩 줄", 0, 0, 1080, 352),
    ("채널명·제목·음악 정보", 0, 1680, 1080, 1920),
    ("오른쪽 버튼 기둥", 930, 1130, 1080, 1760),
]


def main(path: str) -> None:
    a = read_png(path).astype(np.float64)
    h, w, _ = a.shape
    sx, sy = w / 1080, h / 1920
    for _name, x0, y0, x1, y1 in ZONES:
        X0, Y0 = int(x0 * sx), int(y0 * sy)
        X1, Y1 = int(x1 * sx), int(y1 * sy)
        band = a[Y0:Y1, X0:X1]
        # 붉게 덮되 아래가 비쳐야 무엇이 죽는지 보인다
        band[:, :, 0] = band[:, :, 0] * 0.45 + 210 * 0.55
        band[:, :, 1] = band[:, :, 1] * 0.45 + 40 * 0.55
        band[:, :, 2] = band[:, :, 2] * 0.45 + 40 * 0.55
    out = path.replace(".png", ".safe.png")
    write_png(out, a.astype(np.uint8))
    print(out)


if __name__ == "__main__":
    for p in sys.argv[1:]:
        main(p)
