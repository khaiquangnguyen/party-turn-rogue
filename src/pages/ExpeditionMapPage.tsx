import { useState             } from 'react';
import { useNavigate          } from 'react-router-dom';
import { GameData             } from '../game/GameData.ts';
import { CreatureStorage      } from '../game/CreatureStorage.ts';
import type { CreatureTemplate } from '../data/Creature/CreatureTemplate.ts';

const STAGES      = 3;
const STAGE_SIZE  = 4;
const TOTAL_NODES = STAGES * STAGE_SIZE;

// What reward each position within a stage gives.
function rewardLabel(posInStage: number): string | null {
    if (posInStage === 0)            return '★ Combo Mod';
    if (posInStage === STAGE_SIZE - 1) return '◆ Reward';
    return null;
}

export default function ExpeditionMapPage() {
    const navigate   = useNavigate();
    const expedition = GameData.getSelectedExpedition();
    const runPrep    = GameData.getRunPrep();

    const [grandReward] = useState<CreatureTemplate | null>(() =>
        expedition?.map.isComplete ? CreatureStorage.randomFromPool() : null,
    );
    const [rewardClaimed, setRewardClaimed] = useState(false);

    if (!expedition || !runPrep) {
        navigate('/world-map');
        return null;
    }

    const { map, region, worldMods } = expedition;
    const nodes = map.nodes;

    function startCombat() {
        if (!runPrep || map.isComplete) return;
        navigate('/game');
    }

    function handleNodeClick(index: number) {
        if (index === map.currentIndex && !map.isComplete) startCombat();
    }

    function claimCreature(creature: CreatureTemplate) {
        CreatureStorage.addCreature(creature);
        setRewardClaimed(true);
    }

    // Grand reward overlay — shown when expedition just completed and not yet claimed.
    if (grandReward && !rewardClaimed) {
        const acceptedFoods = grandReward.acceptableFoods;
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="bg-white rounded-2xl px-8 py-8 shadow-2xl flex flex-col items-center gap-6 w-full max-w-sm mx-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-amber-500">Expedition Complete</p>
                    <p className="text-2xl font-black uppercase tracking-widest text-gray-900">Grand Reward</p>
                    <p className="text-sm text-gray-400 text-center">A new creature joins your party.</p>

                    <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col gap-3">
                        <p className="text-lg font-black text-amber-700 text-center">{grandReward.name}</p>
                        <p className="text-xs text-gray-500 text-center italic">
                            {grandReward.personalities.map(p => p.name).join(' · ')}
                        </p>
                        {acceptedFoods.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Food</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {acceptedFoods.map((food, i) => (
                                        <span key={i} className="inline-block rounded-md bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                                            {food.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Passives</p>
                            {grandReward.supportPassives.map((p, i) => (
                                <div key={i} className="text-xs text-gray-600">
                                    <span className="font-bold text-gray-800">{p.title}:</span>{' '}{p.description}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => claimCreature(grandReward)}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold uppercase tracking-widest rounded-lg transition-colors shadow"
                    >
                        Claim
                    </button>
                </div>
            </div>
        );
    }

    // Build a padded node array so we always render TOTAL_NODES slots.
    const paddedNodes = Array.from({ length: TOTAL_NODES }, (_, i) => nodes[i] ?? null);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">

            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
                <button
                    onClick={() => navigate('/world-map')}
                    className="text-gray-400 hover:text-gray-700 text-sm uppercase tracking-widest transition-colors"
                >
                    ← World Map
                </button>
                <div className="flex-1">
                    <h1 className="text-base font-bold uppercase tracking-widest text-amber-600">
                        {region.title}
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5">{region.description}</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-10">

                {/* World mods */}
                {worldMods.length > 0 && (
                    <div className="flex gap-4 flex-wrap justify-center">
                        {worldMods.map((mod, i) => (
                            <div key={i} className="bg-white border border-amber-200 rounded-lg px-4 py-2 shadow-sm text-center">
                                <p className="text-xs font-bold text-amber-600">{mod.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{mod.description}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stage groups */}
                <div className="flex items-center gap-6">
                    {Array.from({ length: STAGES }, (_, stageIdx) => {
                        const stageStart = stageIdx * STAGE_SIZE;
                        const stageNodes = paddedNodes.slice(stageStart, stageStart + STAGE_SIZE);
                        const stageComplete = stageNodes.every(n => n?.completed);

                        return (
                            <div key={stageIdx} className="flex items-center gap-0">
                                {/* Stage card */}
                                <div className="flex flex-col items-center gap-3">
                                    <p className={`text-xs font-bold uppercase tracking-widest ${
                                        stageComplete ? 'text-amber-500' : 'text-gray-400'
                                    }`}>
                                        Stage {stageIdx + 1}
                                    </p>

                                    <div className="flex items-center gap-0">
                                        {stageNodes.map((node, posInStage) => {
                                            const globalIdx = stageStart + posInStage;
                                            const isCurrent = globalIdx === map.currentIndex && !map.isComplete;
                                            const isDone    = node?.completed ?? false;
                                            const isLast    = posInStage === STAGE_SIZE - 1;
                                            const reward    = rewardLabel(posInStage);

                                            return (
                                                <div key={posInStage} className="flex items-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        {/* Reward badge above node */}
                                                        <span className={`text-[10px] font-bold whitespace-nowrap h-4 ${
                                                            reward
                                                                ? posInStage === 0
                                                                    ? 'text-purple-500'
                                                                    : 'text-amber-500'
                                                                : 'text-transparent'
                                                        }`}>
                                                            {reward ?? '·'}
                                                        </span>

                                                        {/* Node circle */}
                                                        <button
                                                            onClick={() => handleNodeClick(globalIdx)}
                                                            disabled={!isCurrent}
                                                            className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold text-sm transition-all duration-200 ${
                                                                isDone
                                                                    ? 'border-amber-400 bg-amber-400 text-white cursor-default'
                                                                    : isCurrent
                                                                        ? 'border-amber-500 bg-white text-amber-600 shadow-lg shadow-amber-200 scale-110 animate-pulse cursor-pointer hover:bg-amber-50'
                                                                        : 'border-gray-200 bg-gray-50 text-gray-300 cursor-default'
                                                            }`}
                                                        >
                                                            {isDone ? (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : (
                                                                <span>{globalIdx + 1}</span>
                                                            )}
                                                            {isCurrent && (
                                                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-amber-600 uppercase tracking-wider whitespace-nowrap">
                                                                    Here
                                                                </span>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Connector within stage */}
                                                    {!isLast && (
                                                        <div className={`w-8 h-0.5 ${isDone ? 'bg-amber-400' : 'bg-gray-200'}`} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Connector between stages */}
                                {stageIdx < STAGES - 1 && (
                                    <div className={`w-10 h-0.5 mx-1 ${stageComplete ? 'bg-amber-400' : 'bg-gray-200'}`} />
                                )}
                            </div>
                        );
                    })}

                    {/* End marker */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded border-2 text-xs font-bold uppercase tracking-wider ${
                        map.isComplete
                            ? 'border-amber-400 bg-amber-400 text-white'
                            : 'border-gray-200 bg-gray-50 text-gray-300'
                    }`}>
                        End
                    </div>
                </div>

                {/* Action area */}
                {map.isComplete ? (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-sm font-bold text-amber-600 uppercase tracking-widest">
                            Expedition Complete
                        </p>
                        <button
                            onClick={() => navigate('/world-map')}
                            className="px-10 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold uppercase tracking-widest rounded-lg transition-colors shadow"
                        >
                            Return to World Map
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={startCombat}
                        className="px-12 py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold uppercase tracking-widest rounded-lg transition-colors shadow text-base"
                    >
                        Enter Combat →
                    </button>
                )}
            </div>
        </div>
    );
}
