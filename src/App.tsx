import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import GamePage from './pages/GamePage';
import RunPreparePage from './pages/RunPreparePage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/run-prepare" element={<RunPreparePage />} />
                <Route path="/game" element={<GamePage targetScene="CombatSceneV2" />} />
            </Routes>
        </BrowserRouter>
    );
}
