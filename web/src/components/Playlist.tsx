import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Track } from '../types';
import { TrackRow } from './TrackRow';
import { useSheen } from '../hooks/useSheen';
import { FolderIcon, PlusIcon, RefreshIcon, SearchIcon } from './Icons';

interface Props {
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

export const Playlist = memo(function Playlist({
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
  const [filter, setFilter] = useState<Filter>('all');
  /** Geometry of the sliding highlight behind the active row. */
  const [lens, setLens] = useState<{ y: number; h: number } | null>(null);

  useSheen(listRef);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks
      .map((track, index) => ({ track, index }))
      .filter(
        ({ track }) =>
          (filter === 'all' || liked[track.id]) &&
          (!q || track.title.toLowerCase().includes(q) || track.artist.toLowerCase().includes(q)),
      );
  }, [tracks, query, filter, liked]);

  const rowFor = useCallback((id: string) => {
    const list = listRef.current;
    if (!list) return null;
    return list.querySelector<HTMLLIElement>(`[data-track-id="${id}"]`);
  }, []);

  // Keep the active row visible.
  useEffect(() => {
    const active = tracks[currentIndex];
    if (!active) return;
    rowFor(active.id)?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [currentIndex, tracks, reducedMotion, rowFor]);

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
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onSelect(Math.min(tracks.length - 1, currentIndex + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onSelect(Math.max(0, currentIndex - 1));
    }
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

        <div className="segmented" role="tablist" aria-label="Filter">
          <span className={`segmented__pill${filter === 'liked' ? ' is-right' : ''}`} aria-hidden="true" />
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={`segmented__item${filter === 'all' ? ' is-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'liked'}
            className={`segmented__item${filter === 'liked' ? ' is-active' : ''}`}
            onClick={() => setFilter('liked')}
          >
            Liked
          </button>
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
