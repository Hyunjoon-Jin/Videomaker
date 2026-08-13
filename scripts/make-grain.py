#!/usr/bin/env python3
"""
필름 그레인 타일 생성.

평평한 벡터 화면이 '기계로 뽑은 것'처럼 보이는 큰 이유 하나가 잡티가
전혀 없다는 점이다. 실제로 촬영되거나 인쇄된 것에는 항상 알갱이가 있다.

정지된 잡티 한 장을 깔면 렌즈에 먼지가 붙은 것처럼 보이므로 네 장을
만들어 프레임마다 돌려 쓴다. 그래야 알갱이가 살아 움직인다.

굵은 저주파 얼룩을 섞은 이유는 종이 결 때문이다. 순수 백색잡음만
쓰면 TV 노이즈처럼 균질해서 오히려 인공적이다.

출력: public/grain-0.png ~ grain-3.png (256x256 8bit 그레이스케일)
사용:  python3 scripts/make-grain.py
"""
import os
import struct
import zlib

import numpy as np

SIZE = 256
TILES = 4
OUT = "public"


def png_gray(path: str, arr: np.ndarray) -> None:
    """의존성 없이 8bit 그레이스케일 PNG를 직접 쓴다."""
    h, w = arr.shape
    raw = b"".join(b"\x00" + arr[y].tobytes() for y in range(h))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    open(path, "wb").write(png)


def blotch(rng: np.random.Generator, n: int, cell: int) -> np.ndarray:
    """저주파 얼룩 — 굵게 뽑아 이중선형으로 늘린다(종이 결)."""
    k = n // cell + 2
    small = rng.standard_normal((k, k))
    ys = np.linspace(0, k - 1.001, n)
    xs = np.linspace(0, k - 1.001, n)
    y0 = ys.astype(int)
    x0 = xs.astype(int)
    fy = (ys - y0)[:, None]
    fx = (xs - x0)[None, :]
    a = small[np.ix_(y0, x0)]
    b = small[np.ix_(y0, x0 + 1)]
    c = small[np.ix_(y0 + 1, x0)]
    d = small[np.ix_(y0 + 1, x0 + 1)]
    return (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy)
            + c * (1 - fx) * fy + d * fx * fy)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for i in range(TILES):
        rng = np.random.default_rng(1000 + i)
        fine = rng.standard_normal((SIZE, SIZE))
        # 알갱이가 1픽셀이면 축소될 때 사라진다. 살짝 뭉갠다.
        fine = (fine + np.roll(fine, 1, 0) + np.roll(fine, 1, 1)) / 1.9
        v = 128 + fine * 13 + blotch(rng, SIZE, 22) * 7 + blotch(rng, SIZE, 74) * 5
        arr = np.clip(v, 0, 255).astype(np.uint8)
        path = os.path.join(OUT, f"grain-{i}.png")
        png_gray(path, arr)
        print(f"{path} · {os.path.getsize(path) // 1024}KB")


if __name__ == "__main__":
    main()
