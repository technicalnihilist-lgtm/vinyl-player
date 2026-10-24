import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from './hooks/usePlayer';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useSettings } from './hooks/useSettings';
import { useStyle, styleVars } from './hooks/useStyle';
import { useSheen } from './hooks/useSheen';
import { AmbientBackground } from './components/AmbientBackground';
import { Vinyl } from './components/Vinyl';
import { Visualizer } from './components/Visualizer';
import { Playlist } from './components/Playlist';
import { EmptyState } from './components/EmptyState';
import { Timeline } from './components/Timeline';
import { TransportControls } from './components/TransportControls';
import { VolumeControl } from './components/VolumeControl';
import { SettingsSheet } from './components/SettingsSheet';
import { Splash } from './components/Splash';
import { ChevronDownIcon, ExpandIcon, HeartIcon, PaletteIcon, SettingsIcon } from './components/Icons';
import { publishNowPlaying, onMediaAction } from './services/nowPlaying';

export default function App() {
  const { state, engine, currentTrack, actions, library } = usePlayer();
  const reducedMotion = useReducedMotion();
  const { settings, toggle: toggleSetting, reset: resetSettings } = useSettings();
  const { style, update: updateStyle, reset: resetStyle } = useStyle();
  // Opening the sheet from the palette button should land on the Style section,
  // not leave the user scrolling past six switches to find it.
  const [focusStyle, setFocusStyle] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const folderRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useSheen(panelRef);

  const openImporter = useCallback(() => fileRef.current?.click(), []);
  const openFolderImporter = useCallback(() => folderRef.current?.click(), []);

  const handleFiles = async (files: FileList | null, source: 'files' | 'folder' = 'files') => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 500);
    const added = await actions.importFiles(list);
    const where = source === 'folder' ? ' from that folder' : '';
    setNotice(
      added ? `Added ${added} track${added > 1 ? 's' : ''}${where}.` : 'No supported audio files were found.',
    );
    window.setTimeout(() => setNotice(null), 5000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else {
      void document.exitFullscreen?.().catch(() => undefined);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        actions.toggle();
      } else if (e.shiftKey && e.key === 'ArrowRight') {
        actions.next();
      } else if (e.shiftKey && e.key === 'ArrowLeft') {
        actions.prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  // Start the first song by itself, once, if the listener asked for that.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !settings.autoplay || state.tracks.length === 0) return;
    autoStarted.current = true;
    actions.selectTrack(0);
  }, [settings.autoplay, state.tracks.length, actions]);

  const liked = currentTrack ? !!state.liked[currentTrack.id] : false;
  // Every colour and measurement in the player comes from the user's Style,
  // applied once here as custom properties — changing one re-themes the whole
  // UI without re-rendering the tree.
  const vars = useMemo(() => styleVars(style, currentTrack?.palette[1]), [style, currentTrack?.palette]);

  // Keep the system's now-playing card in step with the player. Only track
  // changes and play/pause are pushed: the media card extrapolates the position
  // itself, so there is nothing to gain from a call every second.
  useEffect(() => {
    publishNowPlaying({
      title: currentTrack?.title ?? '',
      artist: currentTrack?.artist ?? '',
      album: currentTrack?.album ?? '',
      playing: state.isPlaying,
      position: Math.round(state.currentTime * 1000),
      duration: Math.round(state.duration * 1000),
    });
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.album,
      state.isPlaying, state.currentTime, state.duration]);

  // The buttons on the media card drive the real player.
  useEffect(
    () =>
      onMediaAction((action) => {
        if (action === 'play') actions.play();
        else if (action === 'pause') actions.pause();
        else if (action === 'next') actions.next();
        else if (action === 'previous') actions.prev();
      }),
    [actions],
  );

  // Bring the Style section into view once the sheet has finished sliding up.
  useEffect(() => {
    if (!settingsOpen || !focusStyle) return undefined;
    const t = window.setTimeout(() => {
      document.querySelector('.sheet .style')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 360);
    return () => window.clearTimeout(t);
  }, [settingsOpen, focusStyle]);

  return (
    <div
      className={`app${panelOpen ? '' : ' app--collapsed'}${reducedMotion || !settings.glass ? ' app--calm' : ''}`}
      style={vars}
    >
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}

      <AmbientBackground />

      <header className="topbar">
        <button
          type="button"
          className="glass-pill"
          aria-label={panelOpen ? 'Collapse playlist' : 'Expand playlist'}
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((v) => !v)}
        >
          <ChevronDownIcon size={18} className={panelOpen ? '' : 'is-flipped'} />
        </button>

        {/* Keys are prefixed so no two siblings ever share a key — duplicate keys
            among siblings make React's reconciliation drop elements. */}
        <div className="topbar__now" key={`top-${currentTrack?.id ?? 'none'}`}>
          <span className="topbar__title">{currentTrack?.title ?? 'Your music'}</span>
          <span className="topbar__artist">{currentTrack?.artist ?? 'Offline player'}</span>
        </div>

        <button
          type="button"
          className="glass-pill"
          aria-label="Style"
          aria-expanded={settingsOpen}
          onClick={() => {
            setFocusStyle(true);
            setSettingsOpen(true);
          }}
        >
          <PaletteIcon size={18} />
        </button>

        <button
          type="button"
          className="glass-pill"
          aria-label="Settings"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen(true)}
        >
          <SettingsIcon size={18} />
        </button>

        <button type="button" className="glass-pill" aria-label="Toggle fullscreen" onClick={toggleFullscreen}>
          <ExpandIcon size={18} />
        </button>
      </header>

      <main className="stage">
        <section className="stage__left" aria-label="Now playing">
          {currentTrack && (
            <div className="vinyl-slot" key={`vinyl-${currentTrack.id}`}>
              <Vinyl
                track={currentTrack}
                isPlaying={state.isPlaying}
                reducedMotion={reducedMotion}
                spin={settings.spin}
              />
            </div>
          )}

          <div className="stage__now" key={`now-${currentTrack?.id ?? 'none'}`}>
            <h1 className="now__title">{currentTrack?.title ?? 'Your music'}</h1>
            <p className="now__artist">
              {currentTrack
                ? [currentTrack.artist, currentTrack.album].filter(Boolean).join(' · ')
                : library.available
                  ? 'Play the songs on this device'
                  : 'Add your music to get started'}
            </p>
          </div>

          {settings.visualiser && (
            <Visualizer engine={engine} isPlaying={state.isPlaying} reducedMotion={reducedMotion} />
          )}
        </section>

        <aside className="panel glass" aria-label="Playlist and controls" aria-hidden={!panelOpen} ref={panelRef}>
          {state.tracks.length === 0 ? (
            <EmptyState
              hasDeviceLibrary={library.available}
              permission={library.permission}
              scanning={library.scanning}
              onRequestAccess={actions.requestLibraryAccess}
              onOpenSettings={actions.openSystemSettings}
              onRefresh={actions.refreshLibrary}
              onImportFiles={openImporter}
              onImportFolder={openFolderImporter}
            />
          ) : (
            <Playlist
              tracks={state.tracks}
              currentIndex={state.currentIndex}
              isPlaying={state.isPlaying}
              liked={state.liked}
              onSelect={actions.selectTrack}
              onToggleLike={actions.toggleLike}
              onImport={openImporter}
              onImportFolder={openFolderImporter}
              onRefresh={actions.refreshLibrary}
              showRefresh={library.available}
              reducedMotion={reducedMotion}
              showNumbers={settings.numbers}
              compact={settings.compact}
            />
          )}

          <div className="panel__foot">
            <Timeline current={state.currentTime} duration={state.duration} onSeek={actions.seek} />

            <div className="transport-row">
              <button
                type="button"
                className={`glass-btn${liked ? ' is-liked' : ''}`}
                aria-pressed={liked}
                aria-label="Like current track"
                onClick={() => currentTrack && actions.toggleLike(currentTrack.id)}
              >
                <HeartIcon size={18} filled={liked} />
              </button>

              <TransportControls state={state} actions={actions} />

              <VolumeControl
                volume={state.volume}
                muted={state.muted}
                onVolume={actions.setVolume}
                onToggleMute={actions.toggleMute}
              />
            </div>

            {state.error && (
              <p className="panel__error" role="alert">
                {state.error}
              </p>
            )}
            {notice && (
              <p className="panel__note" role="status">
                {notice}
              </p>
            )}
          </div>
        </aside>
      </main>

      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        onToggle={toggleSetting}
        onReset={resetSettings}
        style={style}
        onStyleChange={updateStyle}
        onStyleReset={resetStyle}
        onClose={() => {
          setSettingsOpen(false);
          setFocusStyle(false);
        }}
      />

      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus"
        multiple
        hidden
        onChange={(e) => {
          void handleFiles(e.target.files, 'files');
          e.target.value = '';
        }}
      />
      <input
        ref={folderRef}
        type="file"
        multiple
        hidden
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        onChange={(e) => {
          void handleFiles(e.target.files, 'folder');
          e.target.value = '';
        }}
      />
    </div>
  );
}
