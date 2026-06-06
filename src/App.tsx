import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import GamePage from './pages/GamePage';
import RunPreparePage from './pages/RunPreparePage';
import WorldMapPage from './pages/WorldMapPage';
import ExpeditionMapPage from './pages/ExpeditionMapPage';
import CreaturesPage from './pages/CreaturesPage';
import { CreatureStorage } from './game/CreatureStorage';

CreatureStorage.initWithAllCreatures();

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/world-map" element={<WorldMapPage />} />
                <Route path="/run-prepare" element={<RunPreparePage />} />
                <Route path="/expedition-map" element={<ExpeditionMapPage />} />
                <Route path="/game" element={<GamePage targetScene="CombatSceneV2" />} />
                <Route path="/creatures" element={<CreaturesPage />} />
            </Routes>
        </BrowserRouter>
    );
}
