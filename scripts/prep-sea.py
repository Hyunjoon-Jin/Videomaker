#!/usr/bin/env python3
"""열린 바다에 닿는 해안선만 남긴다.

## 왜 걸러야 하나

OSM `natural=coastline`의 한국 구간에는 `source=PGS`(Prototype Global
Shoreline) 시절 선이 남아 있다. 방조제가 생기기 전 물길을 그대로
그려서, **아산호와 금강호 안쪽까지 해안선이 들어가 있다.**

```
아산만방조제   126.9074, 36.913
그런데 해안선  126.9114, 36.893   ← 방조제 안쪽, 아산호(민물)
```

이걸 그냥 두면 상주에서 '서해까지'가 실제보다 짧게 나온다. 담수호를
바다라고 부른 셈이다.

## 어떻게 거르나

**바다는 바깥이다.** 200m 격자에 육지를 칠하고, 지도 테두리에서
물 칸을 타고 들어온다. 그렇게 닿는 물만 바다다. 방조제 안쪽 호수는
육지에 둘러싸여 있어 닿지 않는다.

육지는 남한 시군구 경계(통계청)와 북한(Natural Earth) 둘 다 칠한다.
북한을 안 칠하면 그 땅이 물로 남아 강원 북부 값이 틀어진다.

해안선 점은 600m 안에 바다 칸이 있을 때만 남긴다.

사용:  python3 scripts/prep-sea.py
출력:  data/coast-open.json   (열린 바다에 닿는 해안선 점 목록)
"""
import json
import os
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
MUNI = os.path.join(DATA, "skorea-municipalities.json")
WORLD = os.path.join(DATA, "ne-countries.geojson")
COAST = os.path.join(DATA, "osm-coastline.json")
OUT = os.path.join(DATA, "coast-open.json")

STEP = 0.002                     # 약 200m
LON0, LON1 = 124.0, 132.0
LAT0, LAT1 = 33.0, 39.6
W = int((LON1 - LON0) / STEP) + 1
H = int((LAT1 - LAT0) / STEP) + 1

REACH = 3                        # 해안선 점에서 바다 칸까지 봐 주는 칸 수


def rings_of(path, keep=None):
    gj = json.load(open(path, encoding="utf-8"))
    out = []
    for f in gj["features"]:
        if keep and not keep(f["properties"]):
            continue
        g = f["geometry"]
        ps = (g["coordinates"] if g["type"] == "MultiPolygon"
              else [g["coordinates"]])
        for poly in ps:
            out.append(poly[0])
    return out


def paint(land, rings):
    """가로줄마다 교차점을 구해 안쪽을 칠한다."""
    for ring in rings:
        ys = [p[1] for p in ring]
        j0 = max(0, int((min(ys) - LAT0) / STEP))
        j1 = min(H - 1, int((max(ys) - LAT0) / STEP))
        n = len(ring)
        for j in range(j0, j1 + 1):
            y = LAT0 + (j + 0.5) * STEP
            xs = []
            for a in range(n):
                xa, ya = ring[a]
                xb, yb = ring[(a + 1) % n]
                if (ya > y) != (yb > y):
                    xs.append((xb - xa) * (y - ya) / (yb - ya) + xa)
            xs.sort()
            base = j * W
            for k in range(0, len(xs) - 1, 2):
                i0 = max(0, int((xs[k] - LON0) / STEP))
                i1 = min(W - 1, int((xs[k + 1] - LON0) / STEP))
                for i in range(i0, i1 + 1):
                    land[base + i] = 1


def main():
    land = bytearray(W * H)
    paint(land, rings_of(MUNI))
    print(f"남한 칠함 · {sum(land):,}칸", flush=True)
    paint(land, rings_of(WORLD, lambda p: p.get("ADM0_A3") == "PRK"))
    print(f"북한까지 · {sum(land):,}칸", flush=True)

    # 테두리에서 물을 타고 들어온다. 닿는 물만 바다다.
    sea = bytearray(W * H)
    q = deque()
    for i in range(W):
        for j in (0, H - 1):
            k = j * W + i
            if not land[k] and not sea[k]:
                sea[k] = 1
                q.append(k)
    for j in range(H):
        for i in (0, W - 1):
            k = j * W + i
            if not land[k] and not sea[k]:
                sea[k] = 1
                q.append(k)
    while q:
        k = q.popleft()
        i, j = k % W, k // W
        for nk, ok in ((k - 1, i > 0), (k + 1, i < W - 1),
                       (k - W, j > 0), (k + W, j < H - 1)):
            if ok and not land[nk] and not sea[nk]:
                sea[nk] = 1
                q.append(nk)
    print(f"바다 {sum(sea):,}칸", flush=True)

    def open_sea(x, y):
        ci = int((x - LON0) / STEP)
        cj = int((y - LAT0) / STEP)
        for j in range(max(0, cj - REACH), min(H, cj + REACH + 1)):
            base = j * W
            for i in range(max(0, ci - REACH), min(W, ci + REACH + 1)):
                if sea[base + i]:
                    return True
        return False

    co = json.load(open(COAST, encoding="utf-8"))
    keep, drop = [], []
    for w in co["elements"]:
        for g in w.get("geometry", []):
            x, y = g["lon"], g["lat"]
            (keep if open_sea(x, y) else drop).append((round(x, 5), round(y, 5)))
    print(f"남김 {len(keep):,} · 버림 {len(drop):,}")
    json.dump(keep, open(OUT, "w"))
    print("→", OUT)


if __name__ == "__main__":
    main()
