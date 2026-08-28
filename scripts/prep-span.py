#!/usr/bin/env python3
"""같은 시·군의 이 끝에서 저 끝까지 — 지름을 잰다.

## 왜 지름인가

앞선 판(`docs/plan-exclave.md`)은 '자기 시·군과 안 붙어 있는 땅'을
셌다. 그런데 기준을 다섯 번 고쳐 쓰는 동안 목록이 11곳에서 2곳까지
줄었다. 섬이냐, 방조제냐, 매립지냐, 바다로 갈라진 거냐 —
**볼 때마다 예외가 나왔고 그때마다 규칙을 하나씩 더 붙여야 했다.**

지름은 예외가 없다. 그 시·군 땅에서 가장 먼 두 점 사이 거리다.
섬이든 방조제든 매립지든 다 넣는다. 규칙이 하나뿐이라 물음이
남지 않는다.

## 자가 자료 안에 있다

남한에서 제일 넓은 시·군은 강원 홍천군(1,808km²)이고 지름이
95.7km다. 한 덩어리다.

인천 옹진군은 넓이가 182.7km² — 홍천군의 1/10이다. 그런데 지름이
189.2km로 **홍천군의 2배**다. 76조각으로 흩어져 있어서다.

## 끝점이 어디인지

경계 자료에는 섬 이름이 없다. OSM에 끝점 둘레 2.5km를 물어
마을·섬 이름을 받아 확인했다(`data/osm-span-ends.json`).

```
인천 옹진군  백령도 서단 (124.610,37.970) ↔ 선재도 (선재리)
전남 신안군  가거도 (125.122,34.048)      ↔ 어의도 (어의리)
전남 여수시  거문도 (덕촌리)               ↔ 여수 북동 끝
경북 울릉군  독도 (독도리)                 ↔ 울릉도 서단
강원 홍천군  서쪽 끝 (위곡리)              ↔ 동쪽 끝 (내면 쪽)
```

## 지름 구하기

볼록 껍질을 구하고 그 위 점들만 짝지어 잰다. 44만 점을 다 짝지으면
안 끝난다. 껍질은 시·군마다 수십 점이라 금방이다.

사용:  python3 scripts/prep-span.py
출력:  src/data/span.json
"""
import json
import math
import os
import sys

sys.setrecursionlimit(200000)

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
OUT = os.path.join(HERE, "..", "src", "data", "span.json")

DEG_LAT_KM = 110.574
BOX = 1000.0
TOL = 0.00035
MIN_RING = 6e-6

SIDO = {
    "11": "서울", "21": "부산", "22": "대구", "23": "인천", "24": "광주",
    "25": "대전", "26": "울산", "29": "세종", "31": "경기", "32": "강원",
    "33": "충북", "34": "충남", "35": "전북", "36": "전남", "37": "경북",
    "38": "경남", "39": "제주",
}

# 화면에 세우는 차례. 지름이 짧은 것에서 긴 것으로.
# 홍천군이 첫 걸음인 이유는 그것이 자이기 때문이다 — 남한에서
# 제일 넓은 시·군.
ORDER = ["강원 홍천군", "경북 울릉군", "전남 여수시",
         "전남 신안군", "인천 옹진군"]

# 끝점 이름. 경계 자료에 없어서 OSM으로 확인한 것을 적어둔다.
ENDS = {
    "강원 홍천군": ("서쪽 끝", "동쪽 끝"),
    "경북 울릉군": ("독도", "울릉도"),
    "전남 여수시": ("거문도", "여수 본토"),
    "전남 신안군": ("가거도", "어의도"),
    "인천 옹진군": ("백령도", "선재도"),
}


def lon_km(lat):
    return 111.320 * math.cos(math.radians(lat))


def dist_km(a, b):
    la = (a[1] + b[1]) / 2
    return math.hypot((a[0] - b[0]) * lon_km(la),
                      (a[1] - b[1]) * DEG_LAT_KM)


def ring_area_km2(ring):
    lat0 = sum(p[1] for p in ring) / len(ring)
    k = lon_km(lat0)
    s = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i][0] * k, ring[i][1] * DEG_LAT_KM
        x2, y2 = ring[(i + 1) % n][0] * k, ring[(i + 1) % n][1] * DEG_LAT_KM
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def ring_area_deg(ring):
    s = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def dp(points, tol):
    if len(points) < 3:
        return points
    ax, ay = points[0]
    bx, by = points[-1]
    dx, dy = bx - ax, by - ay
    norm = math.hypot(dx, dy)
    idx, far = 0, -1.0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        d = (math.hypot(px - ax, py - ay) if norm == 0
             else abs(dy * px - dx * py + bx * ay - by * ax) / norm)
        if d > far:
            idx, far = i, d
    if far > tol:
        return dp(points[: idx + 1], tol)[:-1] + dp(points[idx:], tol)
    return [points[0], points[-1]]


def unit_name(name):
    """일반구를 시로 되돌린다. '안산시상록구' → '안산시'."""
    if name.endswith("구") and "시" in name[:-1]:
        return name[: name.index("시") + 1]
    return name


def load():
    gj = json.load(open(SRC, encoding="utf-8"))
    units = {}
    order = []
    for f in gj["features"]:
        p = f["properties"]
        g = f["geometry"]
        polys = (g["coordinates"] if g["type"] == "MultiPolygon"
                 else [g["coordinates"]])
        # 이름만으로 묶으면 안 된다. '동구'는 여섯 곳에 있다.
        key = (str(p["code"])[:2], unit_name(p["name"]))
        if key not in units:
            units[key] = {"name": key[1], "code": str(p["code"]), "polys": []}
            order.append(key)
        u = units[key]
        u["code"] = min(u["code"], str(p["code"]))
        u["polys"] += [[tuple(pt) for pt in poly[0]] for poly in polys]
    return [units[k] for k in order]


def hull(pts):
    """볼록 껍질. 44만 점을 다 짝지으면 안 끝난다."""
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lo = []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    up = []
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def span(u):
    pts = [p for poly in u["polys"] for p in poly]
    h = hull(pts)
    best = (0.0, None, None)
    for i in range(len(h)):
        for j in range(i + 1, len(h)):
            d = dist_km(h[i], h[j])
            if d > best[0]:
                best = (d, h[i], h[j])
    return best


def projector(units):
    lons, lats = [], []
    for u in units:
        for poly in u["polys"]:
            for x, y in poly:
                lons.append(x)
                lats.append(y)
    lon0, lon1 = min(lons), max(lons)
    lat0, lat1 = min(lats), max(lats)
    kx = math.cos(math.radians((lat0 + lat1) / 2))
    scale = BOX / max((lon1 - lon0) * kx, lat1 - lat0)
    offx = (BOX - (lon1 - lon0) * kx * scale) / 2
    offy = (BOX - (lat1 - lat0) * scale) / 2

    def project(x, y):
        return (round((x - lon0) * kx * scale + offx, 1),
                round(BOX - ((y - lat0) * scale + offy), 1))
    return project


def to_path(polys, project):
    parts = []
    for ring in polys:
        if ring_area_deg(ring) < MIN_RING:
            continue
        s = dp(ring, TOL)
        if len(s) < 4:
            continue
        pts = [project(x, y) for x, y in s]
        parts.append("M" + "L".join(f"{x} {y}" for x, y in pts) + "Z")
    if not parts and polys:
        big = max(polys, key=ring_area_deg)
        pts = [project(x, y) for x, y in dp(big, TOL / 4)]
        parts.append("M" + "L".join(f"{x} {y}" for x, y in pts) + "Z")
    return "".join(parts)


def main():
    units = load()
    sido_of = [SIDO.get(u["code"][:2], "") for u in units]

    rows = []
    for ui, u in enumerate(units):
        d, a, b = span(u)
        rows.append({
            "name": f"{sido_of[ui]} {u['name']}",
            "span": d,
            "area": sum(ring_area_km2(p) for p in u["polys"]),
            "parts": len(u["polys"]),
            "a": a, "b": b, "ui": ui,
        })
    rows.sort(key=lambda r: -r["span"])

    print(f'{"":12}{"지름":>8}{"넓이":>11}{"조각":>7}')
    for r in rows[:14]:
        print(f'{r["name"]:12s}{r["span"]:6.1f}km{r["area"]:9.1f}km²{r["parts"]:6d}')
    widest = max(rows, key=lambda r: r["area"])
    print(f'\n넓이 1위 — {widest["name"]} {widest["area"]:.1f}km², '
          f'지름 {widest["span"]:.1f}km, {widest["parts"]}조각')

    project = projector(units)
    by = {r["name"]: r for r in rows}
    cases = []
    for nm in ORDER:
        r = by[nm]
        ends = ENDS[nm]
        cases.append({
            "name": nm,
            "span": round(r["span"], 1),
            "area": round(r["area"], 1),
            "parts": r["parts"],
            "d": to_path(units[r["ui"]]["polys"], project),
            "line": [list(project(*r["a"])), list(project(*r["b"]))],
            "ends": list(ends),
        })

    json.dump({
        "viewBox": f"0 0 {int(BOX)} {int(BOX)}",
        "cases": cases,
        # 전국 순위 표 — 마무리에 쓴다
        "table": [{"name": r["name"], "span": round(r["span"], 1),
                   "area": round(r["area"], 1), "parts": r["parts"]}
                  for r in rows[:10]],
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("→", OUT)


if __name__ == "__main__":
    main()
