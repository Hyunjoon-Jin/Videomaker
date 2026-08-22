#!/usr/bin/env python3
"""동해안 네 곳의 일출 시각을 1년치 계산해 1등이 언제 바뀌는지 뽑는다.

이 편은 외부 자료가 필요 없다. 위경도와 날짜만 있으면 일출 시각이 나온다.
영해 편과 간척 편이 데이터를 못 구해 접혔던 것과 다르다.

## 알고리즘

NOAA 일출 계산. 태양의 평균근점이각에서 중심차를 구해 황경을 얻고,
적위와 시간각으로 일출을 낸다. 지평선은 고도 -0.833도로 잡는다 —
대기 굴절 34분각과 태양 반지름 16분각을 더한 값이다.

검산: 서울(37.5665, 126.9780) 2026년 1월 1일 일출이 07:47로 나온다.
관측값과 같다. main()이 돌 때마다 이걸 먼저 확인하고 어긋나면 멈춘다.

## 왜 이 네 곳인가

새해 해맞이로 이름이 알려진 동해안 지점들이다. 간절곶과 호미곶은 서로
'가장 먼저 해 뜨는 곳'이라고 걸어놓고 다투는 두 곳이고, 정동진과 고성은
그보다 북쪽이라 여름에 앞선다.

## 섬을 왜 따로 두나

독도와 울릉도를 같이 넣으면 사철 독도가 1등이라 순위가 안 바뀐다.
그러면 이 편이 없어진다. 본문은 육지 넷만 보고, 마무리에서 독도를
켜서 뒤집는다. 그래서 ISLANDS를 LAND와 나눠 둔다 — 화면이 둘을 다른
시점에 쓴다.

사용:  python3 scripts/prep-sunrise.py
출력:  src/data/sunrise.json
"""
import datetime
import json
import math

D = math.radians
YEAR = 2026

# (이름, 위도, 경도) — 육지 넷
LAND = [
    ("간절곶", 35.3600, 129.3603),
    ("호미곶", 36.0776, 129.5673),
    ("정동진", 37.6906, 129.0347),
    ("고성", 38.5836, 128.3628),
]
# 마무리에서만 쓴다
ISLANDS = [
    ("독도", 37.2411, 131.8683),
]
# 검산용
SEOUL = (37.5665, 126.9780)


def julian(y: int, m: int, d: int) -> float:
    if m <= 2:
        y -= 1
        m += 12
    a = y // 100
    b = 2 - a + a // 4
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + b - 1524.5


def sunrise_min(lat: float, lon: float, y: int, m: int, d: int) -> float:
    """KST 기준 자정부터 몇 분인지. 못 뜨는 날이면 None."""
    n = julian(y, m, d) - 2451545.0 + 0.0008
    js = n - lon / 360.0
    M = (357.5291 + 0.98560028 * js) % 360
    C = (1.9148 * math.sin(D(M)) + 0.0200 * math.sin(D(2 * M))
         + 0.0003 * math.sin(D(3 * M)))
    L = (M + C + 180 + 102.9372) % 360
    j_transit = 2451545.0 + js + 0.0053 * math.sin(D(M)) - 0.0069 * math.sin(D(2 * L))
    dec = math.asin(math.sin(D(L)) * math.sin(D(23.4397)))
    cos_w = ((math.sin(D(-0.833)) - math.sin(D(lat)) * math.sin(dec))
             / (math.cos(D(lat)) * math.cos(dec)))
    if abs(cos_w) > 1:
        return None
    w = math.degrees(math.acos(cos_w))
    j_rise = j_transit - w / 360.0
    # 율리우스일의 소수부가 UTC 정오 기준이라 0.5를 더해 자정 기준으로 옮기고,
    # KST(+9시간=540분)를 더한 뒤 정오 기준분(720)을 뺀다.
    return ((j_rise + 0.5) % 1.0) * 1440 + 540 - 720


def hm(t: float) -> str:
    t = round(t) % 1440
    return f"{t // 60:02d}:{t % 60:02d}"


def main() -> None:
    # 검산부터. 틀리면 아래 숫자가 전부 무의미하다.
    chk = sunrise_min(*SEOUL, YEAR, 1, 1)
    if not (7 * 60 + 45 <= chk <= 7 * 60 + 49):
        raise SystemExit(f"검산 실패 — 서울 1월 1일 일출이 {hm(chk)}로 나온다")
    print(f"검산 · 서울 {YEAR}-01-01 일출 {hm(chk)} (관측 07:47)")

    names = [n for n, _, _ in LAND]
    days = []
    d0 = datetime.date(YEAR, 1, 1)
    ndays = (datetime.date(YEAR, 12, 31) - d0).days + 1
    for i in range(ndays):
        dt = d0 + datetime.timedelta(days=i)
        times = {n: round(sunrise_min(la, lo, dt.year, dt.month, dt.day), 2)
                 for n, la, lo in LAND}
        isl = {n: round(sunrise_min(la, lo, dt.year, dt.month, dt.day), 2)
               for n, la, lo in ISLANDS}
        first = min(times, key=times.get)
        days.append({
            "md": dt.strftime("%m-%d"),
            "t": [times[n] for n in names],
            "first": names.index(first),
            "isl": [isl[n] for n, _, _ in ISLANDS],
        })

    # 1등이 이어지는 구간으로 묶는다
    runs = []
    for i, d in enumerate(days):
        if not runs or runs[-1]["who"] != d["first"]:
            runs.append({"who": d["first"], "from": i, "to": i})
        else:
            runs[-1]["to"] = i
    for r in runs:
        r["fromMd"] = days[r["from"]]["md"]
        r["toMd"] = days[r["to"]]["md"]
        r["days"] = r["to"] - r["from"] + 1

    # 육지 몫과 독도 몫
    share = [0] * len(names)
    for d in days:
        share[d["first"]] += 1
    isl_wins = sum(1 for d in days if min(d["isl"]) < min(d["t"]))
    gaps = [min(d["t"]) - min(d["isl"]) for d in days]

    out = {
        "year": YEAR,
        "land": [{"name": n, "lat": la, "lon": lo} for n, la, lo in LAND],
        "islands": [{"name": n, "lat": la, "lon": lo} for n, la, lo in ISLANDS],
        "days": days,
        "runs": runs,
        "share": share,
        "islandWins": isl_wins,
        "islandLeadMin": [round(min(gaps), 1), round(max(gaps), 1)],
        "note": "NOAA 일출, 고도 -0.833도 기준. 시각은 KST 자정부터의 분.",
    }
    with open("src/data/sunrise.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"\n{ndays}일 · 1등이 {len(runs) - 1}번 바뀜")
    for r in runs:
        print(f"  {r['fromMd']} ~ {r['toMd']}  {names[r['who']]:<6} {r['days']:>3}일")
    print("\n육지 몫 " + " · ".join(f"{n} {s}일" for n, s in zip(names, share)))
    print(f"독도 {isl_wins}일 · 육지 1등을 "
          f"{out['islandLeadMin'][0]}~{out['islandLeadMin'][1]}분 앞섬")


if __name__ == "__main__":
    main()
