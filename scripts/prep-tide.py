#!/usr/bin/env python3
"""밀물이 서해를 올라오는 시각 — 관측소 열한 곳의 하루치 조위.

## 야마

**밀물은 서해안에 한꺼번에 들어오지 않는다.** 남에서 북으로 6시간에
걸쳐 올라온다. 그래서 진도가 만조인 그 순간 인천은 간조다.

## 왜 열한 곳인가 — 닫힌 집합

자료에 조위관측소가 52곳 있고 진도 북쪽 서해안만 25곳이다. 다 올리면
지도가 점으로 덮이기도 하지만, 그보다 **위도 순서와 만조 순서가
어긋나는 곳이 섞인다.**

    서거차도(34.251N)  진도보다 남쪽인데 만조가 1시간 11분 늦다.
                       조석파가 정남이 아니라 남서에서 들어온다.
    평택(36.967N)      대산(37.008N)보다 11분 늦다. 아산만 안쪽이다.
    어청도·서천마량, 굴업도·안산, 영종대교·경인항  1~2분씩 뒤집힌다.

그래서 **해안을 따라가는 열한 곳으로 닫았다.** 먼바다 섬을 빼고,
위도 간격이 고르게, 그리고 고른 뒤 위도 순서와 만조 순서가 어긋나는
곳이 없는지 이 스크립트가 다시 검사한다(`check_order`).

## 절대 하면 안 되는 비교

**관측소마다 기준면이 다르다.** 조위는 그 지점 약최저저조위 위로 잰
값이라 인천 9.56m와 진도 3.47m를 놓고 「인천 바다가 더 높다」고 하면
틀린다. 견줄 수 있는 것은 **조차와 시각**뿐이라, 화면에 넘기는 값도
각 관측소 자기 범위 안의 비율(0~1)이다.

## 조위 곡선

받은 자료는 극치조위(고조·저조)뿐이라 사이를 채워야 한다. 조석은
사인파에 가까우니 **이웃한 두 극값 사이를 반주기 코사인으로 잇는다.**

    h(t) = a + (b - a) * (1 - cos(pi * f)) / 2

## 날을 고른 까닭

2026-08-15는 **인천의 2026년 조차 최대일**이다(9.58m). 가장 크게
움직이는 날이라 차이가 가장 또렷하다.

사용:  python3 scripts/prep-tide.py
자료:  data/khoa-tide-2026.json          (없으면 scripts/fetch-tide.py)
       data/skorea-municipalities.json
출력:  src/data/tide.json
"""
import datetime
import json
import math
import os
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
TIDE = os.path.join(HERE, "..", "data", "khoa-tide-2026.json")
GEO = os.path.join(HERE, "..", "data", "skorea-municipalities.json")
OUT = os.path.join(HERE, "..", "src", "data", "tide.json")

BOX = 1000.0
DAY = "2026-08-15"
# 진도 만조 → 인천 만조. 이 둘이 편의 두 끝이다
SOUTH = "DT_0028"
NORTH = "DT_0001"

# 해안을 따라가는 열한 곳. 남에서 북으로.
LINE = [
    ("DT_0028", "진도"), ("DT_0007", "목포"), ("DT_0003", "영광"),
    ("DT_0068", "위도"), ("DT_0018", "군산"), ("DT_0025", "보령"),
    ("DT_0067", "안흥"), ("DT_0050", "태안"), ("DT_0043", "영흥도"),
    ("DT_0001", "인천"), ("DT_0032", "강화대교"),
]

# 이름표를 지도 어느 쪽에 붙이나. 서해안이라 대개 왼쪽인데
# 서로 겹치는 자리만 따로 잡는다
SIDE = {"목포": "L", "진도": "L", "영광": "L", "위도": "L", "군산": "L",
        "보령": "L", "안흥": "L", "태안": "L", "영흥도": "L",
        "인천": "R", "강화대교": "R"}


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
        return ((x - lon0) * kx * scale + offx,
                BOX - ((y - lat0) * scale + offy))
    return project


def events(v):
    """(datetime, '고'/'저', cm) 를 시간순으로."""
    out = []
    for day, evs in v["days"]:
        y, m, d = map(int, day.split("-"))
        for t, kind, h in evs:
            hh, mm = map(int, t.split(":"))
            out.append((datetime.datetime(y, m, d, hh, mm), kind, h))
    return sorted(out)


def curve(evs, when):
    """극값 사이를 반주기 코사인으로 잇는다. 조석은 사인파에 가깝다."""
    prev = None
    for t, kind, h in evs:
        if t > when and prev:
            pt, _, ph = prev
            f = (when - pt).total_seconds() / (t - pt).total_seconds()
            return ph + (h - ph) * (1 - math.cos(math.pi * f)) / 2
        prev = (t, kind, h)
    return None


def check_order(day_events):
    """위도 순서와 만조 순서가 어긋나지 않는지 다시 본다.

    고른 열한 곳이 닫힌 집합이라는 근거가 이것이다. 어긋나면
    거기서 멈춘다 — 「남에서 북으로 올라간다」를 못 쓰게 되므로.
    """
    prev = None
    for code, name in LINE:
        first = [t for t, k, _ in day_events[code] if k == "고"][0]
        if prev and first <= prev[1]:
            raise SystemExit(
                f"만조 순서가 뒤집혔다: {prev[0]} {prev[1]:%H:%M} → "
                f"{name} {first:%H:%M}")
        prev = (name, first)


def main():
    raw = json.load(open(TIDE, encoding="utf-8"))
    feats = json.load(open(GEO, encoding="utf-8"))["features"]
    project = projector(feats)

    d0 = datetime.date(*map(int, DAY.split("-")))
    allev = {c: events(raw[c]) for c, _ in LINE}
    dayev = {c: [e for e in allev[c] if e[0].date() == d0] for c, _ in LINE}
    check_order(dayev)

    # ── 자: 만조에서 다음 만조까지 ──
    gaps = []
    for c, _ in LINE:
        hs = [t for t, k, _ in allev[c] if k == "고"]
        gaps += [(b - a).total_seconds() / 3600
                 for a, b in zip(hs, hs[1:]) if (b - a).total_seconds() < 14 * 3600]
    period = statistics.mean(gaps)

    # ── 연중 지각. 이 편이 하루짜리 우연이 아니라는 근거 ──
    lags = []
    for t, k, _ in allev[SOUTH]:
        if k != "고":
            continue
        nxt = [x for x, kk, _ in allev[NORTH] if kk == "고" and x > t]
        if nxt:
            g = (nxt[0] - t).total_seconds() / 3600
            if g < period:
                lags.append(g)

    # ── 관측소마다 그날 조위 곡선. 1분 간격 ──
    stations = []
    for code, name in LINE:
        v = raw[code]
        x, y = project(v["lon"], v["lat"])
        hs = [h for _, _, h in dayev[code]]
        lo, hi = min(hs), max(hs)
        ser = []
        for m in range(0, 24 * 60 + 1):
            t = datetime.datetime.combine(d0, datetime.time()) + \
                datetime.timedelta(minutes=m)
            h = curve(allev[code], t)
            ser.append(round((h - lo) / (hi - lo), 4))
        stations.append({
            "code": code, "name": name,
            "lat": v["lat"], "lon": v["lon"],
            "x": round(x, 1), "y": round(y, 1),
            "side": SIDE[name],
            # cm → m. 그 지점 안에서의 오르내림이라 서로 못 견준다
            "range": round((hi - lo) / 100, 2),
            "highs": [f"{t:%H:%M}" for t, k, _ in dayev[code] if k == "고"],
            "lows": [f"{t:%H:%M}" for t, k, _ in dayev[code] if k == "저"],
            # 0~1 로 눌러 담은 하루. 화면 게이지가 이 값이다
            "level": ser,
        })

    def hm(code, kind, i):
        return [f"{t:%H:%M}" for t, k, _ in dayev[code] if k == kind][i]

    def mins(a, b):
        ah, am = map(int, a.split(":"))
        bh, bm = map(int, b.split(":"))
        return (bh * 60 + bm) - (ah * 60 + am)

    s_high = hm(SOUTH, "고", 0)
    n_high = hm(NORTH, "고", 0)
    s_high2 = hm(SOUTH, "고", 1)
    n_low2 = hm(NORTH, "저", 1)
    n_hi_m = max(h for _, k, h in dayev[NORTH] if k == "고") / 100
    n_lo_m = curve(allev[NORTH], datetime.datetime.combine(d0, datetime.time(
        *map(int, n_low2.split(":"))))) / 100

    out = {
        "day": DAY,
        "stations": stations,
        # 자. 이 편의 모든 수치가 이 안에서 나온다
        "periodMin": round(period * 60),
        "halfMin": round(period * 30),
        # 첫 번째 멈춤 — 밀물이 올라오는 데 걸린 시간
        "rise": {"south": s_high, "north": n_high,
                 "min": mins(s_high, n_high)},
        # 두 번째 멈춤 — 같은 시각, 정반대
        "flip": {"southHigh": s_high2, "northLow": n_low2,
                 "min": mins(s_high2, n_low2),
                 "northHighM": round(n_hi_m, 2),
                 "northLowM": round(n_lo_m, 2)},
        "lagMeanMin": round(statistics.mean(lags) * 60),
        "lagN": len(lags),
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    print(f"{DAY} — 관측소 {len(stations)}곳")
    prev = None
    for s in stations:
        gap = "" if prev is None else f"  +{mins(prev, s['highs'][0]):3d}분"
        prev = s["highs"][0]
        print(f"  {s['name']:<6}{s['lat']:7.3f}N  만조 {s['highs'][0]}"
              f"  조차 {s['range']:.2f}m{gap}")
    print(f"\n만조 → 다음 만조 {out['periodMin']}분"
          f" (= {out['periodMin']//60}시간 {out['periodMin']%60}분, {len(gaps)}번)")
    print(f"진도 → 인천 {out['rise']['min']}분"
          f" (= {out['rise']['min']//60}시간 {out['rise']['min']%60}분)"
          f"  · 반주기 {out['halfMin']}분")
    print(f"낮에 진도 만조 {s_high2} / 인천 간조 {n_low2}"
          f" — {out['flip']['min']}분 차")
    print(f"그때 인천 {n_lo_m:.2f}m, 그날 만조 {n_hi_m:.2f}m"
          f" — {n_hi_m - n_lo_m:.2f}m 아래")
    print(f"연중 지각 평균 {out['lagMeanMin']}분 ({out['lagN']}번)")
    print("→", OUT)


if __name__ == "__main__":
    main()
