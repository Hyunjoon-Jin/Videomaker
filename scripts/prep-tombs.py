#!/usr/bin/env python3
"""조선왕릉 열여덟 곳을 위키데이터에서 받아 좌표와 거리를 뽑는다.

국가유산청(khs.go.kr, heritage.go.kr)은 이 환경에서 응답이 없다(000).
대신 위키데이터 SPARQL이 열려 있다.

  ?t wdt:P361 wd:Q495276    # part of: Royal Tombs of the Joseon Dynasty

19행이 나오는데 홍유릉이 좌표가 조금 다른 두 항목으로 잡혀 있다.
100m 안이면 같은 곳으로 보고 합친다. 그러면 열여덟 곳이 되고,
유네스코 등재 기준(40기 18개소)과 맞는다.

거리는 경복궁 근정전에서 대권거리로 잰다. '도성에서'의 기준을 무엇으로
잡느냐는 이 편에서 조심해야 할 자리다. 성벽 어디로 잡느냐에 따라 몇
리가 움직이므로, 안쪽 경계(10리)는 화면에서 다루지 않는다. 바깥
경계(100리)는 벗어난 셋이 104·160·349리라 기준점을 몇 km 옮겨도
결론이 안 바뀐다.

1리를 392.7m로 환산한다(주척 기준). 조선의 1리는 시기와 기준척에 따라
달랐고 대한제국 때 0.4km로 정해졌다. 어느 쪽을 쓰든 이 편의 결론은
같아서, 화면에는 '계산값'으로 밝히고 하나를 골라 일관되게 쓴다.

사용:  python3 scripts/prep-tombs.py
출력:  src/data/tombs.json
"""
import json
import math
import os
import urllib.parse
import urllib.request

SPARQL = "https://query.wikidata.org/sparql"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")

# 한양 — 경복궁 근정전
LAT0, LON0 = 37.5796, 126.9770
# 1리. 주척 기준.
RI_M = 392.7

QUERY = """
SELECT ?t ?ko ?en ?coord WHERE {
  ?t wdt:P361 wd:Q495276 .
  OPTIONAL { ?t wdt:P625 ?coord }
  OPTIONAL { ?t rdfs:label ?ko FILTER(LANG(?ko)="ko") }
  OPTIONAL { ?t rdfs:label ?en FILTER(LANG(?en)="en") }
}
"""

# 장릉이 셋이다(김포·파주·영월). 화면에 셋 다 '장릉'이면 무슨 소린지
# 알 수 없어서 지명을 붙인다. 위키데이터 라벨에는 그 구분이 없다.
RENAME = {
    (37.6131, 126.7108): "김포 장릉",
    (37.7736, 126.7081): "파주 장릉",
    (37.1974, 128.4531): "영월 장릉",
}


def great_circle(la1, lo1, la2, lo2):
    R = 6371.0088
    p1, p2 = math.radians(la1), math.radians(la2)
    dp = p2 - p1
    dl = math.radians(lo2 - lo1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# 받아온 원본을 남긴다.
#
# 위키데이터 질의 서비스가 장애 때 분당 1회로 조인다. 실제로 이 스크립트를
# 두 번째 돌리다 429를 맞았다. 원본을 안 남겨두면 그때부터 이 편의 데이터가
# 재현 불가능해진다. 받은 응답을 그대로 저장하고, 있으면 그걸 쓴다.
# 다시 받고 싶으면 이 파일을 지우면 된다.
RAW = "data/tombs-wikidata.json"


def fetch():
    if os.path.exists(RAW):
        with open(RAW, encoding="utf-8") as f:
            return json.load(f)["results"]["bindings"]
    url = SPARQL + "?" + urllib.parse.urlencode({"query": QUERY})
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept": "application/sparql-results+json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        body = r.read()
    os.makedirs("data", exist_ok=True)
    with open(RAW, "wb") as f:
        f.write(body)
    return json.loads(body)["results"]["bindings"]


def main():
    rows = []
    for x in fetch():
        c = x.get("coord", {}).get("value")
        if not c:
            continue
        lon, lat = (float(v) for v in c.replace("Point(", "").replace(")", "").split())
        name = (x.get("koLabel", {}).get("value")
                or x.get("ko", {}).get("value")
                or x.get("tLabel", {}).get("value")
                or x.get("en", {}).get("value") or "?")
        rows.append({"name": name, "lat": lat, "lon": lon})

    # 같은 곳이 좌표만 조금 다르게 두 번 들어온다(홍유릉). 300m 안이면 합친다.
    # 처음에 100m로 잡았더니 홍유릉 두 항목이 150m 떨어져 있어 안 합쳐졌다.
    # 능원은 담장 안이 수만 평이라 항목마다 어디를 찍었는지가 다르다.
    # 300m는 이 목록에서 서로 다른 능원 사이 최단거리(사릉↔홍유릉 1.6km)보다
    # 한참 작아서, 다른 곳을 잘못 합칠 여지가 없다.
    merged = []
    for r in rows:
        dup = next((m for m in merged
                    if great_circle(m["lat"], m["lon"], r["lat"], r["lon"]) < 0.3), None)
        if dup:
            continue
        merged.append(r)

    for r in merged:
        key = (round(r["lat"], 4), round(r["lon"], 4))
        if key in RENAME:
            r["name"] = RENAME[key]
        km = great_circle(LAT0, LON0, r["lat"], r["lon"])
        r["km"] = round(km, 2)
        r["ri"] = round(km * 1000 / RI_M)

    merged.sort(key=lambda r: r["km"])
    out = {
        "origin": {"name": "한양 경복궁 근정전", "lat": LAT0, "lon": LON0},
        "riMeters": RI_M,
        "source": "Wikidata Q495276 (Royal Tombs of the Joseon Dynasty)",
        "sites": merged,
    }
    with open("src/data/tombs.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    inside = [r for r in merged if r["ri"] <= 100]
    print(f"{len(merged)}곳 · 100리 안 {len(inside)} · 밖 {len(merged) - len(inside)}")
    for r in merged:
        mark = "" if r["ri"] <= 100 else "   ← 밖"
        print(f"  {r['km']:6.1f}km {r['ri']:4d}리  {r['name']}{mark}")


if __name__ == "__main__":
    main()
