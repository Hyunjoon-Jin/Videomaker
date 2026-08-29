#!/usr/bin/env python3
"""조위관측소별 예측 극치조위(고조·저조)를 받는다.

## 어디서

국립해양조사원 「스마트 조석예보」의 자료 다운로드 창이 쓰는 그대로다.
공공데이터포털의 조석예보 API는 인증키가 필요한데, 이쪽은 안 쓴다.

    https://www.khoa.go.kr/swtc/getDownHilowData.do
        ?obsPostId=DT_0002&date=202601&timeInterval=0

한 달치가 한 파일이고, 하루에 극치조위가 넷씩 들어 있다.

    2026-01-03, 04:04/고/743, 10:27/저/53, 16:46/고/888, 23:22/저/156

단위는 cm다. 평택 2026-01-03이면 저조 53에서 고조 888 — 조차 8.35m다.

## 관측소 목록

공공데이터포털 「해양수산부 국립해양조사원_조위관측소 운영 현황」
(15146602). 고유번호·이름·위경도가 들어 있다. 60곳인데 그중 셋은
종합해양과학기지(이어도·옹진소청초·신안가거초)라 뺀다.

## 조심할 것

받은 파일 머리에 이렇게 적혀 있다.

    *2028년 이후 예측정보는 추산 자료이므로 근거 자료로 사용 할 수 없습니다.

그래서 2026년만 받는다.

사용:  python3 scripts/fetch-tide.py
출력:  data/khoa-tide-2026.json
"""
import csv
import io
import json
import os
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
STATIONS = os.path.join(DATA, "khoa-stations.csv")
OUT = os.path.join(DATA, "khoa-tide-2026.json")

BASE = "https://www.khoa.go.kr/swtc/getDownHilowData.do"
YEAR = 2026
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")


def stations():
    raw = open(STATIONS, "rb").read()
    for enc in ("cp949", "utf-8-sig", "utf-8"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    out = []
    for r in list(csv.reader(io.StringIO(text)))[1:]:
        if not r or not r[0].startswith("DT_"):
            continue      # 종합해양과학기지는 뺀다
        out.append({"id": r[0], "name": r[2],
                    "lat": float(r[3]), "lon": float(r[4])})
    return out


def month(obs_id, ym, tries=4):
    q = urllib.parse.urlencode({"obsPostId": obs_id, "date": ym,
                                "timeInterval": 0, "obsPostName": ""})
    req = urllib.request.Request(f"{BASE}?{q}", headers={"User-Agent": UA})
    for a in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read().decode("cp949", errors="replace")
        except Exception:
            if a == tries - 1:
                return None
            time.sleep(2 ** a)
    return None


def parse(text):
    """[(날짜, [(시각, 고저, cm), ...]), ...]"""
    days = []
    for line in text.splitlines():
        line = line.strip()
        if not line[:4].isdigit() or line[4] != "-":
            continue
        cells = [c.strip() for c in line.split(",")]
        pts = []
        for c in cells[1:]:
            bits = c.split("/")
            if len(bits) < 3 or bits[0].startswith("--"):
                continue
            try:
                pts.append((bits[0], bits[1], int(bits[2])))
            except ValueError:
                continue
        if pts:
            days.append((cells[0], pts))
    return days


def main():
    sts = stations()
    print(f"{len(sts)}곳", flush=True)
    out = {}
    for i, s in enumerate(sts, 1):
        rec = []
        for m in range(1, 13):
            text = month(s["id"], f"{YEAR}{m:02d}")
            if text:
                rec += parse(text)
        out[s["id"]] = {"name": s["name"], "lat": s["lat"], "lon": s["lon"],
                        "days": rec}
        print(f'  {i:3d}/{len(sts)} {s["name"]:8s} {len(rec)}일', flush=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
    print("→", OUT)


if __name__ == "__main__":
    main()
