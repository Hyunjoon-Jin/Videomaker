"""계미사행(1763~64) 음력 날짜를 일수로 옮긴다.

영상이 '출발 후 ○○일'을 세므로 달의 크기(29/30일)를 알아야 한다.
삭으로 달의 시작을, 중기(中氣)로 달의 번호를 정한다 — 중기가 없는 달이
윤달이라는 무중치윤법이다. 동지가 든 달이 11월이라는 것만 고정하면
나머지는 거기서 세어 내려온다. 시헌력이 북경 기준이므로 다 북경 지방시다.
"""
import math
from newmoon import nm, deltaT, cal, OFF

D = math.radians


def sun_lon(jde):
    """태양의 겉보기 황경(도). Meeus 25장 저정밀식."""
    T = (jde - 2451545.0) / 36525
    L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T**2
    M = 357.52911 + 35999.05029 * T - 0.0001537 * T**2
    C = ((1.914602 - 0.004817 * T - 0.000014 * T**2) * math.sin(D(M))
         + (0.019993 - 0.000101 * T) * math.sin(D(2 * M))
         + 0.000289 * math.sin(D(3 * M)))
    om = 125.04 - 1934.136 * T
    return (L0 + C - 0.00569 - 0.00478 * math.sin(D(om))) % 360


def jdn(y, m, d):
    a = (14 - m) // 12
    yy, mm = y + 4800 - a, m + 12 * a - 3
    return d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045


def local(jde):
    """TT 기준 JDE → 북경 지방시 날짜(JDN, (y,m,d))."""
    y = cal(jde)[0]
    y_, m_, d_, _ = cal(jde - deltaT(y) / 86400 + OFF)
    return jdn(y_, m_, d_), (y_, m_, d_)


def terms(j0, j1):
    """구간 안에서 태양 황경이 30의 배수가 되는 순간(중기·절기 전부)."""
    out, p, j = [], sun_lon(j0), j0 + 1
    while j < j1:
        c = sun_lon(j)
        if int(p // 30) != int(c // 30):
            deg = (int(c // 30) * 30) % 360
            lo, hi = j - 1, j
            for _ in range(60):
                m = (lo + hi) / 2
                v = ((sun_lon(m) - deg + 180) % 360) - 180
                if v < 0:
                    lo = m
                else:
                    hi = m
            out.append((local((lo + hi) / 2)[0], deg))
        p, j = c, j + 1
    return out


def build():
    lun = [local(nm(k)) for k in range(-2934, -2903)]
    # 중기는 30도 배수 중 짝수 번째(동지 270, 대한 300, 우수 330, 춘분 0 …)
    # 시헌력의 중기는 황경 0,30,60…이 아니라 330,0,30…이 아니라—
    # 정확히는 태양 황경이 30의 배수가 되는 순간이 중기다(절기는 그 사이 15도).
    tm = terms(lun[0][0] - 40, lun[-1][0] + 5)
    months = []
    for i in range(len(lun) - 1):
        a, b = lun[i][0], lun[i + 1][0]
        months.append({
            "start": a, "ymd": lun[i][1], "len": b - a,
            "terms": [d for j, d in tm if a <= j < b],
        })
    anchor = next(i for i, m in enumerate(months)
                  if 270 in m["terms"] and m["ymd"][0] == 1763)
    num = {}
    n = 11
    for i in range(anchor, len(months)):
        leap = False
        if i > anchor:
            if not months[i]["terms"]:
                leap = True
            else:
                n += 1
        yr = 1763 if n <= 12 else 1764
        mn = n if n <= 12 else n - 12
        num[i] = (yr, mn, leap)
    n = 11
    for i in range(anchor - 1, -1, -1):
        n -= 1
        num[i] = (1763, n, False)
    return months, num


if __name__ == "__main__":
    months, num = build()
    print("음력 달 (북경 지방시 초하루)")
    start = {}
    for i, m in enumerate(months):
        yr, mn, lp = num[i]
        if not lp:
            start[(yr, mn)] = m["start"]
        if (yr, mn) < (1763, 7) or (yr, mn) > (1764, 8):
            continue
        y, mo, d = m["ymd"]
        print(f"  {yr}년 {'윤' if lp else ' '}{mn:2d}월  초하루 {y}-{mo:02d}-{d:02d}  "
              f"{m['len']}일   중기{m['terms']}")

    def J(yr, mn, dy):
        return start[(yr, mn)] + dy - 1

    EVENTS = [
        (1763, 8, 3, "한양 출발"),
        (1763, 10, 6, "부산 출항"),
        (1764, 1, 21, "오사카 도착"),
        (1764, 2, 16, "에도 입성"),
        (1764, 3, 11, "에도 출발"),
        (1764, 4, 7, "최천종 피살"),
        (1764, 5, 2, "범인 처형"),
        (1764, 7, 8, "복명"),
    ]
    base = J(1763, 8, 3)
    print("\n사행 일정")
    for yr, mn, dy, name in EVENTS:
        j = J(yr, mn, dy)
        y, mo, d, _ = cal(j - 0.5)
        print(f"  음 {yr}. {mn:2d}. {dy:2d}   양 {y}-{mo:02d}-{d:02d}   "
              f"출발 후 {j - base:3d}일   {name}")
    print(f"\n에도 체류      {J(1764,3,11) - J(1764,2,16)}일")
    print(f"한양→부산출항  {J(1763,10,6) - base}일")
    print(f"부산→에도      {J(1764,2,16) - J(1763,10,6)}일")
    print(f"전체           {J(1764,7,8) - base}일")
