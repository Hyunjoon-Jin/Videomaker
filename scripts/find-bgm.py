#!/usr/bin/env python3
"""공유마당에서 BGM 후보를 훑어 받고 걸러낸다.

## 왜 여기인가

Kevin MacLeod의 음원은 CC BY지만 본인이 Content ID에 직접 등록해 뒀다.
그래서 올릴 때마다 클레임이 걸리고, 1분을 넘는 쇼츠는 주장이 살아 있는
동안 차단된다. 표준시 편이 그렇게 죽었다.

대안을 찾다 막힌 곳들:

  YouTube 오디오 보관함   스튜디오 로그인이 필요해 자동으로 못 받는다
  FreePD                 2025년에 폐쇄됐다
  Pixabay                403 (차단)
  Musopen                403 (차단)
  archive.org netlabels  CC0가 2천 건 넘게 있지만 실험음악 위주라 쓸 게 없다
  직접 합성              두 판 만들어 둘 다 퇴짜. 그만둔다

열려 있고 쓸 만한 곳이 **공유마당**(한국저작권위원회)이다. 정부가
운영하는 공유저작물 포털이고, 음악 분류에 대중음악·극음악·기악합주·
전통음악·관현악·국악이 나뉘어 있다. 국악이 있다는 게 이 채널에는
특히 맞는다 — 조선 편에 서양 라이브러리 음악을 까는 것보다 낫다.

## 라이선스를 반드시 읽는다

공유마당에는 네 계통이 섞여 있고 조건이 제각각이다.

  만료저작물     보호기간이 끝난 것. 조건 없음
  기증저작물     권리자가 기증한 것. 조건 없음
  CC BY         출처만 밝히면 상업적 이용·변경 자유
  CC BY-NC      비영리만. **쓰면 안 된다**
  CC BY-ND      변경 금지. 잘라 쓸 것이므로 **쓰면 안 된다**
  공공누리 1유형  출처표시만. 자유
  공공누리 2유형  상업적 이용 금지. **쓰면 안 된다**
  공공누리 3유형  변경 금지. **쓰면 안 된다**
  공공누리 4유형  둘 다 금지. **쓰면 안 된다**

이 스크립트는 상세 페이지에서 이용조건 문구를 그대로 긁어 함께 찍는다.
사람이 읽고 고르라는 뜻이지 자동으로 판정하지 않는다. 라이선스를
기계가 넘겨짚어 틀리면 그게 제일 비싼 실수다.

주의: 클레임이 안 걸린다고 보장할 수는 없다. 이건 라이선스 이야기지
Content ID 등록 여부는 올려보기 전에는 아무도 모른다. 그래서 편을 60초
아래로 유지하는 규칙(scripts/check-lengths.py)은 그대로 간다. 60초 아래면
주장이 걸려도 차단이 아니라 수익만 넘어간다.

## 무엇을 걸러내나

fetch-bgm.py가 음원을 고를 때 쓰던 두 지표를 그대로 쓴다.

  중역 비중   200~4000Hz가 전체 에너지에서 차지하는 몫. 휴대폰 스피커가
              그 대역만 제대로 낸다. 지금까지 채택한 곡들이 43~88%였다.
  고르기      0.25초 RMS 포락선의 평균 ÷ 표준편차. 채택 곡들이 2.9~4.9였다.

여기에 하나 더 — **길이**. 효과음이 잔뜩 섞여 있어서 20초 미만은 뺀다.

사용:
    python3 scripts/find-bgm.py 가야금 대금 정악          # 훑어서 표로
    python3 scripts/find-bgm.py --get 13387454           # 하나만 받기
출력:
    data/bgm-src/gongu-<wrtSn>.mp3 와 후보표
"""
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

import numpy as np

BASE = "https://gongu.copyright.or.kr"
LIST = f"{BASE}/gongu/wrt/wrtCl/listWrtSound.do"
VIEW = f"{BASE}/gongu/wrt/wrt/view.do"
PLAY = f"{BASE}/gongu/wrt/cmmn/wrtFileMediaPlay.do"
CACHE = "data/bgm-src"
SR = 48000

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")

# 쓰면 안 되는 조건. 문구에 이게 있으면 표에 표시한다.
BAD = ["비영리", "변경금지", "NC", "ND", "제2유형", "제3유형", "제4유형"]

# 20초 미만은 효과음으로 본다. 이 목록에 효과음이 수천 건 섞여 있다.
MIN_SEC = 20.0

# 편 하나에 필요한 길이. 이만큼 고른 구간이 곡 안에 있는지를 본다.
NEED = 58.0


def get(url: str, referer: str = BASE, tries: int = 5) -> bytes:
    """공유마당은 503을 자주 뱉는다. 한 번 실패로 훑기를 통째로 버리지 않는다."""
    import time
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": UA, "Referer": referer,
                "Accept-Language": "ko-KR,ko;q=0.9",
            })
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * 2 ** i)
    return b""


def text_of(html_bytes: bytes) -> str:
    s = html_bytes.decode("utf-8", "replace")
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S)
    s = re.sub(r"<style.*?</style>", " ", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    for a, b in [("&nbsp;", " "), ("&amp;", "&"), ("&quot;", '"'),
                 ("&lt;", "<"), ("&gt;", ">"), ("&#39;", "'")]:
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


def search(word: str, pages: int = 1) -> list[str]:
    """검색어로 wrtSn 목록을 긁는다."""
    out: list[str] = []
    for p in range(1, pages + 1):
        q = urllib.parse.urlencode({
            "menuNo": "200020", "searchWrd": word, "kwd": word, "pageIndex": p,
        })
        try:
            html = get(f"{LIST}?{q}").decode("utf-8", "replace")
        except Exception as e:
            print(f"  목록 실패 {word} p{p}: {e}")
            break
        found = re.findall(r"view\.do\?wrtSn=(\d+)", html)
        for sn in found:
            if sn not in out:
                out.append(sn)
    return out


# 이용조건은 대개 글자가 아니라 아이콘의 alt에 들어 있다. 처음에 본문
# 텍스트만 긁었더니 여덟 건 중 일곱 건이 "공표년도 창작년도"를 물어왔다.
LIC_IMG = re.compile(
    r'<img[^>]*(?:alt|title)="([^"]*(?:공공누리|CC BY|만료|기증)[^"]*)"', re.I)


def detail(sn: str) -> dict:
    """제목과 이용조건을 긁어온다."""
    raw = get(f"{VIEW}?wrtSn={sn}&menuNo=200020").decode("utf-8", "replace")
    t = text_of(raw.encode("utf-8"))
    title = ""
    m = re.search(r"저작물명\s*(.{2,60}?)\s*저작\(권\)자", t)
    if m:
        title = m.group(1)

    # 사이드바 검색 필터에도 CC-BY-NC 같은 것이 잔뜩 있어서 문서 전체에서
    # 첫 번째를 집으면 엉뚱한 걸 문다. '이용조건' 라벨 뒤부터 찾는다.
    lic = ""
    i = raw.find("이용조건")
    if i > 0:
        m = LIC_IMG.search(raw, i)
        if m:
            lic = m.group(1).strip()
    if not lic:
        m = re.search(r"이용조건\s*(.{4,160}?)\s*(?:공표년도|분류)", t)
        if m and "공표년도" not in m.group(1):
            lic = m.group(1)
    return {"sn": sn, "title": title, "license": lic or "(못 읽음 — 직접 확인)"}


def fetch_audio(sn: str) -> str | None:
    os.makedirs(CACHE, exist_ok=True)
    dst = os.path.join(CACHE, f"gongu-{sn}.mp3")
    if os.path.exists(dst) and os.path.getsize(dst) > 20_000:
        return dst
    try:
        data = get(f"{PLAY}?wrtSn={sn}&fileSn=1",
                   referer=f"{VIEW}?wrtSn={sn}&menuNo=200020")
    except Exception:
        return None
    if len(data) < 20_000 or not data[:4] in (b"ID3\x03", b"ID3\x04", b"ID3\x02"):
        if not data[:2] == b"\xff\xfb":
            return None
    with open(dst, "wb") as f:
        f.write(data)
    return dst


def decode(path: str) -> "np.ndarray | None":
    """mp3 → 48kHz 스테레오. remotion의 ffmpeg는 디코딩만 시킨다."""
    r = subprocess.run(
        ["npx", "remotion", "ffmpeg", "-y", "-i", path,
         "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", "-f", "wav", "-"],
        capture_output=True,
    )
    if r.returncode != 0:
        return None
    i = r.stdout.find(b"data")
    if i < 0:
        return None
    pcm = np.frombuffer(r.stdout[i + 8:], dtype="<i2")
    pcm = pcm[: len(pcm) // 2 * 2]
    return pcm.reshape(-1, 2).astype(np.float64) / 32768.0


def band_mid(m: "np.ndarray") -> float:
    X = np.abs(np.fft.rfft(m * np.hanning(len(m))))
    f = np.fft.rfftfreq(len(m), 1 / SR)
    return float(X[(f >= 200) & (f <= 4000)].sum() / (X.sum() or 1))


def best_window(a: "np.ndarray", need: float) -> dict:
    """
    곡 안에서 가장 고른 need초 구간을 찾는다.

    처음에 곡 전체로 재고 고르기가 낮다고 후보를 버렸다. 그건 잘못된
    검사다. fetch-bgm.py가 하던 일이 원래 '곡 안에서 잘라 쓸 구간을
    고르는 것'이었다. 곡에는 도입부도 있고 끝맺음도 있어서 전체로 재면
    당연히 편차가 크게 나온다. 우리가 알고 싶은 것은 '이 곡 안에 쓸 만한
    58초가 있는가'다.

    0.25초 RMS 포락선을 만들어 두고 창을 밀며 고르기를 잰다.
    """
    m = a.mean(axis=1)
    total = len(m) / SR
    if total < need:
        return {"sec": total, "start": 0.0, "mid": band_mid(m),
                "even": 0.0, "fits": False}
    w = int(0.25 * SR)
    env = np.array([np.sqrt(np.mean(m[i:i + w] ** 2))
                    for i in range(0, len(m) - w, w)])
    span = int(need / 0.25)
    best = (-1.0, 0)
    for s0 in range(0, len(env) - span, 4):   # 1초 간격으로 훑는다
        e = env[s0:s0 + span]
        sd = e.std() or 1e-9
        sc = e.mean() / sd
        if sc > best[0]:
            best = (sc, s0)
    even, s0 = best
    t0 = s0 * 0.25
    seg = m[int(t0 * SR): int((t0 + need) * SR)]
    return {"sec": total, "start": t0, "mid": band_mid(seg),
            "even": float(even), "fits": True}


def main() -> None:
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args[0] == "--get":
        for sn in args[1:]:
            d = detail(sn)
            p = fetch_audio(sn)
            print(f"{sn} {d['title']} · {d['license']} → {p}")
        return

    rows = []
    seen: set[str] = set()
    for word in args:
        sns = search(word)
        print(f"'{word}' {len(sns)}건")
        for sn in sns:
            if sn in seen:
                continue
            seen.add(sn)
            d = detail(sn)
            p = fetch_audio(sn)
            if not p:
                continue
            a = decode(p)
            if a is None or len(a) == 0:
                continue
            w = best_window(a, NEED)
            if w["sec"] < MIN_SEC or not w["fits"]:
                os.remove(p)
                continue
            bad = [b for b in BAD if b in d["license"]]
            rows.append({**d, **w, "bad": bad, "path": p, "word": word})

    rows.sort(key=lambda r: (bool(r["bad"]), -r["even"]))
    print(f"\n{'wrtSn':<10}{'전체':>7}{'구간':>8}{'중역':>6}{'고르기':>7}  제목")
    for r in rows:
        flag = "  ✗ " + ",".join(r["bad"]) if r["bad"] else ""
        print(f"{r['sn']:<10}{r['sec']:>6.0f}s{r['start']:>7.0f}s"
              f"{r['mid']*100:>5.0f}%{r['even']:>7.2f}  {r['title'][:30]}{flag}")
        print(f"{'':24}{r['license'][:90]}")
    print(f"\n{len(rows)}건. 이용조건을 직접 읽고 고를 것 — "
          "비영리·변경금지·공공누리 2~4유형은 이 채널에서 못 쓴다.")


if __name__ == "__main__":
    main()
