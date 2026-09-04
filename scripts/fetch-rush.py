#!/usr/bin/env python3
"""서울교통공사 역별·일별·시간대별 승하차 인원을 받아 평일 평균으로 접는다.

## 자료

공공데이터포털 15048032 「서울교통공사_역별 일별 시간대별 승하차인원
정보_20241231」. 인증키 없이 파일로 받는다 — `fileData.do` 쪽을 긁어
`atchFileId`를 찾은 뒤 `fileDownload.do`로 내려받는다. cp949다.

칸은 26개. 연번·수송일자·호선·역번호·역명·승하차구분 다음에
06시이전부터 24시이후까지 20칸이다.

## 평일만 센다

주말은 흐름이 통째로 다르다. 공휴일 20일도 뺀다. 2024년 평일 245일.

## 환승역은 호선마다 줄이 따로다

서울역이 1호선 한 줄, 4호선 한 줄로 들어 있다. **역명으로 합친다** —
사람이 「서울역」을 하나로 세기 때문이다.

## 13-14시간대 칸은 오염돼 있다

서울 전체 승차가 앞뒤 시간대의 1.8배로 튀는데, 8개 호선·7개 요일에서
똑같이 튄다. 실제 흐름이 아니다. 역마다 하루 총량의 약 4%가 이 칸에
얹혀 있고, 도심역(삼성 0.5%)보다 외곽 주거역(암사 6.0%)에서 크다.
정기권이나 미태그 정산분을 한 칸에 몰아넣은 것으로 보인다.

**그래서 이 칸은 쓰지 않는다.** 여기서는 지우지 않고 그대로 남기되
`dirty`에 적어 둔다 — 지워 버리면 다음 사람이 또 속는다.

연간 승차 합계 16.5억 명은 서울교통공사 공식 수송실적과 맞는다.
총량은 멀쩡하고 한 칸의 배분만 틀렸다.

출력: data/subway-hours.json
"""
import csv
import datetime
import io
import json
import os
import re
import sys
import urllib.request
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "subway-hours.json")

PORTAL = "https://www.data.go.kr"
SET_ID = "15048032"
UA = {"User-Agent": "Mozilla/5.0"}

# 2024년 관공서 공휴일. 대체공휴일(2/12, 5/6)과 임시공휴일(10/1)을 넣었다
HOLIDAYS = {
    "2024-01-01", "2024-02-09", "2024-02-10", "2024-02-11", "2024-02-12",
    "2024-03-01", "2024-04-10", "2024-05-01", "2024-05-05", "2024-05-06",
    "2024-05-15", "2024-06-06", "2024-08-15", "2024-09-16", "2024-09-17",
    "2024-09-18", "2024-10-01", "2024-10-03", "2024-10-09", "2024-12-25",
}

DIRTY = "13-14시간대"


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def download():
    """포털 상세 쪽에서 파일 번호를 찾아 내려받는다."""
    page = get(f"{PORTAL}/data/{SET_ID}/fileData.do").decode("utf-8", "replace")
    m = re.search(r"atchFileId=(FILE_\d+)&fileDetailSn=(\d+)", page)
    if not m:
        raise SystemExit("파일 번호를 못 찾았다 — 캡차가 붙었을 수 있다")
    url = (f"{PORTAL}/cmm/cmm/fileDownload.do?atchFileId={m.group(1)}"
           f"&fileDetailSn=1&insertDataPrcus=N")
    print("받는다", url, flush=True)
    return get(url)


def main():
    cache = sys.argv[1] if len(sys.argv) > 1 else None
    blob = open(cache, "rb").read() if cache else download()
    text = blob.decode("cp949")

    r = csv.reader(io.StringIO(text))
    head = next(r)
    hours = head[6:26]

    on = defaultdict(lambda: [0.0] * 20)
    off = defaultdict(lambda: [0.0] * 20)
    lines = defaultdict(set)
    days = set()
    year_on = 0.0

    for row in r:
        day = row[1]
        year_on += sum(float(x or 0) for x in row[6:26]) if row[5] == "승차" else 0
        if day in HOLIDAYS or datetime.date.fromisoformat(day).weekday() >= 5:
            continue
        days.add(day)
        name = row[4]
        lines[name].add(row[2])
        box = on[name] if row[5] == "승차" else off[name]
        for i, v in enumerate(row[6:26]):
            box[i] += float(v or 0)

    n = len(days)
    if n < 200:
        raise SystemExit(f"평일이 {n}일밖에 없다 — 파일이 한 해가 아니다")

    fold = lambda t: {k: [round(x / n) for x in v] for k, v in t.items()}
    json.dump({
        "source": f"공공데이터포털 {SET_ID} 서울교통공사 역별 일별 시간대별 승하차",
        "days": n, "hours": hours,
        "dirty": DIRTY,
        "on": fold(on), "off": fold(off),
        "lines": {k: sorted(v) for k, v in lines.items()},
    }, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)

    print(f"평일 {n}일 · {len(on)}역 · 연간 승차 {year_on/1e8:.1f}억 명")
    print(f"{DIRTY} 칸은 오염됐다 — 쓰지 않는다")
    print("→", OUT)


if __name__ == "__main__":
    main()
