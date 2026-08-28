#!/usr/bin/env python3
"""한반도 해안선을 OSM에서 받는다.

`natural=coastline`은 땅과 바다의 경계만 그린 선이다. 시군구 경계의
바깥 둘레와 달리 휴전선이 안 섞인다.

**북한까지 받는다.** 강원 북부에서는 북한 쪽 동해가 더 가깝다.
바다는 나라를 가리지 않는다.

Overpass 공식 서버(overpass-api.de)와 kumi.systems는 이 환경에서
막혀 있다. maps.mail.ru 거울만 열린다.

받는 양이 66MB라 `/data/`는 커밋하지 않는다(.gitignore). 필요하면
다시 받는다. 1분쯤 걸린다.

사용:  python3 scripts/fetch-coastline.py
출력:  data/osm-coastline.json
"""
import json
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "osm-coastline.json")
API = "https://maps.mail.ru/osm/tools/overpass/api/interpreter"

# 남한 전체 + 북한 해안선까지. 제주 남쪽(33.0)부터 함남(39.6)까지.
QUERY = """[out:json][timeout:600];
way["natural"="coastline"](33.0,124.0,39.6,132.0);
out geom;
"""


def main():
    req = urllib.request.Request(API, data=QUERY.encode("utf-8"))
    with urllib.request.urlopen(req, timeout=900) as r:
        raw = r.read()
    gj = json.loads(raw)
    ways = gj["elements"]
    pts = sum(len(w.get("geometry", [])) for w in ways)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "wb") as f:
        f.write(raw)
    print(f"{len(ways):,} way · {pts:,}점 → {OUT}")


if __name__ == "__main__":
    main()
