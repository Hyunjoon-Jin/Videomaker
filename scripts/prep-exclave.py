#!/usr/bin/env python3
"""자기 시·군과 땅이 안 이어진 조각을 시군구 경계에서 찾는다.

자료는 `data/skorea-municipalities.json` 하나다. 통계청 2018년 기준
시군구 경계 250개. 받을 것이 없어 접힐 위험이 없는 편이다.

## 단위를 시·군·자치구로 되돌린다

원본은 250개다. 여기에는 일반구(안산시 상록구·단원구, 전주시 덕진구·
완산구 같은 것)가 따로 들어 있다. 일반구는 자치단체가 아니고 청사도
시청 하나로 모인다. '시청에 가려면'을 묻는 편이라 일반구는 시로
합친다. 이름이 '○○시△△구' 꼴이면 '○○시'로 묶는다.

합치면 답이 뒤집히는 자리가 있다. 안산시 단원구만 보면 본토 쪽이
따로 떨어진 조각으로 잡히지만, 상록구와 합치면 본토가 본체가 되고
대부도가 조각이 된다. 시청이 본토에 있으니 이쪽이 실제와 맞는다.

## 판정은 셋이다

  ① 본체    = 그 시·군 조각 중 면적이 가장 큰 것
  ② 조각    = 본체와 안 붙은 것
  ③ 섬 제외 = 다른 시·군과 150m 안으로 맞닿아야 남긴다

①에서 점 수로 본체를 고르면 틀린다. 해안선이 복잡한 조각은 면적이
작아도 점이 훨씬 많다. 부안군이 그렇게 479km² 조각을 뱉었다.

③이 필요한 이유는 이 자료에 섬이 전부 별개 폴리곤으로 들어 있어서다.
울릉도부터 무인도까지 다 걸린다. 다른 시·군과 맞닿는지를 보면
'경계로 이웃과 이어진 조각'만 남는다.

붙었다고 보는 거리는 150m 하나로 쓴다. 자기 조각끼리든 남의 시·군
이든 같은 자다. 자를 둘로 나누면 '내 땅과는 110m라 떨어진 것, 남의
땅과는 150m라 붙은 것' 같은 말이 나온다. 부산 강서구(가덕도)가 그
자리에 있었고, 자를 하나로 맞추니 사라졌다.

## 두 거리를 같이 잰다

**직선** — 떨어진 땅의 어느 점과 나머지 땅의 어느 점이 가장 가까운지.

**도로** — 그 두 점 사이를 차로 실제 몇 km 가는지. OSRM 공개 서버
(router.project-osrm.org)에 물어 받는다. 이게 편의 큰 숫자다.
직선만 재면 대부분 1km 아래라 시시해 보이는데, 도로로는 당진시
조각이 25.9km다. 직선 2.7km 자리를 9.6배 돌아간다.

받은 길의 좌표를 시군구 경계에 대고 훑어 **남의 동네를 지나는 거리**도
잰다. 이게 '다른 데를 거쳐야만 갈 수 있다'는 말의 실제 크기다.

받아온 것은 `data/osrm-exclave.json`에 남긴다. 다시 돌릴 때마다
공개 서버를 두들기지 않는다.

면적은 계산값이다. 경계 폴리곤을 위도 보정해 잰 값이라 공식 통계와
소수점이 다를 수 있다.

사용:  python3 scripts/prep-exclave.py
출력:  src/data/exclave.json
"""
import json
import math
import os
import sys
import time
import urllib.request

sys.setrecursionlimit(200000)

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
OUT = os.path.join(HERE, "..", "src", "data", "exclave.json")
ROADS = os.path.join(HERE, "..", "data", "osrm-exclave.json")

OSRM = "https://router.project-osrm.org/route/v1/driving"

# 붙었다고 볼 거리
NEAR_M = 150.0
DEG_LAT_KM = 110.574

# 화면 좌표계. korea-paths.json과 같은 투영을 쓴다.
BOX = 1000.0
TOL = 0.00035        # Douglas-Peucker 허용오차(약 30~40m)
MIN_RING = 6e-6      # 이보다 작은 링은 렌더에서 뺀다

SIDO = {
    "11": "서울", "21": "부산", "22": "대구", "23": "인천", "24": "광주",
    "25": "대전", "26": "울산", "29": "세종", "31": "경기", "32": "강원",
    "33": "충북", "34": "충남", "35": "전북", "36": "전남", "37": "경북",
    "38": "경남", "39": "제주",
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


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


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


class Grid:
    """점을 격자에 담아 가까운 것만 꺼내 본다.

    250개 시군구에 점이 44만 개다. 짝을 다 재면 안 끝난다.
    """

    def __init__(self, cell_deg):
        self.c = cell_deg
        self.d = {}

    def add(self, lon, lat, val):
        self.d.setdefault((int(lon / self.c), int(lat / self.c)),
                          []).append((lon, lat, val))

    def near(self, lon, lat, r_deg):
        n = int(r_deg / self.c) + 1
        i0, j0 = int(lon / self.c), int(lat / self.c)
        for i in range(i0 - n, i0 + n + 1):
            for j in range(j0 - n, j0 + n + 1):
                for it in self.d.get((i, j), ()):
                    yield it


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
        # 이름만으로 묶으면 안 된다. '동구'는 부산·대구·인천·광주·
        # 대전·울산에 다 있고 고성군은 강원과 경남에 있다.
        key = (str(p["code"])[:2], unit_name(p["name"]))
        if key not in units:
            units[key] = {"name": key[1], "code": str(p["code"]), "polys": []}
            order.append(key)
        u = units[key]
        u["code"] = min(u["code"], str(p["code"]))
        # 겉 링만 쓴다. 구멍은 이 편에서 다루지 않는다.
        u["polys"] += [[tuple(pt) for pt in poly[0]] for poly in polys]
    return [units[k] for k in order]


def components(polys):
    """한 시·군 안에서 서로 붙은 폴리곤을 묶는다."""
    n = len(polys)
    par = list(range(n))

    def find(x):
        while par[x] != x:
            par[x] = par[par[x]]
            x = par[x]
        return x

    g = Grid(0.01)
    for i, poly in enumerate(polys):
        for lon, lat in poly:
            g.add(lon, lat, i)
    r = NEAR_M / 1000 / DEG_LAT_KM
    for i, poly in enumerate(polys):
        for lon, lat in poly:
            for olon, olat, j in g.near(lon, lat, r):
                a, b = find(i), find(j)
                if a != b and dist_km((lon, lat), (olon, olat)) * 1000 <= NEAR_M:
                    par[a] = b
    out = {}
    for i in range(n):
        out.setdefault(find(i), []).append(i)
    return list(out.values())


def point_in(ring, x, y):
    c = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def find_exclaves(units):
    world = Grid(0.01)
    for ui, u in enumerate(units):
        for poly in u["polys"]:
            for lon, lat in poly:
                world.add(lon, lat, ui)
    r_near = NEAR_M / 1000 / DEG_LAT_KM

    found = []
    for ui, u in enumerate(units):
        comps = components(u["polys"])
        if len(comps) == 1:
            continue
        sized = sorted(((sum(ring_area_km2(u["polys"][i]) for i in c), c)
                        for c in comps), key=lambda t: -t[0])
        main_c = sized[0][1]
        main_pts = [p for i in main_c for p in u["polys"][i]]
        total = sum(a for a, _ in sized)

        mg = Grid(0.02)
        for lon, lat in main_pts:
            mg.add(lon, lat, 0)

        for area, c in sized[1:]:
            pts = [p for i in c for p in u["polys"][i]]
            nb = set()
            for lon, lat in pts:
                for olon, olat, oui in world.near(lon, lat, r_near):
                    if oui != ui and \
                            dist_km((lon, lat), (olon, olat)) * 1000 <= NEAR_M:
                        nb.add(oui)
            if not nb:
                continue  # ③ 섬
            best = (1e9, None, None)
            for lon, lat in pts:
                r = 0.05
                cand = []
                while r <= 4:
                    cand = list(mg.near(lon, lat, r))
                    if cand:
                        break
                    r *= 2
                if not cand:
                    cand = [(x, y, 0) for x, y in main_pts]
                for olon, olat, _ in cand:
                    d = dist_km((lon, lat), (olon, olat))
                    if d < best[0]:
                        best = (d, (lon, lat), (olon, olat))
            found.append({
                "ui": ui, "name": u["name"], "code": u["code"],
                "area": area, "total": total, "pct": area / total * 100,
                "dist": best[0], "from": best[1], "to": best[2],
                "nb": sorted(nb), "piece": [u["polys"][i] for i in c],
                "main": [u["polys"][i] for i in main_c],
            })
    found.sort(key=lambda r: -r["area"])
    return found


def road(a, b, cache):
    """두 점 사이 실제 도로. OSRM 공개 서버.

    받은 것은 파일에 남긴다. 판정을 고칠 때마다 남의 서버를
    두들길 이유가 없다.
    """
    key = f"{a[0]:.5f},{a[1]:.5f};{b[0]:.5f},{b[1]:.5f}"
    if key in cache:
        return cache[key]
    url = (f"{OSRM}/{a[0]},{a[1]};{b[0]},{b[1]}"
           "?overview=full&geometries=geojson")
    for i in range(4):
        try:
            j = json.loads(urllib.request.urlopen(url, timeout=60).read())
            if j.get("code") == "Ok":
                rt = j["routes"][0]
                cache[key] = {"km": rt["distance"] / 1000,
                              "min": rt["duration"] / 60,
                              "path": rt["geometry"]["coordinates"]}
                return cache[key]
        except Exception:
            pass
        time.sleep(2 * 2 ** i)
    raise SystemExit(f"OSRM 응답을 못 받았다: {key}")


def through(rt, ui, boxes, label):
    """받은 길이 누구 땅 위를 지나는지 잰다."""
    g = rt["path"]
    own = other = sea = 0.0
    names = {}
    for i in range(len(g) - 1):
        a, b = tuple(g[i]), tuple(g[i + 1])
        L = dist_km(a, b)
        x, y = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        who = None
        for k, ps in enumerate(boxes):
            for (x0, y0, x1, y1), poly in ps:
                if x0 <= x <= x1 and y0 <= y <= y1 and point_in(poly, x, y):
                    who = k
                    break
            if who is not None:
                break
        if who is None:
            sea += L
        elif who == ui:
            own += L
        else:
            other += L
            names[who] = names.get(who, 0) + L
    return {
        "other": round(other, 2),
        "sea": round(sea, 2),
        "names": [{"name": label(k), "km": round(v, 2)}
                  for k, v in sorted(names.items(), key=lambda kv: -kv[1])
                  if v >= 0.15],
    }


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


def to_path(polys, project, keep_all=False):
    parts = []
    for ring in polys:
        if not keep_all and ring_area_deg(ring) < MIN_RING:
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


# 화면에 세우는 차례. 작은 것에서 큰 것으로.
# 평택과 당진은 서로 맞닿은 매립지라 한 화면에 묶는다.
# 화면에 세우는 차례는 도로 거리 순이다. 코드에 적어두지 않고
# 받은 값으로 정렬한다 — 자료가 바뀌면 차례도 따라 바뀌어야 한다.


def main():
    units = load()
    found = find_exclaves(units)

    project = projector(units)
    sido_of = [SIDO.get(u["code"][:2], "") for u in units]

    # 이름이 겹치는 것만 시도를 붙인다. '동구'는 여섯 곳에 있다.
    dup = {}
    for u in units:
        dup[u["name"]] = dup.get(u["name"], 0) + 1

    def label(ui):
        n = units[ui]["name"]
        return f"{sido_of[ui]} {n}" if dup[n] > 1 else n

    boxes = [[(bbox(p), p) for p in u["polys"]] for u in units]
    print(len(found), "곳")

    # ── 도로 ─────────────────────────────────────────
    cache = {}
    if os.path.exists(ROADS):
        cache = json.load(open(ROADS, encoding="utf-8"))
    for r in found:
        rt = road(r["from"], r["to"], cache)
        r["road"] = rt["km"]
        r["min"] = rt["min"]
        r["ratio"] = rt["km"] / r["dist"]
        r["path"] = rt["path"]
        r["through"] = through(rt, r["ui"], boxes, label)
    json.dump(cache, open(ROADS, "w", encoding="utf-8"), ensure_ascii=False)

    # 차례는 도로 거리가 짧은 것에서 긴 것으로
    found.sort(key=lambda r: r["road"])
    print(f'\n{"":10}{"직선":>7}{"도로":>8}{"시간":>6}{"남의 동네":>10}{"배수":>7}'
          f'{"면적":>10}')
    for r in found:
        print(f'{label(r["ui"]):10s}{r["dist"]:6.2f}km{r["road"]:7.2f}km'
              f'{round(r["min"]):5d}분{r["through"]["other"]:9.2f}km'
              f'{r["ratio"]:6.1f}배{r["area"]:9.2f}km²  '
              f'{" ".join(x["name"] + " " + str(x["km"]) for x in r["through"]["names"])}')

    cases = []
    for r in found:
        piece = {
            "name": label(r["ui"]),
            "sido": sido_of[r["ui"]],
            "area": round(r["area"], 2),
            "total": round(r["total"], 1),
            "pct": round(r["pct"], 1),
            "dist": round(r["dist"], 2),
            "road": round(r["road"], 2),
            "min": round(r["min"]),
            "ratio": round(r["ratio"], 1),
            "other": r["through"]["other"],
            "sea": r["through"]["sea"],
            "names": r["through"]["names"],
            "piece": to_path(r["piece"], project, keep_all=True),
            "main": to_path(r["main"], project),
            "line": [list(project(*r["from"])), list(project(*r["to"]))],
            # 실제로 달리는 길. 화면에서 이게 굵은 실선이다.
            "path": [list(project(x, y)) for x, y in dp(
                [tuple(p) for p in r["path"]], TOL / 3)],
            "nb": [label(i) for i in r["nb"]],
        }
        # 화면에는 조각·나머지 땅·길이 다 들어와야 한다. 길이 제일
        # 넓게 퍼지므로 길의 상자를 바탕으로 잡는다.
        allpts = ([p for poly in r["piece"] for p in poly]
                  + [tuple(p) for p in r["path"]] + [r["from"], r["to"]])
        x0, y0, x1, y1 = bbox(allpts)
        px0, py1 = project(x0, y0)
        px1, py0 = project(x1, y1)
        w, h = max(px1 - px0, 1.0), max(py1 - py0, 1.0)
        pad = 1.35
        cases.append({
            "pieces": [piece],
            "cam": {
                "cx": round((px0 + px1) / 2, 1),
                "cy": round((py0 + py1) / 2, 1),
                "z": round(min(48.0, BOX / (max(w, h) * pad)), 2),
            },
            # 길이 실제로 지나는 남의 동네만 칠한다
            "nbNames": [x["name"] for x in r["through"]["names"]],
        })

    table = [{
        "name": label(r["ui"]),
        "sido": sido_of[r["ui"]],
        "area": round(r["area"], 2),
        "pct": round(r["pct"], 1),
        "dist": round(r["dist"], 2),
        "road": round(r["road"], 2),
        "min": round(r["min"]),
        "ratio": round(r["ratio"], 1),
        "other": r["through"]["other"],
    } for r in found]

    # 길이 지나는 남의 동네 겉모양. 이름이 겹치는 '서구·동구'가
    # 있어 라벨로 건다.
    need = sorted({n for c in cases for n in c["nbNames"]})
    shapes = {}
    for ui, u in enumerate(units):
        if label(ui) in need or u["name"] in need:
            shapes[label(ui)] = to_path(u["polys"], project)

    json.dump({
        "viewBox": f"0 0 {int(BOX)} {int(BOX)}",
        "cases": cases,
        "table": table,
        "shapes": shapes,
        "count": len(found),
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("→", OUT)
    return found


if __name__ == "__main__":
    main()
