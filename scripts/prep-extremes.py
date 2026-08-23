#!/usr/bin/env python3
"""기상청 극값 조회를 지점마다 돌려 역대 최고·최저 기온을 모은다.

## 어디서 받나

기상자료개방포털의 극값 조회가 인증키 없이 열려 있다. 지점 하나에
두 번 물으면(일최고 / 일최저) 그 지점이 관측을 시작한 뒤 겪은
가장 높은 값과 가장 낮은 값이 날짜와 함께 나온다.

    POST /climate/extremum/selectExtremumAjaxList.do
      schGubun=1 (년)  schElem=1 (기온)
      tempInputVal=7 (연별 일최고기온) / 8 (연별 일최저기온)
      schStnId=<지점번호>  startYear=  endYear=

지점 좌표와 해발고도는 minwon.kma.go.kr의 관측지점정보 표에서 온다.
지점번호·지점명·주소·위도·경도·해발고도가 한 줄에 다 있다.
**눈대중으로 찍은 좌표가 하나도 없다.**

## 왜 두 번 재나

이 편의 주장은 '홍천이 제일 크게 벌어진다'인데, 순위를 말하려면
목록이 공정해야 한다. 지점마다 관측 시작 연도가 다르다 — 대구는
1907년, 홍천은 1971년, 철원은 1988년, 양산시는 2008년이다. 오래
관측한 지점일수록 극값이 커지는 것은 당연하다.

전체 기간으로 재면 양평이 72.7도로 1위다. 그런데 양평의 -32.6도는
1981년 1월 5일 하나에 걸려 있고, 그날 철원은 아직 관측을 시작하지도
않았다. 그래서 **1988년 이전부터 관측한 지점만 골라 1988~2026년
구간으로 한 번 더 잰다.** 그러면 홍천이 1위고 양평은 6위로 내려간다.

홍천은 두 기준 모두 맨 위라 홍천으로 간다. 양평의 1위는 관측 기간이
만든 것이다.

값 하나하나가 맞는 것과 목록이 공정한 것은 다른 검증이다. 왕릉 편이
여기서 걸렸다.

## 화면에서 '1위'라고 말하지 않는 이유

기준에 따라 1위가 바뀌므로 순위는 주장하지 않는다. 홍천이 41.0도와
-28.1도를 다 겪었다는 것은 기록값이고, 대관령·양산·대구를 옆에 놓으면
'한 곳이 양쪽 다'가 순위를 말하지 않고도 읽힌다.

사용:  python3 scripts/prep-extremes.py
출력:  src/data/extremes.json
캐시:  data/kma-extremum.json, data/kma-stations.json
"""
import json
import math
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
AJAX = "https://data.kma.go.kr/climate/extremum/selectExtremumAjaxList.do"
REF = "https://data.kma.go.kr/climate/extremum/selectExtremumList.do"
STN_URL = "https://minwon.kma.go.kr/main/obvStn.do"

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
STN_CACHE = os.path.join(ROOT, "data", "kma-stations.json")
EXT_CACHE = os.path.join(ROOT, "data", "kma-extremum.json")
OUT = os.path.join(ROOT, "src", "data", "extremes.json")

# 공통기간 검증 — 이 해 이전부터 관측한 지점만, 이 해부터 다시 잰다.
# 1988을 고른 이유는 그 앞뒤로 지점이 한 번 크게 늘었기 때문이다.
COMMON_FROM = 1988

# 화면에 세우는 지점. 첫 항목이 주인공이다.
# 나머지는 '한쪽만 잘하는 곳'을 보이려고 고른 것이다.
CAST = [
    ("홍천", "여름과 겨울이 다 극단"),
    ("철원", "겨울은 더 내려가지만 여름이 못 따라감"),
    ("서울", ""),
    ("대관령", "관측 지점 중 가장 높은데 여름에 짐"),
    ("대구", "여름은 상위, 겨울이 멈춤"),
    ("양산시", "역대 최고기온 1위인데 겨울이 없음"),
    ("서귀포", "양쪽 다 안 감"),
]


def curl(args: list) -> str:
    r = subprocess.run(["curl", "-sS", "--max-time", "40", "-A", UA] + args,
                       capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else ""


def stations() -> dict:
    """지점번호 → 이름·주소·위경도·해발고도·관측시작."""
    if os.path.exists(STN_CACHE):
        return json.load(open(STN_CACHE, encoding="utf-8"))
    raw = curl(["-L", STN_URL])
    out = {}
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", raw, re.S):
        td = [re.sub(r"<[^>]+>", "", c).replace("&nbsp;", "").strip()
              for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
        if len(td) >= 8 and td[0].isdigit():
            out[td[0]] = {"name": td[3], "addr": td[4], "lat": float(td[5]),
                          "lon": float(td[6]), "alt": float(td[7]),
                          "start": td[2][:10].replace(".", "-")}
    if len(out) < 50:
        sys.exit(f"지점 표를 못 읽었다 ({len(out)}개). minwon.kma.go.kr 화면이 바뀐 것이다.")
    os.makedirs(os.path.dirname(STN_CACHE), exist_ok=True)
    json.dump(out, open(STN_CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return out


def extremum(stn: str, elem: int, y0: int, y1: int) -> dict | None:
    """elem 7 = 일최고, 8 = 일최저. 1위 한 건만 쓴다."""
    body = ("isSample=N&menuNo=1150&serviceSe=F00101&selectType=2&mddlClssCd=SFC01"
            "&stnFileNm=climateExtremum.json&schGubun=1&schElem=1"
            f"&tempInputVal={elem}&startYear={y0}&endYear={y1}&schStnId={stn}")
    for _ in range(3):
        try:
            d = json.loads(curl(["-H", "X-Requested-With: XMLHttpRequest",
                                 "-e", REF, "-d", body, AJAX]))
        except Exception:
            continue
        if d.get("code") == "00":
            lst = (d.get("data") or {}).get("schElem1List") or []
            return lst[0] if lst else None
    return None


def harvest(stns: dict) -> dict:
    """지점 × (전체기간, 공통기간) × (최고, 최저)."""
    cache = json.load(open(EXT_CACHE, encoding="utf-8")) if os.path.exists(EXT_CACHE) else {}

    def one(stn):
        got = {}
        for tag, y0 in (("all", 1904), ("common", COMMON_FROM)):
            for key, elem in (("hi", 7), ("lo", 8)):
                got[f"{tag}.{key}"] = extremum(stn, elem, y0, 2026)
        return stn, got

    todo = [s for s in stns if s not in cache]
    if todo:
        with ThreadPoolExecutor(max_workers=8) as ex:
            for stn, got in ex.map(one, todo):
                cache[stn] = got
                print(f"  {stn} {stns[stn]['name']}", flush=True)
        json.dump(cache, open(EXT_CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    return cache


def val(rec) -> float | None:
    return float(rec["val"]) if rec and rec.get("val") else None


def rank_table(stns: dict, cache: dict, tag: str, only_old: bool) -> list:
    """교차(최고-최저)가 큰 순으로. only_old면 COMMON_FROM 이전부터 관측한 지점만."""
    rows = []
    for stn, got in cache.items():
        s = stns.get(stn)
        if not s:
            continue
        if only_old and s["start"] >= f"{COMMON_FROM}-01-01":
            continue
        hi, lo = got.get(f"{tag}.hi"), got.get(f"{tag}.lo")
        h, l = val(hi), val(lo)
        if h is None or l is None:
            continue
        rows.append({"stn": stn, "name": s["name"], "lat": s["lat"], "lon": s["lon"],
                     "alt": s["alt"], "start": s["start"],
                     "hi": h, "hiDt": hi["tma"], "lo": l, "loDt": lo["tma"],
                     "gap": round(h - l, 1)})
    rows.sort(key=lambda r: -r["gap"])
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return rows


def corr(a: list, b: list) -> float:
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    va = sum((x - ma) ** 2 for x in a)
    vb = sum((y - mb) ** 2 for y in b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(va * vb)


def main():
    stns = stations()
    print(f"지점 {len(stns)}개")
    cache = harvest(stns)

    allr = rank_table(stns, cache, "all", only_old=False)
    comr = rank_table(stns, cache, "common", only_old=True)
    by_all = {r["name"]: r for r in allr}
    by_com = {r["name"]: r for r in comr}

    # ── 검산 ──────────────────────────────────────────
    # 홍천이 두 기준 모두 위쪽에 있어야 이 편이 선다. 아니면 멈춘다.
    h_all, h_com = by_all.get("홍천"), by_com.get("홍천")
    if not h_all or not h_com:
        sys.exit("홍천 자료를 못 받았다")
    if h_all["rank"] > 3 or h_com["rank"] > 3:
        sys.exit(f"홍천이 밀렸다 — 전체 {h_all['rank']}위, 공통 {h_com['rank']}위. 편을 다시 봐야 한다.")
    if abs(h_all["hi"] - 41.0) > 0.01 or abs(h_all["lo"] + 28.1) > 0.01:
        sys.exit(f"홍천 기록이 달라졌다 — {h_all['hi']} / {h_all['lo']}")

    cast = []
    for name, why in CAST:
        r = by_all.get(name)
        if not r:
            sys.exit(f"{name} 자료가 없다")
        cast.append({**r, "why": why,
                     "commonRank": by_com[name]["rank"] if name in by_com else None})

    gaps = [r["gap"] for r in allr]
    out = {
        "cast": cast,
        # 전국 막대를 그리려면 다 필요하다. 주인공만 그리면 비교가 없다.
        "all": allr,
        "rank": {
            "allTop": [{"name": r["name"], "gap": r["gap"]} for r in allr[:5]],
            "commonTop": [{"name": r["name"], "gap": r["gap"]} for r in comr[:5]],
            "commonFrom": COMMON_FROM,
            "commonCount": len(comr),
        },
        # 해발고도는 교차와 거의 상관이 없다 — 대관령이 밀리는 것과 맞물린다.
        "corr": {
            "alt": round(corr([r["alt"] for r in allr], gaps), 3),
            "lat": round(corr([r["lat"] for r in allr], gaps), 3),
        },
        "source": "기상청 기상자료개방포털 극값 조회 · 관측지점정보",
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"\n검산 통과 — 홍천 {h_all['hi']}℃ / {h_all['lo']}℃ = {h_all['gap']}℃"
          f" (전체 {h_all['rank']}위, 공통 {h_com['rank']}위)")
    print(f"\n전체 기간 {len(allr)}개 지점")
    for r in allr[:5]:
        print(f"  {r['rank']:>2} {r['name']:<7}{r['hi']:>6.1f}{r['lo']:>7.1f}{r['gap']:>7.1f}"
              f"   관측 {r['start'][:4]}")
    print(f"\n{COMMON_FROM}년 이후 공통기간 {len(comr)}개 지점")
    for r in comr[:5]:
        print(f"  {r['rank']:>2} {r['name']:<7}{r['hi']:>6.1f}{r['lo']:>7.1f}{r['gap']:>7.1f}")
    print(f"\n출연 지점")
    for r in cast:
        print(f"  {r['name']:<7}{r['hi']:>6.1f} ({r['hiDt']}) {r['lo']:>7.1f} ({r['loDt']})"
              f"{r['gap']:>7.1f}  해발 {r['alt']:>5.0f}m  전체 {r['rank']:>2}위")
    print(f"\n상관 — 해발고도 {out['corr']['alt']:+.2f}, 위도 {out['corr']['lat']:+.2f}")


if __name__ == "__main__":
    main()
