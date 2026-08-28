#!/usr/bin/env python3
"""같은 시·군 땅인데 그 시·군과 안 붙어 있는 땅을 찾는다.

자료는 `data/skorea-municipalities.json` 하나다. 통계청 2018년 기준
시군구 경계 250개. 받을 것이 없어 접힐 위험이 없는 편이다.

## 단위를 시·군·자치구로 되돌린다

원본은 250개다. 여기에는 일반구(안산시 상록구·단원구, 전주시 덕진구·
완산구 같은 것)가 따로 들어 있다. 일반구는 자치단체가 아니고 청사도
시청 하나로 모인다. '시청에 가려면'을 묻는 편이라 일반구는 시로
합친다. 이름이 '○○시△△구' 꼴이면 '○○시'로 묶는다.

합치면 답이 뒤집히는 자리가 있다. 안산시 단원구만 보면 본토 쪽이
떨어진 땅으로 잡히지만, 상록구와 합치면 본토가 나머지 땅이 되고
대부도가 떨어진 땅이 된다. 시청이 본토에 있으니 이쪽이 실제와 맞는다.

## 판정은 다섯이다

  ① 나머지 땅 = 그 시·군 덩어리 중 넓이가 가장 큰 것
  ② 떨어진 땅 = 그것과 안 붙은 것
  ③ 이웃과 맞닿을 것 = 다른 시·군과 150m 안으로 맞닿아야 남긴다
  ④ 사람이 살 것     = 그 안에 마을·주거지·아파트가 있어야 남긴다
  ⑤ 사이에 바다가 없을 것 = 최단선이 전부 남의 시·군 땅 위를 지날 것

①에서 점 수로 고르면 틀린다. 해안선이 복잡한 덩어리는 넓이가
작아도 점이 훨씬 많다. 부안군이 그렇게 479km² 덩어리를 뱉었다.

## ③ 이웃과 맞닿은 것만 남긴다

이 자료에 섬이 전부 별개 폴리곤으로 들어 있어서, ③이 없으면
**1,049곳**이 나온다. 흑산도·돌산도·교동도·연평도가 다 여기 든다.

**'섬을 뺐다'고는 못 쓴다.** 대부도는 섬인데 시화방조제로 시흥시와
경계가 닿아 이 편에 들어온다. 가른 것은 섬이냐 아니냐가 아니라
**이웃 시·군과 경계가 맞닿았느냐**다.

(백령도와 울릉도는 아예 안 걸린다. 옹진군·울릉군에서 제일 넓은
덩어리, 곧 그 군의 나머지 땅 자체다.)

## ④ 사람이 사는 땅만 남긴다

③만으로는 방조제와 항만 매립지가 잔뜩 걸린다. 새만금 방조제
(군산 2.11km²), 평택·당진항 매립지(0.59·0.97km²), 광양만 매립지
(2.59km²), 해남 쪽 완도군 매립지(1.19km²)가 그렇다. 넓이는 방조제
폭이 넓어서 나온 값이고, 지도에서는 바다 위 띠로 보인다.

**저건 땅이 아니라 구조물이다.** 행정구역이 갈라져서 주민이 겪는
일을 말하는 편에 방조제 조각이 끼면 기준이 무너진다.

OSM에 물어 조각 안에 사람이 사는 흔적이 있는지 본다.

```
                넓이   마을  주거지  아파트
달성군       74.74km²    22     40    304
안산시       57.78km²    13     20     21
완주군       33.61km²    19    214     58
인천 중구    14.77km²    44     16    135
─────────────────────────────────────────
광양시        2.59km²     0      0      0
군산시        2.11km²     0      0      0
완도군        1.19km²     0      0      0
당진시        0.97km²     0      0      0
평택시        0.59km²     0      0      0
```

깨끗하게 갈린다. 넓이 컷오프 같은 임의의 선을 안 그어도 된다.
받아온 것은 `data/osm-exclave-place.json`에 남긴다.

## ⑤ 사이에 바다가 없어야 한다

④까지 걸러도 대부도(안산시)와 내륙 중구(인천)가 남는다. 그런데
**대부도는 섬이다.** 시화방조제로 시흥시와 이어져 있을 뿐이고,
안산 본토와 안 붙은 이유는 행정이 아니라 시화호다. 인천 중구도
같다 — 나머지 땅이 영종도라서 갈라진 것이다.

그 둘을 넣어두면 '섬은 어떻게 셀 거냐'는 물음이 끝나지 않는다.
**바다 때문에 갈라진 것은 이 편의 이야기가 아니다.**

그래서 최단선이 지나는 것을 본다. 바다가 한 뼘이라도 끼면 뺀다.

```
                 사이
대구 달성군   고령군 2.35km · 달서구 0.5km        ← 전부 땅
전북 완주군   전주시 3.38km                       ← 전부 땅
─────────────────────────────────────────────
경기 안산시   바다 6.43km · 화성시 1.32km         ← 바다
인천 중구     바다 1.81km                         ← 바다
```

**2곳이 남는다.** 그리고 이 기준은 야마 그 자체다 — 걸어서 갈 수
있는데 가는 길이 전부 남의 동네인 땅. 섬 이야기를 아예 안 해도
된다.

붙었다고 보는 거리는 150m 하나로 쓴다. 자기 조각끼리든 남의 시·군
이든 같은 자다. 자를 둘로 나누면 '내 땅과는 110m라 떨어진 것, 남의
땅과는 150m라 붙은 것' 같은 말이 나온다. 부산 강서구(가덕도)가 그
자리에 있었고, 자를 하나로 맞추니 사라졌다.

## 거리는 직선이다

떨어진 땅의 어느 점과 나머지 땅의 어느 점이 가장 가까운지를 잰다.
이게 편의 큰 숫자고, 차례도 이 값이 정한다.

한 번 OSRM으로 실제 도로를 재서 그걸 큰 숫자로 세워봤다. 당진시
조각이 25.9km로 나와 세기는 셌는데 접었다. 매립지 도로망에 경로가
붙으면서 길이 크게 우회해 그려졌고, 화면에 점선과 실선이 같이
있으니 무엇을 보는 그림인지가 흐려졌다. 하나만 잰다.

그 직선이 무엇 위를 지나는지는 같이 잰다. 200등분해서 각 점이 어느
시·군 안에 드는지 본다. 어디에도 안 들면 바다나 호수다. 달성군은
2.9km 중 2.4km가 고령군, 0.5km가 달서구 땅 위를 지난다.

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
import urllib.parse
import urllib.request

sys.setrecursionlimit(200000)

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
OUT = os.path.join(HERE, "..", "src", "data", "exclave.json")
PLACES = os.path.join(HERE, "..", "data", "osm-exclave-place.json")

# overpass-api.de와 kumi.systems는 이 환경에서 막혀 있다.
OVERPASS = "https://maps.mail.ru/osm/tools/overpass/api/interpreter"

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


def people(r, cache):
    """조각 안에 사람이 사는 흔적이 있는지 OSM에 묻는다.

    마을(place), 주거지(landuse=residential), 아파트(building) 셋을
    센다. 하나라도 있으면 사람이 사는 땅으로 본다. 방조제와 항만
    매립지는 셋 다 0이 나온다.
    """
    key = r["name"] + f'{r["area"]:.2f}'
    if key in cache:
        return cache[key]
    pts = [p for poly in r["piece"] for p in poly]
    x0, y0, x1, y1 = bbox(pts)
    q = (f"[out:json][timeout:120];("
         f'node({y0},{x0},{y1},{x1})["place"~"^(city|town|village|hamlet|'
         f'suburb|neighbourhood|quarter)$"];'
         f'way({y0},{x0},{y1},{x1})["landuse"="residential"];'
         f'way({y0},{x0},{y1},{x1})["building"="apartments"];);out center tags;')
    data = urllib.parse.urlencode({"data": q}).encode()
    js = None
    for i in range(4):
        try:
            req = urllib.request.Request(OVERPASS, data,
                                         {"User-Agent": "Mozilla/5.0"})
            js = json.loads(urllib.request.urlopen(req, timeout=180).read())
            break
        except Exception:
            time.sleep(3 * 2 ** i)
    if js is None:
        raise SystemExit(f"OSM 응답을 못 받았다: {key}")
    out = {"place": 0, "residential": 0, "apartments": 0, "names": []}
    for e in js["elements"]:
        lon = e.get("lon") or e.get("center", {}).get("lon")
        lat = e.get("lat") or e.get("center", {}).get("lat")
        if lon is None:
            continue
        hit = False
        for poly in r["piece"]:
            a, b, c, d = bbox(poly)
            if a <= lon <= c and b <= lat <= d and point_in(poly, lon, lat):
                hit = True
                break
        if not hit:
            continue
        t = e["tags"]
        if t.get("place"):
            out["place"] += 1
            if t.get("name"):
                out["names"].append(t["name"])
        elif t.get("landuse") == "residential":
            out["residential"] += 1
        elif t.get("building") == "apartments":
            out["apartments"] += 1
    cache[key] = out
    time.sleep(2)
    return out


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
    islands = []
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
                # ③ 섬. 세지는 않지만 몇 곳인지는 화면에 낸다.
                pts_ = [p for i in c for p in u["polys"][i]]
                xs = sum(q[0] for q in pts_) / len(pts_)
                ys = sum(q[1] for q in pts_) / len(pts_)
                islands.append((xs, ys, area))
                continue
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
    return found, islands


def between(r, boxes, label):
    """최단선이 누구 땅 위를 지나는지 200등분해 잰다."""
    a, b = r["from"], r["to"]
    n = 200
    cnt = {}
    for k in range(1, n):
        t = k / n
        x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        who = None
        for ui, ps in enumerate(boxes):
            for (x0, y0, x1, y1), poly in ps:
                if x0 <= x <= x1 and y0 <= y <= y1 and point_in(poly, x, y):
                    who = ui
                    break
            if who is not None:
                break
        cnt[who] = cnt.get(who, 0) + 1
    out = []
    for k, v in sorted(cnt.items(), key=lambda kv: -kv[1]):
        km = v / (n - 1) * r["dist"]
        if km < 0.15:
            continue
        out.append({"name": label(k) if k is not None else "바다",
                    "km": round(km, 2)})
    return out


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

    def unproject(px, py):
        return ((px - offx) / (kx * scale) + lon0,
                (BOX - py - offy) / scale + lat0)
    return project, unproject


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


# 화면에 세우는 차례는 떨어진 거리 순이다. 코드에 적어두지 않고
# 받은 값으로 정렬한다 — 자료가 바뀌면 차례도 따라 바뀌어야 한다.

# 이름표를 앉힐 자리를 고를 때 쓰는 격자 크기
LBL_N = 90
# 화면에서 글자가 안 가려지는 세로 구간(0..1 비율).
# 위는 계기판과 눈금, 아래는 자막이 덮는다.
LBL_BAND = (0.44, 0.73)


def label_spots(targets, cam, unproject):
    """카메라 안에서 각 땅의 이름표 자리를 고른다.

    폴리곤의 무게중심을 쓰면 화면 밖으로 나가거나 바다 위에 앉는다.
    보이는 상자를 격자로 훑어 그 땅 안에 드는 점만 모으고, 그 점들의
    가운데에 가장 가까운 점을 고른다. 글자가 반드시 그 땅 위에 앉는다.

    계기판과 자막이 덮는 위아래는 피한다. 피할 자리가 없으면 그냥
    가운데를 쓴다 — 없는 것보다 낫다.
    """
    w = BOX / cam["z"]
    h = w * 1920 / 1080
    x0, x1 = cam["cx"] - w / 2, cam["cx"] + w / 2
    y0, y1 = cam["cy"] - h / 2, cam["cy"] + h / 2
    pts = []
    for i in range(LBL_N):
        for j in range(LBL_N):
            px = x0 + (i + 0.5) / LBL_N * w
            py = y0 + (j + 0.5) / LBL_N * h
            pts.append((px, py, (j + 0.5) / LBL_N, unproject(px, py)))

    out = []
    for name, polys, kind in targets:
        boxes = [(bbox(r), r) for r in polys]
        inside = []
        for px, py, fy, (lon, lat) in pts:
            for (a, b, c, d), ring in boxes:
                if a <= lon <= c and b <= lat <= d and point_in(ring, lon, lat):
                    inside.append((px, py, fy))
                    break
        if not inside:
            continue
        band = [q for q in inside if LBL_BAND[0] <= q[2] <= LBL_BAND[1]]
        pick = band or inside
        mx = sum(q[0] for q in pick) / len(pick)
        my = sum(q[1] for q in pick) / len(pick)
        best = min(pick, key=lambda q: (q[0] - mx) ** 2 + (q[1] - my) ** 2)
        out.append({"text": name, "kind": kind,
                    "x": round(best[0], 1), "y": round(best[1], 1)})
    return out



def main():
    units = load()
    found, islands = find_exclaves(units)

    project, unproject = projector(units)
    sido_of = [SIDO.get(u["code"][:2], "") for u in units]

    # 이름이 겹치는 것만 시도를 붙인다. '동구'는 여섯 곳에 있다.
    dup = {}
    for u in units:
        dup[u["name"]] = dup.get(u["name"], 0) + 1

    def label(ui):
        n = units[ui]["name"]
        return f"{sido_of[ui]} {n}" if dup[n] > 1 else n

    # ④ 사람이 사는 땅만 남긴다
    cache = {}
    if os.path.exists(PLACES):
        cache = json.load(open(PLACES, encoding="utf-8"))
    empty = []
    keep = []
    for r in found:
        r["people"] = people(r, cache)
        (keep if sum(r["people"][k] for k in
                     ("place", "residential", "apartments")) > 0
         else empty).append(r)
    json.dump(cache, open(PLACES, "w", encoding="utf-8"), ensure_ascii=False)
    found = keep
    print(f'이웃과 맞닿은 {len(keep) + len(empty)}곳 중 사람이 사는 곳 {len(keep)}곳')
    for r in empty:
        print(f'   뺌 — {label(r["ui"]):10s}{r["area"]:7.2f}km²  '
              f'마을·주거지·아파트 0 (방조제·항만 매립지)')

    boxes = [[(bbox(p), p) for p in u["polys"]] for u in units]

    for r in found:
        r["between"] = between(r, boxes, label)

    # ⑤ 사이에 바다가 없어야 한다
    sea = [r for r in found
           if any(b["name"] == "바다" for b in r["between"])]
    found = [r for r in found
             if all(b["name"] != "바다" for b in r["between"])]
    print(f'그중 사이에 바다가 없는 곳 {len(found)}곳')
    for r in sea:
        print(f'   뺌 — {label(r["ui"]):10s}{r["area"]:7.2f}km²  '
              f'사이 {" · ".join(b["name"] + " " + str(b["km"]) + "km" for b in r["between"])}')

    # 차례는 떨어진 거리가 짧은 것에서 긴 것으로
    found.sort(key=lambda r: r["dist"])
    print(f'섬(아무 시·군과도 땅이 안 닿는 덩어리) {len(islands)}곳')
    print(f'\n{"":10}{"떨어진 거리":>11}{"넓이":>11}{"그 시·군 땅의":>13}  사이')
    for r in found:
        print(f'{label(r["ui"]):10s}{r["dist"]:9.2f}km{r["area"]:9.2f}km²'
              f'{r["pct"]:11.1f}%  '
              f'{" · ".join(x["name"] + " " + str(x["km"]) + "km" for x in r["between"])}')

    cases = []
    for r in found:
        piece = {
            "name": label(r["ui"]),
            "sido": sido_of[r["ui"]],
            "area": round(r["area"], 2),
            "total": round(r["total"], 1),
            "pct": round(r["pct"], 1),
            "dist": round(r["dist"], 2),
            "piece": to_path(r["piece"], project, keep_all=True),
            "main": to_path(r["main"], project),
            "line": [list(project(*r["from"])), list(project(*r["to"]))],
            "between": r["between"],
            "nb": [label(i) for i in r["nb"]],
        }
        # 떨어진 땅만 담으면 나머지 땅이 화면 밖에 남아 그 색이 안
        # 보인다. 최단선 끝점 둘레로 떨어진 땅 크기의 0.6배를 더 담는다.
        allpts = ([p for poly in r["piece"] for p in poly]
                  + [r["from"], r["to"]])
        x0, y0, x1, y1 = bbox(allpts)
        m = max(x1 - x0, y1 - y0) * 0.6
        far = [(r["to"][0] + dx, r["to"][1] + dy)
               for dx in (-m, m) for dy in (-m, m)]
        x0, y0, x1, y1 = bbox(allpts + far)
        px0, py1 = project(x0, y0)
        px1, py0 = project(x1, y1)
        w, h = max(px1 - px0, 1.0), max(py1 - py0, 1.0)
        pad = 1.6
        cam = {
            "cx": round((px0 + px1) / 2, 1),
            "cy": round((py0 + py1) / 2, 1),
            "z": round(min(55.0, BOX / (max(w, h) * pad)), 2),
        }
        nm = label(r["ui"])
        # 나머지 땅은 이름만 적는다. '완주군 나머지 땅'까지 적으면
        # 글자가 화면 밖으로 밀린다. 떨어진 땅 쪽에 '떨어진'이
        # 붙어 있으니 나머지가 무엇인지는 그것으로 갈린다.
        targets = [(f"{nm} 떨어진 땅", r["piece"], "piece"),
                   (nm, r["main"], "main")]
        land = [b["name"] for b in r["between"] if b["name"] != "바다"]
        # 사이가 전부 바다면 칠할 남의 동네가 없다. 그러면 지도에
        # 이름이 자기 시·군 둘뿐이라 어디쯤인지 감이 안 온다.
        # 맞닿은 이웃 이름을 대신 얹는다.
        for n in (land or [label(i) for i in r["nb"]][:3]):
            k = next(i for i, u in enumerate(units) if label(i) == n)
            targets.append((n, units[k]["polys"], "neigh"))
        cases.append({
            "pieces": [piece],
            "cam": cam,
            # 최단선이 실제로 지나는 남의 시·군만 칠한다
            "nbNames": [x["name"] for x in r["between"] if x["name"] != "바다"],
            "labels": label_spots(targets, cam, unproject),
        })

    table = [{
        "name": label(r["ui"]),
        "sido": sido_of[r["ui"]],
        "area": round(r["area"], 2),
        "pct": round(r["pct"], 1),
        "dist": round(r["dist"], 2),
        "nb": len(r["nb"]),
    } for r in found]

    # 최단선이 지나는 남의 동네 겉모양. 이름이 겹치는 '서구·동구'가
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
        # 이웃과 아예 안 닿는 덩어리(흑산도 같은 것)
        "islandCount": len(islands),
        # 이웃과는 닿지만 사람이 안 사는 것(방조제·항만 매립지)
        "emptyCount": len(empty),
        # 사람은 살지만 사이가 바다인 것(대부도·내륙 중구)
        "seaCount": len(sea),
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("→", OUT)
    return found


if __name__ == "__main__":
    main()
