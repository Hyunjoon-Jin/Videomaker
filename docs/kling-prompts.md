# Kling image-to-video 프롬프트 (씬 순서)

각 이미지(`public/scenes/<코드>.png`)를 Kling image-to-video에 넣고 아래 프롬프트 사용.

**공통 권장 설정**
- 모드: Image to Video, 길이 5초(액션은 5초 권장), 화질 High/Pro
- 카메라·모션 강도: 중(과하면 얼굴/손 뭉개짐)
- **공통 Negative prompt**: `morphing, warping, distorted face, deformed hands, extra fingers, extra limbs, flickering, jitter, text artifacts, watermark`
- 야구 씬은 **느린 슬로모션 + 야간 구장 중계 톤**으로 통일해 앞뒤 흐름을 맞춘다.
- 그래픽 씬(속보 인트로·브릿지·선발 라인업·엔딩·최종 스코어)은 코드 제작이라 Kling 불필요.

---

## PART 1 — 뉴스

### S02 · AI 앵커 브리핑
> Locked broadcast shot. The Korean female news anchor speaks to camera with natural subtle head and mouth movement, occasional blink, slight shoulder motion; the city-skyline screen behind glows and shifts softly. Almost imperceptible slow push-in. Professional newsroom, photoreal.

### S03 · 아메리카나 대통령(가상)
> Static medium shot, warm office. The heavyset bald leader speaks confidently to camera with big enthusiastic hand gestures and a friendly grin, subtle head movement; the striped flag sways gently behind him. Slow push-in, slightly comedic energy.

### S04 · 유로피아 총리(가상)
> Static medium shot, soft window light. The elegant silver-haired female leader speaks calmly and gracefully to camera with small measured hand gestures, gentle smile, subtle blinking. Very slow push-in, dignified and warm.

### S05 · 우주정거장 집무실 (배경, 인물 없음)
> Slow cinematic push-in toward the huge panoramic window; planet Earth rotates very slowly outside with a soft blue glow, distant stars twinkle faintly, the warm desk lamp flickers subtly. No people. Majestic and quiet.

---

## PART 2 — 야구 (야간 구장 · 슬로모션 중계 톤)

### S06 · 경기 시작 (플레이볼)
> The home plate umpire punches the air and shouts "play ball" with a sharp arm motion, the catcher shifts in his crouch, the crowd shimmers behind. A quick subtle camera shake that settles. Energetic broadcast opening, night stadium.

### S06C · 감독 작전 지시
> The manager in the dugout signals a play with focused authoritative motion — subtle head turn, hand signs — players move slightly behind him. Slow push-in, night stadium lighting.

### S07 · 홈런 스윙 ① (팔로스루)
> Cinematic slow motion. The batter holds his high home-run follow-through and turns his head tracking the ball, jersey ripples, dust drifts, the ball recedes into the night sky. Gentle push-in.

### S072 · 홈런 스윙 ② (감상 포즈)
> Slow motion. The slugger holds his proud admiring pose, lowers the bat slightly while his eyes follow the soaring ball, subtle breathing; floodlights flare. Slow push-in.

### S073 · 홈런 스윙 ③ (컨택)
> Explosive slow motion contact. The bat drives through and the ball launches off the barrel flying away, dust and debris burst outward, the camera follows the swing arc. Cinematic.

### S07C · 배트 플립(빠던)
> Slow motion bat flip. The batter tosses the bat spinning high into the air with swagger and watches his home run, confident stance, crowd blurred behind. Cinematic KBO celebration.

### S07B · 관중 응원
> Ecstatic fans jump and cheer, waving red thundersticks, arms pumping, confetti drifting down. Handheld energetic motion, night stadium lights.

### S08 · 도루 (슬라이딩 → 세이프)
> Dramatic slow motion. The runner slides head-first into the base as a dust cloud explodes, the fielder sweeps a late tag down. Tense split-second, low camera angle.

### S08B · 호수비 (다이빙 캐치)
> Slow motion. The outfielder lays out in a full-stretch diving catch, glove reaching, body hitting the grass, dust flying. The camera tracks the dive. Dramatic.

### S09 · 삼진 투수 (뒷모습)
> Slow motion from behind. The pitcher explodes forward and releases a fastball, arm whipping through, uniform snapping, dust off the mound. Keep the plain jersey back clean and unchanged.
> *Negative 추가:* `text on jersey, numbers, logo on back`  (이름/등번호는 편집에서 얹음)

### S09B · 라이벌 타자 헛스윙 ①
> Extreme slow motion. The rival batter swings hard and misses completely, badly fooled, the bat whips through empty air, off-balance twist, the ball snaps into the catcher's mitt. Dramatic whiff.

### S09C · 라이벌 타자 헛스윙 ②
> Slow motion low angle. The rival batter lunges and swings through the pitch, missing, twisting off-balance; the catcher secures the ball. Dramatic strikeout.

### S10 · 뒤지는 스코어 (덕아웃)
> Heavy, quiet mood. The dugout players sit almost still with tense faces, one clenches his jaw, minimal movement, low light. Very slow push-in, somber.

### S10B · 상대의 반격
> Slow motion. The rival runner slides into home plate scoring a run, dust bursts, opposing teammates celebrate in the background. Tense, disappointing mood for the home side.

### S11 · 약속의 8회 말 (일어서는 선수들)
> Slow motion, low angle. The players rise from the dugout bench one by one with quiet determination, adjusting caps, jaws set. Heroic rising mood, rim light behind.

### S11B · 마운드 작전 회의
> The infielders and pitcher lean in together on the mound for a tense meeting, subtle nods and talking, a glove held over the mouth. Slow push-in, night stadium.

### S12 · 2사 만루 풀카운트 (라이벌 투수 클로즈업)
> Extreme close-up. The rival pitcher's sweating face; a single sweat drop rolls down his temple, intense eyes stare toward the plate, subtle breathing and a faint blink. Ultra-slow, thriller tension.

### S12B1 · 만루 1루 주자
> Subtle tense motion. The base runner takes a lead-off, weight shifting side to side, eyes locked forward, poised and ready to bolt but not running. Very slight push-in, night stadium.

### S12B2 · 만루 2루 주자
> Subtle tense motion. The base runner leans into a lead-off off second base, coiled and focused, small ready movements, not running. Very slight push-in, night stadium.

### S12B3 · 만루 3루 주자
> Subtle tense motion. The base runner takes a lead-off from third, poised to break for home, intense focused stare, small ready movements, not running. Very slight push-in.

### S13 · 타격의 순간 (결정적 역전 스윙)
> Majestic slow motion. The power hitter drives through the decisive home-run swing, the ball launches off the bat toward the outfield, dramatic backlit silhouette, dust bursts. Cinematic climax.

### S13B · 공이 밤하늘로 (여운)
> A baseball soars straight up and away into the night sky between the light towers, receding toward the stars, the camera tilts up following it smoothly with no side-to-side wobble. Majestic and hopeful.
