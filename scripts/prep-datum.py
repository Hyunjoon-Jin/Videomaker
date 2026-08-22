#!/usr/bin/env python3
"""동경측지계 → 세계측지계 좌표 이동량을 전국 지점마다 계산한다.

이 편도 외부 자료가 필요 없다. 두 타원체의 제원과 3-parameter 평행이동
값만 있으면 어느 지점이든 이동량이 나온다.

## 무엇을 계산하나

같은 물리적 지점의 좌표를 두 기준계로 각각 적으면 값이 다르다.
동경측지계(Bessel 1841 타원체, 원점은 일본 도쿄)로 적은 경위도를
세계측지계(GRS80, 원점은 지구 질량중심)로 다시 적으면 얼마나
달라지는지를 지점별로 낸다.

경위도 → ECEF 직교좌표(Bessel) → 평행이동 → 경위도(GRS80).

## 검산 — 국토교통부 보도자료와 맞는다

「"우리 땅 365m 바로 잡는다"…세계측지계로 변환」
국토교통부 지적재조사기획단, 2015.3.6. 배포 (2015.3.9. 조간)

  · "동경측지계는 세계측지계보다 약 365m 북서쪽으로 편차 발생"
  · "도면상 위치만 남동쪽으로 365m 이동"
  · 참고2 — "지적도의 좌표만 남쪽 315m, 동쪽 185m씩 변화"
  · 참고1 표 — Bessel 장반경 6,377,397.155m / GRS80 6,378,137.000m,
    차이 739.845m

계산 결과는 경복궁에서 위도 +9.83초, 경도 -7.68초(북 303m, 서 189m)다.
보도된 '위도 +10초, 경도 -8초'와 맞고, 동서 성분 185m와도 맞는다.
main()이 돌 때마다 이 범위를 먼저 확인하고 어긋나면 멈춘다.

## 방향을 두 번 뒤집지 않도록

여기가 이 편에서 제일 틀리기 쉬운 자리다.

  · **좌표 숫자**는 북서로 커진다 (위도 +, 경도 -)
  · **옛 좌표를 새 지도에 그대로 찍으면** 남동으로 어긋난다

보도자료가 둘 다 쓴다. "동경측지계가 세계측지계보다 365m 북서쪽"은
전자, "도면상 위치만 남동쪽으로 365m 이동"은 후자다.
JSON은 전자(dLat, dLon, north, east)만 담는다. 화면이 후자를 그릴
때는 부호를 뒤집어 쓴다 — 데이터를 두 벌 만들면 언젠가 섞인다.

## 3-parameter 값의 출처

dX, dY, dZ = -146.43, 507.89, 681.46 은 널리 쓰이는 값이지만
국토지리정보원 고시본은 찾지 못했다. 그래서 화면에는 '계산값'으로
밝힌다. 근거로 다는 것은 위 보도자료다 — 보도값을 이 계산이
재현한다는 것까지가 확인된 사실이다.

한 가지 더. 대한민국 경위도원점 자체의 고시 수치는 이 변환식으로
설명되지 않는다. 동경측지계 때 127도03분05.1452초 / 37도16분31.9031초,
세계측지계로 127도03분14.8913초 / 37도16분33.3659초다. 경도가 오히려
+9.75초 커졌다. 옛 원점 값은 일본에서 삼각망을 이어오며 쌓인 오차를
안고 있었고, 새 값은 위성으로 다시 잰 것이라 그렇다. 즉 원점의 수치
변화 = 측지계 차이 + 옛 망의 오차다. 이 편은 측지계 차이만 다루므로
원점 수치는 화면에 올리지 않는다.

사용:  python3 scripts/prep-datum.py
출력:  src/data/datum.json
"""
import json
import math
import os

# 타원체 제원. 장반경 a, 역편평률 rf.
# GRS80 값은 「공간정보의 구축 및 관리 등에 관한 법률 시행령」 제7조제1항.
BESSEL = (6377397.155, 299.1528128)
GRS80 = (6378137.0, 298.257222101)

# Bessel(동경측지계) → GRS80(세계측지계) 3-parameter 평행이동 (m)
DX, DY, DZ = -146.43, 507.89, 681.46

# (이름, 위도, 경도, 짧은 이름) — 전국이 고르게 안 움직인다는 걸 보이려고
# 남북으로 벌려 잡았다. 첫 항목이 확대해서 볼 지점이다.
SITES = [
    ("경복궁 근정전", 37.578611, 126.977000, "경복궁"),
    ("독도", 37.241389, 131.868611, "독도"),
    ("강릉시청", 37.752100, 128.876000, "강릉"),
    ("대전시청", 36.350400, 127.384500, "대전"),
    ("부산시청", 35.179554, 129.075642, "부산"),
    ("목포시청", 34.811700, 126.392400, "목포"),
    ("제주시청", 33.499621, 126.531188, "제주"),
]


def to_ecef(lat, lon, a, rf):
    """경위도(도) → 지구중심 직교좌표. 높이는 0으로 둔다."""
    f = 1.0 / rf
    e2 = f * (2 - f)
    p, l = math.radians(lat), math.radians(lon)
    s, c = math.sin(p), math.cos(p)
    n = a / math.sqrt(1 - e2 * s * s)
    return (n * c * math.cos(l), n * c * math.sin(l), n * (1 - e2) * s)


def to_geo(x, y, z, a, rf):
    """지구중심 직교좌표 → 경위도(도). 반복해서 수렴시킨다."""
    f = 1.0 / rf
    e2 = f * (2 - f)
    lon = math.atan2(y, x)
    p = math.hypot(x, y)
    lat = math.atan2(z, p * (1 - e2))
    for _ in range(30):
        s = math.sin(lat)
        n = a / math.sqrt(1 - e2 * s * s)
        h = p / math.cos(lat) - n
        lat = math.atan2(z, p * (1 - e2 * n / (n + h)))
    return math.degrees(lat), math.degrees(lon)


def meters_per_degree(lat, a, rf):
    """그 위도에서 위도 1도·경도 1도가 각각 몇 m인가."""
    f = 1.0 / rf
    e2 = f * (2 - f)
    p = math.radians(lat)
    s = math.sin(p)
    w = 1 - e2 * s * s
    mer = a * (1 - e2) / w ** 1.5          # 자오선 곡률반경
    prime = a / math.sqrt(w)               # 묘유선 곡률반경
    return (math.radians(1) * mer, math.radians(1) * prime * math.cos(p))


def shift(lat, lon):
    """동경측지계 경위도를 세계측지계로 옮겼을 때의 변화량."""
    x, y, z = to_ecef(lat, lon, *BESSEL)
    lat2, lon2 = to_geo(x + DX, y + DY, z + DZ, *GRS80)
    d_lat, d_lon = lat2 - lat, lon2 - lon
    mlat, mlon = meters_per_degree(lat, *GRS80)
    north, east = d_lat * mlat, d_lon * mlon
    return {
        "dLat": round(d_lat * 3600, 3),    # 초
        "dLon": round(d_lon * 3600, 3),
        "north": round(north, 1),          # m, 북이 +
        "east": round(east, 1),            # m, 동이 +
        "dist": round(math.hypot(north, east), 1),
    }


def check():
    """보도값과 어긋나면 여기서 멈춘다."""
    s = shift(37.578611, 126.977000)       # 경복궁
    if not (9.5 <= s["dLat"] <= 10.5):
        raise SystemExit(f"경복궁 위도 이동이 +10초에서 벗어났다: {s['dLat']}")
    if not (-8.5 <= s["dLon"] <= -7.5):
        raise SystemExit(f"경복궁 경도 이동이 -8초에서 벗어났다: {s['dLon']}")
    if not (180 <= abs(s["east"]) <= 195):
        raise SystemExit(f"동서 성분이 보도값 185m에서 벗어났다: {s['east']}")
    if not (330 <= s["dist"] <= 400):
        raise SystemExit(f"합이 365m 근처가 아니다: {s['dist']}")
    return s


def main():
    ref = check()
    sites = []
    for name, lat, lon, short in SITES:
        sites.append({"name": name, "short": short, "lat": lat, "lon": lon, **shift(lat, lon)})

    dists = [s["dist"] for s in sites]
    out = {
        "params": {
            "dX": DX, "dY": DY, "dZ": DZ,
            "bessel": {"a": BESSEL[0], "rf": BESSEL[1]},
            "grs80": {"a": GRS80[0], "rf": GRS80[1]},
            # 보도자료 참고1의 장반경 차이 739.845m와 맞는지 여기서 확인된다
            "aDiff": round(GRS80[0] - BESSEL[0], 3),
        },
        "sites": sites,
        "span": {
            "min": min(dists), "max": max(dists),
            "gap": round(max(dists) - min(dists), 1),
        },
        # 화면 고지에 쓸 문구의 근거
        "source": "국토교통부 지적재조사기획단 보도자료, 2015.3.6.",
    }

    path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "datum.json")
    with open(os.path.normpath(path), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print(f"검산 통과 — 경복궁 {ref['dLat']:+.2f}\" {ref['dLon']:+.2f}\" "
          f"= 북 {ref['north']:.0f}m 서 {-ref['east']:.0f}m ({ref['dist']:.0f}m)")
    print(f"장반경 차이 {out['params']['aDiff']}m (보도자료 739.845m)")
    for s in sites:
        print(f"  {s['short']:5s} {s['dLat']:+7.3f}\" {s['dLon']:+7.3f}\"  {s['dist']:6.1f}m")
    print(f"전국 편차 {out['span']['min']}~{out['span']['max']}m (차이 {out['span']['gap']}m)")


if __name__ == "__main__":
    main()
