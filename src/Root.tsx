import React from "react";
import { Composition } from "remotion";
import { ShortsDecline, SHORT_DURATION } from "./ShortsDecline";
import { FPS, SHORT_H, SHORT_W } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="ShortsDecline"
      component={ShortsDecline}
      durationInFrames={SHORT_DURATION}
      fps={FPS}
      width={SHORT_W}
      height={SHORT_H}
    />
  </>
);
