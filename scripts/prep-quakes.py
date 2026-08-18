#!/usr/bin/env python3
"""
지진 목록 — USGS 지진 카탈로그에서 굽는다.

기상청(weather.go.kr)은 이 환경에서 막혀 있다. 대신 USGS의 FDSN 이벤트
API를 쓴다. 전 세계 카탈로그라 한반도만 따로 손보지 않았고, 무엇보다
**이벤트 종류를 직접 분류해 둔다.** 이게 이 편에 결정적이다.

  type = earthquake         지진
  type = nuclear explosion  핵실험 — 이 창에 여섯 건 있다
  type = collapse           붕괴 — 2017년 9월 3일 폭발 8분 뒤 한 건

지진만 그린다. 폭발과 붕괴는 뺀다. 규모만 보고 골랐으면 M6.3짜리
핵실험이 '한반도 최대 지진'으로 화면에 올라갔을 것이다. 판단을 내가
하지 않고 카탈로그의 분류를 그대로 따른다.

── 두 개의 문턱 ─────────────────────────────────────
전체 창은 M5.5 이상만 담는다. M5.0까지 내리면 6천 건이 넘어 일본
동쪽이 새까매지고, 판이 내려가는 모양은 M5.5로도 그대로 보인다
(130°E 깊이중앙 566km → 143°E 25km).

그런데 한반도는 M5.5 이상이 손에 꼽는다. 그 상자(124~131°E, 33~43.5°N)
만 M4.0까지 내렸다. 안 그러면 '한반도 지진' 장면에 점이 두어 개뿐이다.
문턱이 두 개라는 것은 화면 고지와 고정댓글에 적는다.

── 단면은 위도 띠를 정해서 자른다 ──────────────────
판은 위도마다 다르게 누워 있다. 창 전체를 한 단면에 겹치면 규슈 밑
얕은 지진과 함경도 밑 600km가 같은 자리에 찍혀 뭉갠다. 화면의 단면은
**북위 36~44도** 구간만 쓰고, 평면 지도에 그 띠를 그려 어디를 자른
것인지 보여준다.

── 규모 표기 ────────────────────────────────────────
USGS 값을 쓴다. 기상청과 다르다 — 2016 경주가 USGS M5.4 / 기상청 5.8,
2017 포항이 USGS M5.5 / 기상청 5.4다. 척도(mb·Mw·ML)와 관측망이 달라서
생기는 차이다. 한 카탈로그 안에서 서로 비교해야 하므로 섞지 않고 USGS로
통일하고, 차이는 고정댓글에 적는다.

출력: src/data/quakes.json
사용:  python3 scripts/prep-quakes.py
"""
import json
import urllib.request

OUT = "src/data/quakes.json"
API = "https://earthquake.usgs.gov/fdsnws/event/1/query"

# 지도·단면이 공유하는 창. prep-slabmap.py와 같아야 한다.
LON0, LON1 = 124.0, 147.0
LAT0, LAT1 = 30.0, 47.0

MIN_MAG = 5.5
# 한반도 상자는 문턱을 낮춘다
KOR = (124.0, 131.0, 33.0, 43.5)
KOR_MAG = 4.0


def fetch(minmag: float) -> list:
    q = (f"{API}?format=geojson&starttime=1900-01-01"
         f"&minmagnitude={minmag}"
         f"&minlatitude={LAT0}&maxlatitude={LAT1}"
         f"&minlongitude={LON0}&maxlongitude={LON1}&limit=20000")
    with urllib.request.urlopen(q, timeout=180) as r:
        return json.load(r)["features"]


def main() -> None:
    wide = fetch(MIN_MAG)
    near = fetch(KOR_MAG)

    kinds = {}
    for x in wide + near:
        kinds[x["properties"]["type"]] = kinds.get(x["properties"]["type"], 0) + 1
    print("카탈로그가 붙인 종류:", kinds)

    seen = set()
    out = []
    for x in wide + near:
        p = x["properties"]
        if p["type"] != "earthquake":
            continue
        lon, lat, dep = x["geometry"]["coordinates"]
        if p["mag"] is None or dep is None:
            continue
        # 한반도 상자 밖에서는 M5.0 문턱을 그대로 지킨다
        in_kor = KOR[0] <= lon <= KOR[1] and KOR[2] <= lat <= KOR[3]
        if not in_kor and p["mag"] < MIN_MAG:
            continue
        if x["id"] in seen:
            continue
        seen.add(x["id"])
        out.append({
            "t": p["time"] // 1000,          # 초 단위 UTC
            "m": round(p["mag"], 1),
            "lon": round(lon, 3),
            "lat": round(lat, 3),
            "d": round(dep, 1),              # km
        })

    out.sort(key=lambda e: e["t"])
    deep = [e for e in out if e["d"] >= 300]
    print(f"지진 {len(out)}건 · 깊은 것(300km↑) {len(deep)}건")
    print(f"가장 깊은 것 {max(e['d'] for e in out):.0f}km · 가장 큰 것 M{max(e['m'] for e in out)}")

    json.dump(
        {
            "lon": [LON0, LON1], "lat": [LAT0, LAT1],
            "minMag": MIN_MAG, "korBox": list(KOR), "korMag": KOR_MAG,
            "source": "USGS FDSN event query, type=earthquake only",
            "events": out,
        },
        open(OUT, "w"), separators=(",", ":"),
    )
    import os
    print(f"{OUT} · {os.path.getsize(OUT)//1024}KB")


if __name__ == "__main__":
    main()
