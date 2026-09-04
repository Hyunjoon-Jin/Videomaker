#!/usr/bin/env python3
"""수도권 전철 노선과 역을 받는다 — OpenStreetMap.

## 어디서

Overpass API. `network=수도권 전철`인 route 관계를 다 받고, 그 관계의
노드 멤버(정차역)를 따로 받는다.

    rel(area.kr)["type"="route"]["network"~"수도권 전철"]
                ["route"~"^(subway|light_rail|train)$"];

## 두 번 나눠 받는다

한 번에 `out body; node(r); out body;`로 받으면 30초를 넘겨 게이트웨이가
504를 낸다. 관계 본문(멤버 목록)을 먼저 받고, 거기서 노드 id를 모아
`node(id:...)`로 좌표를 따로 받는다. 둘 다 5초 안에 끝난다.

## network 태그만 믿으면 안 된다

`network=수도권 전철`로만 받으면 **우이신설선이 통째로 빠진다.**
그쪽은 `ref=W`에 network 태그가 아예 없다. 노선 하나가 빠지면
「가장 많이 돌아가는 길」 같은 셈이 통째로 틀리므로, 수도권 상자
안에서 `route=subway|light_rail`인 것을 한 번 더 받아 합친다.

상자를 서울 언저리로 좁혀 잡았다. 전국으로 넓히면 `out body`가
30초를 넘겨 504가 난다. 이 상자 밖에서 network 태그가 빠진 노선이
새로 생기면 못 줍는다 — 받을 때 찍히는 ref 목록을 보고 안다.

## 미러를 쓴다

`overpass-api.de`가 이 환경에서 막혀 있다(연결이 리셋된다).
`overpass.kumi.systems`가 열려 있어 그쪽으로 간다. `overpass.osm.ch`는
붙기는 하는데 area 색인이 달라 한국 질의에 빈 답을 준다.

## 무엇이 들어 있나

노선 관계 229개(방향·계통별 변형 포함) · 역 노드 1,621개.
ref로 묶으면 25개 노선이다 — 1~9호선, 수인·분당, 경의·중앙, 경춘,
경강, 서해, 공항철도, 신분당, 인천1·2, 에버라인, 우이신설,
김포 골드라인, 신림선, 의정부경전철, GTX-A.

## 조심할 것

**급행 계통이 섞여 있다.** 이름에 「급행」이 든 관계는 역을 건너뛰어
이어져 있어서, 역 수를 셀 때 같이 넣으면 신창~연천이 48역으로
나온다(완행은 76역이다). 세는 쪽에서 걸러야 한다.

**환승역은 노선마다 노드가 따로 있다.** 노드 1,621개인데 이름은
666개다. 역으로 묶으려면 이름으로 합친다.

사용:  python3 scripts/fetch-metro.py
출력:  data/osm-metro.json
"""
import json
import os
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "osm-metro.json")
API = "https://overpass.kumi.systems/api/interpreter"

RELS = """
[out:json][timeout:120];
area["ISO3166-1"="KR"][admin_level=2]->.kr;
rel(area.kr)["type"="route"]["network"~"수도권 전철"]
           ["route"~"^(subway|light_rail|train)$"];
out body;
"""

# network 태그가 없는 노선(우이신설선 ref=W)을 줍는다
MORE = """
[out:json][timeout:120][bbox:37.2,126.5,37.85,127.35];
rel["type"="route"]["route"~"^(subway|light_rail)$"];
out body;
"""


def ask(q, least=1):
    """Overpass에 묻는다.

    **빈 답도 실패로 친다.** 서버가 가끔 200에 빈 목록을 주는데,
    그대로 저장하면 노선이 통째로 빠진 자료가 남는다. 한 번 그렇게
    덮어써서 경의·중앙선부터 GTX까지 다 날아갔다.
    """
    body = urllib.parse.urlencode({"data": q}).encode()
    for i in range(6):
        try:
            with urllib.request.urlopen(API, data=body, timeout=200) as r:
                out = json.loads(r.read())
            if len(out.get("elements", [])) >= least:
                return out
            print(f"  {i + 1}번째 빈 답 — 다시 묻는다", flush=True)
        except Exception as e:
            print(f"  {i + 1}번째 실패 ({e})", flush=True)
        time.sleep(3 * (i + 1))
    raise SystemExit("Overpass가 쓸 만한 답을 안 준다")


def main():
    rel = ask(RELS, least=200)["elements"]
    print(f"network=수도권 전철 관계 {len(rel)}개")
    have = {r["id"] for r in rel}
    add = [r for r in ask(MORE, least=100)["elements"]
           if r["id"] not in have]
    rel += add
    print(f"  + network 태그 없는 것 {len(add)}개 "
          + " · ".join(sorted({r["tags"].get("ref", "?") for r in add})))

    ids = sorted({m["ref"] for r in rel for m in r.get("members", [])
                  if m["type"] == "node"})
    print(f"역 노드 {len(ids)}개 — 좌표를 따로 받는다")
    nod = ask("[out:json][timeout:120];node(id:%s);out body;"
              % ",".join(map(str, ids)), least=len(ids))["elements"]

    json.dump({"routes": rel, "nodes": nod},
              open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    print(f"→ {OUT}  ({os.path.getsize(OUT) / 1e6:.1f}MB)")


if __name__ == "__main__":
    main()
