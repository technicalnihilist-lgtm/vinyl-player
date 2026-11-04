import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Track } from '../types';
import { TrackRow } from './TrackRow';
import { useSheen } from '../hooks/useSheen';
import { FolderIcon, PlusIcon, RefreshIcon, SearchIcon } from './Icons';
import type { Tab } from './TabBar';
import { stepVisible } from '../utils/playlist';
import { filterTracks } from '../utils/filter';

interface Props {
  /** Which tab is showing. Owned by the app, drawn by the bottom tab bar. */
  filter?: Tab;
  onFilter?: (t: Tab) => void;
  tracks: Track[];
  currentIndex: number;
  isPlaying: boolean;
  liked: Record<string, boolean>;
  onSelect: (index: number) => void;
  onToggleLike: (id: string) => void;
  onImport: () => void;
  onImportFolder: () => void;
  onRefresh?: () => void;
  showRefresh: boolean;
  reducedMotion: boolean;
  showNumbers: boolean;
  compact: boolean;
}

type Filter = 'all' | 'liked';

/** A stable empty map, so the Library tab never depends on the liked list. */
const NO_LIKES: Record<string, boolean> = {};

export const Playlist = memo(function Playlist({
  filter: filterProp,
  tracks,
  currentIndex,
  isPlaying,
  liked,
  onSelect,
  onToggleLike,
  onImport,
  onImportFolder,
  onRefresh,
  showRefresh,
  reducedMotion,
  showNumbers,
  compact,
}: Props) {
  const listRef = useRef<HTMLUListElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const drag = useRef({ active: false, startY: 0, startTop: 0, moved: false });

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  // Owned by the app and drawn by the bottom tab bar, not by this header.
  const filter: Filter = filterProp ?? 'all';
  /** Geometry of the sliding highlight behind the active row. */
  const [lens, setLens] = useState<{ y: number; h: number } | null>(null);

  useSheen(listRef);

  // On the Library tab the liked map plays no part in the filter, so it must play
  // no part in the memo either: liking one song used to rebuild the whole visible
  // list — a map and a filter across the entire library, plus a fresh object for
  // every row — in order to show exactly the same rows.
  const likesForFilter = filter === 'liked' ? liked : NO_LIKES;

  // One pass, allocating only for the rows that survive — see utils/filter.ts.
  const visible = useMemo(
    () => filterTracks(tracks, query, filter, likesForFilter),
    [tracks, query, filter, likesForFilter],
  );

  /** The library indices of the rows on screen, in display order. */
  const visibleIndices = useMemo(() => visible.map((row) => row.index), [visible]);

  const rowFor = useCallback((id: string) => {
    const list = listRef.current;
    if (!list) return null;
    return list.querySelector<HTMLLIElement>(`[data-track-id="${id}"]`);
  }, []);

  // Keep the active row visible — when the *active row* changes, not when the
  // library does. `tracks` is a new array after every rescan and every import, and
  // depending on it scrolled the list back to the playing song while the listener
  // was reading somewhere else in it: pick a folder of files, and the list jumped.
  const activeId = tracks[currentIndex]?.id ?? null;
  useEffect(() => {
    if (!activeId) return;
    rowFor(activeId)?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [activeId, reducedMotion, rowFor]);

  // Slide the highlight to whichever row is playing.
  useLayoutEffect(() => {
    const active = tracks[currentIndex];
    if (!active) {
      setLens(null);
      return;
    }
    const el = rowFor(active.id);
    setLens(el ? { y: el.offsetTop, h: el.offsetHeight } : null);
  }, [currentIndex, tracks, visible, filter, query, rowFor]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleSelect = useCallback(
    (index: number) => {
      if (drag.current.moved) {
        drag.current.moved = false;
        return;
      }
      onSelect(index);
    },
    [onSelect],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== 'mouse') return;
    const list = listRef.current;
    if (!list) return;
    drag.current = { active: true, startY: e.clientY, startTop: list.scrollTop, moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLUListElement>) => {
    const list = listRef.current;
    if (!list || !drag.current.active) return;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dy) > 4) drag.current.moved = true;
    list.scrollTop = drag.current.startTop - dy;
  };
  const endDrag = () => {
    drag.current.active = false;
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    // Through the rows on screen, not through the library: with a tab or a
    // search filtering the list, stepping by one in the library moved the
    // selection to a song that was not showing.
    const next = stepVisible(visibleIndices, currentIndex, e.key === 'ArrowDown' ? 1 : -1);
    if (next !== null) onSelect(next);
  };

  return (
    <section className="playlist" aria-label="Playlist">
      <header className="playlist__head">
        <div className="playlist__titles">
          <h2 className="playlist__title">Playlist</h2>
          <p className="playlist__sub">
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
          </p>
        </div>

        <div className="playlist__tools">
          <button
            type="button"
            className={`glass-btn${searchOpen ? ' is-active' : ''}`}
            aria-expanded={searchOpen}
            aria-label="Search this playlist"
            title="Search"
            onClick={() =>
              setSearchOpen((v) => {
                const next = !v;
                if (!next) setQuery('');
                return next;
              })
            }
          >
            <SearchIcon size={17} />
          </button>
          <button type="button" className="glass-btn" aria-label="Add audio files" title="Add files" onClick={onImport}>
            <PlusIcon size={17} />
          </button>
          <button type="button" className="glass-btn" aria-label="Add a folder of audio files" title="Add a folder" onClick={onImportFolder}>
            <FolderIcon size={17} />
          </button>
          {showRefresh && onRefresh && (
            <button type="button" className="glass-btn" aria-label="Rescan device library" title="Rescan" onClick={onRefresh}>
              <RefreshIcon size={17} />
            </button>
          )}
        </div>
      </header>

      {searchOpen && (
        <div className="glass-field playlist__search">
          <SearchIcon size={16} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Search songs or artists…"
            aria-label="Search songs or artists"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      <ul
        className={`playlist__list${compact ? ' is-compact' : ''}`}
        ref={listRef}
        tabIndex={0}
        aria-label="Tracks"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {lens && (
          <span
            className={`playlist__lens${isPlaying ? ' is-playing' : ''}${reducedMotion ? ' is-static' : ''}`}
            style={{ transform: `translateY(${lens.y}px)`, height: `${lens.h}px` }}
            aria-hidden="true"
          />
        )}
        {visible.map(({ track, index }) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            isActive={index === currentIndex}
            isPlaying={isPlaying}
            isLiked={!!liked[track.id]}
            onSelect={handleSelect}
            onToggleLike={onToggleLike}
            showNumbers={showNumbers}
          />
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="playlist__empty">{filter === 'liked' ? 'No liked songs yet.' : 'No songs match your search.'}</p>
      )}
    </section>
  );
});
