#!/usr/bin/env python3
"""
BGM 합성 — 전면 재작성.

앞선 판은 시퀀서였다. 킥·스네어·하이햇·베이스·아르페지오를 각각 따로
발음시켜 한 버퍼에 쏟았다. 그래서 계속 끊겼다. 원인이 셋이었다.

 1) 이어지는 소리가 하나도 없었다. 모든 층이 짧게 감쇠하는 낱개 음이라,
    음과 음 사이마다 소리가 0으로 내려갔다.
 2) 구간마다 페이드인·페이드아웃이 걸려 경계에서 음량이 파였다.
 3) 킥이 칠 때마다 화성을 눌렀고(사이드체인), 조용한 구간에서는 드럼을
    통째로 뺐다. 곡이 실제로 멈추는 지점이 여러 군데 있었다.

이번 판은 반대로 만든다. **처음부터 끝까지 끊기지 않는 한 덩어리**를
깔고, 그 위에서 세기만 변한다.

  현악 지속음   화음을 계속 붙들고 있다. 절대 0으로 내려가지 않는다.
  저역 지속음   근음을 한 옥타브 아래에서 계속 받친다.
  오스티나토    같은 화음을 8분음표로 떨지만, 음량이 0.34까지만 내려간다.
                끊는 게 아니라 흔드는 것이다.
  맥박          박마다 아주 낮은 부드러운 펄스. 드럼 키트가 아니다.

화음이 바뀔 때 주파수는 계단식으로 갈아타되 위상은 이어서 누적한다.
그래야 딸깍임 없이 소리가 끊기지 않는다.

타이핑 효과음은 뺐다. 음악과 별개 층으로 튀어서 곡을 더 조각냈다.

사용:  pip install numpy && python3 scripts/make-bgm.py [imjin|kw|ty|rail]
출력:  public/bgm*.wav (48kHz 16bit 스테레오)
"""
import os
import re
import sys
import wave

import numpy as np

SR = 48000
FPS = 30

# 곡 전체를 한 템포로 간다.
BPM = 126
BEAT = 60.0 / BPM
BAR = BEAT * 4

# 단조 진행 i - VI - III - VII. 한 마디에 하나씩 돈다.
PROG = (0, 8, 3, 10)


# ── 연표에서 길이와 강조 시점을 읽는다 ────────────────
# 사건마다 체류 시간을 주는 방식이라 영상 길이가 사건 수에 따라 정해진다.
# 손으로 적어두면 사건 하나만 늘려도 음악이 어긋난다.


def read_beats(path: str, key: str):
    src = open(path, encoding="utf-8").read()
    i = src.index(key)
    j = src.index("\n];", i)
    rows = []
    for line in src[i:j].splitlines():
        m = re.search(r"\b(?:month|day|year):\s*([0-9.]+)", line)
        if not m:
            continue
        imp = re.search(r"impact:\s*([0-9.]+)", line)
        rows.append((float(m.group(1)), float(imp.group(1)) if imp else 0.4))
    rows.sort(key=lambda r: r[0])
    return rows


def layout(rows, hook: float):
    """src/beats.ts의 beatOf·layoutBeats와 같은 규칙."""
    out, f = [], hook * FPS
    for _, imp in rows:
        big = imp >= 0.85
        travel = round((1.05 if big else 0.85) * FPS)
        hold = round((3.0 if big else 2.4) * FPS)
        t1 = f + travel
        t2 = t1 + hold
        out.append((t1 / FPS, t2 / FPS, imp))
        f = t2
    return out


def build(path: str, key: str, hook: float, tail: float):
    beats = layout(read_beats(path, key), hook)
    return {
        "dur": round(beats[-1][1] + tail, 1),
        "hook": hook,
        # 큰 사건에만 부풀린다. 전부 강조하면 강조가 아니다.
        "swells": [(round(t1, 1), min(1.0, imp)) for t1, _, imp in beats if imp >= 0.85],
    }


PRESETS = {
    "imjin": {
        "out": "public/bgm.wav",
        **build("src/data/war.ts", "export const WAR_EVENTS", 4.5, 1.6),
        "root": 55.0,          # A1
    },
    "kw": {
        "out": "public/bgm-kw.wav",
        **build("src/data/korean-war.ts", "export const KW_EVENTS", 4.5, 1.6),
        "root": 49.0,          # G1 — 전쟁 편은 반음 아래로 더 어둡게
    },
    "rail": {
        "out": "public/bgm-rail.wav",
        **build("src/data/rail.ts", "export const RAIL_EVENTS", 4.5, 9.0),
        "root": 58.3,          # B♭1 — 철도 편은 조금 밝게
    },
    "ty": {
        "out": "public/bgm-ty.wav",
        "dur": 54.0,
        "hook": 4.5,
        "root": 51.9,          # A♭1
        # 각 태풍의 상륙 시점(구간의 84%)
        "swells": [(12.5, 1.0), (23.7, 1.0), (33.5, 1.0), (43.8, 1.0)],
    },
}

name = sys.argv[1] if len(sys.argv) > 1 else "imjin"
if name not in PRESETS:
    sys.exit(f"알 수 없는 프리셋: {name} (가능: {', '.join(PRESETS)})")
P = PRESETS[name]
DUR = P["dur"]
OUT = P["out"]
HOOK = P["hook"]
ROOT = P["root"]

n = int(SR * DUR)
t = np.arange(n) / SR


def semi(f: float, x: float) -> float:
    return f * (2.0 ** (x / 12.0))


def chord_of_bar(b: int) -> float:
    return semi(ROOT, PROG[b % len(PROG)])


BARS = int(np.ceil(DUR / BAR))
BAR_EDGES = [(int(b * BAR * SR), min(n, int((b + 1) * BAR * SR))) for b in range(BARS)]


def sustain(partials, octave=1.0, third=True) -> np.ndarray:
    """
    끊기지 않는 지속음.

    화음이 바뀌면 주파수는 계단식으로 갈아타되 위상은 이어서 누적한다.
    마디마다 새로 발음시키면 그 자리에서 소리가 끊기고 딸깍인다.
    위상을 물려주면 음정만 바뀌고 소리는 이어진다.

    partials는 (배수, 세기) 목록이다. 살짝 어긋난 배수를 섞어야 현악처럼
    두께가 생긴다. 정확한 정수배만 쓰면 오르간이 된다.
    """
    out = np.zeros(n)
    tones = [0, 3, 7] if third else [0, 7]
    # 화음의 각 음 × 각 배음마다 위상을 따로 들고 간다
    ph = np.zeros((len(tones), len(partials)))
    for b, (i0, i1) in enumerate(BAR_EDGES):
        if i1 <= i0:
            continue
        k = np.arange(i1 - i0) / SR
        base = chord_of_bar(b) * octave
        for ti, x in enumerate(tones):
            f = semi(base, x)
            for pi, (mult, amp) in enumerate(partials):
                w = 2 * np.pi * f * mult
                out[i0:i1] += amp * np.sin(ph[ti, pi] + w * k)
                ph[ti, pi] = (ph[ti, pi] + w * (i1 - i0) / SR) % (2 * np.pi)
    return out


def pulse_env(period: float, floor=0.34, shape=1.6) -> np.ndarray:
    """
    떠는 음량 곡선.

    음을 끊는 게 아니라 흔든다. 0까지 내려가면 그 순간 소리가 사라지고,
    그게 '끊긴다'로 들린다. floor 아래로는 내려가지 않는다.
    """
    frac = (t / period) % 1.0
    return floor + (1.0 - floor) * np.sin(np.pi * frac) ** shape


def smooth_env(times, gain=0.45, rise=0.5, fall=2.2) -> np.ndarray:
    """
    사건마다 곡이 부풀어 오르는 곡선.

    타격음을 얹지 않는다. 낱개 소리를 더하면 그게 또 효과음이 되어
    곡에서 튀어나온다. 이미 울리고 있는 소리를 키우는 방식으로 강조한다.
    """
    e = np.zeros(n)
    for at, g in times:
        i0 = int((at - rise) * SR)
        i1 = min(n, int((at + fall) * SR))
        if i1 <= max(0, i0):
            continue
        a = max(0, i0)
        k = np.arange(i1 - a) / SR
        peak = (at - rise) - (a / SR) + rise
        up = np.clip(k / max(1e-3, peak), 0, 1) ** 2
        down = np.exp(-np.maximum(0, k - peak) / (fall / 2.4))
        e[a:i1] += g * gain * up * down
    return np.minimum(e, gain * 1.6)


def beat_pulse() -> np.ndarray:
    """
    맥박. 드럼 키트가 아니라 낮은 심장 박동에 가깝다.

    박마다 낱개로 때리면 다시 조각난 소리가 된다. 박에 맞춰 부드럽게
    부풀는 저역 사인 하나를, 위상을 이어서 만든다.
    """
    out = np.zeros(n)
    ph = 0.0
    for b, (i0, i1) in enumerate(BAR_EDGES):
        if i1 <= i0:
            continue
        k = np.arange(i1 - i0) / SR
        base = chord_of_bar(b)
        w = 2 * np.pi * base
        out[i0:i1] += (np.sin(ph + w * k) + 0.6 * np.sin(2 * (ph + w * k))
                       + 0.3 * np.sin(3 * (ph + w * k)))
        ph = (ph + w * (i1 - i0) / SR) % (2 * np.pi)
    # 박마다 부풀는 곡선. 바닥이 0.2라 완전히 사라지지 않는다.
    return out * pulse_env(BEAT, floor=0.2, shape=2.6)


# ── 층 ─────────────────────────────────────────────
# 현악 지속음 — 살짝 어긋난 배음으로 두께를 만든다
strings = sustain(
    [(2.0, 0.55), (2.006, 0.5), (3.0, 0.3), (4.0, 0.16), (6.01, 0.08)],
    octave=1.0,
)
# 저역 지속음 — 근음과 5도만. 3도를 넣으면 저역이 탁해진다.
# 옥타브를 내리지 않는다. 반 옥타브 아래면 기음이 25Hz라 어차피 하이패스에
# 잘리고, 남는 배음도 90Hz 밑이라 휴대폰에서 안 들린다.
low = sustain([(1.0, 1.0), (2.0, 0.6), (3.0, 0.24)], octave=1.0, third=False)
# 오스티나토 — 같은 화음을 위 옥타브에서 8분음표로 떤다.
# 배음을 24배까지 올린다. 8배에서 끊으면 800Hz 위가 통째로 비어서
# 휴대폰 스피커가 가장 잘 내는 대역이 아무것도 없게 된다.
osti = sustain(
    [(4.0, 0.5), (4.01, 0.45), (6.0, 0.26), (8.0, 0.16),
     (12.0, 0.09), (16.0, 0.055), (24.0, 0.028)],
    octave=1.0,
)
osti *= pulse_env(BEAT / 2, floor=0.34, shape=1.7)
# 밝은 층 — 두 옥타브 위. 곡의 윤곽을 잡아주는 소리.
bright = sustain([(4.0, 0.4), (6.02, 0.22), (8.0, 0.13), (12.0, 0.07)], octave=3.0)
bright *= pulse_env(BEAT, floor=0.5, shape=1.3)

# 전체 세기 — 곡이 서서히 자란다. 0.62 아래로는 안 내려간다.
grow = 0.62 + 0.30 * np.clip((t - HOOK) / max(1.0, DUR - HOOK - 4), 0, 1)
# 아주 느린 숨 — 완전히 평평하면 기계로 들린다
breathe = 1.0 + 0.05 * np.sin(2 * np.pi * t / 11.0)
swell = 1.0 + smooth_env(P.get("swells", []))
inten = grow * breathe * swell

mix = (
    strings * 0.060 * inten
    + low * 0.042 * inten
    + osti * 0.050 * inten
    + bright * 0.030 * inten
)
mix += beat_pulse() * 0.048 * inten

# 훅 구간 — 아직 얇게. 지도가 나오는 순간 두께가 붙는다.
intro = np.clip(t / max(0.5, HOOK), 0, 1)
mix *= 0.5 + 0.5 * intro


# ── 마스터링 ────────────────────────────────────────
def highpass(x: np.ndarray, fc: float) -> np.ndarray:
    """
    박스 평활 두 번으로 저역을 뽑아 빼는 하이패스.
    휴대폰 스피커는 100Hz 아래를 못 낸다. 그런데 그 대역이 피크를 만들어
    정규화 단계에서 나머지를 전부 끌어내린다.
    """
    w = max(2, int(SR / fc))
    k = np.ones(w) / w
    lo = np.convolve(x, k, mode="same")
    lo = np.convolve(lo, k, mode="same")
    return x - lo


mix = highpass(mix, 88.0)
mix = np.tanh(mix * 1.05)
peak = float(np.max(np.abs(mix))) or 1.0
mix = mix / peak * 0.9

# 시작과 끝만 페이드. 중간에는 어떤 페이드도 없다 — 그게 끊김의 원인이었다.
fi = int(0.5 * SR)
mix[:fi] *= np.linspace(0, 1, fi)
fo = int(2.2 * SR)
mix[-fo:] *= np.linspace(1, 0, fo)

# 스테레오 — 살짝 벌려 넓이를 준다
delay = int(0.011 * SR)
right = np.concatenate([np.zeros(delay), mix[:-delay]]) * 0.97
stereo = np.stack([mix, right], axis=1)
pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

print(f"{OUT} · {DUR:.1f}s · {os.path.getsize(OUT) // 1024}KB · {BPM}BPM")
