import { FolderIcon, MusicNoteIcon, PlusIcon } from './Icons';

interface Props {
  hasDeviceLibrary: boolean;
  permission: 'granted' | 'denied' | 'unknown';
  scanning: boolean;
  onRequestAccess: () => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  onImportFiles: () => void;
  onImportFolder: () => void;
}

/**
 * Shown when the playlist is empty. On Android that usually means the app has
 * not been given access to the device's music yet, so the first thing offered
 * is the permission prompt rather than a dead end.
 */
export function EmptyState({
  hasDeviceLibrary,
  permission,
  scanning,
  onRequestAccess,
  onOpenSettings,
  onRefresh,
  onImportFiles,
  onImportFolder,
}: Props) {
  const needsPermission = hasDeviceLibrary && permission !== 'granted';

  return (
    <section className="empty" aria-label="Your library is empty">
      <div className={`empty__badge${scanning ? ' is-scanning' : ''}`} aria-hidden="true">
        <MusicNoteIcon size={24} />
      </div>

      {scanning ? (
        <>
          <h2 className="empty__title">Scanning your music…</h2>
          <p className="empty__body">Looking through the songs stored on this device.</p>
        </>
      ) : needsPermission ? (
        <>
          <h2 className="empty__title">Find your music</h2>
          <p className="empty__body">
            This player works entirely offline and plays the songs already on your device. Allow access to your music
            library to fill the playlist.
          </p>
          <div className="empty__actions">
            <button type="button" className="glass-btn glass-btn--primary" onClick={onRequestAccess}>
              Allow access to my music
            </button>
            {permission === 'denied' && (
              <button type="button" className="glass-btn" onClick={onOpenSettings}>
                Open app settings
              </button>
            )}
          </div>
        </>
      ) : hasDeviceLibrary ? (
        <>
          <h2 className="empty__title">No music found</h2>
          <p className="empty__body">No audio files were found on this device. Add some music, then scan again.</p>
          <div className="empty__actions">
            <button type="button" className="glass-btn glass-btn--primary" onClick={onRefresh}>
              Scan again
            </button>
            <button type="button" className="glass-btn" onClick={onImportFiles}>
              <PlusIcon size={16} /> Add files
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="empty__title">Your library is empty</h2>
          <p className="empty__body">Add music from this device to build your playlist.</p>
          <div className="empty__actions">
            <button type="button" className="glass-btn glass-btn--primary" onClick={onImportFolder}>
              <FolderIcon size={16} /> Add a folder
            </button>
            <button type="button" className="glass-btn" onClick={onImportFiles}>
              <PlusIcon size={16} /> Add files
            </button>
          </div>
        </>
      )}
    </section>
  );
}
