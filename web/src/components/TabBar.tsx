import { MusicNoteIcon, HeartIcon } from './Icons';

export type Tab = 'all' | 'liked';

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
}

/**
 * The app's tab bar, floating over the bottom of the screen.
 *
 * This is the piece the design is modelled on: a translucent capsule that sits
 * above the content rather than in a strip of its own, with the active segment
 * picked out by a lighter inner capsule. It is one glass surface holding plain
 * buttons, which is both what the reference does and the cheapest way to build
 * it — three separate glass pills would be three surfaces to draw.
 */
export function TabBar({ tab, onChange }: Props) {
  return (
    <nav className="tabbar" aria-label="Library">
      <span className={`tabbar__pill${tab === 'liked' ? ' is-right' : ''}`} aria-hidden="true" />
      <button
        type="button"
        className={`tabbar__item${tab === 'all' ? ' is-active' : ''}`}
        aria-current={tab === 'all' ? 'page' : undefined}
        onClick={() => onChange('all')}
      >
        <MusicNoteIcon size={18} />
        <span>Library</span>
      </button>
      <button
        type="button"
        className={`tabbar__item${tab === 'liked' ? ' is-active' : ''}`}
        aria-current={tab === 'liked' ? 'page' : undefined}
        onClick={() => onChange('liked')}
      >
        <HeartIcon size={18} filled={tab === 'liked'} />
        <span>Liked</span>
      </button>
    </nav>
  );
}
