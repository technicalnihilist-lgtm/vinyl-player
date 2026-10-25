import { PaletteIcon, SettingsIcon, ExpandIcon } from './Icons';

interface Props {
  onStyle: () => void;
  onSettings: () => void;
  onFullscreen: () => void;
}

/**
 * The app's options, in one floating glass bar and nowhere else.
 *
 * Modelled on the segmented control in the Liquid Glass prototype the design
 * came from: a translucent capsule holding its own items, with the rim and the
 * lift on the capsule rather than on each button. That is fewer surfaces to draw
 * than three separate glass pills, so it is lighter as well as tidier.
 */
export function OptionBar({ onStyle, onSettings, onFullscreen }: Props) {
  return (
    <div className="optionbar" role="toolbar" aria-label="Options">
      <button type="button" className="optionbar__item" aria-label="Style" title="Style" onClick={onStyle}>
        <PaletteIcon size={17} />
      </button>
      <button type="button" className="optionbar__item" aria-label="Settings" title="Settings" onClick={onSettings}>
        <SettingsIcon size={17} />
      </button>
      <button type="button" className="optionbar__item" aria-label="Fullscreen" title="Fullscreen" onClick={onFullscreen}>
        <ExpandIcon size={17} />
      </button>
    </div>
  );
}
