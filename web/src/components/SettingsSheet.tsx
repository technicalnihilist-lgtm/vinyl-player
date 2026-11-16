import { memo, useEffect, useRef } from 'react';
import type { Settings } from '../hooks/useSettings';
import type { Style } from '../hooks/useStyle';
import { Switch } from './Switch';
import { StylePanel } from './StylePanel';
import { CloseIcon } from './Icons';
import { APP_VERSION } from '../version';

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
export const SettingsSheet = memo(function SettingsSheet({
  open,
  settings,
  onToggle,
  onReset,
  style,
  onStyleChange,
  onStyleReset,
  onClose,
}: Props) {
  /**
   * Escape dismisses the sheet.
   *
   * It is a modal dialog — it says so with `aria-modal`, it has a scrim, and a
   * tap on that scrim closes it — and the one key every dialog answers did
   * nothing at all. The only ways out were the scrim, the cross in the header and
   * the Done button, so a keyboard user who opened it by accident had to tab
   * through the whole panel to find one of them.
   *
   * The listener only exists while the sheet is open, so a stray Escape on the
   * player itself still belongs to the browser.
   */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  /** Whatever had the focus when the sheet opened, so it can be handed back. */
  const opener = useRef<HTMLElement | null>(null);

  /**
   * The sheet takes the focus when it opens, and gives it back when it closes.
   *
   * It announces itself as a modal dialog and dims the player behind a scrim,
   * but the focus stayed exactly where it was — on the button in the top bar that
   * opened it, which is now behind that scrim. A keyboard user who opened the
   * sheet with Enter then had to tab all the way round the player, through every
   * control on the screen it covers, before reaching the sheet's own first
   * switch. Escape closed it and left the focus nowhere useful.
   *
   * The panel itself takes the focus rather than one of its controls, so the tab
   * order starts at the top of the dialog and nothing is skipped. On the way out,
   * the focus goes back to the button that opened it, which is where the next Tab
   * belongs.
   */
  useEffect(() => {
    if (!open) return undefined;
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement ? active : null;
    sheetRef.current?.focus();
    return () => {
      const back = opener.current;
      opener.current = null;
      if (back && document.contains(back)) back.focus();
    };
  }, [open]);

  return (
    <div className={`sheet-layer${open ? ' is-open' : ''}`} aria-hidden={!open}>
      <div className="sheet-layer__scrim" onClick={onClose} />
      <div
        className="sheet glass"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        ref={sheetRef}
      >
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

        <p className="sheet__version">
          Vinyl Player {APP_VERSION} · by Raju
        </p>
      </div>
    </div>
  );
});
