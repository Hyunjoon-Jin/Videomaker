#!/usr/bin/env python3
"""
KOSIS에서 시군구별 인구 시계열을 받아 src/data/population.json으로 저장한다.

이 파일이 채워지면 영상은 자동으로 실데이터로 전환되고
"샘플 데이터" 경고 배지가 사라진다(src/data/population.ts 참조).

인증키 발급(무료, 즉시):
  https://kosis.kr/openapi/  →  로그인  →  '활용신청'  →  발급키 복사

사용:
  KOSIS_API_KEY=xxxx python3 scripts/fetch-population.py

주의 — 행정구역은 50년간 크게 바뀐다(시군 통합, 구 신설, 세종시 출범).
현재 경계(2018년 250개 시군구)에 과거 인구를 매칭하려면 코드 매핑이 필요하다.
이 스크립트는 KOSIS가 내려주는 코드를 그대로 쓰고, 현재 경계에 없는 코드는
`--report`로 보고만 한다. 매핑 규칙은 실제 응답을 본 뒤 확정할 것.
"""
import json
import os
import subprocess
import sys

# 행정구역(시군구)별 주민등록인구
ORG_ID = "101"
TBL_ID = "DT_1B040A3"
BASE = "https://kosis.kr/openapi/Param/statisticsParameterData.do"

START_YEAR = 1975
END_YEAR = 2025
OUT = "src/data/population.json"
GEO = "src/data/korea-paths.json"


def fetch(key: str, start: int, end: int) -> list:
    url = (
        f"{BASE}?method=getList&apiKey={key}"
        f"&orgId={ORG_ID}&tblId={TBL_ID}"
        f"&itmId=T20&objL1=ALL"
        f"&prdSe=Y&startPrdDe={start}&endPrdDe={end}"
        f"&format=json&jsonVD=Y"
    )
    res = subprocess.run(
        ["curl", "-sS", "--max-time", "120", url],
        capture_output=True, text=True,
    )
    if res.returncode != 0:
        sys.exit(f"curl 실패 rc={res.returncode}: {res.stderr[:300]}")
    try:
        data = json.loads(res.stdout)
    except json.JSONDecodeError:
        sys.exit(f"비 JSON 응답: {res.stdout[:300]}")
    if isinstance(data, dict) and "err" in data:
        sys.exit(f"KOSIS 오류 {data.get('err')}: {data.get('errMsg')}")
    return data


def main() -> None:
    key = os.environ.get("KOSIS_API_KEY")
    if not key:
        sys.exit("KOSIS_API_KEY 환경변수가 필요합니다. https://kosis.kr/openapi/ 에서 발급.")

    known = {r["code"] for r in json.load(open(GEO, encoding="utf-8"))["regions"]}

    series: dict = {}
    unmatched: set = set()

    # 연도 범위를 나눠 요청(한 번에 50년치는 응답이 잘린다)
    for lo in range(START_YEAR, END_YEAR + 1, 10):
        hi = min(lo + 9, END_YEAR)
        print(f"  {lo}~{hi} 요청…")
        for row in fetch(key, lo, hi):
            code = str(row.get("C1", ""))
            year = str(row.get("PRD_DE", ""))
            val = row.get("DT")
            if not code or not year or val in (None, "", "-"):
                continue
            if code not in known:
                unmatched.add(code)
                continue
            series.setdefault(int(year), {})[code] = int(float(val))

    if not series:
        sys.exit("받은 데이터가 없습니다. 표 ID/파라미터를 확인하세요.")

    json.dump(series, open(OUT, "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))

    years = sorted(series)
    covered = len(series[years[-1]])
    print(f"저장: {OUT}")
    print(f"  연도 {years[0]}~{years[-1]} ({len(years)}개)")
    print(f"  최신 연도 매칭 지역 {covered}/{len(known)}")
    if unmatched:
        print(f"  ⚠ 현재 경계에 없는 코드 {len(unmatched)}개 (매핑 필요): "
              f"{sorted(unmatched)[:10]}")


if __name__ == "__main__":
    main()
