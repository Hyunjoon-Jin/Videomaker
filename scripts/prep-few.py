#!/usr/bin/env python3
"""전국에서 인구가 가장 적은 지자체 — 순위와 그 안에 뿌린 점.

## 야마

**얼마나 적은지를 세어 보인다.** 그 지자체 경계 안에 점을 뿌린다.
**점 하나가 100명이다.** 울릉군은 88개, 5위 장수군은 212개다.
숫자를 읽지 않아도 개수가 눈에 들어온다.

21편(가장 작은 시·군·구)과 지도 문법은 같지만 재는 것이 다르다.
그쪽은 배율을 고정해 넓이를 견줬고, 이쪽은 **각 지자체를 화면에
꽉 채우고 점 개수만 견준다.** 인구는 땅 크기와 상관이 없어서
배율을 묶을 까닭이 없다.

## 점을 어떻게 뿌리나

경계 다각형 안에 균일하게 뿌린다. 조각이 여럿이면 **넓이에 비례해
나눈다** — 옹진군은 백령도에서 덕적도까지 100조각이 넘는데,
조각마다 같은 수를 뿌리면 작은 섬이 새까매진다.

씨앗을 고정해 프레임마다 점이 안 흔들리게 한다.

## 기준일

`data/pop-dong.json` — 행정안전부 주민등록 인구, 2026-07-31.
**2026-07-01 인천 행정체제 개편이 반영된 자료다.** 중구·동구·서구가
없어지고 제물포구·영종구·서해구·검단구가 생겼다.

경계 자료는 통계청 2018년 것이라 인천의 새 자치구 모양이 없다.
다행히 인천에서 순위에 드는 곳은 옹진군 하나고, 옹진군은 개편과
무관하다.

## 세는 기준

일반구는 시로 묶어 230곳이다. 18·19·21편과 같은 기준인데, 인천이
갈리면서 229곳에서 230곳이 됐다.

사용:  python3 scripts/prep-few.py
자료:  data/pop-dong.json               (없으면 scripts/fetch-pop.py)
       data/skorea-municipalities.json
출력:  src/data/few.json
"""
import json
import math
import os
import random
import re

HERE = os.path.dirname(os.path.abspath(__file__))
POP = os.path.join(HERE, "..", "data", "pop-dong.json")
GEO = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
OUT = os.path.join(HERE, "..", "src", "data", "few.json")

TOP = 5
PER_DOT = 100          # 점 하나에 몇 명
BOX = 1000.0
DEG_LAT_KM = 110.574
TOL_DEG = 0.00035
SEED = 21

SHORT = {"서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구",
         "인천광역시": "인천", "대전광역시": "대전", "울산광역시": "울산",
         "세종특별자치시": "세종", "경기도": "경기", "강원특별자치도": "강원",
         "충청북도": "충북", "충청남도": "충남", "전북특별자치도": "전북",
         "전남광주통합특별시": "전남광주", "경상북도": "경북",
         "경상남도": "경남", "제주특별자치도": "제주"}

# 경계 자료(2018)의 시도 코드 → 지금 시도 이름.
# 광주·전남은 2026-07-01에 합쳐졌지만 기초자치단체는 그대로다.
GEO_SIDO = {"11": "서울", "21": "부산", "22": "대구", "23": "인천",
            "24": "전남광주", "25": "대전", "26": "울산", "29": "세종",
            "31": "경기", "32": "강원", "33": "충북", "34": "충남",
            "35": "전북", "36": "전남광주", "37": "경북", "38": "경남",
            "39": "제주"}


def ranking():
    """행정동을 시군구로 더하고 일반구는 시로 묶는다."""
    raw = json.load(open(POP, encoding="utf-8"))
    u = {}
    for sd, sg, _dong, n in raw["행정동"]:
        sido = SHORT.get(sd, sd)
        unit = sg if sg else sd
        m = re.match(r"^(.+?시)\s*(.+구)$", unit)
        key = (sido, m.group(1) if m else unit)
        u[key] = u.get(key, 0) + n
    rows = sorted((n, sd, nm) for (sd, nm), n in u.items())
    return rows, raw["기준"], raw["행정동"]


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


def projector(feats):
    """`scripts/prep-map.py`와 똑같은 투영. 전국 지도와 좌표계를 맞춘다."""
    lons, lats = [], []
    for f in feats:
        g = f["geometry"]
        polys = (g["coordinates"] if g["type"] == "MultiPolygon"
                 else [g["coordinates"]])
        for poly in polys:
            for x, y in poly[0]:
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

    def project(x, y):
        return ((x - lon0) * kx * scale + offx,
                BOX - ((y - lat0) * scale + offy))
    return project


def area2(ring):
    a = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def inside(pt, ring):
    x, y = pt
    ok = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            ok = not ok
        j = i
    return ok


def shape(features, project):
    """경계를 0..1000 상자 좌표로. 조각마다 (바깥 링, 구멍들)을 남긴다.

    **일반구로 갈린 시는 조각을 다 이어 붙인다.** 수원시는 경계
    자료에 장안·권선·팔달·영통 넷으로 들어 있는데, 인구는 시 하나로
    세므로 모양도 하나여야 한다.
    """
    polys = []
    for feature in features:
        g = feature["geometry"]
        polys += (g["coordinates"] if g["type"] == "MultiPolygon"
                  else [g["coordinates"]])
    parts, paths = [], []
    for poly in polys:
        rings = []
        for ring in poly:
            pts = dp([tuple(p) for p in ring], TOL_DEG)
            if len(pts) < 4:
                continue
            q = [project(x, y) for x, y in pts]
            rings.append(q)
            paths.append("M" + " ".join(f"{x:.2f},{y:.2f}" for x, y in q)
                         + "Z")
        if rings:
            parts.append(rings)
    return parts, paths


def scatter(parts, n, rng):
    """경계 안에 점 n개를 균일하게 뿌린다.

    조각마다 넓이에 비례해 나눈다. 옹진군은 100조각이 넘는데
    조각마다 같은 수를 뿌리면 작은 섬이 새까매진다.
    """
    weights = [area2(p[0]) for p in parts]
    total = sum(weights) or 1.0
    dots = []
    for part, w in zip(parts, weights):
        want = int(round(n * w / total))
        if want <= 0:
            continue
        outer = part[0]
        holes = part[1:]
        xs = [p[0] for p in outer]
        ys = [p[1] for p in outer]
        got = 0
        guard = 0
        while got < want and guard < want * 400 + 3000:
            guard += 1
            p = (rng.uniform(min(xs), max(xs)), rng.uniform(min(ys), max(ys)))
            if not inside(p, outer):
                continue
            if any(inside(p, h) for h in holes):
                continue
            dots.append((round(p[0], 2), round(p[1], 2)))
            got += 1
    # 반올림으로 몇 개 어긋난 것을 맞춘다
    return dots[:n]


def main():
    rows, day, dong = ranking()
    print(f"{len(rows)}곳 · 기준 {day}", flush=True)
    print("== 적은 쪽 8")
    for i, (n, sd, nm) in enumerate(rows[:8], 1):
        print(f"{i:3d} {n:9,} {sd} {nm}")
    top = rows[-1]
    print(f"== 가장 많은 곳  {top[0]:,} {top[1]} {top[2]}")
    print(f"   가장 적은 곳의 {top[0] / rows[0][0]:.0f}배")

    only = sorted(d[3] for d in dong)
    mid = only[len(only) // 2]
    over = sum(1 for v in only if v > rows[0][0])
    print(f"   행정동 {len(only):,}개 중앙값 {mid:,}명 · "
          f"1위보다 많은 동 {over:,}개 ({over / len(only) * 100:.0f}%)")

    gj = json.load(open(GEO, encoding="utf-8"))
    project = projector(gj["features"])
    feat = {}
    for f in gj["features"]:
        p = f["properties"]
        m = re.match(r"^(.+?시)(.+구)$", p["name"])
        key = (GEO_SIDO[p["code"][:2]], m.group(1) if m else p["name"])
        feat.setdefault(key, []).append(f)

    rng = random.Random(SEED)

    def build(n, sd, nm, rank=None):
        parts, paths = shape(feat[(sd, nm)], project)
        dots = scatter(parts, round(n / PER_DOT), rng)
        xs = [p[0] for part in parts for p in part[0]]
        ys = [p[1] for part in parts for p in part[0]]
        rec = {"sido": sd, "name": nm, "pop": n, "d": paths, "dots": dots,
               "x0": round(min(xs), 2), "x1": round(max(xs), 2),
               "y0": round(min(ys), 2), "y1": round(max(ys), 2)}
        if rank:
            rec["rank"] = rank
        print(f"  {rank or '큰곳'} {sd} {nm} {n:,}명 · 점 {len(dots):,} · "
              f"조각 {len(parts)}")
        return rec

    few = [build(n, sd, nm, i) for i, (n, sd, nm) in enumerate(rows[:TOP], 1)]
    big = build(top[0], top[1], top[2])

    json.dump({
        "day": day,
        "units": len(rows),
        "perDot": PER_DOT,
        "few": few,
        "big": big,
        "sixth": {"sido": rows[TOP][1], "name": rows[TOP][2],
                  "pop": rows[TOP][0]},
        "dongCount": len(only),
        "dongMedian": mid,
        "dongOver": over,
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("→", OUT)


if __name__ == "__main__":
    main()
