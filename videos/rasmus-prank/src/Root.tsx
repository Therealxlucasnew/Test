import {Composition} from 'remotion';
import {RasmusPrank, FPS, totalFrames} from './Video';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="RasmusPrank"
    component={RasmusPrank}
    durationInFrames={totalFrames()}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
