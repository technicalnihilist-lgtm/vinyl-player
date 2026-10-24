import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

// Note: React.StrictMode is intentionally omitted. Its double-invoked effects
// would mount → unmount → remount the imperative AudioEngine, tearing down the
// AudioContext on the simulated unmount. The player logic is exercised by the
// unit test suite instead.
createRoot(container).render(<App />);
