import { useNavigate } from 'react-router-dom';
import { PhaserGame } from '../PhaserGame';
import CombatUI from '../components/CombatUI';

interface Props {
    targetScene: string;
}

export default function GamePage({ targetScene }: Props) {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="text-gray-400 hover:text-gray-700 text-sm uppercase tracking-widest transition-colors"
                >
                    ← Back
                </button>
                <span className="text-gray-400 text-sm uppercase tracking-widest">
                    {targetScene}
                </span>
            </div>
            <div className="flex-1 flex items-center justify-center">
                <PhaserGame targetScene={targetScene} />
            </div>
            <CombatUI />
        </div>
    );
}
