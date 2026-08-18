#!/usr/bin/env python3
"""
BGM 내려받기 — 합성을 그만두고 실제 음원을 쓴다.

사인파로 곡을 짜보려 여러 판을 만들었지만 결국 음악이 되지 않았다.
합성으로 만들 수 있는 것과 곡으로 들리는 것 사이의 거리가 생각보다 멀다.

대신 라이선스가 확실한 음원을 받아 쓴다. 유튜브에 올릴 것이므로 이
부분이 가장 중요하다. Kevin MacLeod의 곡은 CC BY 4.0이라 출처만 밝히면
상업적 이용까지 자유롭다. 표기 문구는 docs/publish.md의 각 영상 설명에
넣어뒀고, 아래 CREDIT에도 적어둔다.

  https://incompetech.com — Kevin MacLeod, CC BY 4.0
  https://creativecommons.org/licenses/by/4.0/

곡을 고른 기준은 두 가지다.
 1) 에너지가 고르게 유지되는 구간이 있을 것. 조용해졌다 커졌다 하면
    영상 길이에 맞춰 자르는 순간 곡이 이상해진다.
 2) 편마다 성격이 맞을 것. 전쟁 편은 관현악 타격, 태풍 편은 조여드는
    긴장, 철도 편은 이동감.

시작 지점은 두 가지를 같이 봐서 정했다. 0.25초 단위 RMS 포락선의 평균이
높고 편차가 작을 것, 그리고 200~4000Hz 비중이 클 것. 두 번째가 중요한
이유는 휴대폰 스피커가 그 대역만 제대로 내기 때문이다. 처음에는 에너지가
가장 고른 구간을 골랐는데 저역이 76%인 자리가 뽑혀서, 웅장하긴 해도
휴대폰에서는 웅웅거리기만 했다.

사용:  python3 scripts/fetch-bgm.py
출력:  public/bgm.wav, bgm-kw.wav, bgm-ty.wav, bgm-rail.wav
"""
import os
import subprocess
import sys
import urllib.parse
import urllib.request
import wave

import numpy as np

SR = 48000

BASE = "https://incompetech.com/music/royalty-free/mp3-royaltyfree"
CACHE = "data/bgm-src"

CREDIT = (
    "음악: Kevin MacLeod (incompetech.com) — Creative Commons BY 4.0"
)

# (출력, 곡 이름, 시작 초, 길이 초, 왜 이 곡인지)
TRACKS = [
    (
        "public/bgm.wav", "The Descent", 33.0, 92.0,
        "임진왜란 — 어둡게 조여드는 진행. Clash Defiant가 더 웅장했지만 "
        "고른 구간이 저역 76%라 휴대폰에서 뭉근하게만 들렸다.",
    ),
    (
        "public/bgm-kw.wav", "Volatile Reaction", 25.0, 98.5,
        "6·25 — 어둡고 밀어붙이는 진행. 전선이 네 번 뒤집히는 편에 맞는다.",
    ),
    (
        "public/bgm-ty.wav", "Anguish", 26.0, 57.0,
        "태풍 — 조여드는 긴장. Rising Tide가 제목은 더 맞았지만 고른 구간의 "
        "중역이 37%뿐이라 휴대폰에서 힘이 없었다. 이쪽이 76%다.",
    ),
    (
        "public/bgm-pw.wav", "Static Motion", 42.0, 64.0,
        "5·14 단전 — 조여들다 끊기는 편. 고른 구간을 자동으로 훑어 골랐다"
        "(고르기 4.65, 중역 43%). Industrial Music Box가 점수는 더 높았지만 "
        "중역 100%라 저역이 통째로 비어 오르골처럼 얇았다.",
    ),
    (
        "public/bgm-bs.wav", "Killers", 228.0, 65.0,
        "봉수 — 밤에 불이 한 줄로 올라오는 편이라 밀어붙이는 진행이 맞는다. "
        "고른 구간을 자동으로 훑어 골랐다(고르기 3.93, 중역 70%). Echoes of Time이 "
        "분위기는 맞았지만 중역이 3%뿐이라 휴대폰에서 아무것도 안 들렸다.",
    ),
    (
        "public/bgm-ts.wav", "Deep Haze", 34.0, 85.5,
        "조선통신사 — 열한 달을 가는 편이라 밀어붙이면 안 된다. 고른 구간을 "
        "자동으로 훑어 골랐다(고르기 4.91, 중역 48%). Crypto가 고르기는 7.74로 "
        "제일 높았지만 중역이 18%뿐이라 휴대폰에서 배경이 비었다.",
    ),
    (
        "public/bgm-gc.wav", "Machinations", 21.0, 61.2,
        "간척 — 바다를 막는 편이라 기계가 도는 느낌이 맞는다. 고른 구간을 "
        "자동으로 훑어 골랐다(고르기 3.69, 중역 44%). Deep Haze가 점수는 더 "
        "높았지만 통신사 편이 이미 쓰고 있어 두 편이 같은 곡이 된다.",
    ),
    (
        "public/bgm-tz.wav", "Half Mystery", 137.0, 60.2,
        "표준시 — 전쟁도 재난도 아니고 법령이 네 번 바뀐 편이라 밀어붙이면 "
        "안 된다. 고른 구간을 자동으로 훑어 골랐다(고르기 3.36, 중역 88%). "
        "Grim Idol이 고르기는 4.10으로 더 높았지만 어두운 타격이라 전쟁 편 "
        "톤이고, 중역도 44%뿐이다.",
    ),
    (
        "public/bgm-sl.wav", "Lost Time", 19.0, 79.0,
        "조선왕조실록 사고 — 지키는 편이라 밀어붙이면 안 되고, 그렇다고 "
        "느슨해도 안 된다. 고른 구간을 자동으로 훑어 골랐다(고르기 4.66, "
        "중역 43%). Unseen Horrors가 고르기 4.89로 더 높았지만 원본이 너무 "
        "작아(세기 0.024) 키우면 잡음이 같이 올라온다.",
    ),
    (
        "public/bgm-qk.wav", "Windswept", 56.0, 73.6,
        "한반도 밑 — 땅속 600km를 훑어 내려가는 편이라 넓고 느린 것이 맞는다. "
        "고른 구간을 자동으로 훑어 골랐다(고르기 3.33, 중역 53%). Unseen Horrors가 "
        "고르기 4.90으로 더 높았지만 원본이 너무 작아(세기 0.024) 키우면 잡음이 "
        "같이 올라온다. Tempting Secrets는 고르기 11.20으로 압도적인데 중역이 "
        "13%뿐이라 휴대폰에서 배경이 통째로 빈다.",
    ),
    (
        "public/bgm-tyc.wav", "Anguish", 26.0, 20.2,
        "태풍 20초 판 — 본편과 같은 곡의 같은 자리를 짧게 자른다. 두 판을 "
        "나란히 올려 길이만 놓고 비교할 것이므로 음악까지 바꾸면 무엇이 "
        "달랐는지 알 수 없다.",
    ),
    (
        "public/bgm-rail.wav", "Lost Frontier", 9.0, 140.1,
        "철도 — 넓고 계속 나아가는 느낌. 200~4000Hz 비중이 84%로 후보 중 "
        "가장 또렷하다. 전쟁 편들과 톤도 달라야 한다.",
    ),
]

# 페이드. 끝은 길게 빼야 영상이 끝날 때 뚝 끊기지 않는다.
FADE_IN = 1.2
FADE_OUT = 3.0
# 네 편의 체감 음량을 맞춘다. 곡마다 원본 레벨이 제각각이다.
TARGET_RMS = 0.14


def decode(src: str) -> "np.ndarray":
    """
    mp3 → 48kHz 스테레오 실수 배열.

    레포에 딸린 remotion의 ffmpeg는 필터가 빠진 축소 빌드라 afade도
    loudnorm도 없다. 디코딩만 시키고 자르기·페이드·음량은 여기서 한다.
    """
    r = subprocess.run(
        ["npx", "remotion", "ffmpeg", "-y", "-i", src,
         "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", "-f", "wav", "-"],
        capture_output=True,
    )
    if r.returncode != 0:
        sys.exit(r.stderr.decode()[-2000:])
    raw = r.stdout
    i = raw.find(b"data")
    if i < 0:
        sys.exit("wav 헤더를 찾지 못했다")
    pcm = np.frombuffer(raw[i + 8:], dtype="<i2")
    pcm = pcm[: len(pcm) // 2 * 2]
    return pcm.reshape(-1, 2).astype(np.float64) / 32768.0


def write_wav(path: str, x: "np.ndarray") -> None:
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def fetch(name: str) -> str:
    os.makedirs(CACHE, exist_ok=True)
    dst = os.path.join(CACHE, f"{name}.mp3")
    if os.path.exists(dst) and os.path.getsize(dst) > 100_000:
        return dst
    url = f"{BASE}/{urllib.parse.quote(name)}.mp3"
    print(f"  받는 중 {name}")
    with urllib.request.urlopen(url, timeout=120) as r, open(dst, "wb") as f:
        f.write(r.read())
    if os.path.getsize(dst) < 100_000:
        sys.exit(f"내려받기 실패: {url}")
    return dst


def main() -> None:
    print(CREDIT)
    # 자막을 한 줄 고치면 길이가 바뀌고 그 편의 BGM만 다시 잘라야 한다.
    # 열한 곡을 매번 디코딩할 이유가 없어서 이름으로 걸러낼 수 있게 했다.
    #   python3 scripts/fetch-bgm.py tyc qk
    only = sys.argv[1:]
    for out, name, start, dur, why in TRACKS:
        if only and not any(k in out for k in only):
            continue
        a = decode(fetch(name))
        i0 = int(start * SR)
        seg = a[i0: i0 + int(dur * SR)].copy()
        if len(seg) < int(dur * SR):
            sys.exit(f"{name}: 필요한 길이를 못 채웠다")

        # 자른 자리를 페이드로 감춘다. 끝을 길게 빼야 뚝 끊기지 않는다.
        fi = int(FADE_IN * SR)
        fo = int(FADE_OUT * SR)
        seg[:fi] *= np.linspace(0, 1, fi)[:, None]
        seg[-fo:] *= np.linspace(1, 0, fo)[:, None]

        # 네 곡의 체감 음량을 맞춘다. 곡마다 원본 레벨이 제각각이다.
        # 정확한 LUFS 대신 RMS를 쓴다 — 네 곡을 서로 맞추는 데는 충분하다.
        rms = float(np.sqrt(np.mean(seg ** 2))) or 1.0
        seg *= TARGET_RMS / rms
        # 피크만 부드럽게 눌러 클리핑을 막는다.
        # 전에는 신호 전체에 tanh를 걸었는데, 순간 피크 하나 때문에
        # 곡 전체가 눌려 음량이 목표의 절반으로 떨어졌다.
        TH = 0.75
        m = np.abs(seg) > TH
        seg[m] = np.sign(seg[m]) * (
            TH + (1 - TH) * np.tanh((np.abs(seg[m]) - TH) / (1 - TH))
        )

        # 마지막 안전장치. 소프트 리미터는 1.0에 점근하므로 그대로 두면
        # 인코딩 단계에서 아슬아슬하다.
        peak = float(np.max(np.abs(seg)))
        if peak > 0.95:
            seg *= 0.95 / peak

        write_wav(out, seg)
        print(f"{out} · {dur:.1f}s · {name} @{start:.0f}s · {os.path.getsize(out)//1024}KB")
        print(f"   {why}")


if __name__ == "__main__":
    main()
