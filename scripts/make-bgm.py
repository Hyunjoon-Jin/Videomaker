#!/usr/bin/env python3
"""
BGM 합성 — 임진왜란 7년 영상용.

음원을 구해 붙이는 대신 코드로 만든다. 이유가 두 가지다.
 1) 저작권 문제가 없다. 전부 사인파와 노이즈에서 나온다.
 2) 영상과 같은 타임라인을 쓰므로 타격이 정확히 맞는다. 전투 순간에
    북이 떨어지고, 전선이 밀리는 구간에서 드론이 조여든다.

구성(초) — src/ShortsWar.tsx의 LEGS와 같은 경계:
  0.0~2.4   훅        저역 임팩트 + 라이저
  2.4~11.4  1592 북상  타이코 가속, 긴장 상승
  11.4~19.4 1593 반격  박자 유지, 화성 밝아짐
  19.4~23.4 소강      북이 빠지고 드론만
  23.4~31.4 1597      다시 조여듦, 가장 빠름
  31.4~38.4 종결      큰 타격 후 감쇠

사용:  pip install numpy && python3 scripts/make-bgm.py
출력:  public/bgm.wav (48kHz 16bit 스테레오)
"""
import math
import os
import struct
import wave

import numpy as np

SR = 48000
DUR = 38.4
OUT = "public/bgm.wav"

# 영상 구간 경계(초)
HOOK, L1, L2, L3, L4, END = 2.4, 11.4, 19.4, 23.4, 31.4, 37.4

n = int(SR * DUR)
t = np.arange(n) / SR
mix = np.zeros(n)


def env(start: float, dur: float, attack=0.002, curve=4.0) -> np.ndarray:
    """지수 감쇠 엔벨로프. 타악기용."""
    e = np.zeros(n)
    i0 = int(start * SR)
    i1 = min(n, i0 + int(dur * SR))
    if i0 >= n or i1 <= i0:
        return e
    k = np.arange(i1 - i0) / SR
    a = np.clip(k / attack, 0, 1)
    e[i0:i1] = a * np.exp(-curve * k / dur)
    return e


def taiko(at: float, gain=1.0, pitch=58.0, dur=0.6) -> None:
    """큰북 — 피치가 살짝 떨어지는 저역 사인 + 어택 노이즈."""
    e = env(at, dur, 0.001, 5.0)
    i0, i1 = int(at * SR), min(n, int((at + dur) * SR))
    if i1 <= i0:
        return
    k = np.arange(i1 - i0) / SR
    # 피치 드롭이 있어야 '북'으로 들린다. 고정 주파수면 그냥 삐 소리다.
    f = pitch * np.exp(-3.2 * k)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR)
    seg = np.zeros(n)
    seg[i0:i1] = body
    # 어택 순간의 짧은 노이즈가 타격감을 만든다
    rng = np.random.default_rng(int(at * 1000) & 0xFFFF)
    noise = np.zeros(n)
    ln = min(n - i0, int(0.02 * SR))
    noise[i0:i0 + ln] = rng.standard_normal(ln) * np.linspace(1, 0, ln)
    mix[:] += (seg * e * 0.9 + noise * 0.25) * gain


def hit(at: float, gain=1.0, dur=1.6) -> None:
    """충돌음 — 넓은 노이즈, 큰 사건용."""
    rng = np.random.default_rng((int(at * 977) + 7) & 0xFFFF)
    e = env(at, dur, 0.001, 3.0)
    seg = np.zeros(n)
    i0, i1 = int(at * SR), min(n, int((at + dur) * SR))
    if i1 > i0:
        seg[i0:i1] = rng.standard_normal(i1 - i0)
        # 저역만 남겨 '쿵' 쪽으로. 단순 이동평균 = 저역통과.
        w = 24
        seg[i0:i1] = np.convolve(seg[i0:i1], np.ones(w) / w, mode="same")
    mix[:] += seg * e * gain * 1.4


def drone(a: float, b: float, base: float, gain: float, detune=1.008) -> None:
    """지속 저음 — 두 음을 살짝 어긋나게 겹쳐 맥놀이를 만든다."""
    i0, i1 = int(a * SR), min(n, int(b * SR))
    if i1 <= i0:
        return
    k = np.arange(i1 - i0) / SR
    fade = np.minimum(np.minimum(k / 0.8, 1.0), np.clip((k[-1] - k) / 1.2, 0, 1))
    v = (np.sin(2 * np.pi * base * k)
         + 0.7 * np.sin(2 * np.pi * base * detune * k)
         + 0.35 * np.sin(2 * np.pi * base * 2 * k))
    mix[i0:i1] += v * fade * gain


def riser(a: float, b: float, gain=0.5) -> None:
    """라이저 — 노이즈가 점점 밝아지며 조여든다."""
    i0, i1 = int(a * SR), min(n, int(b * SR))
    if i1 <= i0:
        return
    rng = np.random.default_rng(4242)
    k = np.linspace(0, 1, i1 - i0)
    nz = rng.standard_normal(i1 - i0)
    # 뒤로 갈수록 평활 폭을 줄여 고역을 살린다(=밝아진다)
    out = np.empty_like(nz)
    step = max(1, (i1 - i0) // 64)
    for s in range(0, i1 - i0, step):
        e = min(i1 - i0, s + step)
        w = max(1, int(40 * (1 - k[s]) + 2))
        out[s:e] = np.convolve(nz[s:e], np.ones(w) / w, mode="same")
    mix[i0:i1] += out * (k ** 2.2) * gain


def pulse_train(a: float, b: float, bpm0: float, bpm1: float, gain=0.7) -> None:
    """일정 구간을 북으로 채운다. bpm이 선형으로 변해 가속·감속이 들린다."""
    now = a
    i = 0
    while now < b:
        prog = (now - a) / max(1e-6, b - a)
        bpm = bpm0 + (bpm1 - bpm0) * prog
        beat = 60.0 / bpm
        # 4박에 한 번 강박
        strong = (i % 4) == 0
        taiko(now, gain * (1.0 if strong else 0.45),
              pitch=58 if strong else 72, dur=0.55 if strong else 0.3)
        now += beat
        i += 1


# ── 구성 ────────────────────────────────────────────
# 훅: 큰 타격 하나 + 라이저로 지도 등장까지 끌고 간다
hit(0.15, 1.1, 2.2)
taiko(0.15, 1.2, 52, 1.1)
riser(0.5, HOOK, 0.55)
drone(0.0, HOOK + 0.6, 41.2, 0.16)

# 1592 북상 — 점점 빨라진다
drone(HOOK, L1 + 0.5, 41.2, 0.2)
pulse_train(HOOK, L1, 82, 116, 0.75)

# 1593 반격 — 5도 위로 올려 국면 전환을 들리게 한다
drone(L1, L2 + 0.5, 61.7, 0.19)
pulse_train(L1, L2, 116, 104, 0.7)

# 소강 — 북을 빼고 드론만 남긴다. 비어 있음이 이 구간의 내용이다.
drone(L2, L3 + 0.4, 36.7, 0.22)

# 1597 — 가장 빠르고 낮게
drone(L3, L4 + 0.5, 38.9, 0.24)
pulse_train(L3, L4, 104, 138, 0.8)

# 종결 — 마지막 타격 후 여운
drone(L4, END + 1.0, 41.2, 0.18)
taiko(L4, 1.2, 50, 1.4)
hit(L4, 0.9, 2.6)
taiko(END - 1.2, 1.1, 46, 2.0)
hit(END - 1.2, 0.8, 3.0)

# 주요 사건 강조 — 영상의 impact 지점과 맞춘 초
for at, g in [(4.6, 0.8), (7.0, 0.9), (9.4, 1.0),   # 한양·평양·한산도
              (13.2, 0.9), (16.0, 1.0),             # 평양성 탈환·행주
              (24.6, 0.9), (26.8, 1.0), (28.6, 1.0)]:  # 칠천량·남원·명량
    taiko(at, g, 54, 0.8)
    hit(at, g * 0.5, 1.2)

# ── 마스터링 ────────────────────────────────────────
# 소프트 클리핑 — 하드 클립하면 지직거린다
mix = np.tanh(mix * 0.9)
peak = float(np.max(np.abs(mix))) or 1.0
mix = mix / peak * 0.89

# 끝 페이드아웃
fade = int(1.0 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)

# 스테레오 — 살짝 벌려 넓이를 준다
delay = int(0.008 * SR)
left = mix
right = np.concatenate([np.zeros(delay), mix[:-delay]]) * 0.97
stereo = np.stack([left, right], axis=1)

pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

print(f"{OUT} · {DUR:.1f}s · {os.path.getsize(OUT)//1024}KB")
