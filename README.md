# Videomaker

데이터 기반 지도 애니메이션 영상을 코드로 생성하는 프로젝트.
Remotion(React)으로 렌더하고, 데이터는 스크립트로 받아 붙인다.

현재 파일럿: **지방소멸 50년** — 1975→2025 시군구 인구 변화를 지도 위에 애니메이션.

---

## 빠른 시작

```bash
npm install
npm run studio                                  # 브라우저 프리뷰
npx remotion render ShortsDecline out/short.mp4 # 렌더 (1080×1920 · 40초)
```

## 구조

```
src/
├─ index.ts              registerRoot
├─ Root.tsx              컴포지션 등록
├─ ShortsDecline.tsx     파일럿 쇼츠 (9:16 · 40초)
├─ KoreaMap.tsx          ★ 지도 엔진 — 연도를 받아 250개 시군구를 색칠
├─ theme.ts              색 토큰 + 증감률→색 램프
├─ fonts.ts              Pretendard 로컬 로드
└─ data/
   ├─ regions.ts         지오메트리 로더 + 시도 코드표
   ├─ korea-paths.json   ← prep-map.py 산출물 (1MB)
   ├─ population.ts      인구 데이터 레이어 (실데이터/합성 자동 전환)
   └─ population.json    ← fetch-population.py 산출물 (현재 비어 있음)

scripts/
├─ prep-map.py           GeoJSON 18MB → SVG path 1MB
├─ fetch-population.py   KOSIS → population.json
├─ generate-images.py    Imagen (씬 스틸)
└─ generate-videos.py    Veo image-to-video
```

### 지도 엔진

`KoreaMap`은 **연도를 실수로 받는다.** 정수 연도 사이를 선형 보간하므로
프레임마다 색이 튀지 않고 연속적으로 흐른다. 시간축만 바꾸면
다른 주제(역사 사건의 날짜축 등)에도 그대로 쓸 수 있다.

```tsx
<KoreaMap year={2004.7} reveal={1} />
```

---

## 데이터

### 지도 경계 — 연결됨

통계청 2018년 시군구 250개. 원본은
[southkorea/southkorea-maps](https://github.com/southkorea/southkorea-maps)에서 받는다.

```bash
mkdir -p data && curl -sSL -o data/skorea-municipalities.json \
  https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-geo.json
python3 scripts/prep-map.py     # → src/data/korea-paths.json (95% 감소)
```

### 인구 — 미연결

`src/data/population.json`이 비어 있어 **합성 데이터로 동작 중**이다.
이 상태에서는 화면에 `샘플 데이터 · 실제 통계 아님` 경고 배지가 강제로 표시된다.

실데이터를 붙이려면 KOSIS 인증키(무료)가 필요하다.

```bash
# https://kosis.kr/openapi/ 에서 발급
KOSIS_API_KEY=xxxx python3 scripts/fetch-population.py
```

`population.json`이 채워지면 영상은 자동으로 실데이터로 전환되고 배지가 사라진다.
컴포넌트 코드는 손댈 필요 없다.

> **미해결 과제** — 50년간 행정구역이 크게 바뀌었다(시군 통합, 구 신설, 세종시 출범).
> 과거 인구를 2018년 경계에 매칭하는 코드 매핑이 필요하다.
> `fetch-population.py`는 현재 경계에 없는 코드를 보고만 하고 넘긴다.

---

## AI 생성 소스 (선택)

씬 스틸·클립이 필요할 때만 쓴다. 지도 영상에는 필요 없다.

```bash
export GEMINI_API_KEY=xxxx
python3 scripts/generate-images.py S07        # Imagen → public/scenes/<ID>.png
python3 scripts/generate-videos.py S07        # Veo    → public/clips/<ID>.mp4
```
