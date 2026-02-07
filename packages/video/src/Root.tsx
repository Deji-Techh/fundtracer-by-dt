import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';
import { FundTracerIntro } from './scenes/FundTracerIntro';
import './style.css';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="MainVideo"
                component={MainVideo}
                durationInFrames={300}
                fps={30}
                width={1920}
                height={1080}
            />
            <Composition
                id="FundTracerIntro"
                component={FundTracerIntro}
                durationInFrames={150}
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
