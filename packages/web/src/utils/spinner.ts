// Unicode spinner animations
const spinners = {
    helix: {
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏', '⠛', '⠟', '⠯', '⠷', '⠾', '⠿'],
        interval: 80
    },
    braille: {
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
        interval: 80
    },
    orbit: {
        frames: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈'],
        interval: 100
    },
    cascade: {
        frames: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈', '⠁', '⠂', '⠄', '⡀'],
        interval: 60
    }
};

export function useSpinner(name: 'helix' | 'braille' | 'orbit' | 'cascade' = 'helix') {
    const spinner = spinners[name];
    const [frame, setFrame] = React.useState(0);
    
    React.useEffect(() => {
        const timer = setInterval(() => {
            setFrame(f => (f + 1) % spinner.frames.length);
        }, spinner.interval);
        return () => clearInterval(timer);
    }, [name]);
    
    return spinner.frames[frame];
}

export function Spinner({ name = 'helix', children }: { name?: 'helix' | 'braille' | 'orbit' | 'cascade', children?: React.ReactNode }) {
    const frame = useSpinner(name);
    return <span style={{ fontFamily: 'monospace' }}>{frame} {children}</span>;
}

export { spinners };