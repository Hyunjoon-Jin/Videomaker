#!/usr/bin/env python3
"""지점별 연도별 최고·최저기온을 받아 '그 해까지의 기온 폭' 순위를 해마다 낸다.

## 왜 다시 받나

앞판은 지점마다 역대 최고·최저 하나씩만 받아 막대 다섯 개를 세웠다.
결과는 맞지만 화면이 정지해 있다. 순위표가 처음부터 끝까지 그대로라
볼 이유가 없다.

순위를 **해마다** 내려면 지점별 연도별 값이 필요하다. 극값 조회는
상위 10개만 주므로 못 쓴다. 기후통계분석 쪽에 연도별 표가 따로 있다.

    POST /stcs/grnd/grndTaAjaxList.do
      dataFormCd=F00512 (년)  dataTypeCd=standard
      startDt/endDt = 연도   taElement=MIN&taElement=MAX
      stnId=<지점번호>
    → [{year, maxTa, minTa, avgTa, lati, lngt, ...}, ...]

## 무엇을 세나

**그 해까지의 기온 폭** = (관측 시작부터 그 해까지의 최고) −
(같은 구간의 최저). 기록은 깨질 때만 올라가는 값이라, 순위표가
해마다 조금씩 움직이고 기록이 깨진 해에 크게 뒤집힌다.

'그 해의 기온 폭'(그 해 최고 − 그 해 최저)이 아니다. 그건 해마다
출렁여서 순위가 무의미하게 요동친다. 이 편이 세는 것은 누적 기록이다.

## 시작 연도

관측 지점이 열 곳 미만이면 순위표가 안 찬다. 열 곳이 채워지는 해를
찾아 거기서 시작한다 — 코드가 계산해서 정한다.

## 관측 기간 편향

늦게 시작한 지점은 불리하다. 이건 숨길 게 아니라 이 화면이 보여주는
것이다. 새 지점은 아래에서 들어와 기록이 쌓이면서 올라간다. 그
움직임 자체가 '순위가 관측 기간에 흔들린다'를 말한다.

사용:  python3 scripts/prep-race.py
출력:  src/data/race.json
캐시:  data/kma-yearly.json
"""
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
AJAX = "https://data.kma.go.kr/stcs/grnd/grndTaAjaxList.do"
REF = "https://data.kma.go.kr/stcs/grnd/grndTaList.do"

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
STN_CACHE = os.path.join(ROOT, "data", "kma-stations.json")
YR_CACHE = os.path.join(ROOT, "data", "kma-yearly.json")
OUT = os.path.join(ROOT, "src", "data", "race.json")

END_YEAR = 2026
# 순위표를 채우는 칸 수
TOP_N = 10


def yearly(stn: str) -> list:
    body = ("isSample=N&pgmNo=70&menuNo=432&serviceSe=F00101&stdrMg=99999"
            "&selectType=1&mddlClssCd=SFC01&dataFormCd=F00512&dataTypeCd=standard"
            f"&startDt=1904&endDt={END_YEAR}&startYear=1904&endYear={END_YEAR}"
            f"&taElement=MIN&taElement=MAX&stnId={stn}&areaId=&stnGroupSns=")
    for _ in range(3):
        r = subprocess.run(
            ["curl", "-sS", "--max-time", "40", "-A", UA,
             "-H", "X-Requested-With: XMLHttpRequest", "-e", REF, "-d", body, AJAX],
            capture_output=True, text=True)
        try:
            d = json.loads(r.stdout)
        except Exception:
            continue
        if isinstance(d, list):
            return [{"y": x["year"], "hi": x["maxTa"], "lo": x["minTa"]}
                    for x in d if x.get("maxTa") is not None and x.get("minTa") is not None]
    return []


def main():
    if not os.path.exists(STN_CACHE):
        sys.exit("data/kma-stations.json이 없다. scripts/prep-extremes.py를 먼저 돌린다.")
    stns = json.load(open(STN_CACHE, encoding="utf-8"))

    cache = json.load(open(YR_CACHE, encoding="utf-8")) if os.path.exists(YR_CACHE) else {}
    todo = [s for s in stns if s not in cache]
    if todo:
        with ThreadPoolExecutor(max_workers=8) as ex:
            for stn, rows in zip(todo, ex.map(yearly, todo)):
                cache[stn] = rows
                print(f"  {stn} {stns[stn]['name']} {len(rows)}년", flush=True)
        json.dump(cache, open(YR_CACHE, "w", encoding="utf-8"), ensure_ascii=False)

    got = {k: v for k, v in cache.items() if v}
    print(f"지점 {len(got)}개")

    # ── 누적 기록 ─────────────────────────────────────
    # 그 해까지의 최고와 최저. 기록은 깨질 때만 움직인다.
    run = {}
    for stn, rows in got.items():
        by = {r["y"]: r for r in rows}
        hi = lo = None
        cur = {}
        for y in range(min(by), END_YEAR + 1):
            if y in by:
                hi = by[y]["hi"] if hi is None else max(hi, by[y]["hi"])
                lo = by[y]["lo"] if lo is None else min(lo, by[y]["lo"])
            if hi is not None:
                cur[y] = {"hi": round(hi, 1), "lo": round(lo, 1), "gap": round(hi - lo, 1)}
        run[stn] = cur

    # ── 시작 연도 — 순위표 열 칸이 채워지는 해 ──────────
    start = None
    for y in range(1904, END_YEAR + 1):
        if sum(1 for c in run.values() if y in c) >= TOP_N:
            start = y
            break
    if start is None:
        sys.exit("열 곳이 동시에 관측한 해가 없다")

    years = []
    for y in range(start, END_YEAR + 1):
        rows = [(stn, run[stn][y]) for stn in run if y in run[stn]]
        rows.sort(key=lambda t: -t[1]["gap"])
        years.append({
            "y": y,
            "n": len(rows),
            "top": [{"stn": s, "name": stns[s]["name"], **v} for s, v in rows[:TOP_N]],
        })

    # ── 검산 ──────────────────────────────────────────
    # 마지막 해의 1위는 prep-extremes.py가 낸 것과 같아야 한다.
    last = years[-1]["top"]
    if last[0]["name"] != "양평":
        sys.exit(f"마지막 해 1위가 양평이 아니다 — {last[0]['name']} {last[0]['gap']}")
    if abs(last[0]["gap"] - 72.7) > 0.11:
        sys.exit(f"양평 폭이 72.7과 다르다 — {last[0]['gap']}")

    # 순위가 실제로 바뀌는지. 안 바뀌면 이 편은 정지 화면이다.
    lead = [y["top"][0]["name"] for y in years]
    changes = sum(1 for a, b in zip(lead, lead[1:]) if a != b)
    if changes == 0:
        sys.exit("1위가 한 번도 안 바뀐다. 레이스가 안 된다.")

    stn_meta = {}
    for y in years:
        for r in y["top"]:
            s = stns[r["stn"]]
            stn_meta[r["stn"]] = {"name": s["name"], "lat": s["lat"], "lon": s["lon"]}

    out = {
        "from": start,
        "to": END_YEAR,
        "topN": TOP_N,
        "years": years,
        "stations": stn_meta,
        "leadChanges": changes,
        "source": "기상청 기상자료개방포털 기온분석(연별)",
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)

    print(f"\n{start}~{END_YEAR} · {len(years)}해 · 1위가 {changes}번 바뀐다")
    print(f"순위표에 오른 지점 {len(stn_meta)}곳")
    for y in years[:1] + years[len(years) // 3:len(years) // 3 + 1] + years[-1:]:
        head = " · ".join(f"{r['name']} {r['gap']}" for r in y["top"][:4])
        print(f"  {y['y']}  ({y['n']}곳)  {head}")
    print("\n1위가 바뀐 해")
    for i in range(1, len(years)):
        if lead[i] != lead[i - 1]:
            t = years[i]["top"][0]
            print(f"  {years[i]['y']}  {lead[i-1]} → {t['name']} {t['gap']}")


if __name__ == "__main__":
    main()
