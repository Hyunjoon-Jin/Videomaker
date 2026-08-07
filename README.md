# Gemini API 생성 스크립트

Google Gemini API로 씬별 이미지·영상을 생성하는 스크립트 모음.
Python 표준 라이브러리 + `curl`만 사용하며, 별도 의존성 설치가 필요 없다.

| 스크립트 | 모델 | 입력 | 출력 |
|---|---|---|---|
| `scripts/generate-images.py` | Imagen (`imagen-4.0-generate-001`) | 내장 프롬프트 | `public/scenes/<ID>.png` (16:9) |
| `scripts/generate-videos.py` | Veo (`veo-3.1-generate-preview`) | `public/scenes/<ID>.png` | `public/clips/<ID>.mp4` (8초) |

씬 프롬프트는 각 스크립트 안에 딕셔너리로 들어있다 —
`generate-images.py`의 `PROMPTS`, `generate-videos.py`의 `MOTION`.
씬을 추가하려면 해당 딕셔너리에 `ID: 프롬프트` 항목을 넣으면 된다.

---

## 준비

```bash
export GEMINI_API_KEY=xxxx    # generate-images.py는 GOOGLE_API_KEY도 허용
```

## 이미지 생성 (Imagen)

```bash
python3 scripts/generate-images.py             # PROMPTS 전체
python3 scripts/generate-images.py S07 S12     # 일부만
python3 scripts/generate-images.py S07 --force # 이미 있어도 재생성
```

이미 `public/scenes/<ID>.png`가 있으면 건너뛴다. `--force`로 덮어쓴다.

## 영상 생성 (Veo image-to-video)

```bash
python3 scripts/generate-videos.py             # MOTION 전체
python3 scripts/generate-videos.py S06 S07     # 일부만
```

같은 ID의 이미지(`public/scenes/<ID>.png`)가 먼저 있어야 한다.
롱러닝 오퍼레이션을 폴링해 완료되면 `public/clips/<ID>.mp4`로 내려받는다.

## 모델 교체

```bash
IMAGEN_MODEL=imagen-4.0-generate-001    python3 scripts/generate-images.py
VEO_MODEL=veo-3.1-generate-preview      python3 scripts/generate-videos.py
```

---

## 참고

- 전송을 `curl`에 위임하므로 프록시·CA 설정이 자동으로 적용된다.
- 이 저장소에는 이전에 Remotion 애니매틱 프로젝트가 있었다.
  전체 소스는 `claude/new-session-vwlav1` 브랜치(커밋 `370f35e`)에 그대로 남아있다.
