#!/usr/bin/env python3
"""BGM을 직접 합성한다 — 소유권 주장이 걸릴 수 없는 음원.

## 왜 다시 여기로 왔나

처음에 사인파로 곡을 짜보려다 실패하고 Kevin MacLeod의 CC BY 음원으로
갈아탔다. 그런데 CC BY와 'Content ID에 등록돼 있지 않다'는 다른 문제였다.
MacLeod는 제3자의 도둑 등록을 막으려고 본인 음악을 Content ID에 직접
등록해 뒀고, 그래서 그 음원을 쓰면 클레임이 매번 걸린다. 1분을 넘는
쇼츠는 주장이 살아 있는 동안 차단된다. 표준시 편이 그렇게 죽었다.

설명란에 표기 문구를 넣고 편마다 이의를 제기하면 풀리기는 한다. 하지만
그건 올릴 때마다 손이 가는 일이고, 애초에 안 걸리게 하는 것과 다르다.
YouTube 오디오 보관함은 스튜디오 로그인이 필요해 이 환경에서 못 받는다.
남은 길은 직접 만드는 것이다.

## 지난번 실패에서 바뀐 것

전에는 '곡'을 쓰려고 했다. 멜로디를 짜고 화성을 붙이려니 사인파 몇 개로
될 일이 아니었다. 이번에는 **바탕**을 만든다. 이 채널의 BGM은 앞에 나설
일이 없다. 지도가 그려지는 동안 화면 밑에 깔려 시간이 가고 있다는 것만
알려주면 된다. 그건 다른 문제고, 훨씬 손에 잡힌다.

세 겹을 쌓는다.

  패드   화음. 음마다 톱니를 저역통과시킨 것 세 대가 ±4센트로 갈라져
         같이 켠다. 현악 앙상블이 그렇게 어긋나 있다.
  저음   근음 한 옥타브 아래 사인. 휴대폰에서는 거의 안 들리지만 이게
         없으면 이어폰에서 바닥이 빈다.
  공기   아주 낮은 잡음을 느리게 부풀렸다 줄인다. 이게 없으면 소리가
         너무 깨끗해서 죽은 것처럼 들린다.

## 두 번 되물린 것 — '의뭉스럽다'

첫 판에 '맥' 층이 있었다. 2초마다 화음의 5도를 짧게 때리고 지수적으로
죽여 시간을 세게 하려던 것이다. 순음을 지수적으로 죽이면 그게 정확히
오르골이라 뺐다. 이 채널의 바탕에 시계는 필요 없다 — 화면에 이미 연도
계기판이 돌고 있다.

빼고 나서도 "화음 자체가 오르골 같다"는 말을 들었다. 맞는 말이었고,
원인이 셋이었다.

  스펙트럼   배음 여섯 개짜리 사인 더미였다. 사인 몇 개를 조화비로 쌓으면
             그게 종과 오르골의 스펙트럼이다. 무엇을 연주해도 유리알처럼
             들린다. 배음 서른둘을 1/k로 깔고 2.4kHz에서 꺾는 톱니로
             바꿨다. 그 꺾임이 악기의 몸통이다.
  화성       근음을 D에 묶어두고 sus4로 매달아 뒀다. '자리를 지키는
             소리'라고 적어놓고 실제로는 '떠 있는 소리'를 만들고 있었다.
             안 푸는 화성은 수상하게 들린다. i-VI-VII-i로 바꿔 근음이
             움직이고 집으로 돌아오게 했다.
  흔들림     배음 하나하나를 ±6센트로 흩고 배음마다 다른 LFO를 걸었다.
             그건 앙상블이 아니라 어른거림이다. 갈라짐을 음 단위 ±4센트로
             줄이고 LFO는 뺐다. 잔향도 0.42에서 0.22로 내렸다 — 화음의
             경계가 뭉개지면 그것도 수상함이 된다.

배운 것: **음향 지표가 맞는다고 소리가 맞는 것은 아니다.** 첫 판은 중역
비중도 고르기도 채택했던 곡들과 같은 자리에 있었는데 오르골이었다.
지표는 '휴대폰에서 들리는가'만 답하지 '무슨 소리인가'는 답하지 않는다.

여기에 잔향을 건다. scipy가 없어 FDN(피드백 지연망)을 직접 짰다 —
서로 소수(素數)인 지연선 넷을 되먹이고, 되먹임 고리 안에 1극 저역통과를
넣어 높은 음이 먼저 사라지게 했다. 실제 공간이 그렇게 울린다. 앞단에
올패스 둘을 둬서 초기 반사를 흩는다.

## 귀가 없으므로 숫자로 검사한다

이 파일을 만든 쪽은 소리를 들을 수 없다. 그래서 fetch-bgm.py가 음원을
고를 때 쓰던 두 지표를 그대로 가져와 만든 것에 되건다.

  중역 비중   200~4000Hz가 전체 에너지에서 차지하는 몫. 휴대폰 스피커가
              그 대역만 제대로 낸다. 고른 곡들이 43~88%였다.
  고르기      0.25초 RMS 포락선의 평균 ÷ 표준편차. 조용해졌다 커졌다
              하면 잘라 쓸 때 곡이 이상해진다. 고른 곡들이 3.3~4.9였다.

두 값을 출력한다. 범위 밖이면 층별 음량을 고쳐야 한다는 뜻이다.

사용:  python3 scripts/make-bgm.py sl 79.0
       python3 scripts/make-bgm.py --list
"""
import math
import sys
import wave

import numpy as np

SR = 48000

# ── 음이름 → 주파수 ──────────────────────────────────
A4 = 440.0
NAMES = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4,
         "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}


def hz(note: str) -> float:
    """'D3' → 146.83Hz"""
    name, octv = note[:-1], int(note[-1])
    return A4 * 2 ** ((NAMES[name] + (octv - 4) * 12) / 12)


# ── 편마다 다른 화성 ─────────────────────────────────
# 여덟 박자(=8초)에 화음 하나. 넷이 한 바퀴라 32초에 돌아온다.
# 편의 성격은 진행이 정한다. 자리를 못 뜨는 편은 근음이 안 움직이고,
# 옮겨 다니는 편은 근음이 내려간다.
PIECES = {
    "sl": dict(
        why="조선왕조실록 사고 — 지키는 편. i-VI-VII-i로 집을 떠났다가 "
            "돌아온다. 처음에는 근음을 D에 묶어두고 sus4로 매달아 뒀는데, "
            "'자리를 지키는 소리'로 적어놓고 실제로는 '떠 있는 소리'를 "
            "만들고 있었다. 안 푸는 화성은 수상하게 들린다. 지킨다는 것은 "
            "매달려 있는 것이 아니라 제자리로 돌아오는 것이다.",
        chords=[
            ["D3", "F3", "A3"],      # Dm — 집
            ["A#2", "D3", "F3"],     # Bb  근음이 내려간다
            ["C3", "E3", "G3"],      # C   돌아오는 길
            ["D3", "F3", "A3"],      # Dm — 집
        ],
        # 배음이 꺾이는 자리. 낮출수록 어둡고 둔하다.
        cutoff=2400.0,
    ),
}


def adsr(n: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    """구간 하나에 씌울 포락선. 초 단위."""
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    S = max(0, n - A - D - R)
    return np.concatenate([
        np.linspace(0, 1, A, endpoint=False) ** 1.6,
        np.linspace(1, s, D, endpoint=False),
        np.full(S, s),
        np.linspace(s, 0, n - A - D - S) ** 1.4,
    ])[:n]


def bowed(f0: float, n: int, cutoff: float, rng) -> np.ndarray:
    """
    음 하나 — 톱니를 저역통과시킨 것. 현을 그은 소리에 가깝다.

    전에는 배음 여섯 개짜리 사인 더미였다. 그게 종과 오르골의 스펙트럼이라
    "오르골 소리"라는 말을 들었다. 사인 몇 개를 조화비로 쌓으면 무엇을
    해도 유리알처럼 들린다.

    악기 소리로 가려면 배음이 훨씬 많아야 하고, 위로 갈수록 1/k로 고르게
    떨어지다가 어느 지점에서 꺾여야 한다. 그 꺾임이 악기의 몸통이다.
    여기서는 배음 서른둘을 1/k로 깔고 cutoff에서 4차로 꺾는다.

    시간 영역에서 오실레이터를 서른둘씩 돌리면 느리다. 어차피 통째로
    들고 있으니 주파수 영역에 배음을 직접 꽂고 한 번에 되돌린다. 버퍼가
    11초라 빈 간격이 0.09Hz다 — 반올림 오차는 안 들린다.

    ── n/2를 곱하는 이유 ──

    처음에 이걸 빼먹고 무음을 만들었다. numpy의 irfft는 1/n 정규화를
    포함한다. 빈 하나에 크기 A를 꽂고 되돌리면 나오는 사인의 진폭이
    A가 아니라 2A/n이다. n이 11초×48000 = 528,000이라 진폭이 백만분의
    이로 줄어든다.

    그렇게 만든 판을 들려주고 "아무 소리도 안 들리고 파도 소리만 난다"는
    말을 들었다. 패드가 통째로 죽고 저음층(58~73Hz, 휴대폰에서 안 들림)과
    공기층 잡음만 남았는데, RMS 정규화가 그 잡음을 목표 음량까지 끌어올린
    것이다. 정규화는 무엇이 남았든 그것을 크게 만든다.

    더 나쁜 건 지표가 이걸 못 잡았다는 것이다. 잡음은 스펙트럼이 넓고
    고르기 점수가 좋게 나온다. 중역 48%, 고르기 3.68로 채택 곡들 한복판에
    앉아 있었는데 내용은 잡음이었다. 그래서 아래 build()에서 층별 실효값을
    같이 찍는다 — 무엇이 실제로 소리를 내고 있는지 보이지 않으면 같은
    일이 또 난다.
    """
    X = np.zeros(n // 2 + 1, dtype=complex)
    df = SR / n
    for k in range(1, 33):
        f = f0 * k
        b = int(round(f / df))
        if f > 0.45 * SR or b >= len(X):
            break
        amp = (1.0 / k) / np.sqrt(1 + (f / cutoff) ** 4)
        X[b] += amp * np.exp(1j * rng.uniform(0, 2 * np.pi))
    return np.fft.irfft(X, n) * (n / 2)


def pad(chord: list[str], n: int, cutoff: float, rng) -> np.ndarray:
    """
    화음 하나 — 현악 한 벌.

    음마다 세 대가 ±4센트로 갈라져 같이 켠다. 실제 앙상블이 그렇게 어긋나
    있고, 그 어긋남이 소리를 두껍게 만든다.

    전에는 배음 하나하나를 ±6센트로 흩고 배음마다 다른 LFO를 걸었다.
    그건 앙상블이 아니라 어른거림이라, 무엇을 연주하든 '수상한' 소리가
    된다. 갈라짐은 음 단위로만 두고 LFO는 뺐다.

    붙임음이 길다. 다음 화음의 머리와 겹쳐 파임을 메운다. 머리는 0.35초로
    짧게 — 활이 현에 닿는 시간이다. 1.2초씩 부풀려 들어오면 시작점이
    없어서 소리가 어디서 왔는지 알 수 없고, 그것도 떠 있는 느낌을 만든다.

    두 벌을 겹친다. 적힌 자리(첼로 쪽)와 그 한 옥타브 위(비올라 쪽)다.
    아래 한 벌만 켜면 D3가 147Hz, Bb2가 117Hz라 기음이 전부 200Hz 밑으로
    떨어진다. 톱니는 1/k라 기음에 무게가 제일 실리는데, 그 무게가 통째로
    휴대폰이 못 내는 대역에 있는 것이다. 처음에 재봤을 때 200Hz 아래가
    58.7%였다.
    """
    out = np.zeros(n)
    for octv, gain in ((1.0, 1.0), (2.0, 0.85)):
        for note in chord:
            f0 = hz(note) * octv
            for cents in (-4.0, 0.0, 4.0):
                out += gain * bowed(f0 * 2 ** (cents / 1200), n, cutoff, rng)
    return out * adsr(n, 0.35, 1.1, 0.86, 2.2) / (len(chord) * 2.6)


def sub(chord: list[str], n: int) -> np.ndarray:
    """
    근음 한 옥타브 아래. 휴대폰에선 거의 안 들리지만 이어폰에서 바닥.

    0.5 → 0.24 → 0.13으로 두 번 내렸다. 73Hz는 통째로 대역 밖이라 세게
    넣을수록 중역 비중만 깎아 먹는다. 바닥이 있다는 것만 알면 된다.
    """
    t = np.arange(n) / SR
    f = hz(chord[0]) / 2
    return 0.13 * np.sin(2 * np.pi * f * t) * adsr(n, 0.9, 0.6, 0.92, 2.4)


def air(n: int, rng) -> np.ndarray:
    """느리게 부푸는 잡음. 소리가 너무 깨끗해서 죽어 보이는 것을 막는다."""
    x = rng.normal(0, 1, n)
    # 1극 저역통과를 두 번 걸어 쉭쉭거리는 고역을 눌러 둔다.
    for a in (0.02, 0.02):
        y = np.zeros(n)
        acc = 0.0
        for i in range(0, n, 4096):  # 블록 단위로 재귀를 돌린다
            blk = x[i: i + 4096]
            b = np.empty(len(blk))
            for j, v in enumerate(blk):
                acc = acc + a * (v - acc)
                b[j] = acc
            y[i: i + len(blk)] = b
        x = y
    t = np.arange(n) / SR
    env = 0.5 + 0.5 * np.sin(2 * np.pi * 0.031 * t)
    return 0.035 * x / (np.std(x) or 1) * env


def highpass(x: np.ndarray, fc: float = 75.0) -> np.ndarray:
    """
    fc 아래를 부드럽게 깎는다.

    재귀 필터는 400만 샘플을 파이썬 반복문으로 도는 것이라 느리다.
    어차피 실시간이 아니고 통째로 들고 있으니 주파수 영역에서 한 번에
    처리한다. 이 대역은 휴대폰에서 안 나오면서 에너지만 차지한다.
    """
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    # 급하게 자르면 울린다. 2차 정도의 완만한 기울기로 깎는다.
    X *= (f / fc) ** 2 / (1 + (f / fc) ** 2)
    return np.fft.irfft(X, len(x))


def onepole(x: np.ndarray, a: float) -> np.ndarray:
    """1극 저역통과. 되먹임 고리 안에서 높은 음을 먼저 죽이는 데 쓴다."""
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = acc + a * (v - acc)
        y[i] = acc
    return y


def allpass(x: np.ndarray, delay: int, g: float) -> np.ndarray:
    """초기 반사를 흩는다. 울림을 늘리지 않고 밀도만 올린다."""
    y = np.zeros(len(x))
    buf = np.zeros(delay)
    p = 0
    for i, v in enumerate(x):
        b = buf[p]
        o = -g * v + b
        buf[p] = v + g * o
        p = (p + 1) % delay
        y[i] = o
    return y


def reverb(x: np.ndarray, mix: float = 0.22) -> np.ndarray:
    """
    피드백 지연망.

    scipy가 없어 직접 짰다. 서로 소수인 지연선 넷을 되먹이면 울림이
    금속처럼 뭉치지 않는다. 되먹임 고리마다 1극 저역통과를 넣어 높은
    음이 먼저 사라지게 했다 — 실제 공간이 그렇게 울린다.

    섞임이 0.42였는데 0.22로 내렸다. 잔향이 많으면 화음의 경계가 뭉개져
    무엇이 언제 바뀌었는지 안 들린다. 그 뭉개짐도 '수상함'에 한몫한다.
    """
    d = allpass(allpass(x, 331, 0.7), 461, 0.7)
    wet = np.zeros(len(x))
    for ms, fb, damp in ((37, 0.78, 0.36), (43, 0.76, 0.30),
                         (53, 0.74, 0.24), (61, 0.72, 0.20)):
        n = int(ms / 1000 * SR)
        line = np.zeros(len(x))
        buf = np.zeros(n)
        p = 0
        acc = 0.0
        for i, v in enumerate(d):
            b = buf[p]
            line[i] = b
            acc = acc + damp * (b - acc)   # 고리 안 감쇠
            buf[p] = v + fb * acc
            p = (p + 1) % n
        wet += line
    wet /= 4
    return (1 - mix) * x + mix * wet


def measure(x: np.ndarray) -> tuple[float, float]:
    """fetch-bgm.py가 곡을 고를 때 쓰던 두 지표. 귀 대신이다."""
    m = x.mean(axis=1) if x.ndim > 1 else x
    X = np.abs(np.fft.rfft(m * np.hanning(len(m))))
    f = np.fft.rfftfreq(len(m), 1 / SR)
    band = ((f >= 200) & (f <= 4000))
    mid = float(X[band].sum() / (X.sum() or 1))
    w = int(0.25 * SR)
    env = np.array([np.sqrt(np.mean(m[i:i + w] ** 2))
                    for i in range(0, len(m) - w, w)])
    even = float(env.mean() / (env.std() or 1e-9))
    return mid, even


def build(key: str, seconds: float, seed: int = 7) -> np.ndarray:
    p = PIECES[key]
    rng = np.random.default_rng(seed)
    bar = int(8.0 * SR)
    # 화음을 8초마다 세우되 길이는 11초로 준다. 3초가 겹쳐 앞 화음의
    # 붙임음이 다음 화음의 머리를 받쳐준다. 딱 8초씩 끊어 붙였더니
    # 8초마다 소리가 0으로 떨어져 고르기가 2.25까지 내려갔다.
    span = int(11.0 * SR)
    total = int(math.ceil(seconds * SR))
    mono = np.zeros(total + span)
    # 층별 실효값. 한 층이 죽어도 정규화가 남은 층을 키워버려 파일은
    # 멀쩡해 보인다. 실제로 패드가 통째로 죽고 잡음만 남은 판을 한 번
    # 내보냈다. 무엇이 소리를 내고 있는지 눈으로 봐야 한다.
    LV: dict[str, float] = {}
    i = 0
    c = 0
    while i < total:
        ch = p["chords"][c % len(p["chords"])]
        a_pad = pad(ch, span, p["cutoff"], rng)
        a_sub = sub(ch, span)
        if c == 0:
            LV["패드"] = float(np.sqrt(np.mean(a_pad ** 2)))
            LV["저음"] = float(np.sqrt(np.mean(a_sub ** 2)))
        n = min(span, len(mono) - i)
        mono[i:i + n] += (a_pad + a_sub)[:n]
        i += bar
        c += 1
    mono = mono[:total]
    a_air = air(total, rng)
    LV["공기"] = float(np.sqrt(np.mean(a_air ** 2)))
    mono += a_air
    mono = reverb(mono)

    ref = LV["패드"] or 1.0
    build.levels = {k: v / ref for k, v in LV.items()}  # type: ignore[attr-defined]

    # 큰 숨.
    #
    # 겹치게 고치고 나니 고르기가 15.4까지 올라갔다. 자를 때 안전하다는
    # 뜻이라 흠은 아닌데, 60초 내내 세기가 똑같으면 음악이 아니라
    # 웅웅거림이다. 24초 주기로 ±14% 흔들어 숨을 넣는다. 두 주기가
    # 겹치게 해서 '느리게 뛰는 심장' 같은 규칙성이 안 생기게 했다.
    t = np.arange(total) / SR
    breath = (1
              + 0.14 * np.sin(2 * np.pi * t / 24.0 - 1.2)
              + 0.06 * np.sin(2 * np.pi * t / 37.0))
    mono *= breath
    mono = highpass(mono)

    # 좌우를 아주 조금 어긋나게 해 넓힌다. 크게 벌리면 휴대폰
    # 모노 스피커에서 상쇄돼 오히려 얇아진다.
    d = int(0.011 * SR)
    L = mono
    R = np.concatenate([np.zeros(d), mono[:-d]])
    return np.stack([L, 0.97 * R], axis=1)


def finish(x: np.ndarray, fade_in=1.2, fade_out=3.0, rms=0.14) -> np.ndarray:
    """fetch-bgm.py의 마무리와 같은 처리 — 두 계통의 음량을 맞춘다."""
    fi, fo = int(fade_in * SR), int(fade_out * SR)
    x[:fi] *= np.linspace(0, 1, fi)[:, None]
    x[-fo:] *= np.linspace(1, 0, fo)[:, None]
    x *= rms / (float(np.sqrt(np.mean(x ** 2))) or 1.0)
    TH = 0.75
    m = np.abs(x) > TH
    x[m] = np.sign(x[m]) * (TH + (1 - TH) * np.tanh((np.abs(x[m]) - TH) / (1 - TH)))
    peak = float(np.max(np.abs(x)))
    if peak > 0.95:
        x *= 0.95 / peak
    return x


def write_wav(path: str, x: np.ndarray) -> None:
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] == "--list":
        for k, v in PIECES.items():
            print(f"{k:>4}  {v['why']}")
        return
    key = sys.argv[1]
    seconds = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0
    out = f"public/bgm-{key}.wav"
    x = finish(build(key, seconds))
    write_wav(out, x)
    # 페이드 구간을 빼고 잰다. 1.2초 인·3.0초 아웃까지 넣고 고르기를
    # 재면 페이드가 편차로 잡혀 짧은 판일수록 점수가 실제보다 나빠진다.
    core = x[int(1.4 * SR): -int(3.2 * SR)] if seconds > 8 else x
    mid, even = measure(core)
    print(f"{out} · {seconds:.1f}s · 직접 합성 (소유권 주장 대상 아님)")
    print(f"   중역 200~4000Hz {mid * 100:.0f}%  (고른 음원들이 43~88%)")
    print(f"   고르기 {even:.2f}          (고른 음원들이 3.3~4.9)")
    lv = getattr(build, "levels", {})
    if lv:
        # 패드를 1로 놓은 상대 실효값. 패드가 죽으면 여기서 바로 보인다.
        line = "  ".join(f"{k} {v:.3f}" for k, v in lv.items())
        print(f"   층별 세기(패드=1)  {line}")
    print(f"   {PIECES[key]['why']}")


if __name__ == "__main__":
    main()
