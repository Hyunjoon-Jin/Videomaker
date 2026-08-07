#!/usr/bin/env python3
"""
한반도 전체 지도 생성 — 임진왜란 7년 전편용.

20일 파일럿의 지도는 남한 250개 시군구뿐이라, 평양·함경도까지 올라간
전쟁의 절반을 그릴 수 없다. 여기서는 남북한을 하나의 투영에 올린다.

입력:
  data/ne-countries.geojson          Natural Earth 10m (KOR + PRK 추출)
  data/skorea-municipalities.json    통계청 2018 시군구 (남한 상세)
출력:
  src/data/peninsula.json  {viewBox, north:[path], south:[{code,name,d,cx,cy}]}

남북을 같은 bbox로 투영하므로 두 레이어가 정확히 겹친다.
prep-map.py의 산출물과는 좌표계가 다르다 — 섞어 쓰면 안 된다.

사용:  python3 scripts/prep-peninsula.py
"""
import json
import math
import os
import sys

sys.setrecursionlimit(200000)

NE = "data/ne-countries.geojson"
SGG = "data/skorea-municipalities.json"
OUT = "src/data/peninsula.json"

BOX = 1000.0
TOL_N = 0.006    # 북한/외곽선은 거칠게
TOL_S = 0.0016   # 남한 시군구는 조금 더 곱게
MIN_AREA = 4e-4  # 이보다 작은 섬은 버림(전쟁 서사에 기여 없음)


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
    ne = json.load(open(NE, encoding="utf-8"))
    korea = [f for f in ne["features"] if f["properties"].get("ADM0_A3") in ("KOR", "PRK")]
    if len(korea) != 2:
        sys.exit(f"KOR/PRK를 찾지 못했습니다 (found {len(korea)})")

    sgg = json.load(open(SGG, encoding="utf-8"))

    # ── 1) 남북 전체를 감싸는 bbox ──
    lons, lats = [], []
    for f in korea:
        for r in rings(f["geometry"]):
            if area(r) < MIN_AREA:
                continue
            for x, y in r:
                lons.append(x)
                lats.append(y)
    lon0, lon1 = min(lons), max(lons)
    lat0, lat1 = min(lats), max(lats)
    kx = math.cos(math.radians((lat0 + lat1) / 2))

    w = (lon1 - lon0) * kx
    h = lat1 - lat0
    scale = BOX / max(w, h)
    offx = (BOX - w * scale) / 2
    offy = (BOX - h * scale) / 2

    def proj(x, y):
        return (round((x - lon0) * kx * scale + offx, 1),
                round(BOX - ((y - lat0) * scale + offy), 1))

    def to_path(ring, tol):
        s = dp(ring, tol)
        if len(s) < 4:
            return None
        pts = [proj(x, y) for x, y in s]
        return "M" + "L".join(f"{a} {b}" for a, b in pts) + "Z"

    # ── 2) 북한 외곽선 ──
    north = []
    for f in korea:
        if f["properties"]["ADM0_A3"] != "PRK":
            continue
        for r in rings(f["geometry"]):
            if area(r) < MIN_AREA:
                continue
            d = to_path(r, TOL_N)
            if d:
                north.append(d)

    # ── 3) 남한 시군구 (같은 투영) ──
    south = []
    for f in sgg["features"]:
        p = f["properties"]
        rs = [r for r in rings(f["geometry"]) if area(r) >= 6e-6]
        if not rs:
            allr = rings(f["geometry"])
            rs = [max(allr, key=area)] if allr else []
        parts, sx, sy, n = [], 0.0, 0.0, 0
        for r in rs:
            d = to_path(r, TOL_S)
            if not d:
                continue
            parts.append(d)
            for x, y in dp(r, TOL_S):
                a, b = proj(x, y)
                sx += a
                sy += b
                n += 1
        if not parts:
            continue
        south.append({
            "code": str(p["code"]), "name": p["name"], "sido": str(p["code"])[:2],
            "d": "".join(parts), "cx": round(sx / n, 1), "cy": round(sy / n, 1),
        })

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"viewBox": f"0 0 {int(BOX)} {int(BOX)}", "north": north, "south": south},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    print(f"북한 폴리곤 {len(north)}개 · 남한 시군구 {len(south)}개")
    print(f"경위도 범위 {lon0:.2f}~{lon1:.2f}E / {lat0:.2f}~{lat1:.2f}N")
    print(f"출력 {os.path.getsize(OUT)//1024}KB → {OUT}")


if __name__ == "__main__":
    main()
