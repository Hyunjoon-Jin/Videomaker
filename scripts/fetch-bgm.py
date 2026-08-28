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

── 여기서 한 판단이 틀렸다 ──────────────────────────

'라이선스가 자유롭다'와 'Content ID에 등록돼 있지 않다'를 같은 것으로
봤는데 다른 문제다. MacLeod는 제3자의 도둑 등록을 막으려고 본인 음악을
Content ID에 직접 등록해 뒀다. 그래서 이 음원을 쓰면 클레임은 매번
걸린다. 표기 문구는 클레임을 막아주는 것이 아니라 이의 제기를 이기게
해주는 근거고, 이의 제기는 편마다 손으로 해야 한다.

그리고 1분을 넘는 쇼츠는 소유권 주장이 살아 있는 동안 소유권자 정책과
관계없이 차단된다. 표준시 편이 60.17초로 전 세계 차단됐다. 5프레임
초과였다. 자세한 것은 docs/publish.md의 「60초가 상한이다」에 있다.

원인 처리는 클레임이 안 걸리는 음원으로 가는 것이다. YouTube 오디오
보관함의 '저작자 표시 필요 없음' 곡에는 소유권 주장이 제기되지 않는다고
YouTube가 명시하고 있다. 다만 스튜디오 로그인이 필요해 이 스크립트가
자동으로 받을 수 없다. 사람이 내려받아 data/bgm-src/에 넣으면 자르기·
페이드·음량 맞추기는 아래 코드가 그대로 처리한다.

그때까지는 scripts/check-lengths.py로 59초를 지킨다. 60초 아래면 주장이
걸려도 차단이 아니라 수익만 넘어간다.

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
        "public/bgm-ty.wav", "Anguish", 26.0, 57.2,
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
        "public/bgm-tz.wav", "Half Mystery", 137.0, 58.2,
        "표준시 — 전쟁도 재난도 아니고 법령이 네 번 바뀐 편이라 밀어붙이면 "
        "안 된다. 고른 구간을 자동으로 훑어 골랐다(고르기 3.36, 중역 88%). "
        "Grim Idol이 고르기는 4.10으로 더 높았지만 어두운 타격이라 전쟁 편 "
        "톤이고, 중역도 44%뿐이다.",
    ),
    # 조선왕조실록 사고(bgm-sl)는 여기서 뺐다. 아래 GONGU 목록으로 옮겼다.
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

# ── 공유마당 계통 ────────────────────────────────────
#
# 9편부터 여기서 가져온다. incompetech 쪽은 1~8편이 이미 그 음원으로
# 올라가 있어 남겨두는 것뿐이고, 새 편은 이 목록에 붙인다.
#
# 파일은 scripts/find-bgm.py가 data/bgm-src/gongu-<wrtSn>.mp3로 받아둔다.
# 받는 것과 자르는 것을 나눈 이유는, 훑어서 고르는 일과 정해진 것을
# 편 길이에 맞춰 자르는 일이 성격이 다르기 때문이다. 앞은 탐색이고
# 뒤는 재현이다.
#
# (출력, wrtSn, 곡 이름, 저작권자, 시작 초, 길이 초, 왜 이 곡인지)
GONGU = [
    (
        "public/bgm-sl.wav", "13263551", "국악연주곡_여민락 68-5",
        "한국저작권위원회", 19.0, 57.9,
        "조선왕조실록 사고 — 여민락은 세종 때 만든 정악이고, 이 편의 첫 "
        "비트가 1445년 세종 27년이다. 소리가 편에 맞는 게 아니라 편의 "
        "연도에 맞는다. 곡 자체는 저작권 만료라 공유재산이고, 실연과 녹음을 "
        "한국저작권위원회가 CC BY로 공개했다. 80초짜리 중 19초부터가 가장 "
        "고르다(중역 73%, 고르기 2.93). "
        "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13263551",
    ),
    (
        "public/bgm-sr.wav", "13366520", "River",
        "기증저작물(자유이용)", 29.0, 47.2,
        "해가 가장 먼저 뜨는 곳 — 전쟁도 재난도 아니고 하루가 밝아오는 "
        "편이라 밝고 느린 쪽으로 골랐다. 국악은 안 쓴다. 소재가 조선이 "
        "아니라 지금이다. 중역 88%로 후보 중 휴대폰에서 제일 또렷하다. "
        "고르기가 1.82로 낮은데 이건 흠이 아니라 실제 연주곡이라 셈여림이 "
        "있다는 뜻이다 — 지금까지 쓰던 라이브러리 음악(2.9~4.9)은 애초에 "
        "배경용으로 평탄하게 만든 것들이다. 기증저작물이라 표기 의무도 "
        "없지만 설명란에 밝힌다. "
        "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13366520",
    ),
    (
        "public/bgm-dt.wav", "13262827", "Uncharted",
        "한국저작권위원회 (작곡 강지희)", 28.0, 53.7,
        "2010년, 좌표가 365m 움직였다 — 제목이 소재와 맞물린다. Uncharted는 "
        "'아직 측량되지 않은'이다. 분위기만 맞춘 게 아니라 편이 다루는 "
        "일 자체를 가리킨다. 하프로 시작해 플루트와 현악으로 벌어지는 "
        "구성이라, 1910년에서 2020년으로 한 번에 건너뛰는 이 편의 "
        "계기판과 걸음이 맞는다. 111초 중 28초부터가 가장 고르다 "
        "(중역 73%, 고르기 4.28). 후보 중 고르기가 10.69로 제일 높았던 "
        "Longing(그리움)은 편이 감상 쪽으로 기운다. 이 편은 서정적이면 "
        "안 된다. Cafemood는 중역 87%로 더 또렷하지만 이름 그대로 "
        "카페 음악이라 소재와 아무 상관이 없다. "
        "CC BY라 설명란 표기가 이용 조건이다. 빼면 라이선스 위반이다. "
        "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13262827",
    ),
    (
        "public/bgm-ex.wav", "13355241", "BGM_05_05_명상음악 힐링브금",
        "공유마당", 8.0, 45.9,
        "기온 폭 순위 레이스 — 이 편은 한쪽 편을 들면 안 된다. "
        "더위 쪽으로 몰면 폭염 영상이 되고 추위 쪽으로 몰면 한파 영상이 "
        "되는데, 야마는 '한 자리가 양쪽 다'다. 그래서 색을 안 내는 곡을 "
        "골랐다. 82초 중 8초부터가 가장 고르다(중역 87%로 후보 중 최고, "
        "고르기 4.08). "
        "End of Fall이 소재와는 더 맞물렸지만 CC BY-SA다 — 잘라 쓰면 "
        "2차 저작물 논란이 남는다. 표준시 편에서 한 번 차단당한 채널이 "
        "질 위험이 아니다. 「12월, 광화문 거리 교향곡」은 겨울 쪽으로 "
        "기울어 뺐다. "
        "CC BY라 설명란 표기가 이용 조건이다. "
        "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13355241",
    ),
    (
        "public/bgm-cn.wav", "319450", "별 헤는 밤",
        "기증저작물(자유이용)", 84.2, 39.6,
        "노인성 — 밤하늘 편이라 조용하고 느린 쪽. 제목이 이 편의 소재 "
        "그대로다. 재난도 전쟁도 아니고 보이지 않는 것에 대한 편이라 "
        "밀어붙이면 안 된다. 146초 중 84.2초부터가 가장 고르다(고르기 "
        "3.19, 중역 79%). 전체로 재면 고르기가 1.54까지 떨어지는데 "
        "앞뒤로 여리게 시작하고 여리게 끝나는 실연이라 그렇다. "
        "「BGM_05_05_명상음악 힐링브금」이 수치는 더 좋았지만(고르기 "
        "4.08, 중역 87%) 13편에 이미 쓴 곡이다. 두 편 연속 같은 음악은 "
        "안 쓴다. 기증저작물이라 표기 의무는 없지만 설명란에 적는다. "
        "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=319450",
    ),
    (
        "public/bgm-sn.wav", "13262340", "12월, 광화문 거리 교향곡",
        "한국저작권위원회", 28.0, 36.8,
        "눈이 가장 많이 온 날 — 13편에서 이 곡을 '겨울 쪽으로 기울어' "
        "뺐는데, 이 편은 실제로 폭설 편이라 그 기울기가 그대로 맞는다. "
        "113초 중 28초부터가 가장 고르다(중역 84%, 고르기 2.67). "
        "재난 편이지만 태풍처럼 몰아치는 것이 아니라 소리 없이 덮는 "
        "쪽이라 관현악이 맞는다. "
        "「End of Fall」이 소재로는 더 가까웠지만 CC BY-SA다 — 잘라 쓰면 "
        "2차 저작물 논란이 남는다. 크리스마스 계통은 종교색이 붙어 뺐다. "
        "CC BY라 설명란 표기가 이용 조건이다. "
        "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13262340",
    ),
    (
        "public/bgm-wd.wav", "13300012", "절정의 화살",
        "기증저작물(자유이용)", 96.0, 37.1,
        "관측 이래 가장 센 바람 — 시속 229km로 날아가는 것을 다루는 "
        "편이라 제목이 그대로 맞물린다. 198초 중 96초부터가 가장 "
        "고르다(중역 71%, 고르기 3.64). "
        "태풍 편(3편)의 조여드는 Anguish와는 성격이 다르다. 이 편은 "
        "재난이 아니라 기록이라 몰아치되 무겁지 않아야 한다. "
        "「BLACK BOX - South Korea」가 고르기 9.51로 훨씬 높았지만 "
        "중역이 49%뿐이라 휴대폰에서 배경이 빈다. "
        "기증저작물이라 표기 의무는 없지만 설명란에 적는다. "
        "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13300012",
    ),
    (
        "public/bgm-rn.wav", "13243502", "Chaser",
        "한국저작권위원회 (작곡 오정석)", 70.0, 38.2,
        "하루 올 비가 1시간에 — 이 편은 기록을 쫓아가 갈아치우는 "
        "이야기다. 1927년 제주에서 시작한 전국 1위가 서울·강화를 거쳐 "
        "2024년과 2025년 군산에서 2년 연속 깨진다. 곡 이름이 그대로 "
        "'추격'이고, 공유마당 요약도 '추격신을 연상케 하는 긴장감 넘치는 "
        "신디사이저와 비트'다. 분위기가 아니라 편의 구조와 맞물린다. "
        "그리고 야마가 '1시간에 몰린다'라 빠른 템포여야 한다 — 15편의 "
        "눈(조용히 덮는 것)과 정확히 반대다. 136초 중 70초부터가 가장 "
        "고르다(중역 63%, 고르기 7.56). "
        "후보 중 「폭풍우가 몰아치는 산」이 고르기 16.03으로 훨씬 높았지만 "
        "278초짜리 자연 녹음이라 음악이 아니다. 소재와는 맞아도 이 채널은 "
        "여덟 편 내내 음악을 깔았고 한 편만 환경음이면 그게 사고로 읽힌다. "
        "CC BY라 설명란 표기가 이용 조건이다. 빼면 라이선스 위반이다. "
        "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13243502",
    ),
    (
        "public/bgm-tg.wav", "13386804", "국악 BGM #64",
        "주식회사 아이티앤", 7.0, 53.6,
        "虎入 — 조선 궁궐에 호랑이가 들어온 밤이다. 공유마당이 이 곡에 "
        "붙인 분위기 태그가 '비장한'이고, 그게 이 편의 결이다. 왕이 "
        "포수를 보내고 훈련도감이 나가는 이야기지 사냥 무용담이 아니다. "
        "9편(실록 사고)의 여민락은 정악이라 단정한데, 이 편은 밤에 "
        "성 안으로 들어온 짐승 이야기라 갈라야 한다. 17편(Chaser, "
        "신디사이저 비트)과도 갈린다. "
        "68초 중 7초부터가 가장 고르다(중역 87%로 후보 23곡 중 최고, "
        "고르기 4.47). "
        "고르기가 5.54로 제일 높았던 「국악 BGM #63」은 태그가 '서서히 "
        "죽어가는'이라 편과 안 맞고, 「국악 BGM #31」('힘찬')은 중역이 "
        "65%뿐이라 휴대폰에서 흐려진다. "
        "CC BY라 설명란 표기가 이용 조건이다. 빼면 라이선스 위반이다. "
        "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13386804",
    ),
    (
        "public/bgm-xc.wav", "13333445", "Walking",
        "최재규, 한국저작권위원회 CC BY", 46.0, 54.2,
        "자기 시·군과 안 붙어 있는 땅 — 제목이 소재와 맞물린다. 이 편의 "
        "9곳은 걸어서 제 시·군에 닿을 수 없는 땅이고, 곡 제목이 Walking이다. "
        "고르기 4.55로 채택 곡들의 범위(2.9~4.9) 한가운데다. 중역 46%는 "
        "낮은 편이지만 채택 범위(43~88%) 안이다. 중역 81%인 '구름산책'이 "
        "휴대폰에서 더 또렷했는데, 저작권자가 '공유마당'으로만 적혀 있고 "
        "곡의 결이 이 편보다 밝다. 131초 중 46초부터가 편 길이 54.2초에 "
        "고르게 맞는다. "
        "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13333445",
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
    jobs = ([(o, n, s0, d, w, None) for o, n, s0, d, w in TRACKS]
            + [(o, t, s0, d, w, sn) for o, sn, t, _au, s0, d, w in GONGU])
    for out, name, start, dur, why, sn in jobs:
        if only and not any(k in out for k in only):
            continue
        if sn:
            src = os.path.join(CACHE, f"gongu-{sn}.mp3")
            if not os.path.exists(src):
                sys.exit(f"{src}가 없다. 먼저 "
                         f"python3 scripts/find-bgm.py --get {sn}")
            a = decode(src)
        else:
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
        tag = "공유마당" if sn else "incompetech"
        print(f"{out} · {dur:.1f}s · {name} @{start:.0f}s · {tag} · "
              f"{os.path.getsize(out)//1024}KB")
        print(f"   {why}")


if __name__ == "__main__":
    main()
