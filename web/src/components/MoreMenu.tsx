import { useEffect, useRef, useState } from 'react';
import { MoreIcon, PaletteIcon, SettingsIcon, ExpandIcon } from './Icons';

interface Props {
  onStyle: () => void;
  onSettings: () => void;
  onFullscreen: () => void;
}

/**
 * The topbar's overflow menu.
 *
 * Style, settings and fullscreen used to sit side by side as three separate
 * buttons, which left the topbar with no room to spare on a narrow phone — the
 * title had already been squeezed down to an ellipsis. They live here now, one
 * tap away, and the row has its space back.
 */
export function MoreMenu({ onStyle, onSettings, onFullscreen }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Close on Escape, and on a tap anywhere outside.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open]);

  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="more" ref={wrap}>
      <button
        type="button"
        className="glass-pill"
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreIcon size={18} />
      </button>

      {open && (
        <div className="more__menu" role="menu" aria-label="More options">
          <button type="button" className="more__item" role="menuitem" onClick={pick(onStyle)}>
            <PaletteIcon size={17} />
            Style
          </button>
          <button type="button" className="more__item" role="menuitem" onClick={pick(onSettings)}>
            <SettingsIcon size={17} />
            Settings
          </button>
          <button type="button" className="more__item" role="menuitem" onClick={pick(onFullscreen)}>
            <ExpandIcon size={17} />
            Fullscreen
          </button>
        </div>
      )}
    </div>
  );
}
