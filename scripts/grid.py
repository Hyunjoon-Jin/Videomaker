"""썸네일을 실제로 보이는 크기로 줄여 한 장에 늘어놓는다.

1080×1920으로 보면 다 근사해 보인다. 그런데 채널 그리드에서는 폭
200px이고, 그 크기에서 살아남는지는 줄여봐야만 안다. PIL이 없으므로
PNG를 직접 읽고 쓴다.

사용:  python3 scripts/grid.py out/thumb/*.png
"""
import struct
import sys
import zlib

import numpy as np


def read_png(path):
    d = open(path, "rb").read()
    i, idat, ct = 8, b"", 6
    while i < len(d):
        ln = struct.unpack(">I", d[i:i + 4])[0]
        typ = d[i + 4:i + 8]
        data = d[i + 8:i + 8 + ln]
        if typ == b"IHDR":
            w, h, _bd, ct = struct.unpack(">IIBB", data[:10])
        elif typ == b"IDAT":
            idat += data
        i += 12 + ln
    raw = zlib.decompress(idat)
    ch = {0: 1, 2: 3, 4: 2, 6: 4}[ct]
    stride = w * ch
    out = np.zeros((h, stride), dtype=np.uint8)
    prev = np.zeros(stride, dtype=np.int32)
    pos = 0
    for y in range(h):
        ft = raw[pos]; pos += 1
        line = np.frombuffer(raw[pos:pos + stride], dtype=np.uint8).astype(np.int32).copy()
        pos += stride
        if ft == 1:
            for x in range(ch, stride):
                line[x] = (line[x] + line[x - ch]) & 255
        elif ft == 2:
            line = (line + prev) & 255
        elif ft == 3:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                line[x] = (line[x] + (a + prev[x]) // 2) & 255
        elif ft == 4:
            for x in range(stride):
                a = line[x - ch] if x >= ch else 0
                b = prev[x]
                c = prev[x - ch] if x >= ch else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        out[y] = line.astype(np.uint8)
        prev = line
    return out.reshape(h, w, ch)[:, :, :3]


def write_png(path, a):
    h, w, _ = a.shape
    raw = b"".join(b"\x00" + a[y].tobytes() for y in range(h))

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    open(path, "wb").write(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 6))
        + chunk(b"IEND", b"")
    )


def shrink(a, tw):
    """면적 평균으로 줄인다. 최근접으로 줄이면 없는 대비가 생겨 속는다."""
    h, w, _ = a.shape
    th = round(h * tw / w)
    ys = (np.arange(th + 1) * h / th).astype(int)
    xs = (np.arange(tw + 1) * w / tw).astype(int)
    out = np.zeros((th, tw, 3), dtype=np.uint8)
    for y in range(th):
        band = a[ys[y]:max(ys[y] + 1, ys[y + 1])].astype(np.float64)
        for x in range(tw):
            out[y, x] = band[:, xs[x]:max(xs[x] + 1, xs[x + 1])].mean(axis=(0, 1))
    return out


if __name__ == "__main__":
    paths = sys.argv[1:] or []
    W = 200          # 채널 그리드에서 실제로 뜨는 폭
    GAP = 14
    tiles = [shrink(read_png(p), W) for p in paths]
    th = max(t.shape[0] for t in tiles)
    cols = min(4, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    canvas = np.full((rows * (th + GAP) + GAP, cols * (W + GAP) + GAP, 3), 24, dtype=np.uint8)
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        y = GAP + r * (th + GAP)
        x = GAP + c * (W + GAP)
        canvas[y:y + t.shape[0], x:x + W] = t
    write_png("out/thumb/grid.png", canvas)
    print(f"out/thumb/grid.png · {len(tiles)}장 · 각 {W}px")
