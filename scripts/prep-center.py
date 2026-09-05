#!/usr/bin/env python3
"""사람의 한가운데 — 인구 무게중심과 국토 무게중심.

## 야마

**대한민국 사람의 한가운데는 서울이 아니라 충북 청주다.**
인구의 절반이 수도권에 사는데도 무게중심은 서울에서 109km 떨어진
청주시 흥덕구 강서2동이고, 땅의 한가운데(옥천군 청산면)와는
46.8km밖에 안 떨어져 있다. 수도권이 북으로 당기는 만큼 영남·호남이
남으로 되당기기 때문이다.

## 어떻게 재나

시·군마다 **경계의 무게중심**을 구하고 거기에 그 시·군 인구를 실어
평균 낸다. 땅의 한가운데는 같은 경계로 인구 대신 **면적**을 실어
잰 값이다. **같은 방식·같은 지도라 두 값을 곧바로 견줄 수 있다.**

## 자치구를 상위 시로 접는다

경계는 통계청 2018년, 인구는 행정안전부 2026년이다. 그 사이
**광주가 전남과 통합됐고**(자료에 「전남광주통합특별시」로 나온다),
인천에 제물포·영종·미추홀·서해·검단구가 새로 생겼고, 부천·화성에
구가 생겼고, 군위군이 대구로 갔다.

동 단위로 붙이면 3,504곳 중 881곳이 어긋난다. **자치구를 상위 시로
접고 광역시는 통째로 한 자리로 보면** 이름이 바뀐 구들이 다 흡수돼
162자리에 5,108만 명이 100% 붙는다.

**대신 광역시 안의 분포가 뭉개진다.** 여덟 광역시를 행정동으로
쪼개 다시 재면 전국 중심이 **1.72km** 움직인다 — 46.8km의 3.7%다.
서울만 보면 안 된다. 서울은 인구가 고르게 퍼져 면적중심과 인구중심이
0.23km밖에 안 떨어져 있지만, **인천은 강화·옹진 때문에 대표점이
실제보다 서쪽에 치우친다.** 근사의 크기를 숨기지 않고 화면에 적는다.

## 시도를 빼 보면 누가 당기는지 나온다

시도를 하나씩 빼고 다시 재면 그 시도가 중심을 얼마나 당기고 있었는지가
나온다. 경기를 빼면 남쪽으로, 부산을 빼면 **북쪽으로** 움직인다 —
수도권만 당기는 게 아니라는 증거이고 야마를 떠받치는 자리다.

사용:  python3 scripts/prep-center.py
자료:  data/pop-dong.json · data/skorea-municipalities.json
       data/skorea-submunicipalities.json (근사 오차를 재는 데 쓴다)
출력:  src/data/center.json
"""
import collections
import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
POP = os.path.join(HERE, "..", "data", "pop-dong.json")
GEO = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
SUB = os.path.join(HERE, "..", "data", "skorea-submunicipalities.json")
OUT = os.path.join(HERE, "..", "src", "data", "center.json")

BOX = 1000.0
R = 6371.0088
TOP = 5

SIDO = {"11": "서울", "21": "부산", "22": "대구", "23": "인천", "24": "광주",
        "25": "대전", "26": "울산", "29": "세종", "31": "경기", "32": "강원",
        "33": "충북", "34": "충남", "35": "전북", "36": "전남", "37": "경북",
        "38": "경남", "39": "제주"}
WIDE = {"서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종"}
CAPITAL = {"서울", "인천", "경기"}

# 인구 자료의 시도 이름 → 경계 쪽 두 글자.
# **앞 두 글자로 자르면 안 된다** — 충청북도·충청남도가 둘 다 「충청」이
# 되어 통째로 어긋나고, 그러면 중심이 66km까지 틀어진다.
PSIDO = {"서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구",
         "인천광역시": "인천", "대전광역시": "대전", "울산광역시": "울산",
         "세종특별자치시": "세종", "경기도": "경기", "강원특별자치도": "강원",
         "충청북도": "충북", "충청남도": "충남", "전북특별자치도": "전북",
         "전남광주통합특별시": "전남", "경상북도": "경북", "경상남도": "경남",
         "제주특별자치도": "제주"}
# 광주가 전남에 묶여 들어온다. 구 이름으로 되돌린다
GWANGJU = {"동구", "서구", "남구", "북구", "광산구"}


def rings(g):
    return (g["coordinates"] if g["type"] == "MultiPolygon"
            else [g["coordinates"]])


def ring_ac(r):
    """링 하나의 면적과 무게중심. 경도는 위도로 압축해 평면으로 본다."""
    lat0 = sum(p[1] for p in r) / len(r)
    k = math.cos(math.radians(lat0))
    a = cx = cy = 0.0
    for i in range(len(r) - 1):
        x1, y1 = r[i][0] * k, r[i][1]
        x2, y2 = r[i + 1][0] * k, r[i + 1][1]
        f = x1 * y2 - x2 * y1
        a += f
        cx += (x1 + x2) * f
        cy += (y1 + y2) * f
    if a == 0:
        return 0.0, (r[0][0], r[0][1])
    a *= 0.5
    return abs(a), (cx / (6 * a) / k, cy / (6 * a))


def centroid(g):
    t = sx = sy = 0.0
    for poly in rings(g):
        a, (x, y) = ring_ac(poly[0])
        t += a
        sx += x * a
        sy += y * a
    return ((sx / t, sy / t), t) if t else (None, 0.0)


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, [a[1], a[0], b[1], b[0]])
    return 2 * R * math.asin(math.sqrt(
        math.sin((la2 - la1) / 2) ** 2
        + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2))


def nz(s):
    return re.sub(r"[\s·]", "", s or "")


def fold(sido, gu):
    """자치구를 상위 시로 접는다. 광역시는 통째로 한 자리다."""
    gu = nz(gu)
    if sido in WIDE:
        return (sido, sido)
    m = re.match(r"(.+?시).*구$", gu)
    return (sido, m.group(1)) if m else (sido, gu)


def inside(x, y, r):
    c = False
    n = len(r)
    for i in range(n):
        x1, y1 = r[i][:2]
        x2, y2 = r[(i + 1) % n][:2]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def main():
    raw = json.load(open(POP, encoding="utf-8"))
    feats = json.load(open(GEO, encoding="utf-8"))["features"]

    # ── 투영. `scripts/prep-map.py`와 똑같이 맞춘다 ──
    lons, lats = [], []
    for f in feats:
        for poly in rings(f["geometry"]):
            for x, y in poly[0]:
                lons.append(x)
                lats.append(y)
    lon0, lon1 = min(lons), max(lons)
    lat0, lat1 = min(lats), max(lats)
    kx = math.cos(math.radians((lat0 + lat1) / 2))
    w, h = (lon1 - lon0) * kx, lat1 - lat0
    scale = BOX / max(w, h)
    offx, offy = (BOX - w * scale) / 2, (BOX - h * scale) / 2

    def project(x, y):
        return (round((x - lon0) * kx * scale + offx, 2),
                round(BOX - ((y - lat0) * scale + offy), 2))

    # ── 인구 ──
    pop = collections.Counter()
    for sido, gu, dong, n in raw["행정동"]:
        sd = PSIDO[sido]
        g = nz(gu)
        if sd == "전남" and g in GWANGJU:
            sd = "광주"
        if sd == "세종":
            g = "세종"
        pop[fold(sd, g)] += n
    total = sum(pop.values())

    # ── 자리마다 경계 무게중심과 면적 ──
    box = collections.defaultdict(lambda: [0.0, 0.0, 0.0])
    for f in feats:
        code = str(f["properties"]["code"])
        key = fold(SIDO[code[:2]], f["properties"]["name"])
        for poly in rings(f["geometry"]):
            a, (x, y) = ring_ac(poly[0])
            b = box[key]
            b[0] += x * a
            b[1] += y * a
            b[2] += a
    places = {k: ((v[0] / v[2], v[1] / v[2]), v[2])
              for k, v in box.items() if v[2] > 0}

    lost = [k for k in pop if k not in places]
    if lost:
        raise SystemExit(f"경계를 못 찾은 자리: {lost}")

    def weigh(w_of, skip=None):
        sx = sy = t = 0.0
        for k, (c, a) in places.items():
            if skip and k[0] == skip:
                continue
            v = w_of(k, a)
            sx += c[0] * v
            sy += c[1] * v
            t += v
        return (sx / t, sy / t)

    ppl = weigh(lambda k, a: pop.get(k, 0))
    land = weigh(lambda k, a: a)

    def where(p):
        for f in feats:
            if any(inside(p[0], p[1], poly[0]) for poly in rings(f["geometry"])):
                code = str(f["properties"]["code"])
                return SIDO[code[:2]] + " " + f["properties"]["name"]
        return "?"

    # ── 시도를 빼면 중심이 얼마나 움직이나 ──
    pulls = []
    for sd in sorted({k[0] for k in places}):
        q = weigh(lambda k, a: pop.get(k, 0), skip=sd)
        dy = (q[1] - ppl[1]) * 111.32
        pulls.append({
            "sido": sd,
            "pop": sum(pop.get(k, 0) for k in places if k[0] == sd),
            "km": round(km(q, ppl), 1),
            # 빼면 중심이 남으로 가나 북으로 가나. **남쪽이 당기고
            # 있었다는 뜻이 북쪽이다** — 야마를 떠받치는 값이다
            "north": dy > 0,
            "x": project(*q)[0], "y": project(*q)[1],
            "where": where(q),
        })
    pulls.sort(key=lambda r: -r["km"])

    # ── 근사의 크기 — 광역시를 행정동으로 쪼개 다시 잰다 ──
    #
    # 광역시를 한 점으로 본 것이 이 편의 유일한 근사다. **서울은
    # 인구가 고르게 퍼져 있어 면적중심과 인구중심이 0.23km밖에 안
    # 떨어져 있지만, 인천은 강화·옹진 때문에 대표점이 실제보다
    # 서쪽에 치우친다.** 그래서 서울만 봐서는 안 되고 여덟 광역시를
    # 다 쪼개 봐야 한다.
    #
    # 동 이름이 2018 경계와 2026 인구 사이에 어긋나는 것이 있어
    # 88~98%만 붙는다. **못 붙은 인구는 그 광역시 면적중심에 그대로
    # 남긴다** — 그러면 이 값은 근사 오차의 하한이 된다.
    subs = json.load(open(SUB, encoding="utf-8"))["features"]

    def nd(x):
        return re.sub(r"제(?=\d)", "", nz(x))

    dong = collections.defaultdict(collections.Counter)
    for sido, gu, dg, n in raw["행정동"]:
        sd = PSIDO[sido]
        g = nz(gu)
        if sd == "전남" and g in GWANGJU:
            sd = "광주"
        if sd in WIDE:
            dong[sd][nd(dg)] += n

    fine = {}
    matched = {}
    for sd in dong:
        code = [c for c, v in SIDO.items() if v == sd][0]
        sx = sy = t = 0.0
        got = 0
        for f in subs:
            if str(f["properties"]["code"])[:2] != code:
                continue
            n = dong[sd].get(nd(f["properties"]["name"]))
            if not n:
                continue
            c, _ = centroid(f["geometry"])
            sx += c[0] * n
            sy += c[1] * n
            t += n
            got += n
        rest = sum(dong[sd].values()) - got
        c0 = places[(sd, sd)][0]
        sx += c0[0] * rest
        sy += c0[1] * rest
        t += rest
        fine[(sd, sd)] = (sx / t, sy / t)
        matched[sd] = round(got / sum(dong[sd].values()) * 100)

    sx = sy = t = 0.0
    for k, (c, a) in places.items():
        n = pop.get(k, 0)
        q = fine.get(k, c)
        sx += q[0] * n
        sy += q[1] * n
        t += n
    approx = round(km((sx / t, sy / t), ppl), 2)

    span = round((lat1 - lat0) * 111.32)
    d = km(ppl, land)
    out = {
        "asOf": raw.get("기준"),
        "source": raw.get("출처"),
        "total": total,
        "places": len(places),
        # 자리마다 인구. 지도에 거품으로 깐다
        "dots": [{"sido": k[0], "name": k[1],
                  "x": project(*c)[0], "y": project(*c)[1],
                  "pop": pop.get(k, 0)}
                 for k, (c, a) in sorted(places.items(),
                                         key=lambda kv: -pop.get(kv[0], 0))],
        "land": {"x": project(*land)[0], "y": project(*land)[1],
                 "lat": round(land[1], 4), "lon": round(land[0], 4),
                 "where": where(land)},
        "ppl": {"x": project(*ppl)[0], "y": project(*ppl)[1],
                "lat": round(ppl[1], 4), "lon": round(ppl[0], 4),
                "where": where(ppl)},
        "distKm": round(d, 1),
        "northKm": round((ppl[1] - land[1]) * 111.32, 1),
        "westKm": round(-(ppl[0] - land[0]) * 111.32
                        * math.cos(math.radians(land[1])), 1),
        "spanKm": span,
        "pctOfSpan": round(d / span * 100, 1),
        "toSeoul": round(km(ppl, (126.9784, 37.5667))),
        "toBusan": round(km(ppl, (129.0756, 35.1796))),
        "capPop": sum(v for k, v in pop.items() if k[0] in CAPITAL),
        "capPct": round(sum(v for k, v in pop.items() if k[0] in CAPITAL)
                        / total * 100, 1),
        "pulls": pulls[:TOP],
        # 광역시를 한 점으로 본 근사가 얼마나 되나 (행정동으로
        # 쪼개 다시 잰 값과의 차이). 화면에 그대로 적는다
        "approxKm": approx,
        "approxMatched": matched,
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    print(f"{out['places']}자리 · {out['total']:,}명 ({out['asOf']}) · 100% 붙었다")
    print(f"\n땅의 한가운데  {out['land']['lat']}N {out['land']['lon']}E  "
          f"{out['land']['where']}")
    print(f"사람의 한가운데 {out['ppl']['lat']}N {out['ppl']['lon']}E  "
          f"{out['ppl']['where']}")
    print(f"사이 {out['distKm']}km (북 {out['northKm']} · 서 {out['westKm']}) "
          f"· 국토 남북 {span}km의 {out['pctOfSpan']}%")
    print(f"서울 {out['toSeoul']}km · 부산 {out['toBusan']}km · "
          f"수도권 {out['capPct']}%")
    print(f"\n광역시를 행정동으로 쪼개 다시 재면 중심이 {approx}km 움직인다")
    print("  동 매칭률 " + " · ".join(f"{k} {v}%" for k, v in sorted(matched.items())))
    print("\n시도를 빼면 중심이 얼마나 움직이나")
    for r in out["pulls"]:
        print(f"  {r['sido']:3s} {r['pop']:>10,}명  "
              f"{r['km']:5.1f}km {'북' if r['north'] else '남'}쪽 → {r['where']}")
    print("→", OUT)


if __name__ == "__main__":
    main()
