#!/usr/bin/env python3
"""虎入 — 조선의 도성과 궁궐에 들어온 호랑이.

## 야마

조선 왕이 사는 궁궐 안에 호랑이가 들어왔다. 1751년 6월 9일 경복궁.
실록 원문이 네 글자다 — 虎入舊闕.

## 자료 ① 조선왕조실록

sillok.history.go.kr 통합검색. 키가 필요 없다. 14편(노인성) 때는
이 환경에서 안 열렸는데 지금은 열린다.

    POST /search/searchResultList.do
      topSearchWord=<검색어>  pageIndex=<n>  initPageUnit=100
    GET  /id/<기사ID>   → 서기 연도 · 국역 · 원문

**국역 검색만으로는 닫힌 집합이 안 된다.** 같은 일을 '범'으로
옮긴 기사가 빠진다. 그래서 원문 표현을 직접 찾았다.

    호랑이  국역 728  원문 149
    호환    국역  63  원문 322
    虎入    국역   0  원문  58    ← '호랑이가 ~에 들어왔다'

**虎入 58건이 이 편의 뼈대다.** 국역어가 무엇이든 원문이 虎入이면
다 걸린다. 그래도 '虎至'·'虎入城' 아닌 다른 표현은 놓치므로,
화면에서 '몇 번'이라고 말하지 않고 날짜만 세운다.

## 자료 ② 한양도성

OpenStreetMap Overpass. `barrier=city_wall`로 성곽을 받는다.

    (way["barrier"="city_wall"](37.53,126.93,37.63,127.03);
     way["historic"="citywalls"](...););out geom;

overpass-api.de와 kumi.systems는 이 환경에서 막혔고 maps.mail.ru
미러가 열린다. 75개 way · 1373점을 data/osm-hanyang-wall.json에
받아뒀다.

**지금 남아 있는 성곽과 복원 구간이 섞여 있다.** 조선 당시의 선과
완전히 같지 않다. 화면 고지에 적는다.

## 화면이 세우는 여덟 날

    1392  태조 1년 윤12월 20일  虎入城              성 안
    1465  세조 11년 9월 14일    虎入昌德宮後苑      창덕궁 후원
    1497  연산 3년 8월 6일      虎入都城            성 안
    1743  영조 19년 11월 27일   虎入京城            성 안
    1750  영조 26년 1월 7일     虎入城內            성 안
    1751  영조 27년 6월 9일     虎入舊闕【景福宮】  경복궁
    1752  영조 28년 1월 2일     虎入景福宮後苑      경복궁
    1754  영조 30년 5월 10일    虎入慶德宮          경덕궁

**'성 안'은 점을 찍지 않는다.** 어디인지 안 적혀 있다. 그런 기록은
성곽 안쪽을 물들이고, 자리를 아는 것만 점으로 찍는다. 아는 것과
모르는 것을 화면에서 가른다.

## 투영

전국 투영(places.ts)은 못 쓴다. 도성은 가로 5km라 그 식으로는
점 하나가 된다. 도성 전용으로 다시 잡는다.

    x = (lon - LON0) * KX + OFFX
    y = 1000 - (lat - LAT0) * KY
    KX = KY * cos(37.575°)      ← 위도 보정. 안 하면 동서로 늘어난다

## 검산

  · 성곽 점이 1000개를 넘는다
  · 여덟 날 전부 서기 연도·국역·원문이 있다
  · 원문이 전부 '虎入'으로 시작하거나 그 말을 담고 있다
  · 연도가 오름차순이다
  · 자리를 아는 기록의 좌표가 성곽 안에 있다

사용:  python3 scripts/prep-tiger.py
"""
import json
import math
import os
import re
import ssl
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WALL = os.path.join(ROOT, "data", "osm-hanyang-wall.json")
PALACE = os.path.join(ROOT, "data", "osm-palaces.json")
GYEONGBOK = os.path.join(ROOT, "data", "osm-gyeongbokgung.json")
CACHE = os.path.join(ROOT, "data", "sillok-article.json")
OUT = os.path.join(ROOT, "src", "data", "tiger.json")
CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")

# 도성 전용 투영. 중심은 종로 네거리 언저리.
LON0, LAT0 = 126.9500, 37.5400
KY = 11000.0
KX = KY * math.cos(math.radians(37.575))
OFFX = 60.0

# 자리를 아는 곳. OSM Overpass에서 받은 좌표다.
PLACES = {
    "경복궁": (37.57576, 126.97357),
    "창덕궁후원": (37.58169, 126.99289),   # 부용지
    "경덕궁": (37.57092, 126.96865),       # 경희궁지 안내판
    "창덕궁": (37.57745, 126.98857),
    "창경궁": (37.57914, 126.99653),
    "종묘": (37.57072, 126.99438),
    "인왕산": (37.58495, 126.95788),
    "북악산": (37.59300, 126.97373),
    "남산": (37.55221, 126.98796),
    "낙산": (37.58056, 127.00860),
    "숭례문": (37.55840, 126.97368),
    "흥인지문": (37.57111, 127.00973),
    # 기록은 '동대문 밖'이라고만 적는다. 문 자리에 찍고 이름으로 밝힌다.
    "동대문": (37.57111, 127.00973),
    "숙정문": (37.59562, 126.98108),
    "돈의문": (37.56831, 126.96881),
    "창의문": (37.59261, 126.96652),
    "혜화문": (37.58792, 127.00389),
    "광희문": (37.56443, 127.00996),
}

# 화면이 세우는 여덟 날. (기사ID, 자리, 화면에 쓸 곳 이름, 한 줄)
#
# 자리가 None이면 '성 안'이다 — 점을 안 찍고 성곽 안쪽을 물들인다.
# 화면이 세우는 열 날.
#
# (기사ID, 자리, 장소 이름, 화면 큰 글씨(줄 단위), 화면에 실을 원문)
#
# **줄바꿈을 직접 나눈다.** wordBreak에 맡기면 '포도장에게 / 수색해'
# 처럼 뜻이 갈리는 자리에서 끊긴다. 한 줄 14자 안쪽으로 맞춘다.
#
# **화면 큰 글씨는 번역이다.** 한자 원문을 크게 띄웠더니 무슨 말인지
# 하나도 안 읽혔다. 원문은 그 아래 작게 한 줄로만 남긴다.
#
# 고르는 기준도 바꿨다. '虎入'으로 시작하는 네 글자짜리 기사는 짧고
# 세지만 그날 무슨 일이 있었는지가 없다. **어디에 나타나 무엇을
# 했는지 적힌 기사**를 앞에 세운다.
BEATS = [
    ("waa_10112120_001", None, "성 안",
     ["성에 들어온 호랑이를", "흥국리 사람이 쏘아 죽임"],
     "虎入城, 興國里人射殺之。"),
    ("wga_11109014_001", "창덕궁후원", "창덕궁 후원",
     ["임금이 듣고 북악산으로", "표범을 잡아 돌아옴"],
     "上聞虎入昌德宮後苑, 遂幸北岳, 獲豹而還。"),
    ("wka_11708015_007", "동대문", "동대문 밖",
     ["마을에서 개를 물어 죽이고", "풀 베던 사람을 다치게 함"],
     "有虎入閭閻, 傷犬 … 攫傷刈草人"),
    ("wka_11911010_002", None, "성 안",
     ["못 잡아서 산 밑 사람들이", "밤에 다니지 못함"],
     "虎入城內 … 昏夜, 則山底居人, 不得出入。"),
    ("kna_13602013_001", "창덕궁", "창덕궁 솔숲",
     ["호랑이가 사람을 묾", "포도장에게 잡으라 명함"],
     "昌德宮松林間, 有虎逐人, 命左右捕盜將, 跟尋捕捉。"),
    ("kua_12312002_003", None, "도성 가까이",
     ["사람을 물어 죽여", "군문에서 포수를 내보냄"],
     "都城近地, 虎縱橫囕人物, 令軍門發送砲手, 捉大虎。"),
    ("wua_12706009_001", "경복궁", "경복궁",
     ["임진왜란에 불타고 159년째", "비어 있던 궁 안으로"],
     "虎入舊闕。【景福宮。】"),
    ("wua_12801002_001", "경복궁", "경복궁 후원",
     ["7개월 만에", "같은 궁궐 후원으로 다시"],
     "虎入景福宮後苑。"),
    ("wua_13005010_001", "경덕궁", "경덕궁",
     ["임금의 말 — 사관이 쓴다면", "'虎入闕中'이라 하리라"],
     "虎入慶德宮。"),
    ("kva_10109019_005", None, "궁궐 담장 밖",
     ["초소를 지키던", "병졸을 물어 감"],
     "虎囕宮墻外軍堡卒。"),
]

# 마무리 판에 글자로만 적는 날들. 자리를 몰라 점은 안 찍는다.
TAIL = [
    ("1497", "연산 3년 8월 6일", "도성 안", "잡으라 명함"),
    ("1698", "숙종 24년 7월 8일", "동문 밖 제기리", "울타리를 넘어 민가로"),
    ("1752", "영조 28년 1월 12일", "도성 안팎", "병조판서 — 옛날에 없던 변괴"),
    ("1843", "헌종 9년 9월 8일", "경모궁 후원", "영문에 사냥해 잡으라 명함"),
]


def project(lon, lat):
    return ((lon - LON0) * KX + OFFX, 1000.0 - (lat - LAT0) * KY)


def area(ring):
    """고리 넓이(px²). 도성 전체를 궁궐로 착각하지 않게 거르는 데 쓴다."""
    s2 = 0.0
    for i in range(len(ring)):
        ax, ay = ring[i]
        bx, by = ring[(i + 1) % len(ring)]
        s2 += ax * by - bx * ay
    return abs(s2) / 2


def fetch(aid):
    """기사 상세. 서기 연도·국역·원문."""
    cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
    if aid in cache:
        return cache[aid]
    for i in range(5):
        try:
            r = urllib.request.Request("https://sillok.history.go.kr/id/" + aid,
                                       headers={"User-Agent": "Mozilla/5.0"})
            h = urllib.request.urlopen(r, timeout=90, context=CTX).read().decode("utf-8", "replace")
            break
        except Exception:
            if i == 4:
                raise
            time.sleep(2 * 2 ** i)
    t = re.sub(r"(?is)<(script|style).*?</\1>", " ", h)
    t = re.sub(r"<[^>]+>", "|", t)
    t = re.sub(r"[|\s]+", "|", t)

    # 본문은 '국역|…|【태백산사고본】…|원문|…|【태백산사고본】' 꼴이다.
    # 위쪽 내비게이션에도 '국역'·'원문'이라는 글자가 그대로 있어서
    # 앞에서부터 찾으면 메뉴를 문다(waa_10112120_001에서 그랬다).
    # 사고본 표시로 토막을 낸 뒤, 각 토막의 **마지막** 라벨 뒤를 집는다.
    seg = t.split("【태백산사고본】")

    def grab(label, k):
        if len(seg) <= k:
            return ""
        i = seg[k].rfind("|" + label + "|")
        if i < 0:
            return ""
        return re.sub(r"\s+", " ", seg[k][i + len(label) + 2:].replace("|", " ")).strip()

    ce = re.search(r"\|(\d{4})년\|[명청]\|", t) or re.search(r"\((\d{4})년", t)
    d = re.search(r"\|([^|]{1,6})\|(\d+)년\|(윤?\d+)월\|(\d+)일\|>", t)
    got = {
        "id": aid,
        "ce": int(ce.group(1)) if ce else 0,
        "ko": grab("국역", 0),
        "hanja": grab("원문", 1),
        "title": (re.search(r"\|(\S+실록|\S+일기)\S*\|", t) or re.search(r"(.{0})", t)).group(0).strip("|"),
        "king": d.group(1) if d else "",
        "yr": int(d.group(2)) if d else 0,
        "mo": d.group(3) if d else "",
        "dy": int(d.group(4)) if d else 0,
    }
    cache[aid] = got
    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    time.sleep(0.3)
    return got


def wall_paths():
    """성곽을 화면 좌표 path로. 조각이 75개라 이어 붙이지 않고 그대로 둔다.

    조각 중에는 궁궐 담장(궁장)도 섞여 있다. OSM이 도성 성벽과 같은
    barrier=city_wall로 달아둔 것인데, 이쪽은 대개 닫힌 고리다.
    닫힌 것만 따로 표시해 두면 클로즈업에서 그 안을 칠할 수 있다 —
    '이 담장 안으로 들어왔다'가 그림이 된다.
    """
    raw = json.load(open(WALL, encoding="utf-8"))
    out, rings = [], []
    for e in raw.get("elements", []):
        g = e.get("geometry") or []
        if len(g) < 2:
            continue
        pts = [project(p["lon"], p["lat"]) for p in g]
        d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
        closed = (abs(pts[0][0] - pts[-1][0]) < 0.5
                  and abs(pts[0][1] - pts[-1][1]) < 0.5 and len(pts) > 3)
        out.append(d)
        rings.append(pts if closed else None)
    return out, rings


def inside(pt, ring):
    """점이 고리 안인가. 짝수-홀수 규칙."""
    x, y = pt
    hit = False
    n = len(ring)
    for i in range(n):
        ax, ay = ring[i]
        bx, by = ring[(i + 1) % n]
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay + 1e-12) + ax:
            hit = not hit
    return hit


def chain(ways):
    """끝점끼리 이어 붙여 고리 하나로. OSM 관계의 멤버가 여러 조각일 때 쓴다.

    경복궁이 그렇다. 관계(relation)가 여덟 개 way로 쪼개져 있는데
    그게 곧 관계가 정의한 경계다 — 없는 선을 지어내는 것이 아니라
    이미 이어져 있는 것을 이어 붙이는 것뿐이다.
    """
    rest = [list(w) for w in ways if len(w) > 1]
    ring = rest.pop(0)
    while rest:
        end = ring[-1]
        best, rev, dist = None, False, 1e9
        for i, w in enumerate(rest):
            for r in (False, True):
                a = w[-1] if r else w[0]
                d = (a[0] - end[0]) ** 2 + (a[1] - end[1]) ** 2
                if d < dist:
                    best, rev, dist = i, r, d
        w = rest.pop(best)
        ring += (w[::-1] if rev else w)[1:]
    return ring


def palace_polys():
    """궁궐 담장 폴리곤. 클로즈업에서 안을 칠할 면이다."""
    out = {}
    raw = json.load(open(PALACE, encoding="utf-8"))
    for e in raw.get("elements", []):
        t = e.get("tags") or {}
        g = e.get("geometry") or []
        n = t.get("name")
        # 같은 이름이 여럿이면 점이 제일 많은 것 — 담장이 제일 촘촘하다
        if n and len(g) > 4 and len(g) > len(out.get(n, [])):
            out[n] = g
    gb = json.load(open(GYEONGBOK, encoding="utf-8"))
    ways = [e["geometry"] for e in gb.get("elements", [])
            if e["type"] == "way" and len(e.get("geometry") or []) > 1]
    if ways:
        out["경복궁"] = chain([[(p["lon"], p["lat"]) for p in w] for w in ways])
    polys = {}
    for n, g in out.items():
        pts = [project(*p) if isinstance(p, tuple) else project(p["lon"], p["lat"])
               for p in g]
        polys[n] = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"
    return polys


def main():
    walls, rings = wall_paths()
    npts = sum(w.count("L") + 1 for w in walls)
    assert npts > 1000, npts
    print(f"닫힌 고리 {sum(1 for r in rings if r)}개")

    beats = []
    for aid, place, label, say, han_short in BEATS:
        a = fetch(aid)
        assert a["ce"] and a["ko"] and a["hanja"], a
        # 원문 앞머리의 간지(○甲辰/)를 떼고 한자 사이에 낀 공백을
        # 없앤다. 지명이 링크라 태그가 공백으로 바뀌어 들어온다.
        han = re.sub(r"^○\s*", "", a["hanja"])
        han = re.sub(r"^[一-鿿]{2}/", "", han)
        han = re.sub(r"(?<=[一-鿿])\s+(?=[一-鿿])", "", han)
        # 원문 구절. 마무리 표에서 쓴다.
        mm = re.search(r"虎[入囕][一-鿿]+", han)
        key = mm.group(0) if mm else han[:6]
        ko = re.sub(r"(?<=[一-鿿])\s+(?=[一-鿿])", "", a["ko"])
        xy = project(*reversed(PLACES[place])) if place else None
        beats.append({
            # 클로즈업에서 칠할 궁궐 담장. 경덕궁은 OSM 이름이 경희궁이다.
            "poly": {"경복궁": "경복궁", "창덕궁후원": "창덕궁",
                     "창덕궁": "창덕궁", "경덕궁": "경희궁"}.get(place or ""),
            "id": aid, "ce": a["ce"], "king": a["king"], "yr": a["yr"],
            "mo": a["mo"], "dy": a["dy"], "label": label,
            # 화면 큰 글씨는 번역, 그 아래 작게 원문
            "say": say, "han": han_short,
            "ko": ko, "full": han, "key": key,
            "x": round(xy[0], 1) if xy else None,
            "y": round(xy[1], 1) if xy else None,
        })
    assert all(beats[i]["ce"] <= beats[i + 1]["ce"] for i in range(len(beats) - 1)), \
        [b["ce"] for b in beats]
    # 화면 폭 796px, 글씨 56px이라 한 줄에 한글 14자가 한계다.
    # 공백과 숫자·부호는 폭이 절반쯤이라 그렇게 센다.
    def width(ln):
        return sum(1.0 if "\uac00" <= ch <= "\ud7a3" or "\u4e00" <= ch <= "\u9fff"
                   else 0.5 for ch in ln)
    for b in beats:
        for ln in b["say"]:
            assert width(ln) <= 14, (b["ce"], ln, width(ln))

    marks = {k: [round(v, 1) for v in project(lo, la)] for k, (la, lo) in PLACES.items()}
    xs = [p[0] for p in marks.values()]
    ys = [p[1] for p in marks.values()]
    print("표시할 곳 x %.0f~%.0f  y %.0f~%.0f" % (min(xs), max(xs), min(ys), max(ys)))

    polys = palace_polys()

    def bbox(d):
        pts = [(float(a), float(b))
               for a, b in re.findall(r"(-?\d+\.?\d*) (-?\d+\.?\d*)", d)]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return min(xs), min(ys), max(xs), max(ys)

    # 카메라. 자리를 아는 걸음은 그 궁궐 담장이 화면의 절반쯤 되게
    # 붙고, 모르는 걸음은 도성 전체로 물러선다. 16편에서 배운 것이다.
    WIDE = {"cx": 391.5, "cy": 637.5, "w": 573.0}
    for b in beats:
        if not b["poly"]:
            # 담장은 없어도 자리를 아는 곳(동대문 밖)은 그리로 붙는다
            b["cam"] = ({"cx": b["x"], "cy": b["y"], "w": 300.0}
                        if b["x"] is not None else WIDE)
            continue
        x0, y0, x1, y1 = bbox(polys[b["poly"]])
        # 경희궁지는 지금 남은 자리가 작아 그대로 붙이면 담장만 보인다.
        # 어느 궁궐인지 알려면 성곽이 화면 귀퉁이에 걸쳐야 한다.
        w = max(max(x1 - x0, (y1 - y0) * 573 / 585) * 2.9, 230.0)
        b["cam"] = {"cx": round((x0 + x1) / 2, 1),
                    "cy": round((y0 + y1) / 2, 1), "w": round(w, 1)}

    print("궁궐 폴리곤 " + " · ".join(f"{k}({v.count('L') + 1}점)" for k, v in polys.items()))
    for b in beats:
        assert b["poly"] is None or b["poly"] in polys, b["poly"]

    json.dump({
        "walls": walls,
        "polys": polys,
        "wide": {"cx": 391.5, "cy": 637.5, "w": 573.0},
        "marks": marks,
        "beats": beats,
        "tail": [{"ce": t[0], "when": t[1], "where": t[2], "say": t[3]} for t in TAIL],
        "counts": {"호랑이": 728, "호환": 63, "虎入": 58},
        "note": "조선왕조실록 원문 검색 虎入 58건. 성곽은 OpenStreetMap.",
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"성곽 {len(walls)}조각 · {npts}점")
    for b in beats:
        print(f"  {b['ce']}  {b['king']} {b['yr']}년 {b['mo']}월 {b['dy']}일  "
              f"{b['label']:<12s} {' / '.join(b['say'])}")


if __name__ == "__main__":
    main()
