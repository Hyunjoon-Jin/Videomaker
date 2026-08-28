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

## 판정은 셋이다

  ① 나머지 땅 = 그 시·군 덩어리 중 넓이가 가장 큰 것
  ② 떨어진 땅 = 그것과 안 붙은 것
  ③ 섬 제외   = 다른 시·군과 150m 안으로 맞닿아야 남긴다

①에서 점 수로 고르면 틀린다. 해안선이 복잡한 덩어리는 넓이가
작아도 점이 훨씬 많다. 부안군이 그렇게 479km² 덩어리를 뱉었다.

③이 이 편의 기준 그 자체다. 이 자료에 섬이 전부 별개 폴리곤으로
들어 있어서, 그냥 세면 **1,049곳**이 나온다. 흑산도·백령도·안면도·
돌산도가 다 여기 든다.

섬이 자기 시·군과 안 붙어 있는 것은 놀랍지 않다. 사방이 바다니까
그렇다. 이 편이 묻는 것은 **땅으로는 남의 시·군과 이어져 있는데
자기 시·군과는 안 이어진 곳**이다. 그게 9곳이다.

(울릉도는 아예 안 걸린다. 울릉군의 나머지 땅이 아니라 울릉군
그 자체이기 때문이다.)

그래서 안 센 1,049곳도 세어서 화면에 같이 낸다. 기준을 숨기면
'그럼 흑산도는 왜 안 세느냐'는 물음에 답이 없다.

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

sys.setrecursionlimit(200000)

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
OUT = os.path.join(HERE, "..", "src", "data", "exclave.json")

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


# 화면에 세우는 차례. 작은 것에서 큰 것으로.
# 평택과 당진은 서로 맞닿은 매립지라 한 화면에 묶는다.
# 화면에 세우는 차례는 떨어진 거리 순이다. 코드에 적어두지 않고
# 받은 값으로 정렬한다 — 자료가 바뀌면 차례도 따라 바뀌어야 한다.

# 이름표를 앉힐 자리를 고를 때 쓰는 격자 크기
LBL_N = 90
# 화면에서 글자가 안 가려지는 세로 구간(0..1 비율).
# 위는 계기판과 눈금, 아래는 자막과 범례가 덮는다.
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

    boxes = [[(bbox(p), p) for p in u["polys"]] for u in units]
    print(len(found), "곳")

    for r in found:
        r["between"] = between(r, boxes, label)

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
        # 안 센 섬. 화면에서 점으로 한 번 켰다 끈다.
        "islands": [[*project(x, y), round(a, 2)] for x, y, a in islands],
        "islandCount": len(islands),
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("→", OUT)
    return found


if __name__ == "__main__":
    main()
