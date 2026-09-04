#!/usr/bin/env python3
"""서울에서 지하철로 가장 많이 돌아가는 두 역.

## 야마

**낙성대와 남성은 직선으로 1.1km다. 그런데 지하철로는 8정거장,
10.8km다.** 9.9배 돌아간다.

## 자를 자료 안에서 찾는다

**같은 두 점의 직선과 노선을 견준다.** 바깥에서 자를 빌려 올
까닭이 없다 — 돌아가는 정도는 그 자체가 비(比)다.

첫 판에서 「2호선 한 바퀴 47km」를 자로 세웠다가 접었다. 무엇을
재든 2호선을 갖다 대는 것은 자료 안의 자가 아니라 **형식만 채운
장치**였다.

## 닫힌 집합

서울 안 역 317곳에서 **직선 1km 이상 떨어진 모든 쌍**을 다 쟀다.
1km를 밑에 두는 까닭은, 그보다 가까우면 걸어가는 거리라 「돌아간다」는
말이 안 서기 때문이다.

## 같은 역이 이름 두 개로 갈려 있다

OSM은 노선마다 정차 노드를 따로 둔다. 환승역은 그 노드들 이름이
어긋나 있는 데가 있다 — 4호선은 「총신대입구 (이수)」인데 7호선은
「이수」다. **이름으로만 묶으면 환승이 안 이어진다.**

첫 판이 여기서 틀렸다. 낙성대~남성을 사당(2·4)·이수(4·7)로 3정거장에
가는데, 4호선 환승이 끊겨 있어 교대·고속터미널로 8정거장 돌아가는
길이 최단으로 나왔다.

**가까우면 같은 역으로 묶는다.**

    100m 안                          무조건 같은 역
    300m 안 + 이름이 서로 들어감      같은 역 (괄호 설명만 다른 것)

둘째 조건이 필요한 까닭은 **송정과 공항시장이 274m**라서다. 이름이
안 겹치므로 안 묶인다. 반대로 「의정부」와 「경전철의정부」는 278m인데
이름이 겹쳐 묶인다.

## 급행을 걸러야 한다

이름에 「급행」이 든 계통은 역을 건너뛰어 이어져 있다. 정거장 수를
세려면 완행이어야 한다.

## 노선 색

**선을 호선 색으로 칠한다.** 한 구간을 여러 노선이 같이 쓰면 하나를
골라야 하는데, `LINE_ORDER` 차례로 앞선 것을 쓴다 — 1~9호선이 먼저고
그다음이 광역 노선이다. 서울 도심에서 1호선과 경의·중앙이 겹치면
1호선 색이 이긴다.

`ref`가 없는 관계가 둘 있다(의정부경전철). 이름으로 붙인다.

## 거리는 직선이다

역과 역을 대권거리로 이은 값이라 선로 길이가 아니다. 노선 거리도
정거장 사이 직선을 더한 값이라 **실제보다 짧다.** 둘을 같은 방식으로
쟀으니 비는 성립하지만, 절대값은 계산값이라고 밝힌다.

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
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "data", "osm-metro.json")
GEO = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
OUT = os.path.join(HERE, "..", "src", "data", "metro.json")

BOX = 1000.0
R = 6371.0088
# 이보다 가까우면 걸어가는 거리라 「돌아간다」는 말이 안 선다
FLOOR_KM = 1.0
TOP = 3
# 1·2·3등이 같은 동네면 지도를 세 번 같은 데로 날아간다.
# 이미 쓴 역에서 이만큼 떨어진 쌍만 다음 자리에 올린다
SPREAD_KM = 3.0

# 한 구간을 여러 노선이 같이 쓸 때 앞선 것을 그린다
LINE_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9",
              "수인·분당", "경의·중앙", "경춘", "경강", "서해", "공항철도",
              "신분당", "GTX-A", "인천1", "I2", "용인", "E", "W", "U",
              "김포 골드라인", "Silim", "의정부경전철"]
RANK = {r: i for i, r in enumerate(LINE_ORDER)}


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
        for poly in (g["coordinates"] if g["type"] == "MultiPolygon"
                     else [g["coordinates"]]):
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
    nod = {e["id"]: e for e in raw["nodes"]}
    feats = json.load(open(GEO, encoding="utf-8"))["features"]
    project = projector(feats)

    def nm(n):
        t = n.get("tags", {})
        return t.get("name:ko") or t.get("name") or "?"

    st = {}
    for n in raw["nodes"]:
        st.setdefault(nm(n), (n["lon"], n["lat"]))

    # ── 갈린 이름을 하나로 묶는다 ──
    freq = collections.Counter()
    for r in raw["routes"]:
        for m in r["members"]:
            if m["type"] == "node" and m["ref"] in nod:
                freq[nm(nod[m["ref"]])] += 1

    def core(s):
        """이름에서 띄어쓰기와 괄호 기호만 턴다.

        **괄호 안을 지우면 안 된다.** 같은 역이라는 단서가 바로
        거기 있다 — 「총신대입구 (이수)」에서 「(이수)」를 지우면
        7호선 쪽 「이수」와 안 겹친다.
        """
        return re.sub(r"[\s()·・]", "", s)

    parent = {k: k for k in st}

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    keys = list(st)
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            d = km(st[a], st[b]) * 1000
            ca, cb = core(a), core(b)
            same = d < 100 or (d < 300 and ca and cb
                               and (ca in cb or cb in ca))
            if same:
                ra, rb = find(a), find(b)
                if ra != rb:
                    parent[rb] = ra
    group = collections.defaultdict(list)
    for k in keys:
        group[find(k)].append(k)
    # 대표 이름은 노선에 더 자주 적힌 쪽, 같으면 짧은 쪽
    alias = {}
    merged = 0
    for g in group.values():
        best = sorted(g, key=lambda n: (-freq[n], len(n), n))[0]
        for n in g:
            alias[n] = best
        if len(g) > 1:
            merged += len(g) - 1
    st = {alias[k]: v for k, v in st.items() if alias[k] == k}

    def nm2(n):
        return alias[nm(n)]

    seg = {}
    segline = {}
    G = collections.defaultdict(dict)
    line = collections.defaultdict(set)
    for r in raw["routes"]:
        slow = "급행" not in (r["tags"].get("name", "") or "")
        ref = r["tags"].get("ref")
        if not ref:
            # ref가 없는 관계는 의정부경전철 둘뿐이다
            ref = ("의정부경전철" if "의정부" in r["tags"].get("name", "")
                   else "?")
        s = [nod[m["ref"]] for m in r["members"]
             if m["type"] == "node" and m["role"].startswith("stop")
             and m["ref"] in nod]
        for n in s:
            line[nm2(n)].add(ref)
        for a, b in zip(s, s[1:]):
            x, y = nm2(a), nm2(b)
            if x == y:
                continue
            d = km(st[x], st[y])
            k = tuple(sorted((x, y)))
            if k not in seg or d < seg[k]:
                seg[k] = d
            if RANK.get(ref, 99) < RANK.get(segline.get(k), 99):
                segline[k] = ref
            if slow and (y not in G[x] or d < G[x][y]):
                G[x][y] = d
                G[y][x] = d

    # ── 서울 안 역만 견준다 ──
    seoul = [f for f in feats
             if str(f["properties"].get("code", "")).startswith("11")]
    inseoul = set()
    for name, (lon, lat) in st.items():
        for f in seoul:
            g = f["geometry"]
            if any(inside(lon, lat, p[0]) for p in
                   (g["coordinates"] if g["type"] == "MultiPolygon"
                    else [g["coordinates"]])):
                inseoul.add(name)
                break

    def walk(src):
        dist = {src: 0.0}
        prev = {}
        pq = [(0.0, src)]
        while pq:
            c, u = heapq.heappop(pq)
            if c > dist.get(u, 1e9):
                continue
            for v, d in G[u].items():
                n = c + d
                if n < dist.get(v, 1e9):
                    dist[v] = n
                    prev[v] = u
                    heapq.heappush(pq, (n, v))
        return dist, prev

    names = sorted(inseoul & set(G))
    ranked = []
    pairs = 0
    for a in names:
        dist, prev = walk(a)
        for b in names:
            if b <= a or b not in dist:
                continue
            s = km(st[a], st[b])
            if s < FLOOR_KM:
                continue
            pairs += 1
            ranked.append((dist[b] / s, s, dist[b], a, b, prev))
    ranked.sort(key=lambda r: -r[0])

    def build(rec):
        ratio, s, rail, a, b, prev = rec
        p = [b]
        while p[-1] != a:
            p.append(prev[p[-1]])
        p.reverse()
        return {
            "a": a, "b": b,
            "lineA": sorted(line[a]), "lineB": sorted(line[b]),
            "straightKm": round(s, 2),
            "railKm": round(rail, 1),
            "hops": len(p) - 1,
            "ratio": round(ratio, 1),
            "path": [{"name": n, "x": project(*st[n])[0],
                      "y": project(*st[n])[1]} for n in p],
        }

    # 같은 자리 이야기가 겹치지 않게 고른다.
    #
    # 한 역을 두 번 쓰지 않는 것만으로는 모자랐다. 우이신설선이
    # 들어오자 1·2·3등이 다 강북구 미아·수유·삼양이 됐다 — 4호선과
    # 나란히 달리는데 환승이 성신여대입구 하나뿐이라 그 언저리가
    # 다 높게 나온다. **이미 쓴 역에서 3km 밖**이어야 다음 자리에
    # 올린다.
    top = []
    used = []
    usedline = set()
    for rec in ranked:
        a, b = rec[3], rec[4]
        if any(km(st[a], st[u]) < SPREAD_KM or km(st[b], st[u]) < SPREAD_KM
               for u in used):
            continue
        # **한 노선도 한 번만 쓴다.** 3km 규칙만으로는 2등이 또
        # 우이신설선 이야기였다(방학↔북한산우이). 노선까지 갈라야
        # 세 자리가 서로 다른 이야기가 된다
        if (line[a] | line[b]) & usedline:
            continue
        top.append(build(rec))
        used += [a, b]
        usedline |= line[a] | line[b]
        if len(top) == TOP:
            break

    out = {
        # [x1, y1, x2, y2, 호선]
        "seg": [[*project(*st[a]), *project(*st[b]), segline.get((a, b), "?")]
                for a, b in seg],
        "seoulStations": len(names),
        "floorKm": FLOOR_KM,
        "pairs": pairs,
        "top": top,
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    print(f"이름이 갈려 있던 역 {merged}곳을 묶었다")
    print(f"서울 안 역 {len(names)}곳 · 직선 {FLOOR_KM}km 이상 쌍 {pairs:,}개")
    for t in top:
        print(f"  {t['ratio']:4.1f}배  직선 {t['straightKm']}km → "
              f"노선 {t['railKm']}km · {t['hops']}정거장   "
              f"{t['a']}({'/'.join(t['lineA'])}) ↔ {t['b']}({'/'.join(t['lineB'])})")
        print("        " + " → ".join(x["name"] for x in t["path"]))
    print("→", OUT)


if __name__ == "__main__":
    main()
