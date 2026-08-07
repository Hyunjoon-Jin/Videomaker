#!/usr/bin/env python3
"""
시군구 GeoJSON(18MB) → 렌더 가능한 SVG path 셋으로 가공.

원본: southkorea/southkorea-maps (kostat 2018, 250개 시군구)
출력: src/data/korea-paths.json  {viewBox, regions:[{code,name,sido,d,cx,cy,area}]}

- 경위도를 등거리원통도법으로 투영(위도 보정) 후 0..1000 박스에 정규화
- Douglas-Peucker로 단순화, 좌표는 소수점 1자리로 절단
- 면적이 극히 작은 섬 폴리곤은 제거(렌더 부하 대비 시각적 기여 없음)

사용:  python3 scripts/prep-map.py
"""
import json
import math
import os
import sys

# 해안선 링이 길어 DP 재귀가 깊어진다(기본 1000으로는 RecursionError).
sys.setrecursionlimit(200000)

SRC = "data/skorea-municipalities.json"
OUT = "src/data/korea-paths.json"

BOX = 1000.0          # 출력 viewBox 한 변
TOLERANCE = 0.00035   # DP 단순화 허용오차(경위도 단위, 약 30~40m)
MIN_RING_AREA = 6e-6  # 이보다 작은 폴리곤(섬)은 제거


def dp(points, tol):
    """Douglas-Peucker 폴리라인 단순화."""
    if len(points) < 3:
        return points
    ax, ay = points[0]
    bx, by = points[-1]
    dx, dy = bx - ax, by - ay
    norm = math.hypot(dx, dy)
    idx, far = 0, -1.0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        if norm == 0:
            d = math.hypot(px - ax, py - ay)
        else:
            d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
        if d > far:
            idx, far = i, d
    if far > tol:
        left = dp(points[: idx + 1], tol)
        right = dp(points[idx:], tol)
        return left[:-1] + right
    return [points[0], points[-1]]


def ring_area(ring):
    """신발끈 공식 절대 면적(경위도 단위)."""
    s = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def polygons_of(geom):
    """Polygon/MultiPolygon → 외곽 링 리스트(내부 구멍은 무시)."""
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return [c[0]]
    if t == "MultiPolygon":
        return [p[0] for p in c]
    return []


def main() -> None:
    geo = json.load(open(SRC, encoding="utf-8"))
    feats = geo["features"]

    # 1) 투영 기준: 전체 경위도 범위 + 중위도 보정
    lons, lats = [], []
    for f in feats:
        for ring in polygons_of(f["geometry"]):
            for x, y in ring:
                lons.append(x)
                lats.append(y)
    lon0, lon1 = min(lons), max(lons)
    lat0, lat1 = min(lats), max(lats)
    kx = math.cos(math.radians((lat0 + lat1) / 2))  # 경도 축 압축

    w = (lon1 - lon0) * kx
    h = lat1 - lat0
    scale = BOX / max(w, h)
    offx = (BOX - w * scale) / 2
    offy = (BOX - h * scale) / 2

    def project(x, y):
        px = (x - lon0) * kx * scale + offx
        py = BOX - ((y - lat0) * scale + offy)  # y축 뒤집기(화면 좌표)
        return round(px, 1), round(py, 1)

    regions = []
    for f in feats:
        p = f["properties"]
        code = str(p["code"])
        rings = [r for r in polygons_of(f["geometry"]) if ring_area(r) >= MIN_RING_AREA]
        if not rings:  # 전부 잘려나간 경우 최대 링 하나는 살림
            allr = polygons_of(f["geometry"])
            rings = [max(allr, key=ring_area)] if allr else []

        parts, total_area = [], 0.0
        sx = sy = 0.0
        npt = 0
        for ring in rings:
            simp = dp(ring, TOLERANCE)
            if len(simp) < 4:
                continue
            total_area += ring_area(ring)
            pts = [project(x, y) for x, y in simp]
            for qx, qy in pts:
                sx += qx
                sy += qy
                npt += 1
            d = "M" + "L".join(f"{qx} {qy}" for qx, qy in pts) + "Z"
            parts.append(d)
        if not parts:
            continue

        regions.append({
            "code": code,
            "name": p["name"],
            "sido": code[:2],            # 시도 코드 앞 2자리
            "d": "".join(parts),
            "cx": round(sx / npt, 1),    # 라벨용 근사 중심
            "cy": round(sy / npt, 1),
            "area": round(total_area * 1e6, 2),
        })

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"viewBox": f"0 0 {int(BOX)} {int(BOX)}", "regions": regions},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    src_kb = os.path.getsize(SRC) // 1024
    out_kb = os.path.getsize(OUT) // 1024
    print(f"지역 {len(regions)}개 · {src_kb}KB → {out_kb}KB "
          f"({100 - out_kb * 100 // src_kb}% 감소)")


if __name__ == "__main__":
    main()
