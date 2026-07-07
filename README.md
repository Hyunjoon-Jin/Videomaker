# KT 워크샵 오프닝 — 애니매틱 (Remotion)

수도권강남법인고객본부 상반기 직책자 워크샵 오프닝 영상의 **전체 애니매틱**(약 2분 52초, 15씬)을 Remotion으로 구현한 프로젝트.

- **그래픽 씬**(Scene 1 속보 인트로 · Scene 14 엔딩 · 브릿지)은 실제 애니메이션으로 완성 구현.
- **방송 그래픽 오버레이**(스코어바 · 자막 · 위성 프레임 · 네임택)는 실제 컴포넌트로 구현되어, 실사 씬 위에도 그대로 얹힘.
- **실사/Veo/HeyGen 씬**(Scene 2~13)은 씬 번호·제목·제작 방식이 표시된 **플레이스홀더**. 실제 소스가 나오면 각 씬 파일의 `<Placeholder>`만 `<OffthreadVideo>`로 교체.

원본 제작 가이드는 [`docs/통합제작가이드.md`](docs/통합제작가이드.md).

---

## 빠른 시작

```bash
npm install
npm run studio      # Remotion Studio (브라우저 프리뷰 · 씬별 스크럽)
```

## 렌더링

```bash
# 전체 통합본
npm run render                              # → out/full-animatic.mp4

# 개별 씬만 교체 렌더링 (컴포지션 id 지정)
npx remotion render S01-Breaking  out/S01.mp4
npx remotion render S12-FullCount out/S12.mp4
npx remotion render S14-Ending    out/S14.mp4

# 스틸(썸네일/검수)
npx remotion still S07-Homerun out/s07.png --frame=40
```

컴포지션 id 목록은 `npx remotion compositions` 또는 [`src/timeline.ts`](src/timeline.ts)의 `SCENES` 참고.

---

## 구조

```
src/
├─ index.ts            registerRoot
├─ Root.tsx            컴포지션 등록 (FullAnimatic + 씬별 개별 컴포지션)
├─ FullAnimatic.tsx    <Series>로 전 씬을 순서대로 연결
├─ timeline.ts         ★ 씬 순서·길이·메타데이터 단일 진실 소스
├─ registry.tsx        씬 id → 컴포넌트 매핑
├─ theme.ts            색 토큰 (뉴스/야구/팀 컬러)
├─ fonts.ts            Pretendard 로컬 로드
├─ components/         재사용 오버레이
│  ├─ Placeholder.tsx     실사 씬 대체 슬레이트
│  ├─ Scoreboard.tsx      방송 스코어바 (점수·이닝·풀카운트·만루 도트)
│  ├─ Subtitle.tsx        자막 (뉴스바 / 실적 캡션 / 하단 대형)
│  ├─ SatelliteFrame.tsx  위성 중계 프레임 (Scene 3·4)
│  ├─ NameTag.tsx         하단 이름표
│  └─ Globe.tsx           속보 인트로용 회전 지구본(캔버스)
└─ scenes/             Scene01Breaking … Scene14Ending + Bridge
```

### 씬을 교체·수정하려면

- **길이 변경**: `src/timeline.ts`의 해당 씬 `seconds`만 수정 → 개별 컴포지션과 전체 통합본에 동시 반영.
- **실사 소스 반영**: 해당 `src/scenes/SceneXX*.tsx`에서 `<Placeholder .../>`를 `<OffthreadVideo src={staticFile("...")} />`로 교체. 오버레이(스코어바/자막 등)는 그대로 유지.
- **실적 수치 확정**: `Scene07Homerun.tsx`의 `HITS`, 스코어바 점수/이닝 props 수정.

---

## 타임라인 (30fps · 1920×1080)

| # | 씬 | 길이 | 유형 |
|---|---|---|---|
| Scene 1 | 속보 인트로 | 5s | **그래픽** |
| Scene 2 | AI 앵커 브리핑 | 20s | 플레이스홀더 + 뉴스 자막바 |
| Scene 3 | 아메리카나 대통령(가상) | 12s | 플레이스홀더 + 위성 프레임·네임택 |
| Scene 4 | 유로피아 총리(가상) | 12s | 플레이스홀더 + 위성 프레임·네임택 |
| Scene 5 ★ | 김봉균 부문장님 | 20s | 플레이스홀더 + 네임택 (클린) |
| 브릿지 | PART1→PART2 | 3s | **그래픽** |
| Scene 6 | 경기 시작 | 5s | 플레이스홀더 + 스코어바 |
| Scene 7 | 홈런 몽타주 | 20s | 플레이스홀더 + 실적 캡션·스코어 누적 |
| Scene 8 | 도루 · 탈환 | 10s | 플레이스홀더 + 스코어바·자막 |
| Scene 9 | 삼진 · 연속 수주 | 10s | 플레이스홀더 + K 마크·자막 |
| Scene 10 | 뒤지는 스코어 | 10s | 플레이스홀더 + 스코어바 확대 |
| Scene 11 | 약속의 8회 말 | 10s | 타이핑 + 플레이스홀더 |
| Scene 12 | 2사 만루 풀카운트 | 15s | 플레이스홀더 + 풀카운트 스코어바 |
| Scene 13 | 타격의 순간 | 10s | 플레이스홀더 + 임팩트/블랙 페이드 |
| Scene 14 | 엔딩 카피 | 10s | **그래픽** |

합계 ≈ **172초 (2:52)**. 가이드 목표 2:40에 맞추려면 몽타주(Scene 7·12) 길이를 `timeline.ts`에서 조정.

> **참고** — 가이드 원문은 23.976fps지만 애니매틱은 정수 30fps로 단순화했다.

---

## 폰트

가이드 지정 **Pretendard**(자막)를 사용한다. 프록시 환경에서 웹폰트 CDN이 막히므로 `public/fonts`에 번들해 로컬 로드하며, 렌더 속도를 위해 **소스에 등장하는 글자만 서브셋**(웨이트당 ~40KB)했다.

자막에 새 한글 글자를 추가한 경우:

```bash
# 원본 Pretendard woff2를 public/fonts에 복원한 뒤
pip install fonttools brotli
python3 scripts/subset-fonts.py
```

---

## 사운드 · 컬러

애니매틱에는 사운드가 없다(가이드대로 후반작업에서 얹음). 오디오·컬러 통일·출력 스펙(-14 LUFS, H.264 4K 등)은 [`docs/통합제작가이드.md`](docs/통합제작가이드.md) "마무리. 후반작업 통합 가이드" 참고.
