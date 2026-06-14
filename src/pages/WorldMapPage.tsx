import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorldMap } from '../data/WorldMap/WorldMap.ts';
import type { Expedition } from '../data/WorldMap/Expedition.ts';
import { GameData } from '../game/GameData.ts';

// Generated once per session — survives re-renders but resets on hard reload.
const SESSION_WORLD_MAP = WorldMap.generate();

// Staggered vertical positions (% from top of screen) for visual spread.
const Y_OFFSETS = [38, 52, 42, 58, 45, 55];

function positionFor(index: number, total: number): { x: number; y: number } {
    const x = ((index + 0.5) / total) * 100;
    const y = Y_OFFSETS[index % Y_OFFSETS.length];
    return { x, y };
}

export default function WorldMapPage() {
    const navigate    = useNavigate();
    const expeditions = SESSION_WORLD_MAP.expeditions as Expedition[];
    const [selected, setSelected] = useState(0);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                setSelected(i => Math.max(0, i - 1));
            } else if (e.key === 'ArrowRight') {
                setSelected(i => Math.min(expeditions.length - 1, i + 1));
            } else if (e.key === 'Enter') {
                embark(expeditions[selected]);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selected, expeditions]);

    function embark(exp: Expedition) {
        GameData.setSelectedExpedition(exp);
        navigate('/run-prepare');
    }

    return (
        <div className="relative w-screen h-screen bg-white overflow-hidden select-none">

            {/* Subtle grid texture */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage:
                        'repeating-linear-gradient(0deg,#000 0,#000 1px,transparent 1px,transparent 48px),' +
                        'repeating-linear-gradient(90deg,#000 0,#000 1px,transparent 1px,transparent 48px)',
                }}
            />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 pt-8 flex flex-col items-center gap-1 pointer-events-none">
                <h1 className="text-2xl font-bold uppercase tracking-widest text-amber-500">
                    World Map
                </h1>
                <p className="text-base text-gray-400 tracking-widest uppercase">
                    ← → select &nbsp;·&nbsp; Enter embark
                </p>
            </div>

            {/* Expedition cards */}
            {expeditions.map((exp, i) => {
                const { x, y } = positionFor(i, expeditions.length);
                const active   = i === selected;

                return (
                    <div
                        key={i}
                        style={{
                            position:  'absolute',
                            left:      `${x}%`,
                            top:       `${y}%`,
                            transform: 'translate(-50%, -50%)',
                            width:     '280px',
                        }}
                        onClick={() => setSelected(i)}
                        onDoubleClick={() => embark(exp)}
                        className="cursor-pointer"
                    >
                        {/* Connector dot */}
                        <div
                            className={`absolute left-1/2 -translate-x-1/2 -bottom-3 w-3 h-3 rounded-full transition-colors duration-200 ${
                                active ? 'bg-amber-500' : 'bg-gray-300'
                            }`}
                        />

                        <div
                            className={`rounded-xl p-5 border-2 transition-all duration-200 ${
                                active
                                    ? 'border-amber-500 bg-white shadow-xl shadow-amber-500/20 scale-105'
                                    : 'border-gray-200 bg-white/70 opacity-50'
                            }`}
                        >
                            <p className="text-xl font-bold text-gray-900 mb-1.5 leading-tight">
                                {exp.region.title}
                            </p>
                            <p className="text-base text-gray-500 leading-snug mb-4">
                                {exp.region.description}
                            </p>

                            <div className="flex flex-col gap-2.5">
                                {exp.worldMods.map((mod, j) => (
                                    <div key={j}>
                                        <p className="text-base font-semibold text-amber-500">
                                            {mod.title}
                                        </p>
                                        <p className="text-sm text-gray-500 leading-snug">
                                            {mod.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Footer — embark button */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <button
                    onClick={() => embark(expeditions[selected])}
                    className="px-12 py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-xl font-bold uppercase tracking-widest rounded-xl transition-colors shadow-lg"
                >
                    Embark →
                </button>
            </div>
        </div>
    );
}
