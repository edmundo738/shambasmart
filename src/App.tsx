import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Studio from './pages/Studio';
import Projects from './pages/Projects';
import Lab from './pages/Lab';
import Generator from './pages/Generator';
import Library from './pages/Library';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/projetos" element={<Projects />} />
      <Route path="/lab" element={<Lab />} />
      <Route path="/gerador" element={<Generator />} />
      <Route path="/biblioteca" element={<Library />} />
      <Route path="/studio" element={<Studio />} />
      <Route path="/studio/:projectId" element={<Studio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
