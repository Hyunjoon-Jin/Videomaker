#!/usr/bin/env python3
"""바다에서 가장 먼 지자체 순위 — 19편의 다섯 걸음.

## 나온 것

```
 1  119.70km  경북 상주시 공성면    서해 119.71  동해 119.70
 2  118.85km  경북 김천시 어모면    서해 118.85  동해 118.88
 3  118.41km  충북 영동군 추풍령면  서해 118.41  동해 118.58
 4  113.50km  경북 문경시 점촌4동   서해 113.50  동해 113.50
 5  111.64km  충북 제천시 덕산면    서해 111.64  동해 111.67
 6  111.16km  경북 구미시 무을면    서해 126.91  동해 111.16
```

**1위부터 5위까지가 동해와 서해에서 같은 거리다.** 우연이 아니다.
한쪽 바다가 더 가까우면 반대쪽으로 더 갈 자리가 남아 있다는 뜻이라,
가장 먼 점은 두 바다가 같아지는 자리에서만 멈춘다.

6위 구미부터 한쪽으로 기운다.

## 왜 전국을 안 훑나

`prep-inland.py`가 시도별로 재둔 값에서 100km를 넘는 곳이
경북·충북·강원·전북·경남뿐이었고 봉우리가 다 이 상자 안이다.
5위 문턱이 110km대라 93km짜리 경기 양평까지 담기는 상자면 넉넉하다.

## 1·2위가 0.85km 차이라 다듬기를 넓게 잡는다

거친 격자가 2km라 그 오차가 1·2위 차이보다 크다. 그래서 봉우리마다
±6km를 1km로, 다시 ±1.2km를 200m로, 마지막에 ±0.3km를 50m로 좁힌다.

## 투영

`korea-paths.json`과 같은 0..1000 상자다. 경도에 mid-lat의 cos를
곱하고 세로를 뒤집는다. 그래서 계산한 좌표가 전국 지도 위에 그대로
얹힌다.

원은 진짜 원으로 그린다. 이 위도대에서 가로 반지름이 0.5% 작은
타원이 맞지만, 화면에서 1픽셀이 안 된다.

사용:  python3 scripts/rank-inland.py
출력:  src/data/inland.json
"""
import importlib.util
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    "pi", os.path.join(HERE, "prep-inland.py"))
pi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pi)

OUT = os.path.join(HERE, "..", "src", "data", "inland.json")

BOX = (127.2, 128.9, 35.6, 37.4)
BOXBIG = 1000.0
TOL = 0.0006
MIN_RING = 2e-5
DEG_LAT_KM = 110.574

# 화면에 세우는 다섯. 5위에서 1위로 오른다.
SHOW = 5
# 마무리 표
TABLE = 10


def unit(name):
    """일반구를 시로 되돌린다. 18편과 같은 기준."""
    if name.endswith("구") and "시" in name[:-1]:
        return name[: name.index("시") + 1]
    return name


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


def projector(polys):
    """korea-paths.json과 같은 0..1000 투영. 단위당 km도 함께 돌려준다."""
    lons = [q[0] for pl in polys for q in pl[4]]
    lats = [q[1] for pl in polys for q in pl[4]]
    lon0, lon1 = min(lons), max(lons)
    lat0, lat1 = min(lats), max(lats)
    kx = math.cos(math.radians((lat0 + lat1) / 2))
    scale = BOXBIG / max((lon1 - lon0) * kx, lat1 - lat0)
    offx = (BOXBIG - (lon1 - lon0) * kx * scale) / 2
    offy = (BOXBIG - (lat1 - lat0) * scale) / 2

    def project(x, y):
        return (round((x - lon0) * kx * scale + offx, 1),
                round(BOXBIG - ((y - lat0) * scale + offy), 1))
    return project, scale / DEG_LAT_KM   # 1km가 몇 단위인지


def coast_path(project, keep):
    """해안선을 폴리라인으로. 지도에 얹어 물길을 판다.

    시군구 폴리곤만 그리면 금강 하구나 아산만 같은 물길이 안 보인다.
    원이 닿는 자리가 육지 한복판처럼 보여서 못 믿을 그림이 된다.
    바탕색으로 가늘게 그으면 그 물길이 드러난다.
    """
    co = json.load(open(os.path.join(HERE, "..", "data", "osm-coastline.json"),
                        encoding="utf-8"))
    parts = []
    for w in co["elements"]:
        run = []
        for g in w.get("geometry", []):
            p = (round(g["lon"], 5), round(g["lat"], 5))
            if p in keep:
                run.append((g["lon"], g["lat"]))
            else:
                if len(run) > 2:
                    parts.append(run)
                run = []
        if len(run) > 2:
            parts.append(run)
    out = []
    for run in parts:
        s = dp(run, 0.0016)          # 약 150m
        if len(s) < 2:
            continue
        pts = [project(x, y) for x, y in s]
        out.append("M" + "L".join(f"{x} {y}" for x, y in pts))
    return "".join(out)


def to_path(rings, project):
    parts = []
    for ring in rings:
        if ring_area_deg(ring) < MIN_RING:
            continue
        s = dp(ring, TOL)
        if len(s) < 4:
            continue
        pts = [project(x, y) for x, y in s]
        parts.append("M" + "L".join(f"{x} {y}" for x, y in pts) + "Z")
    return "".join(parts)


def peak(grid, polys, idx, nm, seed):
    """봉우리를 50m까지 좁힌다. 1·2위가 0.85km 차이라 넓게 잡는다."""
    best = (0.0, seed[0], seed[1], None)
    for step, half in ((0.01, 0.06), (0.002, 0.012), (0.0005, 0.003)):
        cx, cy = best[1], best[2]
        x = cx - half
        while x <= cx + half + 1e-9:
            y = cy - half
            while y <= cy + half + 1e-9:
                if pi.where(x, y, polys, idx) == nm:
                    d, q = pi.nearest(grid, (x, y))
                    if d > best[0]:
                        best = (d, x, y, q)
                y += step
            x += step
    return best


def main():
    grid, n = pi.load_coast()
    print(f"해안선 {n:,}점", flush=True)

    polys = pi.load_polys(
        pi.MUNI,
        lambda pr: pi.SIDO.get(str(pr["code"])[:2], "") + " " + unit(pr["name"]))
    idx = pi.index(polys)
    sub = pi.load_polys(pi.SUB, lambda pr: pr.get("name", ""))
    sidx = pi.index(sub)

    # 1단계 — 2km 격자로 지자체마다 봉우리 자리를 잡는다
    seed = {}
    x = BOX[0]
    while x <= BOX[1]:
        y = BOX[2]
        while y <= BOX[3]:
            nm = pi.where(x, y, polys, idx)
            if nm:
                d, _ = pi.nearest(grid, (x, y))
                if nm not in seed or d > seed[nm][0]:
                    seed[nm] = (d, x, y)
            y += 0.02
        x += 0.02
    print(f"{len(seed)}곳 훑음", flush=True)

    # 2단계 — 50m까지 좁힌다
    rows = []
    for nm, (_, sx, sy) in sorted(seed.items(), key=lambda kv: -kv[1][0])[:TABLE + 2]:
        d, px, py, q = peak(grid, polys, idx, nm, (sx, sy))
        seas = {}
        for lab, keep in pi.SEAS:
            dd, qq = pi.nearest(grid, (px, py), keep)
            seas[lab] = (dd, qq)
        rows.append({"name": nm, "km": d, "lon": px, "lat": py,
                     "emd": pi.where(px, py, sub, sidx),
                     "coast": q, "seas": seas})
        print(f'  {d:7.2f} {nm}', flush=True)
    rows.sort(key=lambda r: -r["km"])
    rows = rows[:TABLE]

    print("\n== 바다에서 가장 먼 지자체")
    for i, r in enumerate(rows, 1):
        s = " · ".join(f'{k} {v[0]:.2f}' for k, v in r["seas"].items())
        print(f'{i:3d} {r["km"]:7.2f}km  {r["name"]:12s}{str(r["emd"]):10s}'
              f' {r["lon"]:.4f},{r["lat"]:.4f}  {s}')

    project, unit_km = projector(polys)
    keep = set(map(tuple, json.load(open(
        os.path.join(HERE, "..", "data", "coast-open.json"), encoding="utf-8"))))
    coast = coast_path(project, keep)
    print(f"해안선 path {len(coast):,}자")
    ringsof = {}
    for pl in polys:
        ringsof.setdefault(pl[5], []).append(pl[4])

    cases = []
    for i, r in enumerate(rows[:SHOW]):
        rank = i + 1
        cx, cy = project(r["lon"], r["lat"])
        touch = {}
        for lab in ("서해", "동해"):
            dd, qq = r["seas"][lab]
            tx, ty = project(*qq)
            touch[lab] = {"km": round(dd, 2), "x": tx, "y": ty}
        cases.append({
            "rank": rank,
            "name": r["name"],
            "emd": r["emd"],
            "km": round(r["km"], 1),
            "x": cx, "y": cy,
            "r": round(r["km"] * unit_km, 2),
            "d": to_path(ringsof[r["name"]], project),
            "west": touch["서해"],
            "east": touch["동해"],
        })
    cases.reverse()   # 5위 → 1위

    json.dump({
        "viewBox": f"0 0 {int(BOXBIG)} {int(BOXBIG)}",
        "coast": coast,
        "unitKm": round(unit_km, 4),
        "cases": cases,
        "table": [{"rank": i + 1, "name": r["name"], "emd": r["emd"],
                   "km": round(r["km"], 1),
                   "west": round(r["seas"]["서해"][0], 1),
                   "east": round(r["seas"]["동해"][0], 1)}
                  for i, r in enumerate(rows)],
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("→", OUT)


if __name__ == "__main__":
    main()
