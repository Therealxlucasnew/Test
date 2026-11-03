import React from 'react';
import {Composition} from 'remotion';
import {CrashNews, DURATION} from './Video';
import {FPS, H, W} from './theme';

export const Root: React.FC = () => (
  <Composition id="CrashNews" component={CrashNews} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
);
