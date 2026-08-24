#!/usr/bin/env python3
"""노인성(카노푸스)이 지평선 위로 올라오는 북쪽 한계 위도를 낸다.

## 외부 자료가 필요 없다

별 하나의 적경·적위와 관측지 위도만 있으면 남중고도가 나온다.
일출 편(11편), 좌표 편(12편)과 같은 계통이다.

    카노푸스 (α Carinae, 老人星)
      J2000  적경 06h 23m 57.11s = 95.9880°
             적위 -52° 41′ 44.4″ = -52.6957°
      겉보기 등급 -0.74 — 시리우스 다음으로 밝다

    남중고도    h = 90° - 위도 + 적위
    북쪽 한계   위도 = 90° + 적위

적위가 음수라 남쪽 별이고, 위도가 높으면 남중해도 지평선을 못 넘는다.

## 세차운동

지구 자전축이 2만 6천 년 주기로 도는 탓에 적위가 조금씩 변한다.
IAU1976 세차각으로 그 해의 적위를 낸다. 카노푸스의 고유운동은
600년에 0.005°라 무시한다.

세차각 다항식은 J2000에서 몇 세기 범위를 겨냥한 것이라, 1400년까지
외삽하면 오차가 커진다. 이 편이 쓰는 정밀도(0.01°)에는 충분하지만
**화면에 올릴 때 계산값임을 밝힌다.**

## 검산

널리 알려진 값은 '북위 37도 18분 이하에서 관측 가능'이다.
계산하면 2026년 한계 위도가 37.289° = 37° 17′ 20″로 나온다.
main()이 돌 때마다 이걸 먼저 확인하고 어긋나면 멈춘다.

## 보이는 것과 뜨는 것은 다르다

지평선 위로 올라온다고 보이는 것이 아니다. 대기가 빛을 먹는다.

  · 대기 굴절이 겉보기 고도를 약 0.57° 올려준다
  · 고도가 낮을수록 대기를 길게 지나 별이 어두워진다(소광).
    고도 1°에서는 5등급 넘게 깎이고, 4°에서는 2등급 안쪽이다.
  · 카노푸스는 -0.74등이라 4°면 눈에 들지만 1° 아래는 사실상 못 본다

그래서 이 스크립트는 **기하학적 남중고도**만 낸다. '보인다'는 판정은
안 한다. 화면에서도 '계산상 지평선 위'와 '실제로 보인다'를 갈라 적는다.

## 높은 곳에 오르면 지평선이 내려간다

해발 h미터에서 지평선 하강각은 대략 1.93′√h다. 남산(262m)이면
0.52°, 한라산(1947m)이면 1.42° 내려간다. 평지에서 못 보던 별이
산에서는 뜬다.

사용:  python3 scripts/prep-canopus.py
출력:  src/data/canopus.json
"""
import json
import math
import os
import sys

D = math.radians
G = math.degrees

# 카노푸스 J2000 (히파르코스)
RA0 = (6 + 23 / 60 + 57.1099 / 3600) * 15.0
DEC0 = -(52 + 41 / 60 + 44.378 / 3600)
MAG = -0.74

NOW = 2026
# 계기판이 훑는 구간. 1400보다 앞은 세차각 다항식의 외삽 오차가 커진다.
FROM = 1400

# 대기 굴절 — 지평선 근처에서 겉보기 고도를 이만큼 올려준다
REFRACTION = 0.57

# (이름, 위도, 경도) — 경계선 위아래로 갈리는 곳만 고른다.
# 서울과 수원이 이 편의 두 주인공이다.
SITES = [
    ("서울", 37.5714, 126.9658),
    ("인천", 37.4776, 126.6244),
    ("원주", 37.3376, 127.9466),
    ("수원", 37.2571, 126.9830),
    ("대전", 36.3504, 127.3845),
    ("대구", 35.8780, 128.6530),
    ("부산", 35.1047, 129.0323),
    ("제주", 33.4996, 126.5312),
    ("서귀포", 33.2462, 126.5653),
    ("마라도", 33.1167, 126.2667),
]

# 평지에서 못 보는 곳에서 산에 오르면 어떻게 되나
PEAKS = [
    ("남산", 37.5512, 126.9882, 262),
    ("한라산", 33.3617, 126.5292, 1947),
]


def dec_at(year: float) -> float:
    """세차를 넣은 그 해의 적위(도). IAU1976 세차각."""
    T = (year - 2000.0) / 100.0
    ze = D((2306.2181 * T + 0.30188 * T * T + 0.017998 * T ** 3) / 3600)
    th = D((2004.3109 * T - 0.42665 * T * T - 0.041833 * T ** 3) / 3600)
    a, d = D(RA0), D(DEC0)
    c = math.sin(th) * math.cos(d) * math.cos(a + ze) + math.cos(th) * math.sin(d)
    return G(math.asin(c))


def limit_at(year: float) -> float:
    """그 해에 노인성이 지평선 위로 올라오는 북쪽 한계 위도."""
    return 90.0 + dec_at(year)


def dip(alt_m: float) -> float:
    """해발 alt_m에서 지평선이 내려가는 각(도)."""
    return 1.93 * math.sqrt(alt_m) / 60.0


def dms(deg: float) -> str:
    s = "-" if deg < 0 else ""
    v = abs(deg)
    d = int(v)
    m = int((v - d) * 60)
    sec = round(((v - d) * 60 - m) * 60)
    return f"{s}{d}°{m:02d}′{sec:02d}″"


def main():
    d_now = dec_at(NOW)
    lim_now = limit_at(NOW)

    # ── 검산 ──────────────────────────────────────────
    # 널리 알려진 '북위 37도 18분 이하'와 맞아야 한다.
    if not (37.28 <= lim_now <= 37.31):
        sys.exit(f"한계 위도가 37도 18분 언저리가 아니다 — {lim_now:.4f}° ({dms(lim_now)})")
    # 서울은 못 보고 수원은 봐야 이 편이 선다.
    if not (90 - 37.5714 + d_now < 0 < 90 - 37.2571 + d_now):
        sys.exit("서울과 수원이 경계선 양쪽으로 안 갈린다. 편을 다시 봐야 한다.")

    sites = []
    for name, lat, lon in SITES:
        h = 90 - lat + d_now
        sites.append({
            "name": name, "lat": lat, "lon": lon,
            "alt": round(h, 3),
            "altRef": round(h + REFRACTION, 3),
            "up": h > 0,
        })

    peaks = []
    for name, lat, lon, m in PEAKS:
        base = 90 - lat + d_now
        peaks.append({
            "name": name, "lat": lat, "lon": lon, "m": m,
            "dip": round(dip(m), 3),
            "alt": round(base, 3),
            "altUp": round(base + REFRACTION + dip(m), 3),
        })

    # 경계선이 내려온 자취
    track = []
    for y in range(FROM, 2101, 25):
        track.append({"y": y, "lim": round(limit_at(y), 4)})

    seoul = 37.5714
    out = {
        "star": {"name": "노인성", "alias": "카노푸스", "bayer": "α Carinae",
                 "ra": round(RA0, 4), "dec2000": round(DEC0, 4), "mag": MAG},
        "now": NOW,
        "from": FROM,
        "dec": round(d_now, 4),
        "limit": round(lim_now, 4),
        "limitDms": dms(lim_now),
        "refraction": REFRACTION,
        "sites": sites,
        "peaks": peaks,
        "track": track,
        # 626년 동안 경계선이 내려온 거리. 위도 1도를 111.0km로 본다.
        "drift": {
            "from": round(limit_at(FROM), 4),
            "to": round(lim_now, 4),
            "km": round((limit_at(FROM) - lim_now) * 111.0, 1),
        },
        # 서울이 경계선보다 얼마나 북쪽인가 — 1400년에는 1.6km였다
        "seoulGapKm": {
            "from": round((seoul - limit_at(FROM)) * 111.0, 1),
            "to": round((seoul - lim_now) * 111.0, 1),
        },
        "note": "기하학적 남중고도. 대기 소광은 따지지 않았다.",
    }

    path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "canopus.json")
    with open(os.path.normpath(path), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print(f"검산 통과 — {NOW}년 적위 {d_now:.4f}°, 한계 위도 {lim_now:.4f}° ({dms(lim_now)})")
    print(f"\n{NOW}년 남중고도")
    for s in sites:
        mark = "  " if s["up"] else " ✗"
        print(f"  {s['name']:<5}{s['lat']:>9.4f}{s['alt']:>8.2f}°{mark}  굴절 넣으면 {s['altRef']:>5.2f}°")
    print(f"\n산에 오르면")
    for p in peaks:
        print(f"  {p['name']:<5} {p['m']}m  지평선 {p['dip']:.2f}° 하강  "
              f"→ {p['alt']:+.2f}° 가 {p['altUp']:+.2f}°")
    print(f"\n경계선 {FROM} {out['drift']['from']:.3f}°N → {NOW} {out['drift']['to']:.3f}°N "
          f"= {out['drift']['km']}km 남하")
    print(f"서울까지 거리 {out['seoulGapKm']['from']}km → {out['seoulGapKm']['to']}km")


if __name__ == "__main__":
    main()
