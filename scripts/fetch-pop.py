#!/usr/bin/env python3
"""주민등록 인구를 행정동 단위로 받는다 — 행정안전부.

## 왜 행정동 단위인가

시군구 합계만 받으면 될 것 같지만, **행정동 자료라야 자가 하나 더
생긴다.** 전국 행정동 3,619개의 인구 분포가 「그 군이 웬만한 동
하나보다 사람이 적다」를 자료 안에서 증명한다.

시군구 인구는 행정동을 더해서 만든다.

## 어디서

공공데이터포털 「행정안전부_지역별(행정동) 성별 연령별 주민등록
인구수」(15097972). 인증키가 필요 없는 파일 내려받기다.

    https://www.data.go.kr/data/15097972/fileData.do
        → atchFileId를 뜯어
    https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=…&fileDetailSn=1

한 줄이 (행정기관코드, 기준연월, 시도명, 시군구명, 읍면동명, 계,
남자, 여자, 0세남자, …)다. 쓰는 것은 앞 여섯 칸뿐이다.

## 왜 KOSIS를 안 쓰나

`scripts/fetch-population.py`가 KOSIS 시계열을 받는데 인증키가
필요하다. 이쪽은 안 쓴다.

## 기준일이 중요하다

**2026-07-01에 행정구역이 두 군데 바뀌었다.**

- 광주광역시 + 전라남도 → 전남광주통합특별시. 기초자치단체 27곳은
  그대로다.
- 인천 중구·동구·서구 폐지 → 제물포구·영종구·서해구·검단구 신설.
  **여기서 시군구 목록이 바뀐다.**

그래서 이 자료의 기준연월이 개편 뒤인지 반드시 확인한다. 받은 값이
2026-07-31이면 개편이 반영된 것이다.

사용:  python3 scripts/fetch-pop.py
출력:  data/pop-dong.json
"""
import csv
import io
import json
import os
import re
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "pop-dong.json")

PAGE = "https://www.data.go.kr/data/15097972/fileData.do"
DOWN = "https://www.data.go.kr/cmm/cmm/fileDownload.do"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")


def get(url, tries=6):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for a in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                return r.read()
        except Exception as e:
            if a == tries - 1:
                raise
            print(f"  다시 ({e})", flush=True)
            time.sleep(2 ** a)


def main():
    html = get(PAGE).decode("utf-8", errors="replace")
    m = re.search(r"atchFileId=(FILE_\d+)&fileDetailSn=(\d+)", html)
    if not m:
        raise SystemExit("내려받을 파일을 못 찾았다")
    print(f"{m.group(1)}", flush=True)

    raw = get(f"{DOWN}?atchFileId={m.group(1)}&fileDetailSn={m.group(2)}"
              f"&insertDataPrcus=N")
    text = raw.decode("cp949", errors="replace")

    r = csv.reader(io.StringIO(text))
    next(r)
    rows = []
    day = ""
    for row in r:
        if len(row) < 6 or not row[4].strip():
            continue
        day = row[1].strip()
        rows.append([row[2].strip(), row[3].strip(), row[4].strip(),
                     int(row[5].replace(",", ""))])

    json.dump({"기준": day, "출처": "행정안전부 주민등록 인구현황(행정동)",
               "행정동": rows},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    total = sum(x[3] for x in rows)
    print(f"기준 {day} · 행정동 {len(rows):,}개 · 합계 {total:,}명")
    print("→", OUT)


if __name__ == "__main__":
    main()
