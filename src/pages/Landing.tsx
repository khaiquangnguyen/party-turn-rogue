import { useNavigate } from 'react-router-dom';
import GrandDancerIdle from '../components/GrandDancerIdle';

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-12 text-gray-900">
            <div className="flex flex-col items-center gap-2">
                <h1 className="text-5xl font-bold tracking-widest uppercase text-amber-600">
                    Party Turn Rogue
                </h1>
                <p className="text-gray-400 text-sm tracking-widest uppercase">
                    The Grand Dancer awaits
                </p>
            </div>

            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-amber-400/10 blur-3xl" />
                <GrandDancerIdle className="relative drop-shadow-[0_0_24px_rgba(251,191,36,0.3)]" />
            </div>

            <div className="flex flex-col gap-4 w-64">
                <button
                    onClick={() => navigate('/run-prepare')}
                    className="w-full py-3 px-6 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold uppercase tracking-widest rounded transition-colors shadow"
                >
                    Start Game
                </button>
            </div>
        </div>
    );
}
