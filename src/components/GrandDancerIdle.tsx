import Phaser from 'phaser';
import { useLayoutEffect, useRef } from 'react';
import { IdleShowcaseScene } from '../game/scenes/IdleShowcaseScene';

interface Props {
    className?: string;
}

export default function GrandDancerIdle({ className }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);

    useLayoutEffect(() => {
        if (!containerRef.current || gameRef.current) return;

        gameRef.current = new Phaser.Game({
            type:        Phaser.CANVAS,
            width:       300,
            height:      400,
            transparent: true,
            pixelArt:    true,
            parent:      containerRef.current,
            scene:       [IdleShowcaseScene],
        });

        return () => {
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
    }, []);

    return <div ref={containerRef} className={className} />;
}
