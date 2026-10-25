import { MusicNoteIcon, HeartIcon } from './Icons';
import { ACCENTS } from '../hooks/useStyle';

export type Tab = 'all' | 'liked';

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
  /** The current accent, and a way to set it from the bar. */
  accent: string;
  onAccent: (hex: string) => void;
}

/** Four swatches, the ones most people reach for; the rest are in Style. */
const BAR_ACCENTS = ACCENTS.slice(0, 4);

/**
 * The bar along the bottom: the library tabs, and the accent swatches.
 *
 * The swatches are the one thing carried over from the reference film, whose
 * only real interface is an iPad's floating glass toolbar — a segmented control,
 * pen tools and a row of colour dots. This is the same idea for a music player:
 * the colour the app leans on, one tap away, sitting in the glass bar rather
 * than buried in a settings sheet.
 */
export function TabBar({ tab, onChange, accent, onAccent }: Props) {
  return (
    <nav className="tabbar" aria-label="Library">
      <span className={`tabbar__pill${tab === 'liked' ? ' is-right' : ''}`} aria-hidden="true" />

      <button
        type="button"
        className={`tabbar__item${tab === 'all' ? ' is-active' : ''}`}
        aria-current={tab === 'all' ? 'page' : undefined}
        onClick={() => onChange('all')}
      >
        <MusicNoteIcon size={17} />
        <span>Library</span>
      </button>
      <button
        type="button"
        className={`tabbar__item${tab === 'liked' ? ' is-active' : ''}`}
        aria-current={tab === 'liked' ? 'page' : undefined}
        onClick={() => onChange('liked')}
      >
        <HeartIcon size={17} filled={tab === 'liked'} />
        <span>Liked</span>
      </button>

      <span className="tabbar__rule" aria-hidden="true" />

      <div className="tabbar__swatches" role="group" aria-label="Accent colour">
        {BAR_ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`tabbar__swatch${accent.toLowerCase() === a.value.toLowerCase() ? ' is-active' : ''}`}
            style={{ background: a.value }}
            aria-label={a.label}
            aria-pressed={accent.toLowerCase() === a.value.toLowerCase()}
            title={a.label}
            onClick={() => onAccent(a.value)}
          />
        ))}
      </div>
    </nav>
  );
}
