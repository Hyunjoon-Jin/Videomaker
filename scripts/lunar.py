"""음력 날짜를 일수로 옮긴다.

사행록도 실록도 음력으로 적혀 있는데 화면은 '며칠 걸렸나'를 센다.
그러려면 달이 29일인지 30일인지를 알아야 하고, 그건 삭(朔)이 언제
들었는지로 정해진다. 달의 번호는 중기(中氣)로 정한다 — 중기가 없는
달이 윤달이라는 무중치윤법이고, 동지가 든 달이 11월이다.
시헌력이 북경 기준이라 전부 북경 지방시로 잰다.

사용:
    python3 scripts/lunar.py 1763        # 그 해 11월을 기준으로 앞뒤 달력
    python3 scripts/lunar.py 1763 8 3 1764 7 8   # 두 음력 날짜 사이 일수
"""
import math
import sys

from newmoon import OFF, cal, deltaT, nm

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
    """태양 황경이 30의 배수가 되는 순간 = 중기."""
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


def k_near(year):
    """그 해 언저리의 삭 번호. k=0이 2000-01-06이고 한 해에 12.3685개다."""
    return int((year - 2000) * 12.3685)


def build(year):
    """year년 11월(동지가 든 달)을 기준으로 앞뒤 달력을 만든다."""
    k0 = k_near(year) - 14
    lun = [local(nm(k)) for k in range(k0, k0 + 32)]
    tm = terms(lun[0][0] - 40, lun[-1][0] + 5)
    months = []
    for i in range(len(lun) - 1):
        a, b = lun[i][0], lun[i + 1][0]
        months.append({
            "start": a, "ymd": lun[i][1], "len": b - a,
            "terms": [d for j, d in tm if a <= j < b],
        })
    anchor = next(i for i, m in enumerate(months)
                  if 270 in m["terms"] and m["ymd"][0] == year)
    start = {}
    n = 11
    for i in range(anchor, len(months)):
        if i > anchor:
            if not months[i]["terms"]:
                continue          # 윤달 — 번호를 안 올린다
            n += 1
        yr = year if n <= 12 else year + 1
        mn = n if n <= 12 else n - 12
        start[(yr, mn)] = months[i]["start"]
    n = 11
    for i in range(anchor - 1, -1, -1):
        n -= 1
        if n < 1:
            break
        start[(year, n)] = months[i]["start"]
    return start


def jd_of(year, month, day):
    """음력 (년, 월, 일) → JDN. 그 해 동지를 기준으로 세어 찾는다."""
    for base in (year, year - 1):
        s = build(base)
        if (year, month) in s:
            return s[(year, month)] + day - 1
    raise SystemExit(f"{year}년 {month}월을 못 찾았다")


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) == 6:
        j0 = jd_of(int(a[0]), int(a[1]), int(a[2]))
        j1 = jd_of(int(a[3]), int(a[4]), int(a[5]))
        for j, lbl in ((j0, "부터"), (j1, "까지")):
            y, m, d, _ = cal(j - 0.5)
            print(f"  {lbl}  양력 {y}-{m:02d}-{d:02d}")
        print(f"  차이  {j1 - j0}일")
    else:
        year = int(a[0]) if a else 1763
        s = build(year)
        for (yr, mn), j in sorted(s.items()):
            y, m, d, _ = cal(j - 0.5)
            nxt = s.get((yr, mn + 1)) or s.get((yr + 1, 1))
            ln = f"{nxt - j}일" if nxt else "?"
            print(f"  {yr}년 {mn:2d}월  초하루 양력 {y}-{m:02d}-{d:02d}  {ln}")
