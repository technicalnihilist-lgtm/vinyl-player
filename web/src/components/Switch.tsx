interface Props {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

/**
 * A setting row whose control is a sliding switch.
 *
 * The whole row is the switch (role="switch", aria-checked), so it is one
 * target for a thumb and one node for a screen reader — and the knob slides
 * with a spring rather than jumping.
 */
export function Switch({ id, label, hint, checked, onChange }: Props) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`setting${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="setting__text">
        <span className="setting__label">{label}</span>
        {hint && <span className="setting__hint">{hint}</span>}
      </span>
      <span className="switch" aria-hidden="true">
        <span className="switch__knob" />
      </span>
    </button>
  );
}
