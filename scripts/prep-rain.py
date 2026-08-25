#!/usr/bin/env python3
"""한 시간에 가장 많이 내린 비 — 그날 하루와 견준다.

## 야마

우리나라에 한 시간 동안 가장 많이 내린 비는 152.2mm다. 그날 하루
내린 258.6mm의 59%가 그 한 시간에 왔다. 2025년 9월 7일 군산.
한 시간이 나머지 스물세 시간(106.4mm)보다 많다.

## 자료

기상자료개방포털 기후통계 극값 조회. 15·16편과 같은 창구다.
키가 필요 없고, 지점을 비우면 전국 상위 10건만 나와 닫힌 집합이
안 되므로 96개 지점을 하나씩 다 돌린다.

    POST data.kma.go.kr/climate/extremum/selectExtremumAjaxList.do
      schGubun=1  schElem=3  precInputVal=3  → 1시간 최다강수량
      schGubun=1  schElem=3  precInputVal=2  → 일강수량

  data/kma-rain.json      1시간 최다강수량 (16편 '그날' 판 만들 때 받아둔 것)
  data/kma-rain-day.json  일강수량

## 닫힌 집합인지 따로 확인한다

지점당 상위 10건만 받으므로, 어떤 지점이 자기 top-10 밖에 숨긴 값이
전국 순위에 낄 수 있다. 그런데 **각 지점 10위 값의 최대가 81.6mm**라
숨은 값은 무엇이든 81.6mm를 넘지 못한다. 전국 표도 경신 자취도
105mm 위에서만 쓰므로 빠짐이 없다. HIDDEN_MAX로 검산한다.

## 자 — 그날 자기 하루로 잰다

바깥에서 빌려 온 자가 아니다. 같은 날 같은 지점의 일강수량으로
나누면 단위가 사라져 설명이 필요 없다.

  1998-08-06  강화   하루 481.0mm   그 한 시간 123.5mm   26%
  2026-08-17  거제   하루 654.3mm   그 한 시간 124.5mm   19%
  2024-07-10  군산   하루 209.5mm   그 한 시간 131.7mm   63%
  2025-09-07  군산   하루 258.6mm   그 한 시간 152.2mm   59%

**하루로 많이 온 날과 한 시간에 몰린 날은 다르다.** 거제는 강화보다
하루에 173mm를 더 받고도 한 시간 최대는 1mm 차이고, 군산은 거제의
3분의 1을 받고도 한 시간에는 더 많이 받았다. 이 어긋남이 편이다.

일강수량과 1시간 최다강수량은 둘 다 00~24시 기준이라 나눠 쓸 수
있다. 다른 정의를 섞은 것이 아니다.

## 호우특보 기준 — 기상청 원문

kma.go.kr/kma/biz/forecast03.jsp 기상특보 발표기준에서 받았다.

    호우주의보  3시간 누적 60mm 이상  또는  12시간 110mm 이상
    호우경보    3시간 누적 90mm 이상  또는  12시간 180mm 이상

152.2mm는 세 시간짜리 경보 기준의 1.69배를 한 시간에 채운 값이다.

## 검산

  · 96곳 전부 두 자료가 다 있다
  · 각 지점 10위 값의 최대 < 105mm (닫힌 집합)
  · 전국 1위 군산 152.2 (2025-09-07), 2위 군산 131.7 (2024-07-10)
  · 네 날 전부 1시간 값과 일강수량이 같은 날짜에 잡힌다
  · 경신 자취가 오름차순이고 날짜순이다

사용:  python3 scripts/prep-rain.py
"""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOUR_CACHE = os.path.join(ROOT, "data", "kma-rain.json")
DAY_CACHE = os.path.join(ROOT, "data", "kma-rain-day.json")
OUT = os.path.join(ROOT, "src", "data", "rain.json")

TOP_N = 10
# 호우특보 기준(3시간 누적, mm). 기상청 기상특보 발표기준에서 받은 값이다.
HEAVY_WATCH3 = 60.0
HEAVY_WARN3 = 90.0

# 투영 — places.ts와 같은 식
LON0, LAT0, KX, KY, OFFX = 124.21, 33.20, 80.20, 101.94, 230.9

# 화면이 세우는 네 날. 순서가 곧 편의 순서다.
#
# 하루로 많이 온 날(강화·거제)을 먼저 세우고, 한 시간에 몰린 날
# (군산 둘)로 넘어간다. 막대 하나가 그날 하루고 아래쪽 색칠한
# 만큼이 그 한 시간이라, 넷을 나란히 두면 색 비율이 뒤집힌다.
CASES = [
    ("강화", "1998-08-06"),
    ("거제", "2026-08-17"),
    ("군산", "2024-07-10"),
    ("군산", "2025-09-07"),
]
# 마지막 날 국지성을 말할 때 같이 적는 이웃 지점
NEAR_OF = ("군산", "2025-09-07", ["부안", "고창"])


def project(lon, lat):
    return ((lon - LON0) * KX + OFFX, 1000.0 - (lat - LAT0) * KY)


def km(a, b):
    """두 지점 사이 거리(km). 30km가 얼마나 가까운지 화면에 쓴다."""
    r = 6371.0
    dla = math.radians(b["lat"] - a["lat"])
    dlo = math.radians(b["lon"] - a["lon"])
    x = (math.sin(dla / 2) ** 2
         + math.cos(math.radians(a["lat"])) * math.cos(math.radians(b["lat"]))
         * math.sin(dlo / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(x))


def main():
    hour = json.load(open(HOUR_CACHE, encoding="utf-8"))
    dayf = json.load(open(DAY_CACHE, encoding="utf-8"))
    assert len(hour) == len(dayf) == 96, (len(hour), len(dayf))

    by_name = {s["name"]: s for s in hour.values()}
    day_by_name = {s["name"]: s for s in dayf.values()}

    def val(f, name, d):
        """지점 이름과 날짜로 값 하나. f는 이름으로 색인한 표다."""
        for r in f[name]["rows"]:
            if r["d"] == d:
                return r["v"]
        return None

    # ── 닫힌 집합 ────────────────────────────────────
    # 지점당 상위 10건만 받았다. 숨은 값의 상한은 '각 지점 10위 값의
    # 최대'다. 그 위로는 빠짐이 없다.
    hidden_max = max(min(r["v"] for r in s["rows"]) for s in hour.values())

    rows = sorted(
        ((r["v"], r["d"], s["name"], int(s["start"][:4])) for s in hour.values() for r in s["rows"]),
        key=lambda t: (-t[0], t[1]),
    )
    top = [{"rank": i + 1, "name": n, "v": v, "d": d, "y0": y0}
           for i, (v, d, n, y0) in enumerate(rows[:TOP_N])]
    assert hidden_max < top[-1]["v"], (hidden_max, top[-1])
    assert (top[0]["name"], top[0]["v"], top[0]["d"]) == ("군산", 152.2, "2025-09-07"), top[0]
    assert (top[1]["name"], top[1]["v"], top[1]["d"]) == ("군산", 131.7, "2024-07-10"), top[1]

    # ── 전국 1위가 갈아치워진 자취 ──────────────────
    prog, best = [], 0.0
    for v, d, n, _ in sorted(rows, key=lambda t: t[1]):
        if v > best:
            best = v
            prog.append({"d": d, "name": n, "v": v})
    # 몇 해를 버텼는지 — 다음 기록까지의 간격
    for i, p in enumerate(prog):
        if i + 1 < len(prog):
            a, b = p["d"], prog[i + 1]["d"]
            months = (int(b[:4]) - int(a[:4])) * 12 + (int(b[5:7]) - int(a[5:7]))
            # 2년이 넘으면 해 단위로 반올림한다. 25년 11개월을 '25년'으로
            # 적으면 실제보다 짧게 읽힌다.
            p["held"] = (f"{round(months / 12)}년" if months >= 24
                         else f"{months // 12}년 {months % 12}개월" if months >= 12
                         else f"{months}개월")
    assert prog[-1]["v"] == top[0]["v"] and prog[-1]["name"] == "군산", prog[-1]
    assert all(prog[i]["v"] < prog[i + 1]["v"] for i in range(len(prog) - 1)), prog
    assert all(prog[i]["d"] < prog[i + 1]["d"] for i in range(len(prog) - 1)), prog

    # ── 네 날 ────────────────────────────────────────
    cases = []
    for name, d in CASES:
        h = val(by_name, name, d)
        dv = val(day_by_name, name, d)
        assert h and dv, (name, d, h, dv)
        s = by_name[name]
        x, y = project(s["lon"], s["lat"])
        near = []
        if (name, d) == (NEAR_OF[0], NEAR_OF[1]):
            for nn in NEAR_OF[2]:
                nv = val(by_name, nn, d)
                assert nv, (nn, d)
                near.append({"name": nn, "v": nv, "km": round(km(s, by_name[nn]), 1)})
        rank = next((t["rank"] for t in top if t["name"] == name and t["d"] == d), 0)
        cases.append({
            "name": name, "d": d, "y0": int(s["start"][:4]),
            "lat": s["lat"], "lon": s["lon"], "x": round(x, 1), "y": round(y, 1),
            "hour": h, "day": dv, "pct": round(100 * h / dv),
            "rank": rank,
            # 그 지점 안에서 이 날이 몇 위인지 — 기록값과 계산값을 나눠 적는다
            "dayRank": next((i + 1 for i, r in enumerate(day_by_name[name]["rows"])
                             if r["d"] == d), 0),
            "near": near,
        })
    assert cases[-1]["rank"] == 1 and cases[-2]["rank"] == 2, cases

    # 화면에 쓸 막대 눈금. 제일 긴 하루(거제 654.3mm)가 들어가는 선.
    scale = 10 * math.ceil(max(c["day"] for c in cases) / 10) + 6

    out = {
        "nSites": len(hour),
        "hiddenMax": hidden_max,
        "top": top,
        "prog": prog,
        "cases": cases,
        "scale": scale,
        "heavyWatch3": HEAVY_WATCH3,
        "heavyWarn3": HEAVY_WARN3,
        "note": "기상자료개방포털 기후통계 극값(ASOS 96개 지점). "
                "1시간 최다강수량은 정시 기준 1시간 누적의 최댓값이다.",
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"지점 {len(hour)}곳 · 숨은 값 상한 {hidden_max}mm")
    print("전국 1시간 최다강수량")
    for t in top:
        print(f"  {t['rank']:2d}위 {t['v']:6.1f}mm  {t['name']:<5s} {t['d']}  관측시작 {t['y0']}")
    print("전국 1위가 갈아치워진 자취")
    for p in prog:
        print(f"  {p['d']}  {p['name']:<5s} {p['v']:6.1f}mm  {p.get('held', '')}")
    print("네 날")
    for c in cases:
        print(f"  {c['d']}  {c['name']:<4s} 하루 {c['day']:6.1f}  한 시간 {c['hour']:6.1f}"
              f"  {c['pct']}%  전국 {c['rank'] or '-'}위")
    print(f"막대 눈금 0~{scale}mm")


if __name__ == "__main__":
    main()
