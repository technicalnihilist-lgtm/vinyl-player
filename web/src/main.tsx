import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';
// Imported after app.css on purpose: it carries the row heights the skipped-row
// placeholder needs, and they have to win over the value in app.css.
import './styles/rows.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

// Note: React.StrictMode is intentionally omitted. Its double-invoked effects
// would mount → unmount → remount the imperative AudioEngine, tearing down the
// AudioContext on the simulated unmount. The player logic is exercised by the
// unit test suite instead.
createRoot(container).render(<App />);
