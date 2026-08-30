#!/usr/bin/env python3
"""오디세이아 — 본문에 적힌 날을 다 더한다.

## 야마

**10년 동안 오디세우스가 바다 위를 나아간 날은 52일이다.**

나머지는 붙잡혀 있던 시간이다. 칼립소 7년, 키르케 1년, 아이올로스
한 달, 트리나키아 한 달 — 2,980일.

## 자가 자료 안에 있다

본문이 스스로 10년이라고 말한다.

```
5.107   εἰνάετες, δεκάτῳ δὲ πόλιν πέρσαντες     9년 싸우고 10년째 함락
16.206  ἤλυθον εἰκοστῷ ἔτεϊ ἐς πατρίδα γαῖαν    20년째에 고향 땅
```

20년에서 전쟁 10년을 빼면 귀환이 10년이다. 3,650일.

## 그리고 1년 8개월이 비어 있다

적힌 날을 다 더해도 3,040일 — 8년 4개월이다. 나머지 610일은 본문에
날수가 없다. 이건 편의 마무리가 아니라 고정댓글 자리다.

## 행 번호는 원문으로 맞췄다

버틀러 영역(구텐베르크 1727)으로 자리를 찾고, 페르세우스 그리스어
원문(`tlg0012.tlg002.perseus-grc2`)에서 행 번호를 확인했다. 열세
군데가 다 맞았다.

## 지도

지명 좌표는 OSM에서 하나씩 확인했다. 실재 지명 다섯(트로이·이스마로스·
말레아곶·키테라·이타카)과, 널리 쓰이는 비정 여덟을 갈라 둔다.
화면에서 채운 점과 빈 점으로 가른다.

사용:  python3 scripts/prep-odyssey.py
자료:  data/odyssey-grc.xml   (없으면 scripts/fetch-odyssey.py)
       data/ne-countries.geojson
출력:  src/data/odyssey.json
"""
import json
import math
import os
import re
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
GRC = os.path.join(HERE, "..", "data", "odyssey-grc.xml")
WORLD = os.path.join(HERE, "..", "data", "ne-countries.geojson")
OUT = os.path.join(HERE, "..", "src", "data", "odyssey.json")

YEAR = 365

# (갈래, 이름, 날수, 권.행, 그리스어 낱말)
#   항해 — 배가 나아간 날
#   붙잡힘 — 한자리에 머문 날
#   뭍 — 날수가 적힌 짧은 상륙
LEDGER = [
    ("뭍",   "키코네스 뒤 폭풍",        2,    (9, 74),   "δυω νυκτας"),
    ("항해", "말레아곶 → 로토파고이",    9,    (9, 82),   "εννημαρ"),
    ("붙잡힘", "아이올리아 · 아이올로스",  30,   (10, 14),  "μηνα"),
    ("항해", "아이올리아 → 이타카 코앞",  9,    (10, 28),  "εννημαρ"),
    ("항해", "→ 라이스트리고네스",       6,    (10, 80),  "εξημαρ"),
    ("뭍",   "라이스트리고네스 앞",      2,    (10, 142), "δυο τ ηματα"),
    ("붙잡힘", "아이아이에 · 키르케",    YEAR, (10, 467), "ενιαυτον"),
    ("붙잡힘", "트리나키아 · 남풍",       30,   (12, 325), "μηνα"),
    ("항해", "난파 → 오기기아",          9,    (12, 447), "εννημαρ"),
    ("붙잡힘", "오기기아 · 칼립소",   7 * YEAR, (7, 259),  "επταετες"),
    ("뭍",   "뗏목 만들기",             4,    (5, 262),  "τετρατ"),
    ("항해", "뗏목 항해",               17,   (5, 278),  "επτα"),
    ("항해", "폭풍 표류 → 스케리아",     2,    (5, 388),  "δυω νυκτας"),
]

# 전체를 재는 자. 이것도 본문이 준다.
FRAME = [
    ("전쟁 9년, 10년째 함락", (5, 107), "εινaετες"),  # 확인용이라 검사 안 함
    ("20년째에 고향 땅",      (16, 206), "εικοστ"),
    ("제우스가 말한 20일",    (5, 34),   "εικοστ"),
]

RETURN_DAYS = 10 * YEAR

# 지명. sure=True는 본문의 실재 지명, False는 널리 쓰이는 비정이다.
# 좌표는 OSM에서 하나씩 확인했다.
PLACES = {
    "트로이":       (26.2380, 39.9574, True,  "히사를리크 유적"),
    "이스마로스":   (25.5192, 40.9071, True,  "마로네이아"),
    "말레아곶":     (23.1985, 36.4359, True,  ""),
    "키테라":       (22.9980, 36.2580, True,  ""),
    "로토파고이":   (10.8942, 33.7736, False, "제르바"),
    "키클롭스":     (15.1614, 37.5638, False, "아치 트레차"),
    "아이올리아":   (14.9391, 38.4813, False, "리파리"),
    "라이스트리고네스": (12.5160, 38.0174, False, "트라파니"),
    "아이아이에":   (13.0459, 41.2379, False, "몬테 치르체오"),
    "세이렌":       (14.4342, 40.5822, False, "갈리 제도 · 일 갈로 룽고"),
    "스킬라":       (15.7190, 38.2507, False, "메시나 해협"),
    # 오케아노스 끝. 본문이 「해가 안 비치는 곳」이라 자리가 없다.
    # 지도 서쪽 밖으로 배가 나갔다 오는 것으로 그린다. 점은 안 찍는다.
    "저승":         (7.2000, 36.5000, False, "오케아노스 끝 · 지도 밖"),
    "트리나키아":   (15.1541, 36.6889, False, "파세로곶"),
    "오기기아":     (14.2599, 36.0468, False, "고초"),
    "스케리아":     (19.9181, 39.6217, False, "케르키라"),
    "이타카":       (20.6908, 38.4019, True,  ""),
}

# 걸음. 이 편은 동선이 주인공이다. 한 자리에 하나씩,
# **거기서 무슨 일이 있었는지**를 한 줄로 적는다.
#
# (지명, 사건 한 줄, 권.행, 여기까지 오는 경로, 남은 배)
#   남은 배 — 트로이를 떠날 때 12척(9.159). 라이스트리고네스에서
#   11척이 한꺼번에 죽고(10.132), 트리나키아 뒤 벼락에 마지막
#   한 척이 부서진다(12.417).
BEATS = [
    ("이스마로스", "성을 털다 반격, 배마다 6명", (9, 60),
     ["트로이", "이스마로스"], 12),
    ("로토파고이", "연꽃을 먹고 잊은 고향 · 9일 표류", (9, 82),
     ["말레아곶", "키테라", "로토파고이"], 12),
    ("키클롭스", "외눈 거인의 동굴에서 6명", (9, 289),
     ["키클롭스"], 12),
    ("아이올리아", "바람을 담아 준 자루 · 한 달", (10, 14),
     ["아이올리아"], 12),
    ("이타카 코앞", "부하가 연 자루, 되밀림 · 9일", (10, 28),
     ["이타카", "아이올리아"], 12),
    ("라이스트리고네스", "거인이 던진 바위에 배 11척", (10, 132),
     ["라이스트리고네스"], 1),
    ("아이아이에", "돼지가 된 부하들 · 1년", (10, 239),
     ["아이아이에"], 1),
    ("오케아노스 끝", "해가 안 비치는 곳에서 물은 뱃길", (11, 14),
     ["저승"], 1),
    ("세이렌", "돛대에 묶인 채 지나간 노래", (12, 178),
     ["아이아이에", "세이렌"], 1),
    ("스킬라", "여섯 머리에 채인 6명", (12, 246),
     ["스킬라"], 1),
    ("트리나키아", "태양신의 소를 잡아먹다 · 한 달", (12, 325),
     ["트리나키아"], 1),
    ("오기기아", "벼락에 마지막 배 · 칼립소 곁 7년", (7, 259),
     ["오기기아"], 0),
    ("이타카", "20년 만의 고향", (16, 206),
     ["스케리아", "이타카"], 0),
]

# 떠날 때 배 12척 (9.159)
SHIPS = 12

BOXW = 1000.0
TOL = 0.012          # 지중해는 넓어서 성기게 줄여도 된다
MIN_RING = 3e-3
# 북쪽을 41.9까지만 잘랐더니 이탈리아 장화가 잘려 티레니아해가
# 육지처럼 읽혔다. 43.5까지 올려 반도를 다 담는다.
CLIP = (9.5, 27.6, 30.5, 43.5)


def load():
    text = open(GRC, encoding="utf-8").read()
    books = {}
    for m in re.finditer(
            r'<div n="(\d+)" type="textpart" subtype="book">(.*?)</div>',
            text, re.S):
        lines = {}
        for lm in re.finditer(r'<l n="(\d+)">(.*?)</l>', m.group(2), re.S):
            s = re.sub(r"<[^>]+>", "", lm.group(2))
            lines[int(lm.group(1))] = re.sub(r"\s+", " ", s).strip()
        books[int(m.group(1))] = lines
    return books


def bare(s):
    """악센트와 생략 부호를 떼어 비교한다.

    원문에는 U+02BC(ʼ)로 elision을 적어 둬서, 그냥 두면
    'δύο τʼ ἤματα'가 'δυο τ ηματα'와 안 맞는다.
    """
    s = "".join(c for c in unicodedata.normalize("NFD", s)
                if unicodedata.category(c) != "Mn")
    return re.sub(r"[\u02bc\u2019\u1fbd']", "", s).lower()


def ring_area(ring):
    a = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[(i + 1) % n][0], ring[(i + 1) % n][1]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


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


def projector():
    """지중해 상자를 가로 1000으로 맞춘다. 세로는 그만큼 따라온다."""
    lon0, lon1, lat0, lat1 = CLIP
    kx = math.cos(math.radians((lat0 + lat1) / 2))
    scale = BOXW / ((lon1 - lon0) * kx)
    h = (lat1 - lat0) * scale

    def project(x, y):
        return (round((x - lon0) * kx * scale, 1),
                round(h - (y - lat0) * scale, 1))
    return project, h


def land_path(project):
    gj = json.load(open(WORLD, encoding="utf-8"))
    lon0, lon1, lat0, lat1 = CLIP
    parts = []
    for f in gj["features"]:
        g = f["geometry"]
        ps = (g["coordinates"] if g["type"] == "MultiPolygon"
              else [g["coordinates"]])
        for poly in ps:
            ring = [(p[0], p[1]) for p in poly[0]]
            xs = [p[0] for p in ring]
            ys = [p[1] for p in ring]
            if max(xs) < lon0 - 2 or min(xs) > lon1 + 2:
                continue
            if max(ys) < lat0 - 2 or min(ys) > lat1 + 2:
                continue
            if ring_area(ring) < MIN_RING:
                continue
            simple = dp(ring, TOL)
            if len(simple) < 4:
                continue
            pts = [project(x, y) for x, y in simple]
            parts.append("M" + "L".join(f"{x} {y}" for x, y in pts) + "Z")
    # 한 path로 이으면 안 된다. nonzero 규칙이라 감기 방향이 다른 나라끼리
    # 서로 지운다. 이탈리아와 그리스가 통째로 바다색이 됐다.
    return parts


def write_json(books):
    project, h = projector()
    stops = {}
    for nm, (lon, lat, sure, note) in PLACES.items():
        x, y = project(lon, lat)
        stops[nm] = {"name": nm, "x": x, "y": y, "sure": sure, "note": note}

    beats = []
    for title, what, (b, ln), route, ships in BEATS:
        beats.append({
            "title": title, "what": what,
            "cite": f"{b}.{ln}",
            "route": [[stops[r]["x"], stops[r]["y"]] for r in route],
            "at": [stops[route[-1]]["x"], stops[route[-1]]["y"]],
            "stops": route,
            "ships": ships,
        })

    # 막대. 본문 차례대로 쌓고, 끝에 날수가 없는 몫을 남긴다.
    bar = [{"kind": k, "name": nm, "days": d, "cite": f"{b}.{ln}"}
           for k, nm, d, (b, ln), _ in LEDGER]
    told = sum(x["days"] for x in bar)

    json.dump({
        "viewBox": f"0 0 {int(BOXW)} {round(h)}",
        "land": land_path(project),
        "stops": [v for k, v in stops.items() if k != "저승"],
        "ships": SHIPS,
        "beats": beats,
        "bar": bar,
        "toldDays": told,
        "returnDays": RETURN_DAYS,
        "sailDays": sum(x["days"] for x in bar if x["kind"] == "항해"),
        "heldDays": sum(x["days"] for x in bar if x["kind"] == "붙잡힘"),
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("→", OUT)


def main():
    books = load()
    print(f"{len(books)}권 · {sum(len(v) for v in books.values())}행\n")

    print("== 본문에 날수가 적힌 것")
    bad = 0
    tot = {"항해": 0, "붙잡힘": 0, "뭍": 0}
    for kind, name, days, (b, ln), word in LEDGER:
        line = books.get(b, {}).get(ln, "")
        ok = word in bare(line)
        bad += 0 if ok else 1
        tot[kind] += days
        print(f'  {kind:4s} {name:22s}{days:6d}일  {b:2d}.{ln:<4d}'
              f'{"" if ok else "  ← 안 맞음"}  {line[:44]}')
    print()
    for k in ("항해", "붙잡힘", "뭍"):
        print(f"  {k:4s} {tot[k]:6d}일")
    s = sum(tot.values())
    print(f"  {'합계':4s} {s:6d}일 = {s // YEAR}년 {(s % YEAR) // 30}개월")

    print("\n== 전체를 재는 자")
    for name, (b, ln), word in FRAME:
        line = books.get(b, {}).get(ln, "")
        print(f"  {name:22s} {b:2d}.{ln:<4d} {line[:52]}")
    gap = RETURN_DAYS - s
    print(f"\n  귀환 10년 = {RETURN_DAYS}일")
    print(f"  적힌 날    = {s}일")
    print(f"  빈 날      = {gap}일 = {gap // YEAR}년 {(gap % YEAR) // 30}개월")
    print(f"\n  바다 위를 나아간 날 {tot['항해']}일 "
          f"= 10년의 {tot['항해'] / RETURN_DAYS * 100:.1f}%")
    if bad:
        print(f"\n행 번호 {bad}군데가 안 맞는다.")
    write_json(books)


if __name__ == "__main__":
    main()
