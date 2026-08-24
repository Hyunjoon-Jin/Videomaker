#!/usr/bin/env python3
"""전국 관측소의 역대 최대 적설이 언제 세워졌는지 낸다.

## 야마

한 동네의 눈 기록은 그 동네가 겪은 수백 번의 겨울이 만든 것이 아니라
딱 하루가 만든다. 92곳의 기록이 54일에 걸려 있고, 그중 17일이
55곳(60%)을 만들었다. 제일 센 하루가 2004년 3월 5일 — 여덟 곳이다.

## 자료

기상자료개방포털 기후통계 극값 조회. 키가 필요 없다.

    POST data.kma.go.kr/climate/extremum/selectExtremumAjaxList.do
      schGubun=1  schElem=4(적설)  schStnId=<지점번호>
      startYear=1904  endYear=2026
    → 그 지점의 역대 상위 10건 (값·날짜·관측시작일)

**지점번호를 비우면 전국 상위 10건만 나온다.** 그러면 울릉도가 다섯
자리를 먹고 끝이라 닫힌 집합이 아니다. 13편에서 '전국 1~10위'만
받았다가 양산 42.5도를 통째로 놓쳤던 것과 같은 함정이다.

그래서 data/kma-stations.json의 96개 지점을 하나씩 다 돌려
data/kma-snow.json에 받아뒀다. 이 스크립트는 그 캐시를 읽는다.
없으면 --fetch로 다시 받는다.

## 값의 정체

**일 최심신적설** — 하루 동안 새로 쌓인 눈의 최대 깊이다. 그 시점의
총 깊이를 재는 최심적설과는 다른 값이라 섞으면 안 된다. 널리 인용되는
울릉도 293.6cm는 최심적설이고, 이 자료의 울릉도 150.9cm는 신적설이다.

## 검산

main()이 돌 때마다 확인하고 어긋나면 멈춘다.

  · 기록이 있는 지점이 92곳
  · 최다 기록일이 2004-03-05이고 여덟 곳
  · 대전과 문경이 그날 49.0cm
  · 대전의 2위가 1위의 절반 언저리 (49.0 → 25.2)

사용:  python3 scripts/prep-snow.py [--fetch]
출력:  src/data/snow.json
"""
import json
import os
import sys
import time
import urllib.request
from collections import Counter, defaultdict

HERE = os.path.dirname(__file__)
ROOT = os.path.normpath(os.path.join(HERE, ".."))
STATIONS = os.path.join(ROOT, "data", "kma-stations.json")
CACHE = os.path.join(ROOT, "data", "kma-snow.json")
OUT = os.path.join(ROOT, "src", "data", "snow.json")

AJAX = "https://data.kma.go.kr/climate/extremum/selectExtremumAjaxList.do"
# 이 하루가 편의 전부다
DAY = "2004-03-05"
# 그 전날 밤 경기부터 시작했다. 이틀을 같이 보인다.
EVE = "2004-03-04"


def post(stn: str, tries: int = 5):
    body = ("stnFileNm=climateExtremum.json&schGubun=1&schElem=4"
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


def fetch_all() -> dict:
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
        time.sleep(0.35)
    json.dump(out, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    return out


def main() -> None:
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
        r1 = v["rows"][1] if len(v["rows"]) > 1 else None
        sites.append({
            "id": sid, "name": v["name"],
            "lat": v["lat"], "lon": v["lon"], "alt": round(v["alt"], 1),
            # 관측 시작 연도. 순위를 말할 때 같이 보여야 한다.
            "y0": int(v["start"].split(".")[0]),
            "v": r0["v"], "d": r0["d"],
            "v2": r1["v"] if r1 else None, "d2": r1["d"] if r1 else None,
        })

    # ── 검산 ──────────────────────────────────────────
    if len(sites) != 92:
        sys.exit(f"적설 기록이 있는 지점이 92곳이 아니다 — {len(sites)}곳")

    byday = defaultdict(list)
    for s in sites:
        byday[s["d"]].append(s["name"])
    top_day, top_n = max(((d, len(n)) for d, n in byday.items()), key=lambda t: t[1])
    if top_day != DAY or top_n != 8:
        sys.exit(f"최다 기록일이 {DAY} 여덟 곳이 아니다 — {top_day} {top_n}곳")

    byname = {s["name"]: s for s in sites}
    for n in ("대전", "문경"):
        if abs(byname[n]["v"] - 49.0) > 0.05 or byname[n]["d"] != DAY:
            sys.exit(f"{n}의 1위가 {DAY} 49.0cm가 아니다 — {byname[n]['v']} {byname[n]['d']}")
    dj = byname["대전"]
    if not (0.45 < dj["v2"] / dj["v"] < 0.58):
        sys.exit(f"대전의 2위가 1위의 절반 언저리가 아니다 — {dj['v2']} / {dj['v']}")

    # ── 타임라인 ──────────────────────────────────────
    # 기록일을 날짜순으로 세운다. 화면은 이 배열을 훑는다.
    days = sorted(byday.keys())
    timeline = []
    seen = 0
    for d in days:
        names = sorted(byday[d], key=lambda n: -byname[n]["v"])
        seen += len(names)
        timeline.append({"d": d, "names": names, "n": len(names), "seen": seen})

    multi = [t for t in timeline if t["n"] >= 2]
    month = Counter(int(s["d"][5:7]) for s in sites)

    # 그 이틀에 걸린 것 전부 — 1위가 아닌 지점도 포함한다.
    # 4일 밤 경기에서 시작해 5일 충청·경북으로 내려간 그림이 여기 있다.
    storm = {}
    for d in (EVE, DAY):
        hit = []
        for sid, v in raw.items():
            for i, r in enumerate(v["rows"]):
                if r["d"] == d:
                    hit.append({"name": v["name"], "lat": v["lat"], "lon": v["lon"],
                                "v": r["v"], "rank": i + 1})
        storm[d] = sorted(hit, key=lambda h: -h["v"])

    out = {
        "sites": sorted(sites, key=lambda s: -s["v"]),
        "timeline": timeline,
        "day": DAY, "eve": EVE,
        "dayNames": sorted(byday[DAY], key=lambda n: -byname[n]["v"]),
        "storm": storm,
        "month": {str(m): month.get(m, 0) for m in (11, 12, 1, 2, 3)},
        "nSites": len(sites),
        "nDays": len(days),
        "nMultiDays": len(multi),
        "nFromMulti": sum(t["n"] for t in multi),
        "note": "일 최심신적설 — 하루에 새로 쌓인 눈. 최심적설과는 다른 값이다.",
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"검산 통과 — 지점 {len(sites)}곳, 기록일 {len(days)}개")
    print(f"둘 이상 겹친 날 {len(multi)}개가 {out['nFromMulti']}곳"
          f"({out['nFromMulti'] / len(sites) * 100:.0f}%)을 만들었다")
    print(f"\n최다 기록일 {DAY} — {top_n}곳")
    for n in out["dayNames"]:
        s = byname[n]
        print(f"  {n:<5}{s['v']:>6.1f}cm   2위 {s['v2']:>5.1f}cm ({s['d2']})"
              f"   {s['v'] / s['v2']:.2f}배")
    print(f"\n{EVE} — 그 전날 밤")
    for h in storm[EVE][:6]:
        print(f"  {h['name']:<5}{h['v']:>6.1f}cm  그 지점 {h['rank']}위")
    print("\n지점별 1위가 난 달")
    for m in (11, 12, 1, 2, 3):
        print(f"  {m:>2}월  {month.get(m, 0):>2}곳  {'█' * month.get(m, 0)}")


if __name__ == "__main__":
    main()
