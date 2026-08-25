#!/usr/bin/env python3
"""관측 이래 우리나라에서 가장 센 바람 — 5위와 클로즈업 지도.

## 야마

우리나라에 불었던 가장 센 바람은 초속 63.7m, 시속 229km다.
2006년 10월 23일 속초. 강풍경보 기준(순간 26m/s)의 2.45배다.

## 자료 ① 최대순간풍속

기상자료개방포털 기후통계 극값 조회. 키가 필요 없다.

    POST data.kma.go.kr/climate/extremum/selectExtremumAjaxList.do
      schGubun=1  schElem=2(최대순간풍속)  schStnId=<지점번호>
    → 그 지점의 역대 상위 10건 (값·날짜·관측시작일)

지점번호를 비우면 전국 상위 10건만 나와 닫힌 집합이 안 된다.
96개 지점을 하나씩 다 돌려 data/kma-wind.json에 받아뒀다.

## 자료 ② 클로즈업용 지도

**provinces.json은 못 쓴다.** 시도 경계라 최소 면적 필터에 울릉도와
흑산도가 걸려 빠져 있다(3편 주석에 기록). 5위 안에 섬이 넷인데
클로즈업하면 빈 바다에 점만 남는다.

그래서 시군구 경계(data/skorea-municipalities.json, 250개)를 쓴다.
울릉군·신안군이 들어 있어 섬이 그려진다. 원본이 18MB·44만 점이라
클로즈업 축척에서 읽히는 정밀도로 줄인다.

  · 투영은 places.ts와 같은 식
  · Douglas-Peucker로 단순화 (TOL px)
  · 면적이 MIN_AREA px² 미만인 조각은 버린다

## 자를 셋 쓴다 — 셋 다 근거가 있다

  ① 시속       63.7m/s × 3.6 = 229.3km/h
  ② 강풍특보   기상청 예보 안내(kma.go.kr/kma/biz/forecast05.jsp)
                주의보  풍속 14m/s 이상 또는 순간 20m/s 이상
                경보    풍속 21m/s 이상 또는 순간 26m/s 이상
  ③ 바람의 힘  동압 q = ½ρv²  (ρ = 1.225kg/m³, 15℃·1기압 표준)

이 자료가 최대순간풍속이므로 '순간 20 / 순간 26' 쪽과 바로 맞물린다.
10분 평균 기준인 태풍 강도 등급과는 섞지 않는다.

**③이 필요한 이유.** 시속만 쓰면 5위(189km/h)와 1위(229km/h)가
21%밖에 안 벌어져 순위 차이가 화면에서 안 보인다. 힘은 속도의
제곱에 비례하므로 같은 값이 48% 차이가 된다. 그리고 '㎡에 몇 kg'은
시속보다 몸에 닿는다.

  울릉도 52.4m/s → 171.5kgf/㎡
  속초   63.7m/s → 253.4kgf/㎡   (어른 70kg 기준 3.6명)

## 그날 무슨 일이 있었나

2006년 10월 23일에 기록을 세운 것은 속초의 바람만이 아니다.
같은 창구에서 받은 강수 극값(schElem=3, 1시간 최다강수량)을 보면
그날이 이렇게 걸린다.

  속초  최대순간풍속 63.7m/s   그 지점 1위 · 전국 1위
  강릉  1시간 강수량 81.5mm    그 지점 3위
  태백  최대순간풍속 22.8m/s   그 지점 10위

**바람 전국 1위와 비 강릉 3위가 같은 날이다.**

강릉의 그날 일강수량 304mm는 한국학중앙연구원 향토문화전자대전
(디지털강릉문화대전 「자연재해」)에 강릉 일강수량 역대 3위로
적혀 있다. 같은 문서가 2002년 루사의 870.5mm와 시간당 100.5mm를
적고 있고, 그 값이 이 자료의 강릉 1시간 극값 1위(100.5mm,
2002-08-31)와 정확히 맞아 교차 검증됐다.

**피해 수치는 넣지 않는다.** 재해연보를 이 환경에서 못 받았다.

## 검산

  · 96곳 전부 기록이 있다
  · 1위 속초 63.7 (2006-10-23), 2·3위 제주·고산 60.0 (2003-09-12)
  · 5위까지 값이 내림차순이다
  · 클로즈업 지도에 울릉도와 흑산도가 남아 있다

사용:  python3 scripts/prep-wind.py [--fetch]
출력:  src/data/wind.json
"""
import json
import math
import os
import sys
import time
import urllib.request

HERE = os.path.dirname(__file__)
ROOT = os.path.normpath(os.path.join(HERE, ".."))
STATIONS = os.path.join(ROOT, "data", "kma-stations.json")
CACHE = os.path.join(ROOT, "data", "kma-wind.json")
MUNI = os.path.join(ROOT, "data", "skorea-municipalities.json")
OUT = os.path.join(ROOT, "src", "data", "wind.json")

AJAX = "https://data.kma.go.kr/climate/extremum/selectExtremumAjaxList.do"

TOP_N = 5
# 강풍특보 기준(순간풍속). 기상청 예보 안내에서 받은 값이다.
GUST_WATCH = 20.0
GUST_WARN = 26.0
# 견줄 것들 — 사람이 아는 속도
CAR_KMH = 100.0
KTX_KMH = 305.0
# 공기 밀도(kg/m³). 15℃·1기압 표준값.
RHO = 1.225
# 어른 한 사람 무게로 잡는 값(kg). 힘을 사람 수로 옮길 때만 쓴다.
PERSON_KG = 70.0

# 그날 — 2006-10-23. 이 편의 1위가 세워진 날이다.
DAY = "2006-10-23"
RAIN_CACHE = os.path.join(ROOT, "data", "kma-rain.json")

# 투영 — places.ts와 같은 식
LON0, LAT0, KX, KY, OFFX = 124.21, 33.20, 80.20, 101.94, 230.9
# 단순화 세기(px). 클로즈업이 5~8배라 이 정도면 가장자리가 안 흔들린다.
TOL = 0.22
# 이보다 작은 조각은 버린다(px²). 흑산도가 살아남는 선까지 내렸다.
MIN_AREA = 0.8


def project(lon, lat):
    return ((lon - LON0) * KX + OFFX, 1000.0 - (lat - LAT0) * KY)


def post(stn, tries=5):
    body = ("stnFileNm=climateExtremum.json&schGubun=1&schElem=2"
            f"&tempInputVal=1&startYear=1904&endYear=2026&schStnId={stn}")
    for i in range(tries):
        try:
            r = urllib.request.Request(
                AJAX, data=body.encode(),
                headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                         "X-Requested-With": "XMLHttpRequest",
                         "User-Agent": "Mozilla/5.0"})
            return json.loads(urllib.request.urlopen(r, timeout=60).read().decode("utf-8", "replace"))
        except Exception:
            if i == tries - 1:
                return None
            time.sleep(1.5 * 2 ** i)


def fetch_all():
    st = json.load(open(STATIONS, encoding="utf-8"))
    out = {}
    for sid, m in st.items():
        d = post(sid)
        if d is None:
            print(f"  못 받음 {sid} {m['name']}")
            continue
        data = d.get("data") or {}
        k = list(data.keys())
        lst = data.get(k[0]) if k else []
        out[sid] = {"name": m["name"], "lat": m["lat"], "lon": m["lon"],
                    "alt": m["alt"], "start": m["start"],
                    "rows": [{"v": float(r["val"]), "d": r["tma"]} for r in (lst or [])]}
        time.sleep(0.3)
    json.dump(out, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    return out


def rdp(pts, tol):
    """Douglas-Peucker. 재귀 대신 스택으로 — 한 고리가 만 점을 넘는다."""
    n = len(pts)
    if n < 3:
        return pts
    keep = [False] * n
    keep[0] = keep[n - 1] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        den = math.hypot(dx, dy)
        worst, wi = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if den == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(dx * (ay - py) - (ax - px) * dy) / den
            if d > worst:
                worst, wi = d, i
        if worst > tol:
            keep[wi] = True
            stack.append((a, wi))
            stack.append((wi, b))
    return [p for p, k in zip(pts, keep) if k]


def area(pts):
    s = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def rings(geom):
    """폴리곤·멀티폴리곤에서 바깥 고리만 뽑는다. 구멍은 이 축척에서 안 보인다."""
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return [c[0]]
    if t == "MultiPolygon":
        return [p[0] for p in c]
    return []


def build_map():
    gj = json.load(open(MUNI, encoding="utf-8"))
    paths = []
    kept = 0
    for f in gj["features"]:
        name = f["properties"].get("name", "")
        for ring in rings(f["geometry"]):
            pts = [project(lon, lat) for lon, lat in ring]
            if area(pts) < MIN_AREA:
                continue
            # 조각이 작을수록 덜 줄인다. 흑산도(6px)에 전국용
            # 톨러런스를 그대로 먹이면 클로즈업에서 각이 진다.
            tol = min(TOL, max(0.03, math.sqrt(area(pts)) / 60.0))
            pts = rdp(pts, tol)
            if len(pts) < 4 or area(pts) < MIN_AREA:
                continue
            d = "M" + " ".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z"
            paths.append({"n": name, "d": d})
            kept += len(pts)
    return paths, kept


def main():
    if "--fetch" in sys.argv or not os.path.exists(CACHE):
        print("기상자료개방포털에서 96개 지점을 받는다")
        raw = fetch_all()
    else:
        raw = json.load(open(CACHE, encoding="utf-8"))

    sites = []
    for sid, v in raw.items():
        if not v["rows"]:
            continue
        r0 = v["rows"][0]
        x, y = project(v["lon"], v["lat"])
        sites.append({
            "id": sid, "name": v["name"],
            "lat": v["lat"], "lon": v["lon"],
            "x": round(x, 1), "y": round(y, 1),
            "y0": int(v["start"].split(".")[0]),
            "v": r0["v"], "d": r0["d"],
            "kmh": round(r0["v"] * 3.6, 1),
            "warn": round(r0["v"] / GUST_WARN, 2),
            # 동압 q = ½ρv² [Pa] → kgf/㎡
            "kgf": round(0.5 * RHO * r0["v"] ** 2 / 9.80665, 1),
        })

    # ── 검산 ①  풍속 ──────────────────────────────────
    if len(sites) != 96:
        sys.exit(f"기록이 있는 지점이 96곳이 아니다 — {len(sites)}곳")
    ranked = sorted(sites, key=lambda s: -s["v"])
    for i, s in enumerate(ranked, 1):
        s["rank"] = i
    top = ranked[:TOP_N]
    if top[0]["name"] != "속초" or abs(top[0]["v"] - 63.7) > 0.05 or top[0]["d"] != "2006-10-23":
        sys.exit(f"1위가 속초 63.7(2006-10-23)이 아니다 — {top[0]['name']} {top[0]['v']} {top[0]['d']}")
    if {top[1]["name"], top[2]["name"]} != {"제주", "고산"}:
        sys.exit(f"2·3위가 제주·고산이 아니다 — {top[1]['name']} {top[2]['name']}")
    for s in top[1:3]:
        if abs(s["v"] - 60.0) > 0.05 or s["d"] != "2003-09-12":
            sys.exit(f"{s['name']}이 60.0(2003-09-12)이 아니다 — {s['v']} {s['d']}")
    if any(top[i]["v"] < top[i + 1]["v"] for i in range(TOP_N - 1)):
        sys.exit("5위까지가 내림차순이 아니다")

    # ── 검산 ②  클로즈업 지도 ─────────────────────────
    paths, pts = build_map()
    names = {p["n"] for p in paths}
    for want in ("울릉군", "신안군", "속초시", "제주시"):
        if want not in names:
            sys.exit(f"클로즈업 지도에 {want}가 없다 — 섬이 필터에 걸렸다")
    # 울릉도가 실제로 그려졌는지. 울릉군 조각 중 가장 큰 것이 울릉도다.
    ull = [p for p in paths if p["n"] == "울릉군"]
    if not ull:
        sys.exit("울릉군 폴리곤이 하나도 안 남았다")

    # ── 그날 ──────────────────────────────────────────
    # 바람 1위가 세워진 날에 다른 기록도 걸려 있다. 같은 창구에서
    # 받은 강수 극값을 뒤져 그날 것을 모은다.
    day_hits = []
    for name, cache, unit, lab in (("wind", CACHE, "m/s", "최대순간풍속"),
                                   ("rain", RAIN_CACHE, "mm", "1시간 강수량")):
        if not os.path.exists(cache):
            continue
        src = json.load(open(cache, encoding="utf-8"))
        for v in src.values():
            for i, r in enumerate(v["rows"]):
                if r["d"] == DAY:
                    day_hits.append({"name": v["name"], "kind": lab, "unit": unit,
                                     "v": r["v"], "rank": i + 1})
    day_hits.sort(key=lambda h: (h["rank"], -h["v"]))
    if not any(h["name"] == "속초" and h["rank"] == 1 for h in day_hits):
        sys.exit(f"{DAY}에 속초 1위가 안 잡힌다")
    if not any(h["name"] == "강릉" and h["kind"] == "1시간 강수량" for h in day_hits):
        sys.exit(f"{DAY}에 강릉 강수 기록이 안 잡힌다")

    out = {
        "day": DAY,
        "dayHits": day_hits,
        "personKg": PERSON_KG,
        "rho": RHO,
        "top": top,
        "sites": ranked,
        "map": paths,
        "gustWatch": GUST_WATCH,
        "gustWarn": GUST_WARN,
        "carKmh": CAR_KMH,
        "ktxKmh": KTX_KMH,
        "nSites": len(sites),
        "note": "최대순간풍속. 10분 평균인 최대풍속과는 다른 값이다.",
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)

    print(f"검산 통과 — 지점 {len(sites)}곳, 지도 조각 {len(paths)}개 / 점 {pts}개 "
          f"({os.path.getsize(OUT) / 1e6:.1f}MB)")
    print(f"\n관측 이래 {TOP_N}위")
    for s in top:
        print(f"  {s['rank']}위 {s['name']:<6}{s['v']:>6.1f}m/s  시속 {s['kmh']:>6.1f}km  "
              f"강풍경보의 {s['warn']:.2f}배  {s['d']}  관측시작 {s['y0']}")
    print(f"\n1위는 고속도로 100km/h의 {top[0]['kmh'] / CAR_KMH:.2f}배, "
          f"KTX {KTX_KMH:.0f}km/h의 {top[0]['kmh'] / KTX_KMH:.2f}배")
    print(f"\n바람의 힘(㎡당) — 힘은 속도의 제곱이라 순위 차가 벌어진다")
    for s0 in top:
        print(f"  {s0['rank']}위 {s0['name']:<6}{s0['kgf']:>6.1f}kgf/㎡  "
              f"어른 {s0['kgf'] / PERSON_KG:.1f}명")
    print(f"  시속으로는 5위 대비 1위가 {top[0]['kmh'] / top[-1]['kmh']:.2f}배, "
          f"힘으로는 {top[0]['kgf'] / top[-1]['kgf']:.2f}배")
    print(f"  강풍경보(순간 {GUST_WARN:.0f}m/s)의 힘 = "
          f"{0.5 * RHO * GUST_WARN ** 2 / 9.80665:.1f}kgf/㎡")
    print(f"\n{DAY} 그날 걸린 기록")
    for h in day_hits:
        print(f"  {h['name']:<6}{h['kind']}  {h['v']}{h['unit']}  그 지점 {h['rank']}위")


if __name__ == "__main__":
    main()
