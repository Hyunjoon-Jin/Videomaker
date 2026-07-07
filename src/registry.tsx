import React from "react";
import { Scene01Breaking } from "./scenes/Scene01Breaking";
import { Scene02Anchor } from "./scenes/Scene02Anchor";
import { Scene03PresidentA } from "./scenes/Scene03PresidentA";
import { Scene04PresidentB } from "./scenes/Scene04PresidentB";
import { Scene05Bumunjang } from "./scenes/Scene05Bumunjang";
import { Bridge } from "./scenes/Bridge";
import { Scene06Stadium } from "./scenes/Scene06Stadium";
import { Scene07Homerun } from "./scenes/Scene07Homerun";
import { Scene08Steal } from "./scenes/Scene08Steal";
import { Scene09Strikeout } from "./scenes/Scene09Strikeout";
import { Scene10Losing } from "./scenes/Scene10Losing";
import { Scene11Eighth } from "./scenes/Scene11Eighth";
import { Scene12FullCount } from "./scenes/Scene12FullCount";
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
  "S07-Homerun": Scene07Homerun,
  "S08-Steal": Scene08Steal,
  "S09-Strikeout": Scene09Strikeout,
  "S10-Losing": Scene10Losing,
  "S11-Eighth": Scene11Eighth,
  "S12-FullCount": Scene12FullCount,
  "S13-Swing": Scene13Swing,
  "S14-Ending": Scene14Ending,
};
