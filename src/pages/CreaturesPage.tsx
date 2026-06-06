import { useEffect, useState } from 'react';
import { useNavigate          } from 'react-router-dom';
import { CreatureStorage      } from '../game/CreatureStorage.ts';
import { CreatureVisualCache  } from '../game/CreatureVisualCache.ts';
import { FoodNeed             } from '../data/Creature/FoodNeed.ts';
import type { CreatureTemplate } from '../data/Creature/CreatureTemplate.ts';
import { useCreatureGif       } from '../hooks/useCreatureGif.ts';

export default function CreaturesPage() {
    const navigate    = useNavigate();
    const [creatures] = useState<CreatureTemplate[]>(() => CreatureStorage.loadCreatures());

    useEffect(() => {
        CreatureVisualCache.preloadAll(creatures.map(c => c.gifUrl));
    }, [creatures]);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">

            <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
                <button
                    onClick={() => navigate('/')}
                    className="text-gray-400 hover:text-gray-700 text-sm uppercase tracking-widest transition-colors"
                >
                    ← Back
                </button>
                <h1 className="text-base font-bold uppercase tracking-widest text-amber-600">
                    Creatures
                </h1>
            </div>

            <div className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
                {creatures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                        <p className="text-gray-400 text-sm uppercase tracking-widest">
                            No creatures yet
                        </p>
                        <p className="text-gray-300 text-xs max-w-xs">
                            Complete an expedition to earn a creature companion.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {creatures.map((creature, i) => (
                            <CreatureCard key={i} creature={creature} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function CreatureCard({ creature }: { creature: CreatureTemplate }) {
    const gifSrc   = useCreatureGif(creature.gifUrl);
    const foodNeeds = creature.needs.filter((n): n is FoodNeed => n instanceof FoodNeed);

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col gap-3 overflow-hidden">

            {/* Visual */}
            {(creature.gifUrl !== null) && (
                <div className="bg-gray-50 border-b border-gray-100 flex items-center justify-center h-40">
                    {gifSrc
                        ? <img src={gifSrc} alt={creature.name} className="h-full object-contain" />
                        : <span className="text-xs text-gray-300 uppercase tracking-widest">Loading…</span>
                    }
                </div>
            )}

            <div className="px-6 py-5 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-baseline justify-between">
                    <p className="text-lg font-black text-gray-900">{creature.name}</p>
                    <p className="text-xs text-gray-400 italic">{creature.gender}</p>
                </div>

                <p className="text-xs text-gray-500 italic">
                    {creature.personalities.join(' · ')}
                </p>

                {/* Food requirements */}
                {foodNeeds.length > 0 && (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                            Food Requirements
                        </p>
                        {foodNeeds.map((need, j) => (
                            <div key={j} className="flex flex-wrap gap-1.5">
                                {need.acceptedFoods.map((food, k) => (
                                    <span
                                        key={k}
                                        className="inline-block rounded-md bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700"
                                    >
                                        {food.name}
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/* Passives */}
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                        Passives
                    </p>
                    <div className="flex flex-col gap-1.5">
                        {creature.supportPassives.map((passive, j) => (
                            <div key={j} className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                                <p className="text-xs font-bold text-amber-700">{passive.title}</p>
                                <p className="text-xs text-amber-600 mt-0.5 leading-snug">{passive.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
