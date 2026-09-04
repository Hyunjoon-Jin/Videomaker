#!/usr/bin/env python3
"""수도권 전철은 수도권이 아니다 — 노선망과 네 끝.

## 야마

**남쪽 끝이 충남 아산, 동쪽 끝이 강원 춘천, 북쪽 끝이 경기 연천이다.
신창에서 연천까지 직선 148km — 2호선을 3바퀴 도는 거리다.**

## 자를 자료 안에서 찾는다

**2호선 순환선 한 바퀴 43역 47.1km.** 수도권에 사는 사람은 이
길이를 몸으로 안다. 바깥에서 빌린 자가 아니라 같은 노선망 안에
있는 자다.

## 급행을 걸러야 한다

이름에 「급행」이 든 계통은 역을 건너뛰어 이어져 있다. 안 거르고
세면 신창~연천이 48역으로 나온다. **완행만 이으면 76역이다.**

## 거리는 직선이다

역과 역을 대권거리로 이은 값이라 선로 길이가 아니다. 화면에 쓰는
148km는 **두 역 사이 직선**이고, 기록값(영업거리)이 아니라
계산값이라고 밝힌다.

## 수도권 밖 역

역 668곳을 시군구 경계에 하나씩 떨어뜨려 센다. 17곳이 서울·경기·
인천 밖이다 — 충남 11(아산 5 · 천안 6) · 강원 6(춘천).

사용:  python3 scripts/prep-metro.py
자료:  data/osm-metro.json                (없으면 scripts/fetch-metro.py)
       data/skorea-municipalities.json
출력:  src/data/metro.json
"""
import collections
import heapq
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "data", "osm-metro.json")
GEO = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
OUT = os.path.join(HERE, "..", "src", "data", "metro.json")

BOX = 1000.0
R = 6371.0088

# 네 끝. 이름은 자료에서 찾고 방향만 여기 적는다
SOUTH, NORTH = "신창", "연천"
EAST_TERM = "춘천"          # 화면에 쓰는 이름. 실제 최동단은 남춘천이다
WEST = "인천공항2터미널"

SIDO = {"11": "서울", "21": "부산", "22": "대구", "23": "인천",
        "24": "전남광주", "25": "대전", "26": "울산", "29": "세종",
        "31": "경기", "32": "강원", "33": "충북", "34": "충남",
        "35": "전북", "36": "전남광주", "37": "경북", "38": "경남",
        "39": "제주"}
CAPITAL = {"서울", "경기", "인천"}


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, [a[1], a[0], b[1], b[0]])
    return 2 * R * math.asin(math.sqrt(
        math.sin((la2 - la1) / 2) ** 2
        + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2))


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
        return (round((x - lon0) * kx * scale + offx, 1),
                round(BOX - ((y - lat0) * scale + offy), 1))
    return project


def inside(x, y, ring):
    c = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i][:2]
        x2, y2 = ring[(i + 1) % n][:2]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def main():
    raw = json.load(open(SRC, encoding="utf-8"))
    rel, nodes = raw["routes"], raw["nodes"]
    nod = {e["id"]: e for e in nodes}
    feats = json.load(open(GEO, encoding="utf-8"))["features"]
    project = projector(feats)

    def nm(n):
        t = n.get("tags", {})
        return t.get("name:ko") or t.get("name") or "?"

    def stops(r):
        return [nod[m["ref"]] for m in r["members"]
                if m["type"] == "node" and m["role"].startswith("stop")
                and m["ref"] in nod]

    # ── 역: 환승역은 노선마다 노드가 따로라 이름으로 묶는다 ──
    st = {}
    for n in nodes:
        st.setdefault(nm(n), (n["lon"], n["lat"]))

    # ── 구간: 방향·계통 변형을 다 합쳐 하나로 ──
    seg = {}
    # 역 수를 세는 그래프는 **1호선 완행만** 넣는다.
    # 다른 노선을 섞으면 갈아타는 길이 잡혀 71역으로 줄고,
    # 급행을 섞으면 역을 건너뛰어 48역으로 줄어든다.
    # 「1호선 하나로 신창에서 연천까지」가 이 편이 하려는 말이다.
    G = collections.defaultdict(dict)
    for r in rel:
        s = stops(r)
        one = (r["tags"].get("ref") == "1"
               and "급행" not in (r["tags"].get("name", "") or ""))
        for a, b in zip(s, s[1:]):
            x, y = nm(a), nm(b)
            if x == y:
                continue
            d = km(st[x], st[y])
            k = tuple(sorted((x, y)))
            if k not in seg or d < seg[k]:
                seg[k] = d
            if one and (y not in G[x] or d < G[x][y]):
                G[x][y] = d
                G[y][x] = d

    # ── 시도를 붙인다. 수도권 밖이 몇 곳인가 ──
    polys = []
    for f in feats:
        code = str(f["properties"].get("code", ""))
        sido = SIDO.get(code[:2], "?")
        g = f["geometry"]
        for poly in (g["coordinates"] if g["type"] == "MultiPolygon"
                     else [g["coordinates"]]):
            ring = poly[0]
            xs = [p[0] for p in ring]
            ys = [p[1] for p in ring]
            polys.append((min(xs), max(xs), min(ys), max(ys), ring, sido,
                          f["properties"].get("name", "")))
    where = {}
    for name, (x, y) in st.items():
        for x0, x1, y0, y1, ring, sido, mn in polys:
            if x0 <= x <= x1 and y0 <= y <= y1 and inside(x, y, ring):
                where[name] = (sido, mn)
                break
    outside = sorted((v[0], v[1], k) for k, v in where.items()
                     if v[0] not in CAPITAL)
    bysido = collections.Counter(v[0] for v in where.values())

    # ── 남 → 북 완행 경로. 역 수가 최소인 길 ──
    def walk(src, dst):
        pq = [(0, 0.0, src, [src])]
        seen = set()
        while pq:
            n, c, u, p = heapq.heappop(pq)
            if u == dst:
                return p, c
            if u in seen:
                continue
            seen.add(u)
            for v, d in G[u].items():
                if v not in seen:
                    heapq.heappush(pq, (n + 1, c + d, v, p + [v]))
        raise SystemExit(f"{src}에서 {dst}로 가는 길이 없다")

    path, path_km = walk(SOUTH, NORTH)

    # ── 2호선 순환선. 이 편의 자다 ──
    loop = [r for r in rel if r["tags"].get("ref") == "2"
            and "순환" in r["tags"].get("name", "")][0]
    ls = [nm(n) for n in stops(loop)]
    loop_km = sum(km(st[a], st[b]) for a, b in zip(ls, ls[1:]))
    span = km(st[SOUTH], st[NORTH])

    # ── 최동단은 춘천이 아니라 남춘천이다 ──
    east = max(st.items(), key=lambda kv: kv[1][0])[0]

    def pt(name):
        x, y = project(*st[name])
        return {"name": name, "x": x, "y": y,
                "lat": round(st[name][1], 3), "lon": round(st[name][0], 3),
                "sido": where.get(name, ("?", ""))[0],
                "sigungu": where.get(name, ("?", ""))[1]}

    lines = {r["tags"].get("ref") or r["tags"].get("name", "?") for r in rel}
    out = {
        "stations": len(st),
        "segments": len(seg),
        "lines": len(lines),
        # 노선망. 그리기용 선분만 남긴다
        "seg": [[*project(*st[a]), *project(*st[b])] for a, b in seg],
        "loop": [project(*st[n]) for n in ls],
        "loopStations": len(ls) - 1,          # 순환선이라 첫 역이 끝에 또 있다
        "loopKm": round(loop_km, 1),
        "south": pt(SOUTH), "north": pt(NORTH),
        "east": pt(EAST_TERM), "west": pt(WEST),
        "eastMost": east,
        "spanKm": round(span, 1),
        "laps": round(span / loop_km, 2),
        "pathStations": len(path),
        "pathKm": round(path_km, 1),
        "outside": [{"sido": s, "sigungu": g, "name": n} for s, g, n in outside],
        "bySido": dict(bysido.most_common()),
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    print(f"노선 {len(lines)}개 · 역 {len(st)}곳 · 구간 {len(seg)}개")
    print(f"2호선 순환선 {out['loopStations']}역 {out['loopKm']}km  ← 자")
    print(f"{SOUTH}({out['south']['lat']}N) ↔ {NORTH}({out['north']['lat']}N)"
          f"  직선 {out['spanKm']}km = {out['laps']}바퀴")
    print(f"1호선 완행 {SOUTH}→{NORTH} {out['pathStations']}역"
          f" · 역간 직선 합 {out['pathKm']}km")
    print(f"최동단 역은 {east} (화면에는 {EAST_TERM}으로 쓴다)")
    print(f"수도권 밖 {len(outside)}곳 · " +
          " · ".join(f"{k} {v}" for k, v in out["bySido"].items()))
    print("→", OUT)


if __name__ == "__main__":
    main()
