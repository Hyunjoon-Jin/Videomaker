#!/usr/bin/env python3
"""전국에서 가장 작은 시·군·구 — 순위와 그 모양.

## 야마

**차이를 글자로 말하지 않고 그림으로 보인다.**

1km² 격자를 깔고 그 위에 시·군·구의 실제 모양을 얹는다. 축척은
다섯 걸음 내내 고정이다. 몇 칸을 덮는지가 눈으로 세어지고, 순위가
올라갈수록 도형이 줄어든다.

## 넓이는 재지 않고 받아 쓴다

`data/land-area.json` — 국토교통부 지적기본통계집계(2024-12-31).
경계 폴리곤으로 재면 4위 서울 중구(9.960)와 5위 부산 동구(10.121)를
못 가른다. 자세한 것은 `scripts/fetch-area.py`.

**모양은 경계 자료, 넓이는 지적통계다.** 출처가 둘이라 화면에서도
따로 밝힌다.

## 세는 기준

지적통계의 252개 행정구역에서 일반구를 시로 묶어 229곳이다.
수원 장안구처럼 시 안에 있는 일반구는 시로 합치고, 광역시의
자치구는 각각 한 곳으로 둔다. 18·19편과 같은 기준이다.

제주시·서귀포시는 자치권이 없는 행정시고 세종시는 광역시급인데,
셋 다 넓어서 순위에는 안 걸린다.

## 5위와 6위가 0.096km² 차이다

부산 동구 10.121, 부산 수영구 10.217. 다섯에서 끊는 것이 아슬아슬해
고정댓글에 적는다.

사용:  python3 scripts/prep-small.py
자료:  data/land-area.json            (없으면 scripts/fetch-area.py)
       data/skorea-municipalities.json
출력:  src/data/small.json
"""
import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
AREA = os.path.join(HERE, "..", "data", "land-area.json")
GEO = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
PATHS = os.path.join(HERE, "..", "src", "data", "korea-paths.json")
OUT = os.path.join(HERE, "..", "src", "data", "small.json")

TOP = 5
DEG_LAT_KM = 110.574
TOL_KM = 0.015          # 15m. 2km짜리 구를 그리는 데 이만하면 넉넉하다

SHORT = {"서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구",
         "인천광역시": "인천", "광주광역시": "광주", "대전광역시": "대전",
         "울산광역시": "울산", "세종특별자치시": "세종", "경기도": "경기",
         "강원특별자치도": "강원", "충청북도": "충북", "충청남도": "충남",
         "전북특별자치도": "전북", "전라남도": "전남", "경상북도": "경북",
         "경상남도": "경남", "제주특별자치도": "제주"}

# 경계 자료의 코드 앞 두 자리 → 시도
GEO_SIDO = {"11": "서울", "21": "부산", "22": "대구", "23": "인천",
            "24": "광주", "25": "대전", "26": "울산", "29": "세종",
            "31": "경기", "32": "강원", "33": "충북", "34": "충남",
            "35": "전북", "36": "전남", "37": "경북", "38": "경남",
            "39": "제주"}


def ranking():
    """지적통계를 일반구 묶어 229곳으로 줄이고 넓이 순으로 세운다."""
    raw = json.load(open(AREA, encoding="utf-8"))
    u = {}
    for k, a in raw["면적"].items():
        p = k.split()
        sd = SHORT.get(p[0], p[0])
        unit = p[1] if len(p) >= 2 else p[0]
        u[(sd, unit)] = u.get((sd, unit), 0.0) + a
    rows = sorted((round(a, 3), sd, nm) for (sd, nm), a in u.items())
    return rows, raw["기준일"]


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


def shape(feature):
    """경계를 km 좌표로 옮긴다. 원점은 그 도형의 한가운데, y는 아래로.

    같은 축척으로 나란히 놓을 것이라 도형마다 제 크기를 지녀야 한다.
    화면에 맞추는 일은 그리는 쪽에서 한다.
    """
    g = feature["geometry"]
    polys = (g["coordinates"] if g["type"] == "MultiPolygon"
             else [g["coordinates"]])
    xs = [c[0] for poly in polys for r in poly for c in r]
    ys = [c[1] for poly in polys for r in poly for c in r]
    lat0 = (min(ys) + max(ys)) / 2
    kx = math.cos(math.radians(lat0)) * DEG_LAT_KM
    cx = (min(xs) + max(xs)) / 2
    cy = (min(ys) + max(ys)) / 2

    def km(p):
        return ((p[0] - cx) * kx, (cy - p[1]) * DEG_LAT_KM)

    parts = []
    for poly in polys:
        for ring in poly:
            pts = dp([km(p) for p in ring], TOL_KM)
            if len(pts) < 3:
                continue
            parts.append("M" + " ".join(f"{x:.3f},{y:.3f}" for x, y in pts)
                         + "Z")
    w = (max(xs) - min(xs)) * kx
    h = (max(ys) - min(ys)) * DEG_LAT_KM
    return parts, round(w, 3), round(h, 3)


def main():
    rows, day = ranking()
    print(f"{len(rows)}곳 · 기준일 {day}", flush=True)
    print("== 작은 쪽 8")
    for i, (a, sd, nm) in enumerate(rows[:8], 1):
        print(f"{i:3d} {a:8.3f} {sd} {nm}")
    print(f"== 가장 큰 곳  {rows[-1][0]:.2f} {rows[-1][1]} {rows[-1][2]}")
    print(f"   가장 작은 곳의 {rows[-1][0] / rows[0][0]:.0f}배")

    gj = json.load(open(GEO, encoding="utf-8"))
    feat = {}
    for f in gj["features"]:
        p = f["properties"]
        m = re.match(r"^(.+?시)(.+구)$", p["name"])
        key = (GEO_SIDO[p["code"][:2]], m.group(1) if m else p["name"])
        feat.setdefault(key, []).append(f)

    def one(sd, nm):
        fs = feat[(sd, nm)]
        if len(fs) > 1:                     # 일반구로 갈린 시는 여기 안 온다
            raise SystemExit(f"{sd} {nm} 조각이 {len(fs)}개다")
        return fs[0]

    # 훅에서 전국 지도에 점을 찍을 자리. 0..1000 상자 좌표다
    paths = json.load(open(PATHS, encoding="utf-8"))
    spot = {(GEO_SIDO[r["sido"]], r["name"]): (r["cx"], r["cy"])
            for r in paths["regions"]}

    small = []
    for i, (a, sd, nm) in enumerate(rows[:TOP], 1):
        d, w, h = shape(one(sd, nm))
        small.append({"rank": i, "sido": sd, "name": nm, "area": a,
                      "d": d, "w": w, "h": h,
                      "at": list(spot[(sd, nm)])})
        print(f"  {i}위 {sd} {nm} {a}km² · {w}×{h}km · 조각 {len(d)}")

    ba, bsd, bnm = rows[-1]
    bd, bw, bh = shape(one(bsd, bnm))
    print(f"  가장 큰 곳 {bsd} {bnm} {ba}km² · {bw}×{bh}km")

    # 여섯째. 화면에는 안 쓰고 고정댓글에서 다섯에서 끊은 까닭을 댄다
    sixth = {"sido": rows[TOP][1], "name": rows[TOP][2], "area": rows[TOP][0]}

    json.dump({
        "day": day,
        "units": len(rows),
        "small": small,
        "big": {"sido": bsd, "name": bnm, "area": ba,
                "d": bd, "w": bw, "h": bh},
        "sixth": sixth,
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("→", OUT)


if __name__ == "__main__":
    main()
