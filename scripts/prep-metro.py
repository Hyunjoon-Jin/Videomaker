#!/usr/bin/env python3
"""서울 지하철 음영지역 — 역이 가장 먼 동 다섯.

## 야마

**서울인데 역까지 걸어서 갈 수 없는 동이 있다.** 종로구 평창동은
동의 절반이 가장 가까운 역에서 2.7km 넘게 떨어져 있다. 서울 424개
동의 중앙값이 0.52km니까 5배다.

## 앞선 두 판을 접었다

1. 「수도권 전철이 수도권을 벗어난다 — 148km」. 자로 세운 2호선이
   억지였고 주제가 뻔했다.
2. 「지하철로 가장 많이 돌아가는 두 역」. 야마는 섰는데 **화면이
   노선으로 뒤엉켰고 임팩트가 없었다.** 두 점을 잇는 선 하나로는
   보는 사람이 자기 이야기를 못 찾는다.

음영지역은 다르다. **자기 동네를 떠올리게 된다.**

## 어떻게 재나

동 경계 안을 **180m 격자로 훑어** 점마다 가장 가까운 역까지 직선
거리를 재고, 그 **중앙값**으로 동을 세운다.

중앙값을 쓰는 까닭이 있다. 「동 안에서 가장 먼 자리」로 세우면
산이 큰 동이 다 이긴다 — 그건 음영지역 순위가 아니라 산 순위다.
중앙값이면 **「동 절반이 이만큼 넘게 걸어야 한다」**가 되어 사는
이야기가 된다.

## 산이 섞이는 것은 어쩔 수 없다

평창동·부암동·진관동은 북한산이 동 안에 크게 들어 있다. 인구 격자
자료가 없어서 사람이 사는 자리만 골라 잴 수가 없다. **격자를 땅
전체에 깔았다고 화면과 고정댓글에 적는다.**

## 동 이름이 어긋난다

경계는 통계청 2018년, 인구는 행정안전부 2026년이다. 「시흥2동」과
「시흥제2동」처럼 **「제」 하나로 갈린다.** 숫자 앞 「제」를 털어
맞추면 424곳 중 414곳이 붙는다. 남는 열 곳은 그 사이 갈리거나
합쳐진 동이다.

사용:  python3 scripts/prep-metro.py
자료:  data/osm-metro.json                (없으면 scripts/fetch-metro.py)
       data/skorea-submunicipalities.json · data/pop-dong.json
       data/skorea-municipalities.json
출력:  src/data/metro.json
"""
import collections
import json
import math
import os
import re
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "data", "osm-metro.json")
SUB = os.path.join(HERE, "..", "data", "skorea-submunicipalities.json")
GEO = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
POP = os.path.join(HERE, "..", "data", "pop-dong.json")
OUT = os.path.join(HERE, "..", "src", "data", "metro.json")

BOX = 1000.0
R = 6371.0088
TOP = 5
# 동 안을 이 간격으로 훑는다. 서울 전체가 18,643점이다
STEP_DEG = 0.0018
# 역세권을 이 반경으로 본다. 걸어서 15분쯤이다
NEAR_KM = 1.0

LINE_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9",
              "수인·분당", "경의·중앙", "경춘", "경강", "서해", "공항철도",
              "신분당", "GTX-A", "인천1", "I2", "용인", "E", "W", "U",
              "김포 골드라인", "Silim", "의정부경전철"]
RANK = {r: i for i, r in enumerate(LINE_ORDER)}

GU = {"11010": "종로구", "11020": "중구", "11030": "용산구", "11040": "성동구",
      "11050": "광진구", "11060": "동대문구", "11070": "중랑구",
      "11080": "성북구", "11090": "강북구", "11100": "도봉구",
      "11110": "노원구", "11120": "은평구", "11130": "서대문구",
      "11140": "마포구", "11150": "양천구", "11160": "강서구",
      "11170": "구로구", "11180": "금천구", "11190": "영등포구",
      "11200": "동작구", "11210": "관악구", "11220": "서초구",
      "11230": "강남구", "11240": "송파구", "11250": "강동구"}


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, [a[1], a[0], b[1], b[0]])
    return 2 * R * math.asin(math.sqrt(
        math.sin((la2 - la1) / 2) ** 2
        + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2))


def rings(g):
    return (g["coordinates"] if g["type"] == "MultiPolygon"
            else [g["coordinates"]])


def inside(x, y, ring):
    c = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i][:2]
        x2, y2 = ring[(i + 1) % n][:2]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def projector(feats):
    """`scripts/prep-map.py`와 똑같은 투영. 전국 지도와 좌표계를 맞춘다."""
    lons, lats = [], []
    for f in feats:
        for poly in rings(f["geometry"]):
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
    # 지도 1단위가 몇 km인가. 역세권 원을 그리려면 이 값이 있어야 한다
    return project, 110.574 / scale


def path_of(g, project):
    out = []
    for poly in rings(g):
        pts = [project(x, y) for x, y in poly[0]]
        out.append("M" + "L".join(f"{x},{y}" for x, y in pts) + "Z")
    return " ".join(out)


def main():
    raw = json.load(open(SRC, encoding="utf-8"))
    nod = {e["id"]: e for e in raw["nodes"]}
    feats = json.load(open(GEO, encoding="utf-8"))["features"]
    project, km_per_unit = projector(feats)

    def nm(n):
        t = n.get("tags", {})
        return t.get("name:ko") or t.get("name") or "?"

    st = {}
    for n in raw["nodes"]:
        st.setdefault(nm(n), (n["lon"], n["lat"]))
    names = list(st)
    pts = [st[n] for n in names]

    # ── 노선망. 배경으로 깔 선이다 ──
    seg = {}
    segline = {}
    for r in raw["routes"]:
        ref = r["tags"].get("ref")
        if not ref:
            ref = ("의정부경전철" if "의정부" in r["tags"].get("name", "")
                   else "?")
        s = [nod[m["ref"]] for m in r["members"]
             if m["type"] == "node" and m["role"].startswith("stop")
             and m["ref"] in nod]
        for a, b in zip(s, s[1:]):
            x, y = nm(a), nm(b)
            if x == y:
                continue
            k = tuple(sorted((x, y)))
            seg[k] = True
            if RANK.get(ref, 99) < RANK.get(segline.get(k), 99):
                segline[k] = ref

    # ── 서울 ──
    seoul_gu = [f for f in feats
                if str(f["properties"].get("code", "")).startswith("11")]
    dongs = [f for f in json.load(open(SUB, encoding="utf-8"))["features"]
             if str(f["properties"].get("code", "")).startswith("11")]

    def norm(s):
        return re.sub(r"제(?=\d)", "", s)

    pop = collections.Counter()
    for sido, gu, dong, n in json.load(open(POP, encoding="utf-8"))["행정동"]:
        if sido == "서울특별시":
            pop[norm(dong)] += n

    rows = []
    grid = 0
    far = 0
    for f in dongs:
        name = f["properties"]["name"]
        g = f["geometry"]
        gu = GU.get(str(f["properties"]["code"])[:5], "?")
        xs = [p[0] for poly in rings(g) for p in poly[0]]
        ys = [p[1] for poly in rings(g) for p in poly[0]]
        cells = []
        x = min(xs)
        while x <= max(xs):
            y = min(ys)
            while y <= max(ys):
                if any(inside(x, y, poly[0]) for poly in rings(g)):
                    cells.append((x, y))
                y += STEP_DEG
            x += STEP_DEG
        if not cells:
            continue
        got = []
        for p in cells:
            j = min(range(len(pts)), key=lambda i: km(p, pts[i]))
            got.append((km(p, pts[j]), p, names[j]))
        got.sort()
        grid += len(got)
        far += sum(1 for d, _, _ in got if d > NEAR_KM)
        d, p, near = got[len(got) // 2]
        rows.append({
            "name": name, "gu": gu, "km": round(d, 2),
            "pop": pop.get(name),
            "d": path_of(g, project),
            # 거리가 딱 중앙값인 자리. 여기서 역까지 선을 긋는다
            "x": project(*p)[0], "y": project(*p)[1],
            "near": near,
            "nx": project(*st[near])[0], "ny": project(*st[near])[1],
        })
    rows.sort(key=lambda r: -r["km"])
    top = rows[:TOP]

    out = {
        "seg": [[*project(*st[a]), *project(*st[b]), segline.get((a, b), "?")]
                for a, b in seg],
        # 역세권 원을 그릴 자리. 서울 언저리만 남긴다
        "stations": [list(project(*v)) for v in st.values()],
        "kmPerUnit": round(km_per_unit, 4),
        "nearKm": NEAR_KM,
        "seoul": [path_of(f["geometry"], project) for f in seoul_gu],
        "dongs": len(rows),
        "grid": grid,
        "farPct": round(far / grid * 100),
        "medianKm": round(statistics.median(r["km"] for r in rows), 2),
        "stepM": round(STEP_DEG * 110574),
        # 5위에서 1위로 올라간다
        "top": list(reversed(top)),
        "topPop": sum(r["pop"] for r in top if r["pop"]),
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    print(f"서울 {len(rows)}개 동 · 격자 {grid:,}점({out['stepM']}m 간격)")
    print(f"동 중앙값의 중앙값 {out['medianKm']}km · "
          f"역에서 {NEAR_KM}km 밖 땅 {out['farPct']}%")
    print("\n음영지역 — 동 절반이 이만큼 넘게 걸어야 한다")
    for i, r in enumerate(top, 1):
        print(f"  {i}위  {r['km']:5.2f}km  {r['gu']} {r['name']:8} "
              f"{(str(r['pop']) + '명') if r['pop'] else '(인구 못 붙임)':>10}"
              f"  최근접 {r['near']}")
    print(f"\n다섯 곳 인구 합 {out['topPop']:,}명")
    print("→", OUT)


if __name__ == "__main__":
    main()
