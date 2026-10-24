import type { Settings } from '../hooks/useSettings';
import type { Style } from '../hooks/useStyle';
import { Switch } from './Switch';
import { StylePanel } from './StylePanel';
import { CloseIcon } from './Icons';

interface Props {
  open: boolean;
  settings: Settings;
  onToggle: (key: keyof Settings) => void;
  onReset: () => void;
  style: Style;
  onStyleChange: <K extends keyof Style>(key: K, value: Style[K]) => void;
  onStyleReset: () => void;
  onClose: () => void;
}

const ROWS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'spin', label: 'Spin the record', hint: 'The disc turns while a song plays' },
  { key: 'visualiser', label: 'Visualiser', hint: 'Bars that follow the music' },
  { key: 'numbers', label: 'Song numbers', hint: 'Number every row in the list' },
  { key: 'compact', label: 'Compact list', hint: 'Fit more songs on the screen' },
  { key: 'autoplay', label: 'Auto-play on open', hint: 'Start the first song by itself' },
  { key: 'glass', label: 'Full glass effects', hint: 'Turn off on an older phone for smoother scrolling' },
];

/** The options sheet: one sliding switch per setting. */
export function SettingsSheet({ open, settings, onToggle, onReset, style, onStyleChange, onStyleReset, onClose }: Props) {
  return (
    <div className={`sheet-layer${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <div className="sheet-layer__scrim" onClick={onClose} />
      <div className="sheet glass" role="dialog" aria-modal="true" aria-label="Settings">
        <header className="sheet__head">
          <h2 className="sheet__title">Settings</h2>
          <button type="button" className="glass-btn" aria-label="Close settings" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </header>

        <div className="sheet__body">
          {ROWS.map((row) => (
            <Switch
              key={row.key}
              id={`setting-${row.key}`}
              label={row.label}
              hint={row.hint}
              checked={settings[row.key]}
              onChange={() => onToggle(row.key)}
            />
          ))}

          <StylePanel style={style} onChange={onStyleChange} onReset={onStyleReset} />
        </div>

        <footer className="sheet__foot">
          <button type="button" className="glass-btn glass-btn--primary" onClick={onClose}>
            Done
          </button>
          <button type="button" className="glass-btn glass-btn--wide" onClick={onReset}>
            Reset to defaults
          </button>
        </footer>
      </div>
    </div>
  );
}
