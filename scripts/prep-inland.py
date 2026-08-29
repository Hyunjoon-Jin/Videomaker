#!/usr/bin/env python3
"""바다에서 가장 먼 곳 — 남한 육지에서 해안선까지 가장 먼 지점을 찾는다.

## 야마

경북 상주시 공성면. 서해까지 119.73km, 동해까지 119.74km. 10m 차이다.
그 지점이 최원점인 까닭이 곧 두 값이 같다는 것이다 — **자가 자료 안에
있다.** 바깥에서 빌려 올 것이 없다.

삼면이 바다라는 말을 거리로 바꾸면 이렇게 된다. 남한 어느 땅에 서
있어도 바다까지 120km 안이다.

## 왜 OSM 해안선인가

시군구 경계의 바깥 둘레를 쓰면 안 된다. 거기에는 휴전선이 섞여
있고, 휴전선은 바다가 아니다. `natural=coastline`은 땅과 바다의
경계만 그린 선이라 그 문제가 없다.

**북한 해안선도 넣는다.** 강원 북부에서는 북한 쪽 동해가 더 가깝다.
바다는 나라를 가리지 않는다.

## 담수호는 바다가 아니다

원본 해안선에는 `source=PGS` 시절 선이 남아 시화호·낙동강 하굿둑
안쪽 물가까지 그려져 있다. `scripts/prep-sea.py`가 열린 바다에 닿는
점만 골라 `data/coast-open.json`에 남긴다. 이 파일이 있으면 그것을
쓴다.

금강 하구와 아산만은 걱정했던 것과 달리 멀쩡했다. 해안선이 금강어도
(126.756,36.013)와 아산만방조제(126.907,36.913)에서 딱 멈춘다.
통계청 육지 마스크로 물을 채워 봐도 같은 자리에서 멈췄다.

## 빠짐

OSM 해안선은 강 하구를 어디선가 끊는다. 김포 한강 하구가 8.5km
비어 있다. 상주 값에는 닿지 않지만 서울·경기 값에는 걸린다.

## 구하는 법

해안선 100만 점을 0.05° 격자에 해싱한다. 한 점에서 가장 가까운
해안선을 찾을 때는 격자 링을 바깥으로 넓혀 가다가, 지금까지의
최단거리가 그 링이 보장하는 거리보다 짧아지면 멈춘다.

육지 판정은 시군구 폴리곤 안인지로 한다. 2km 격자로 봉우리를
찾고 100m까지 좁힌다.

사용:  python3 scripts/prep-inland.py
자료:  data/osm-coastline.json  (없으면 scripts/fetch-coastline.py)
"""
import json
import math
import os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
COAST = os.path.join(HERE, "..", "data", "osm-coastline.json")
# scripts/prep-sea.py가 걸러낸 것. 열린 바다에 닿는 점만 들어 있다.
OPEN = os.path.join(HERE, "..", "data", "coast-open.json")
MUNI = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
SUB = os.path.join(HERE, "..", "data", "skorea-submunicipalities.json")

R_KM = 6371.0088
CELL = 0.05          # 해안선 해시 격자(도)
PCELL = 0.1          # 폴리곤 색인 격자(도)
KM_PER_CELL = CELL * 88   # 위도 36°에서 경도 0.05°가 4.4km. 넉넉하게 잡는다

SIDO = {
    "11": "서울", "21": "부산", "22": "대구", "23": "인천", "24": "광주",
    "25": "대전", "26": "울산", "29": "세종", "31": "경기", "32": "강원",
    "33": "충북", "34": "충남", "35": "전북", "36": "전남", "37": "경북",
    "38": "경남", "39": "제주",
}

# 어느 바다인지 가르는 대충의 선. 계기판에 쓸 이름표일 뿐, 순위에는
# 안 쓴다.
SEAS = (
    ("서해", lambda q: q[0] < 127.2),
    ("남해", lambda q: q[0] >= 127.2 and q[1] < 35.2),
    ("동해", lambda q: q[0] > 128.6 and q[1] >= 35.2),
)


def hav(a, b):
    p1, p2 = math.radians(a[1]), math.radians(b[1])
    h = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2)
         * math.sin(math.radians(b[0] - a[0]) / 2) ** 2)
    return 2 * R_KM * math.asin(math.sqrt(h))


def load_coast():
    """열린 바다에 닿는 해안선을 쓴다.

    거르지 않은 원본에는 금강호·시화호·낙동강 하굿둑 안쪽 같은
    담수호 물가가 섞여 있다. 담수호는 바다가 아니다.
    """
    grid = defaultdict(list)
    n = 0
    if os.path.exists(OPEN):
        for x, y in json.load(open(OPEN, encoding="utf-8")):
            grid[(int(x / CELL), int(y / CELL))].append((x, y))
            n += 1
        return grid, n
    gj = json.load(open(COAST, encoding="utf-8"))
    for w in gj["elements"]:
        for g in w.get("geometry", []):
            p = (g["lon"], g["lat"])
            grid[(int(p[0] / CELL), int(p[1] / CELL))].append(p)
            n += 1
    return grid, n


def nearest(grid, p, keep=None):
    """가장 가까운 해안선 점. keep으로 바다를 골라 잴 수도 있다."""
    cx, cy = int(p[0] / CELL), int(p[1] / CELL)
    best, at = 1e9, None
    for r in range(0, 80):
        for i in range(cx - r, cx + r + 1):
            for j in range(cy - r, cy + r + 1):
                if r and max(abs(i - cx), abs(j - cy)) != r:
                    continue
                for q in grid.get((i, j), ()):
                    if keep and not keep(q):
                        continue
                    d = hav(p, q)
                    if d < best:
                        best, at = d, q
        # 링 하나를 다 돌았으면 그 바깥은 최소 r*KM_PER_CELL이다
        if best < r * KM_PER_CELL:
            break
    return best, at


def load_polys(path, namer):
    gj = json.load(open(path, encoding="utf-8"))
    out = []
    for f in gj["features"]:
        g = f["geometry"]
        ps = (g["coordinates"] if g["type"] == "MultiPolygon"
              else [g["coordinates"]])
        nm = namer(f["properties"])
        for poly in ps:
            ring = poly[0]
            xs = [q[0] for q in ring]
            ys = [q[1] for q in ring]
            out.append((min(xs), min(ys), max(xs), max(ys), ring, nm))
    return out


def index(polys):
    g = defaultdict(list)
    for k, pl in enumerate(polys):
        for i in range(int(pl[0] / PCELL), int(pl[2] / PCELL) + 1):
            for j in range(int(pl[1] / PCELL), int(pl[3] / PCELL) + 1):
                g[(i, j)].append(k)
    return g


def where(x, y, polys, idx):
    for k in idx.get((int(x / PCELL), int(y / PCELL)), []):
        x0, y0, x1, y1, ring, nm = polys[k]
        if not (x0 <= x <= x1 and y0 <= y <= y1):
            continue
        c = False
        n = len(ring)
        for a in range(n):
            xa, ya = ring[a]
            xb, yb = ring[(a + 1) % n]
            if (ya > y) != (yb > y) and x < (xb - xa) * (y - ya) / (yb - ya) + xa:
                c = not c
        if c:
            return nm
    return None


def peak(grid, polys, idx, sido, seed, steps=((0.005, 0.025), (0.001, 0.006))):
    """씨앗 둘레를 두 번 좁혀 그 시도의 최원점을 잡는다."""
    best = (0.0, seed[0], seed[1], None, None)
    for step, half in steps:
        cx, cy = (best[1], best[2])
        x = cx - half
        while x <= cx + half + 1e-9:
            y = cy - half
            while y <= cy + half + 1e-9:
                nm = where(x, y, polys, idx)
                if nm and nm.split()[0] == sido:
                    d, q = nearest(grid, (x, y))
                    if d > best[0]:
                        best = (d, x, y, nm, q)
                y += step
            x += step
    return best


def main():
    grid, n = load_coast()
    print(f"해안선 {n:,}점")

    polys = load_polys(MUNI, lambda pr: (SIDO.get(str(pr["code"])[:2], "")
                                         + " " + pr["name"]))
    idx = index(polys)
    sub = load_polys(SUB, lambda pr: pr.get("name", ""))
    sidx = index(sub)

    # 1단계 — 전국 2km 격자로 시도마다 봉우리를 찾는다
    seed = {}
    x = 125.0
    while x <= 129.7:
        y = 33.0
        while y <= 38.7:
            nm = where(x, y, polys, idx)
            if nm:
                sd = nm.split()[0]
                d, _ = nearest(grid, (x, y))
                if sd not in seed or d > seed[sd][0]:
                    seed[sd] = (d, x, y)
            y += 0.02
        x += 0.02

    # 2단계 — 100m까지 좁힌다
    rows = []
    for sd, (_, sx, sy) in seed.items():
        d, x, y, nm, q = peak(grid, polys, idx, sd, (sx, sy))
        rows.append({"sido": sd, "km": d, "lon": x, "lat": y,
                     "name": nm, "emd": where(x, y, sub, sidx), "coast": q})
    rows.sort(key=lambda r: -r["km"])

    for r in rows:
        print(f'{r["sido"]:4s}{r["km"]:8.2f}km  {r["name"]:12s}'
              f'{str(r["emd"]):10s} {r["lon"]:.4f},{r["lat"]:.4f}')

    top = rows[0]
    print(f'\n== {top["name"]} {top["emd"]}에서 바다별 거리')
    for lab, keep in SEAS:
        d, q = nearest(grid, (top["lon"], top["lat"]), keep)
        print(f'  {lab} {d:8.2f}km  {q[0]:.4f},{q[1]:.4f}')


if __name__ == "__main__":
    main()
