#!/usr/bin/env python3
"""시·군·구 면적을 받는다 — 국토교통부 지적기본통계집계.

## 왜 경계 폴리곤으로 안 재나

`data/skorea-municipalities.json`(통계청 2018 경계)으로 넓이를 재면
작은 구에서 어긋난다. 부산 중구가 3.02km²로 나오는데 지적통계는
3.045km²다. 경계선을 성기게 그린 자료라 작은 땅일수록 오차가 크고,
**4위 서울 중구(9.960)와 5위 부산 동구(10.121)는 0.16km² 차이라
폴리곤으로는 순위를 못 가른다.**

넓이는 기록값이다. 재지 말고 받아 쓴다.

## 어디서

공공데이터포털 「국토교통부_지적기본통계집계」(15063997). 인증키가
필요 없는 파일 내려받기다.

    https://www.data.go.kr/data/15063997/fileData.do
        → atchFileId를 뜯어
    https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=…&fileDetailSn=1

한 줄이 (행정구역, 대장 구분, 축척, 소유구분, 지목, 지번수, 면적)이고
면적 단위는 m²다. 행정구역별로 다 더하면 그 시군구의 지적 면적이다.

    252개 행정구역 · 합계 100,460km²

남한 국토면적 100,443km²와 0.02% 차이다.

## 조심할 것

- **대장 구분이 토지와 임야 둘이다.** 둘 다 더해야 전체 면적이다.
- **일반구는 따로 적혀 있다.** 「충청북도 청주시 상당구」처럼. 쓰는
  쪽에서 시로 묶는다.
- 기준일이 2024-12-31이다. 2026-07-01에 광주·전남이
  전남광주통합특별시로 합쳐졌지만 **기초자치단체 27곳은 그대로**라
  시군구 목록과 면적은 안 바뀐다. 시도 이름만 다르다.

사용:  python3 scripts/fetch-area.py
출력:  data/land-area.json
"""
import csv
import io
import json
import os
import re
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "land-area.json")

PAGE = "https://www.data.go.kr/data/15063997/fileData.do"
DOWN = "https://www.data.go.kr/cmm/cmm/fileDownload.do"
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")


def get(url, tries=5):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for a in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
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
    fid, sn = m.group(1), m.group(2)
    stamp = re.search(r"<title>[^<]*?_(\d{8})", html)
    print(f"{fid} · 기준일 {stamp.group(1) if stamp else '?'}", flush=True)

    raw = get(f"{DOWN}?atchFileId={fid}&fileDetailSn={sn}&insertDataPrcus=N")
    text = raw.decode("cp949", errors="replace")

    r = csv.reader(io.StringIO(text))
    head = next(r)
    area = {}
    rows = 0
    for row in r:
        if len(row) < 8:
            continue
        v = row[7].strip().replace(",", "")
        if not v:
            continue
        try:
            a = float(v)
        except ValueError:
            continue
        area[row[1].strip()] = area.get(row[1].strip(), 0.0) + a / 1e6
        rows += 1

    day = ""
    for row in csv.reader(io.StringIO(text)):
        if row and re.match(r"^\d{4}-\d{2}-\d{2}$", row[0].strip()):
            day = row[0].strip()
            break

    out = {"기준일": day, "출처": "국토교통부 지적기본통계집계",
           "면적": {k: round(v, 4) for k, v in sorted(area.items())}}
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False,
              indent=1)
    print(f"{rows:,}줄 · {len(area)}개 행정구역 · "
          f"합계 {sum(area.values()):,.0f}km²")
    print("→", OUT)


if __name__ == "__main__":
    main()
