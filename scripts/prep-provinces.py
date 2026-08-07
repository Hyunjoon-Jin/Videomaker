#!/usr/bin/env python3
"""
조선 팔도(八道) 지도 생성.

전선을 위도 가로줄로 그리면 전라도가 1592년에 점령된 것으로 나온다.
사실은 정반대다 — 전라도는 1차 침공에서 끝까지 지켜낸 유일한 도이고,
그래서 이순신의 수군 기지와 곡창이 살아남았다. 도 단위로 그려야 맞다.

현재 행정구역(Natural Earth admin_1)을 조선 팔도로 묶는다.
투영 bbox는 prep-peninsula.py와 동일하게 잡아 해전 마커 좌표가 어긋나지 않게 한다.

도 색칠만으로는 해상도가 9개뿐이라 지도가 성기다. 같은 투영으로 남한
시군구 250개 경계도 함께 내보내 도 위에 얇게 얹는다(점령 판정은 도 단위,
경계선은 시군구 단위 — 없는 데이터를 주장하지 않으면서 밀도만 올린다).

출력: src/data/provinces.json
      {viewBox, provinces:[{id,name,d,cx,cy}], sgg:[d]}
사용:  python3 scripts/prep-provinces.py
"""
import json
import math
import os
import sys

sys.setrecursionlimit(200000)

NE_C = "data/ne-countries.geojson"
NE_P = "data/ne-provinces.geojson"
OUT = "src/data/provinces.json"

BOX = 1000.0
TOL = 0.004
MIN_AREA = 3e-4

# 조선 팔도 ← 현재 행정구역(Natural Earth 'name')
DO = [
    ("gyeonggi", "경기도", ["Seoul", "Incheon", "Gyeonggi"]),
    ("chungcheong", "충청도", ["North Chungcheong", "South Chungcheong", "Daejeon", "Sejong"]),
    ("gyeongsang", "경상도", ["North Gyeongsang", "South Gyeongsang", "Daegu", "Busan", "Ulsan"]),
    ("jeolla", "전라도", ["North Jeolla", "South Jeolla", "Gwangju"]),
    ("gangwon", "강원도", ["Gangwon", "Kangwŏn-do"]),
    ("hwanghae", "황해도", ["Hwanghae-bukto", "Hwanghae-namdo"]),
    ("pyeongan", "평안도", ["P'yŏngan-bukto", "P'yŏngan-namdo", "P'yŏngyang", "Chagang-do"]),
    ("hamgyeong", "함경도", ["Hamgyŏng-bukto", "Hamgyŏng-namdo", "Rasŏn", "Ryanggang"]),
    ("jeju", "제주", ["Jeju"]),
]


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
    # bbox는 국가 외곽선에서 — peninsula.json과 동일한 좌표계를 보장한다
    cc = json.load(open(NE_C, encoding="utf-8"))
    lons, lats = [], []
    for f in cc["features"]:
        if f["properties"].get("ADM0_A3") not in ("KOR", "PRK"):
            continue
        for r in rings(f["geometry"]):
            if area(r) < 4e-4:
                continue
            for x, y in r:
                lons.append(x)
                lats.append(y)
    lon0, lon1, lat0, lat1 = min(lons), max(lons), min(lats), max(lats)
    kx = math.cos(math.radians((lat0 + lat1) / 2))
    w, h = (lon1 - lon0) * kx, lat1 - lat0
    scale = BOX / max(w, h)
    offx, offy = (BOX - w * scale) / 2, (BOX - h * scale) / 2

    def proj(x, y):
        return (round((x - lon0) * kx * scale + offx, 1),
                round(BOX - ((y - lat0) * scale + offy), 1))

    pp = json.load(open(NE_P, encoding="utf-8"))
    by_name = {}
    for f in pp["features"]:
        p = f["properties"]
        if p.get("adm0_a3") in ("KOR", "PRK"):
            by_name.setdefault(p.get("name"), []).append(f)

    out, missing = [], []
    for pid, kname, members in DO:
        parts, sx, sy, n = [], 0.0, 0.0, 0
        for m in members:
            if m not in by_name:
                missing.append(m)
                continue
            for f in by_name[m]:
                for r in rings(f["geometry"]):
                    if area(r) < MIN_AREA:
                        continue
                    s = dp(r, TOL)
                    if len(s) < 4:
                        continue
                    pts = [proj(x, y) for x, y in s]
                    parts.append("M" + "L".join(f"{a} {b}" for a, b in pts) + "Z")
                    for a, b in pts:
                        sx += a
                        sy += b
                        n += 1
        if not parts:
            missing.append(kname)
            continue
        out.append({"id": pid, "name": kname, "d": "".join(parts),
                    "cx": round(sx / n, 1), "cy": round(sy / n, 1)})

    # 시군구 경계 — 같은 투영, 선만 쓰므로 path 문자열만 담는다
    sgg = []
    sg = json.load(open("data/skorea-municipalities.json", encoding="utf-8"))
    for f in sg["features"]:
        for r in rings(f["geometry"]):
            if area(r) < 8e-5:
                continue
            t = dp(r, 0.0022)
            if len(t) < 4:
                continue
            pts = [proj(x, y) for x, y in t]
            sgg.append("M" + "L".join(f"{a} {b}" for a, b in pts) + "Z")
    print(f"시군구 경계 {len(sgg)}개")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump({"viewBox": f"0 0 {int(BOX)} {int(BOX)}", "provinces": out, "sgg": sgg},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    print(f"팔도 {len(out)}개 · {os.path.getsize(OUT)//1024}KB")
    for p in out:
        print(f"  {p['name']:5} cx={p['cx']:6} cy={p['cy']:6}")
    if missing:
        print("⚠ 매칭 실패:", missing)


if __name__ == "__main__":
    main()
