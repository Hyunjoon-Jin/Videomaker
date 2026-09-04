#!/usr/bin/env python3
"""서울에서 가장 많이 타는 역 — 시간대별 승차 TOP 5.

## 야마

**서울에서 지하철을 가장 많이 타는 역은 하나가 아니다.**
하루 동안 1위 자리를 **6개 역이 나눠 갖고, 8번 바뀐다** —
첫차 대림, 아침 신림, 낮 잠실, 저녁 시청, 밤 강남, 막차 홍대입구.

정점은 08-09시 신림역 11,479명, **1초에 3.2명**. 같은 시각
241역 평균이 2,018명(1초에 0.56명)이니 5.7배다. 재는 자가 자료
안에 있다.

## 무엇을 내보내나

역마다 20개 시간대의 승차 인원과, 걸음마다 그 시각 **승차 TOP 5**.
화면은 그 값으로 거품 반지름을 정한다. **넓이가 인원에 비례하도록**
반지름은 화면에서 제곱근으로 만든다 — 여기서는 인원을 그대로 넘긴다.

**하차는 안 쓴다.** 한 편에서 두 값을 세면 「무엇의 1위인가」가
흐려진다.

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
TOP = 5
# 2024년 3월 개명. 승하차 자료가 옛 이름을 쓴다
ALIAS = {"당고개": "불암산"}

LINE_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8"]
RANK = {r: i for i, r in enumerate(LINE_ORDER)}

# 걸음마다 시간대 번호. **1위가 바뀌는 자리만 골랐다** —
# 첫차 대림 · 08시 신림 · 15시 잠실 · 18시 시청 · 21시 강남 ·
# 막차 홍대입구. 여섯 걸음에 여섯 역이 다 나온다.
# 13-14시간대(8번)는 오염돼 있어 애초에 고를 수 없다.
BEATS = [0, 3, 10, 13, 16, 18]


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
    live = [i for i in range(len(hours)) if i != dirty]

    # ── 배경 땅. 노선망이 닿는 시군구만 남긴다 ──
    # 교통공사 구간은 하남·성남·부천·인천까지 뻗는다. 서울만 그리면
    # 노선 끝이 허공에 뜬다
    pad = 0.05
    lo0, lo1 = min(p[0] for p in ll) - pad, max(p[0] for p in ll) + pad
    la0, la1 = min(p[1] for p in ll) - pad, max(p[1] for p in ll) + pad
    land = [f for f in feats
            if any(lo0 <= x <= lo1 and la0 <= y <= la1
                   for poly in rings(f["geometry"]) for x, y in poly[0])]

    def top(i):
        return sorted(stations, key=lambda s: -(s["on"][i] or 0))

    # ── 걸음마다 그 시각 승차 TOP 5 ──
    beats = []
    for i in BEATS:
        beats.append({
            "hour": i,
            # **자는 표 안에 둔다.** 241역 평균을 순위 밑에 한 줄로
            # 같이 띄우면 「1위가 평균의 몇 배인가」를 눈이 바로 잰다
            "avg": round(sum(s["on"][i] for s in stations) / len(stations)),
            "top": [{"name": r["name"], "n": r["on"][i],
                     "x": r["x"], "y": r["y"]}
                    for r in top(i)[:TOP]],
        })

    # ── 1위 자리가 하루에 몇 번 바뀌나 ──
    # **닫힌 집합을 따로 센다.** 걸음에 고른 여섯이 전부인지 확인해야
    # 「6개 역이 나눠 갖는다」고 쓸 수 있다.
    chain = [top(i)[0]["name"] for i in live]
    swaps = sum(1 for a, b in zip(chain, chain[1:]) if a != b)
    holders = list(dict.fromkeys(chain))

    # ── 편을 떠받치는 수치 ──
    peak = 3                     # 08-09시간대. 하루 중 승차가 가장 몰린다
    avg = sum(s["on"][peak] for s in stations) / len(stations)

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
        "peakHour": peak,
        "peakName": top(peak)[0]["name"],
        "peakN": top(peak)[0]["on"][peak],
        "peakPerSec": round(top(peak)[0]["on"][peak] / 3600, 1),
        "avgN": round(avg),
        "avgPerSec": round(avg / 3600, 2),
        "gangnamN": idx["강남"]["on"][peak],
        # 1위 자리를 나눠 갖는 역들과 바뀐 횟수
        "holders": holders,
        "holderPts": [{"name": n, "x": idx[n]["x"], "y": idx[n]["y"]}
                      for n in holders],
        "swaps": swaps,
        "beats": beats,
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    print(f"{len(stations)}역 · 평일 {hrs['days']}일 평균 · "
          f"{hours[dirty]} 칸은 비웠다")
    print(f"\n{hours[peak]} 승차")
    for r in top(peak)[:TOP]:
        print(f"  {r['name']:12s} {r['on'][peak]:7,}  "
              f"{r['on'][peak]/3600:.2f}명/초")
    print(f"  241역 평균     {out['avgN']:7,}  {out['avgPerSec']}명/초  "
          f"→ {out['peakN']/avg:.1f}배")
    print(f"\n1위 자리를 {len(holders)}개 역이 나눠 갖고 {swaps}번 바뀐다 — "
          + " · ".join(holders))
    print("\n걸음")
    for b in beats:
        line = "  ".join(f"{r['name']} {r['n']:,}" for r in b["top"])
        print(f"  {hours[b['hour']]:9s} {line}")
    print("→", OUT)


if __name__ == "__main__":
    main()
