#!/usr/bin/env python3
"""아침 8시의 신림역 — 시각마다 부푸는 서울 지하철.

## 야마

**신림역은 하루 총량 12위인데, 아침 한 시간만은 서울 1위다.**
08-09시 승차 11,479명, 1초에 3.2명. 같은 시각 241역 평균이 1초에
0.56명이니 5.7배다. 재는 자가 자료 안에 있다.

## 무엇을 내보내나

역마다 20개 시간대의 승차·하차 인원. 화면은 그 값으로 거품 반지름을
정한다. **넓이가 인원에 비례하도록** 반지름은 화면에서 제곱근으로
만든다 — 여기서는 인원을 그대로 넘긴다.

## 역 이름 붙이기

승하차 자료는 「잠실(송파구청)」처럼 병기역명이 괄호로 붙어 있고,
OSM은 「잠실」이다. 공백·괄호·가운뎃점을 털어 맞추고, 그래도 안 되면
괄호 앞만 떼어 다시 맞춘다. 241역 중 240역이 붙는다.

**남는 하나가 당고개다.** 2024년 3월에 불암산으로 바뀌었는데 승하차
자료는 옛 이름을 쓴다. 손으로 이어 준다.

## 13-14시간대는 빼고 넘긴다

그 칸이 오염돼 있다(`scripts/fetch-rush.py` 참고). 화면이 실수로
집어 쓰지 않도록 **`null`로 바꿔서** 넘긴다. 지워 버리면 시간대
번호가 밀려 더 위험하다.

사용:  python3 scripts/prep-rush.py
자료:  data/subway-hours.json      (scripts/fetch-rush.py)
       data/osm-metro.json         (scripts/fetch-metro.py)
       data/skorea-municipalities.json
출력:  src/data/rush.json
"""
import json
import math
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
HRS = os.path.join(HERE, "..", "data", "subway-hours.json")
OSM = os.path.join(HERE, "..", "data", "osm-metro.json")
GEO = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
OUT = os.path.join(HERE, "..", "src", "data", "rush.json")

BOX = 1000.0
STAR = "신림"
# 2024년 3월 개명. 승하차 자료가 옛 이름을 쓴다
ALIAS = {"당고개": "불암산"}

LINE_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8"]
RANK = {r: i for i, r in enumerate(LINE_ORDER)}

# 걸음마다 [시간대 번호, 승차인가]
BEATS = [(1, True), (2, True), (3, True), (10, True),
         (15, False), (18, False)]


def rings(g):
    return (g["coordinates"] if g["type"] == "MultiPolygon"
            else [g["coordinates"]])


def projector(feats):
    """`scripts/prep-map.py`와 똑같은 투영. 다른 편들과 좌표계를 맞춘다."""
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
        return (round((x - lon0) * kx * scale + offx, 1),
                round(BOX - ((y - lat0) * scale + offy), 1))
    return project


def path_of(g, project):
    out = []
    for poly in rings(g):
        pts = [project(x, y) for x, y in poly[0]]
        out.append("M" + "L".join(f"{x},{y}" for x, y in pts) + "Z")
    return " ".join(out)


def core(s):
    return re.sub(r"[\s()·・]", "", s)


def main():
    hrs = json.load(open(HRS, encoding="utf-8"))
    raw = json.load(open(OSM, encoding="utf-8"))
    feats = json.load(open(GEO, encoding="utf-8"))["features"]
    project = projector(feats)

    hours = hrs["hours"]
    dirty = hours.index(hrs["dirty"])

    def nm(n):
        t = n.get("tags", {})
        return t.get("name:ko") or t.get("name") or "?"

    # ── OSM 역 좌표 ──
    nod = {e["id"]: e for e in raw["nodes"]}
    pos = {}
    for n in raw["nodes"]:
        pos.setdefault(nm(n), (n["lon"], n["lat"]))
    byc = {}
    for k, v in pos.items():
        byc.setdefault(core(k), v)

    def find(name):
        for k in (ALIAS.get(name, name), name.split("(")[0]):
            v = byc.get(core(k))
            if v:
                return v
        return None

    # ── 노선망. 1~8호선만, 배경으로 깐다 ──
    seg, segline = {}, {}
    for r in raw["routes"]:
        ref = r["tags"].get("ref")
        if ref not in RANK:
            continue
        stops = [nod[m["ref"]] for m in r["members"]
                 if m["type"] == "node" and m["role"].startswith("stop")
                 and m["ref"] in nod]
        for a, b in zip(stops, stops[1:]):
            x, y = nm(a), nm(b)
            if x == y:
                continue
            k = tuple(sorted((x, y)))
            seg[k] = True
            if RANK.get(ref, 99) < RANK.get(segline.get(k), 99):
                segline[k] = ref

    # ── 역 ──
    stations = []
    lost = []
    ll = []
    for name in hrs["on"]:
        p = find(name)
        if p:
            ll.append(p)
        if not p:
            lost.append(name)
            continue
        x, y = project(*p)
        clean = lambda v: [None if i == dirty else n
                           for i, n in enumerate(v)]
        stations.append({
            "name": name.split("(")[0],
            "x": x, "y": y,
            "on": clean(hrs["on"][name]),
            "off": clean(hrs["off"][name]),
        })
    if lost:
        raise SystemExit(f"좌표를 못 붙인 역: {lost}")

    idx = {s["name"]: s for s in stations}

    # ── 배경 땅. 노선망이 닿는 시군구만 남긴다 ──
    # 교통공사 구간은 하남·성남·부천·인천까지 뻗는다. 서울만 그리면
    # 노선 끝이 허공에 뜬다
    pad = 0.05
    lo0, lo1 = min(p[0] for p in ll) - pad, max(p[0] for p in ll) + pad
    la0, la1 = min(p[1] for p in ll) - pad, max(p[1] for p in ll) + pad
    land = [f for f in feats
            if any(lo0 <= x <= lo1 and la0 <= y <= la1
                   for poly in rings(f["geometry"]) for x, y in poly[0])]

    def top(i, boarding):
        key = "on" if boarding else "off"
        return sorted(stations, key=lambda s: -(s[key][i] or 0))

    # ── 걸음마다 1위와 인원 ──
    beats = []
    for i, boarding in BEATS:
        key = "on" if boarding else "off"
        rank = top(i, boarding)
        star = idx[STAR]
        beats.append({
            "hour": i, "on": boarding,
            "lead": rank[0]["name"], "leadN": rank[0][key][i],
            "second": rank[1]["name"], "secondN": rank[1][key][i],
            "starN": star[key][i],
            "starRank": [s["name"] for s in rank].index(STAR) + 1,
        })

    # ── 편을 떠받치는 수치 ──
    peak = 3                     # 08-09시간대
    star = idx[STAR]
    live = [i for i in range(len(hours)) if i != dirty]
    avg = sum(s["on"][peak] for s in stations) / len(stations)
    total = {s["name"]: sum(s["on"][i] + s["off"][i] for i in live)
             for s in stations}
    order = sorted(total, key=lambda k: -total[k])

    out = {
        "hours": hours,
        "dirtyHour": dirty,
        "days": hrs["days"],
        "seg": [[*project(*pos[a]), *project(*pos[b]),
                 segline.get((a, b), "?")] for a, b in seg],
        "land": [path_of(f["geometry"], project) for f in land],
        "seoul": [path_of(f["geometry"], project) for f in feats
                  if str(f["properties"].get("code", "")).startswith("11")],
        "stations": stations,
        "star": STAR,
        "peakHour": peak,
        "peakN": star["on"][peak],
        "peakPerSec": round(star["on"][peak] / 3600, 1),
        "avgN": round(avg),
        "avgPerSec": round(avg / 3600, 2),
        "peakSecond": top(peak, True)[1]["name"],
        "peakSecondN": top(peak, True)[1]["on"][peak],
        "gangnamN": idx["강남"]["on"][peak],
        "dayRank": order.index(STAR) + 1,
        "dayN": round(total[STAR]),
        "dayTop": order[0],
        "dayTopN": round(total[order[0]]),
        "beats": beats,
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    print(f"{len(stations)}역 · 평일 {hrs['days']}일 평균 · "
          f"{hours[dirty]} 칸은 비웠다")
    print(f"\n{hours[peak]} 승차")
    for s in top(peak, True)[:5]:
        print(f"  {s['name']:12s} {s['on'][peak]:7,}  "
              f"{s['on'][peak]/3600:.2f}명/초")
    print(f"  241역 평균     {out['avgN']:7,}  {out['avgPerSec']}명/초  "
          f"→ {out['peakN']/avg:.1f}배")
    print(f"\n{STAR} 하루 총량 {out['dayN']:,}명 · 서울 {out['dayRank']}위 "
          f"(1위 {out['dayTop']} {out['dayTopN']:,}명)")
    print("\n걸음")
    for b in beats:
        print(f"  {hours[b['hour']]:9s} {'승차' if b['on'] else '하차'}  "
              f"1위 {b['lead']:10s} {b['leadN']:6,}  ·  "
              f"{STAR} {b['starN']:6,} {b['starRank']}위")
    print("→", OUT)


if __name__ == "__main__":
    main()
