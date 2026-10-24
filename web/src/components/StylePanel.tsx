import { ACCENTS, DISCS, MOODS, DEFAULT_STYLE } from '../hooks/useStyle';
import type { DiscId, MoodId, Style } from '../hooks/useStyle';
import { Switch } from './Switch';

interface Props {
  style: Style;
  onChange: <K extends keyof Style>(key: K, value: Style[K]) => void;
  onReset: () => void;
}

const MOOD_IDS = Object.keys(MOODS) as MoodId[];
const DISC_IDS = Object.keys(DISCS) as DiscId[];

/** The style sheet: everything about the look, adjustable. */
export function StylePanel({ style, onChange, onReset }: Props) {
  const dirty =
    style.accent !== DEFAULT_STYLE.accent ||
    style.mood !== DEFAULT_STYLE.mood ||
    style.glass !== DEFAULT_STYLE.glass ||
    style.roundness !== DEFAULT_STYLE.roundness ||
    style.disc !== DEFAULT_STYLE.disc ||
    style.accentFromArt !== DEFAULT_STYLE.accentFromArt;

  return (
    <section className="style" aria-label="Style">
      <div className="style__head">
        <h3 className="style__title">Style</h3>
        <button
          type="button"
          className="style__reset"
          onClick={onReset}
          disabled={!dirty}
          aria-label="Reset the style to its defaults"
        >
          Reset
        </button>
      </div>
      <p className="style__lede">Make the player look how you want it to.</p>

      {/* ------------------------------------------------------------ accent */}
      <div className="style__group">
        <span className="style__label">Accent</span>
        <div className="swatches" role="radiogroup" aria-label="Accent colour">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={!style.accentFromArt && style.accent.toLowerCase() === a.value}
              aria-label={a.label}
              title={a.label}
              className={`swatch${!style.accentFromArt && style.accent.toLowerCase() === a.value ? ' is-on' : ''}`}
              style={{ ['--sw' as string]: a.value }}
              onClick={() => {
                onChange('accentFromArt', false);
                onChange('accent', a.value);
              }}
            />
          ))}
          <label className="swatch swatch--custom" title="Pick any colour">
            <input
              type="color"
              value={style.accent}
              aria-label="Custom accent colour"
              onChange={(e) => {
                onChange('accentFromArt', false);
                onChange('accent', e.target.value);
              }}
            />
            <span aria-hidden="true">+</span>
          </label>
        </div>
        <div className="style__switch">
          <Switch
            id="style-accent-art"
            label="Take the accent from the cover art"
            hint="Otherwise it uses the colour you pick above"
            checked={style.accentFromArt}
            onChange={() => onChange('accentFromArt', !style.accentFromArt)}
          />
        </div>
      </div>

      {/* ------------------------------------------------------- background */}
      <div className="style__group">
        <span className="style__label">Background</span>
        <div className="moods" role="radiogroup" aria-label="Background mood">
          {MOOD_IDS.map((id) => {
            const m = MOODS[id];
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={style.mood === id}
                className={`mood${style.mood === id ? ' is-on' : ''}`}
                onClick={() => onChange('mood', id)}
              >
                <span className="mood__dots" aria-hidden="true">
                  {m.swatch.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                <span className="mood__name">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------ glass */}
      <div className="style__group">
        <label className="style__label" htmlFor="style-glass">
          Glass <span className="style__value">{style.glass}%</span>
        </label>
        <input
          id="style-glass"
          className="slider"
          type="range"
          min={0}
          max={100}
          step={2}
          value={style.glass}
          onChange={(e) => onChange('glass', Number(e.target.value))}
        />
        <p className="style__hint">How much frost the panels carry. Lower is flatter and cheaper to draw.</p>
      </div>

      {/* -------------------------------------------------------- roundness */}
      <div className="style__group">
        <label className="style__label" htmlFor="style-roundness">
          Corners <span className="style__value">{style.roundness}px</span>
        </label>
        <input
          id="style-roundness"
          className="slider"
          type="range"
          min={8}
          max={34}
          step={1}
          value={style.roundness}
          onChange={(e) => onChange('roundness', Number(e.target.value))}
        />
        <p className="style__hint">From softly squared off to fully rounded.</p>
      </div>

      {/* ----------------------------------------------------------- record */}
      <div className="style__group">
        <span className="style__label">Record</span>
        <div className="swatches" role="radiogroup" aria-label="Record colour">
          {DISC_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={style.disc === id}
              aria-label={DISCS[id].label}
              title={DISCS[id].label}
              className={`swatch${style.disc === id ? ' is-on' : ''}`}
              style={{ ['--sw' as string]: DISCS[id].swatch }}
              onClick={() => onChange('disc', id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
