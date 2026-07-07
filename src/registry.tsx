import React from "react";
import { Scene01Breaking } from "./scenes/Scene01Breaking";
import { Scene02Anchor } from "./scenes/Scene02Anchor";
import { Scene03PresidentA } from "./scenes/Scene03PresidentA";
import { Scene04PresidentB } from "./scenes/Scene04PresidentB";
import { Scene05Bumunjang } from "./scenes/Scene05Bumunjang";
import { Bridge } from "./scenes/Bridge";
import { Scene06Stadium } from "./scenes/Scene06Stadium";
import { Scene06bLineup } from "./scenes/Scene06bLineup";
import { Scene06cManager } from "./scenes/Scene06cManager";
import { Scene07Homerun } from "./scenes/Scene07Homerun";
import { Scene07cBatFlip } from "./scenes/Scene07cBatFlip";
import { Scene07bCrowd } from "./scenes/Scene07bCrowd";
import { Scene08Steal } from "./scenes/Scene08Steal";
import { Scene08bDefense } from "./scenes/Scene08bDefense";
import { Scene09Strikeout } from "./scenes/Scene09Strikeout";
import { Scene10bRivalRun } from "./scenes/Scene10bRivalRun";
import { Scene10Losing } from "./scenes/Scene10Losing";
import { Scene11Eighth } from "./scenes/Scene11Eighth";
import { Scene11bMound } from "./scenes/Scene11bMound";
import { Scene12FullCount } from "./scenes/Scene12FullCount";
import { Scene12bBasesLoaded } from "./scenes/Scene12bBasesLoaded";
import { Scene13Swing } from "./scenes/Scene13Swing";
import { Scene14Ending } from "./scenes/Scene14Ending";

/** 씬 id → 컴포넌트 매핑. timeline.ts의 SCENES와 짝을 이룬다. */
export const SCENE_COMPONENTS: Record<string, React.FC> = {
  "S01-Breaking": Scene01Breaking,
  "S02-Anchor": Scene02Anchor,
  "S03-PresidentA": Scene03PresidentA,
  "S04-PresidentB": Scene04PresidentB,
  "S05-Bumunjang": Scene05Bumunjang,
  "BR-Bridge": Bridge,
  "S06-Stadium": Scene06Stadium,
  "S06B-Lineup": Scene06bLineup,
  "S06C-Manager": Scene06cManager,
  "S07-Homerun": Scene07Homerun,
  "S07C-BatFlip": Scene07cBatFlip,
  "S07B-Crowd": Scene07bCrowd,
  "S08-Steal": Scene08Steal,
  "S08B-Defense": Scene08bDefense,
  "S09-Strikeout": Scene09Strikeout,
  "S10B-RivalRun": Scene10bRivalRun,
  "S10-Losing": Scene10Losing,
  "S11-Eighth": Scene11Eighth,
  "S11B-Mound": Scene11bMound,
  "S12-FullCount": Scene12FullCount,
  "S12B-BasesLoaded": Scene12bBasesLoaded,
  "S13-Swing": Scene13Swing,
  "S14-Ending": Scene14Ending,
};
