#!/usr/bin/env python3
"""
동아시아 지도 — 태풍 편용.

태풍은 필리핀 근해에서 올라오므로 한반도만으로는 경로의 대부분이 화면 밖이다.
중국 동안·일본·대만·필리핀까지 담는 창을 따로 잡는다.

전쟁 편들과 달리 세로로 긴 창(1000×1600)을 쓴다. 태풍 경로는 남에서
북으로 길게 뻗으므로 정사각형 창이면 좌우가 낭비된다.

출력: src/data/eastasia.json {viewBox, w, h, lands:[{iso,d}], korea:[d]}
사용:  python3 scripts/prep-eastasia.py
"""
import json
import math
import os
import sys

sys.setrecursionlimit(200000)

NE = "data/ne-countries.geojson"
OUT = "src/data/eastasia.json"

BOX_W, BOX_H = 1000.0, 1600.0
LON0, LON1 = 118.0, 143.0
LAT0, LAT1 = 10.0, 46.0
TOL = 0.02        # 넓은 창이라 거칠게 단순화해도 된다
MIN_AREA = 0.02   # 작은 섬은 버림

WANT = {"CHN", "JPN", "KOR", "PRK", "TWN", "PHL", "RUS", "VNM"}


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    ax, ay = pts[0]
    bx, by = pts[-1]
    dx, dy = bx - ax, by - ay
    norm = math.hypot(dx, dy)
    idx, far = 0, -1.0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = (math.hypot(px - ax, py - ay) if norm == 0
             else abs(dy * px - dx * py + bx * ay - by * ax) / norm)
        if d > far:
            idx, far = i, d
    if far > tol:
        return dp(pts[: idx + 1], tol)[:-1] + dp(pts[idx:], tol)
    return [pts[0], pts[-1]]


def area(ring):
    s = 0.0
    for i in range(len(ring) - 1):
        s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return abs(s) / 2.0


def rings(geom):
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return [c[0]]
    if t == "MultiPolygon":
        return [p[0] for p in c]
    return []


def main() -> None:
    kx = math.cos(math.radians((LAT0 + LAT1) / 2))
    w = (LON1 - LON0) * kx
    h = LAT1 - LAT0
    # 가로·세로 중 더 빡빡한 쪽에 맞춰 종횡비를 지킨다
    scale = min(BOX_W / w, BOX_H / h)
    offx = (BOX_W - w * scale) / 2
    offy = (BOX_H - h * scale) / 2

    def proj(x, y):
        return (round((x - LON0) * kx * scale + offx, 1),
                round(BOX_H - ((y - LAT0) * scale + offy), 1))

    def to_path(ring):
        s = dp(ring, TOL)
        if len(s) < 4:
            return None
        pts = [proj(x, y) for x, y in s]
        return "M" + "L".join(f"{a} {b}" for a, b in pts) + "Z"

    ne = json.load(open(NE, encoding="utf-8"))
    lands, korea = [], []
    for f in ne["features"]:
        iso = f["properties"].get("ADM0_A3")
        if iso not in WANT:
            continue
        for r in rings(f["geometry"]):
            if area(r) < MIN_AREA:
                continue
            # 창 밖 폴리곤은 건너뛴다
            xs = [p[0] for p in r]
            ys = [p[1] for p in r]
            if max(xs) < LON0 - 4 or min(xs) > LON1 + 4:
                continue
            if max(ys) < LAT0 - 4 or min(ys) > LAT1 + 4:
                continue
            d = to_path(r)
            if not d:
                continue
            if iso in ("KOR", "PRK"):
                korea.append(d)
            else:
                lands.append({"iso": iso, "d": d})

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({
        "viewBox": f"0 0 {int(BOX_W)} {int(BOX_H)}",
        "w": BOX_W, "h": BOX_H,
        "lon": [LON0, LON1], "lat": [LAT0, LAT1],
        "kx": round(kx, 6), "scale": round(scale, 4),
        "offx": round(offx, 2), "offy": round(offy, 2),
        "lands": lands, "korea": korea,
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    print(f"주변국 {len(lands)}개 폴리곤 · 한반도 {len(korea)}개 · "
          f"{os.path.getsize(OUT)//1024}KB")
    # 검산 — 서울과 제주가 창 안에 제대로 놓이는지
    for name, lon, lat in [("서울", 126.98, 37.57), ("제주", 126.53, 33.50),
                           ("오키나와", 127.68, 26.21), ("괌", 144.75, 13.44)]:
        print(f"  {name}: {proj(lon, lat)}")


if __name__ == "__main__":
    main()
