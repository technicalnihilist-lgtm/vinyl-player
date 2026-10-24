import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 20): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const PlayIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const PauseIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const PrevIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M7 6v12" />
    <path d="M18 6.5v11L9.5 12 18 6.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const NextIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M17 6v12" />
    <path d="M6 6.5v11L14.5 12 6 6.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const ShuffleIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M16 4h4v4" />
    <path d="M20 4l-6.5 6.5" />
    <path d="M4 20l6.5-6.5" />
    <path d="M16 20h4v-4" />
    <path d="M20 20l-4.5-4.5" />
    <path d="M4 4l4 4" />
  </svg>
);

export const RepeatIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 12V9a3 3 0 0 1 3-3h10" />
    <path d="M14 3l3 3-3 3" />
    <path d="M20 12v3a3 3 0 0 1-3 3H7" />
    <path d="M10 21l-3-3 3-3" />
  </svg>
);

export const RepeatOneIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 12V9a3 3 0 0 1 3-3h10" />
    <path d="M14 3l3 3-3 3" />
    <path d="M20 12v3a3 3 0 0 1-3 3H7" />
    <path d="M10 21l-3-3 3-3" />
    <path d="M11.6 10.4l1.2-.7v4.6" strokeWidth="1.6" />
  </svg>
);

export const HeartIcon = ({ size, filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size)} {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.35-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5C19 15.65 12 20 12 20z" />
  </svg>
);

export const VolumeIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" fill="currentColor" stroke="none" />
    <path d="M15 9a4.5 4.5 0 0 1 0 6" />
    <path d="M17.5 6.5a8 8 0 0 1 0 11" />
  </svg>
);

export const MuteIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" fill="currentColor" stroke="none" />
    <path d="M16 9.5l4 5" />
    <path d="M20 9.5l-4 5" />
  </svg>
);

export const SearchIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);

export const ChevronDownIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6 10l6 6 6-6" />
  </svg>
);

export const ExpandIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9" />
    <path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9" />
    <path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" />
    <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </svg>
);

export const PlusIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const FolderIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 7.1A1.9 1.9 0 0 1 4.9 5.2h3.6l1.9 2.1h8.7A1.9 1.9 0 0 1 21 9.2v8.2a1.9 1.9 0 0 1-1.9 1.9H4.9A1.9 1.9 0 0 1 3 17.4z" />
  </svg>
);

export const RefreshIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 11.5A8 8 0 0 1 6.3 17.4" />
    <path d="M4 12.5A8 8 0 0 1 17.7 6.6" />
    <path d="M17.4 3.2v3.6h-3.6" />
    <path d="M6.6 20.8v-3.6h3.6" />
  </svg>
);

/** Small "now playing" equaliser used on the active playlist row. */
export const EqualizerIcon = ({ size = 16, ...p }: P) => (
  <svg {...base(size)} {...p} strokeWidth={0}>
    <rect className="eq-bar" x="3" y="8" width="2.6" height="8" rx="1.2" fill="currentColor" />
    <rect className="eq-bar" x="7.6" y="4" width="2.6" height="16" rx="1.2" fill="currentColor" />
    <rect className="eq-bar" x="12.2" y="9" width="2.6" height="6" rx="1.2" fill="currentColor" />
    <rect className="eq-bar" x="16.8" y="6" width="2.6" height="12" rx="1.2" fill="currentColor" />
  </svg>
);

export const SettingsIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M12 3.2v2.3M12 18.5v2.3M20.8 12h-2.3M5.5 12H3.2M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6M18.2 18.2l-1.6-1.6M7.4 7.4L5.8 5.8" />
  </svg>
);

export const CloseIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);

export const MusicNoteIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M9 18V5.5l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="15.5" r="2.5" />
  </svg>
);

export const PaletteIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3.2a8.8 8.8 0 0 0 0 17.6c1.2 0 1.9-.8 1.9-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h1.1a4.4 4.4 0 0 0 4.4-4.4c0-4-3.7-7.4-8.1-7.4z" />
    <circle cx="8.2" cy="10.4" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="11.6" cy="7.7" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="15.6" cy="9.2" r="1.15" fill="currentColor" stroke="none" />
  </svg>
);

export const MoreIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="5.4" r="1.7" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
    <circle cx="12" cy="18.6" r="1.7" fill="currentColor" stroke="none" />
  </svg>
);
