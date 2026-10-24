/**
 * Procedural album artwork.
 *
 * The supplied MP3s carry no embedded cover art, so instead of showing a broken
 * image we synthesise a distinct, deterministic abstract cover for every track
 * from its palette. The result is a self-contained SVG data URI that can be
 * used both as an <img> source and as a CSS background, and it never 404s.
 */
export function makeArtwork(palette: [string, string, string], seed: number): string {
  const [a, b, c] = palette;
  const id = `art${seed}`;
  const rot = (seed * 37) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>
  <defs>
    <radialGradient id='${id}bg' cx='50%' cy='42%' r='78%'>
      <stop offset='0%' stop-color='#241640'/>
      <stop offset='55%' stop-color='#0d0a1c'/>
      <stop offset='100%' stop-color='#05060c'/>
    </radialGradient>
    <filter id='${id}blur' x='-40%' y='-40%' width='180%' height='180%'>
      <feGaussianBlur stdDeviation='46'/>
    </filter>
    <filter id='${id}soft' x='-20%' y='-20%' width='140%' height='140%'>
      <feGaussianBlur stdDeviation='2.5'/>
    </filter>
  </defs>
  <rect width='512' height='512' fill='url(#${id}bg)'/>
  <g transform='rotate(${rot} 256 256)' filter='url(#${id}blur)'>
    <ellipse cx='186' cy='188' rx='150' ry='142' fill='${a}' opacity='0.92'/>
    <ellipse cx='344' cy='214' rx='138' ry='150' fill='${b}' opacity='0.86'/>
    <ellipse cx='252' cy='366' rx='172' ry='120' fill='${c}' opacity='0.82'/>
  </g>
  <g fill='none' stroke='#ffffff' opacity='0.5' filter='url(#${id}soft)'>
    <circle cx='256' cy='256' r='158' stroke-width='1.4'/>
    <circle cx='256' cy='256' r='116' stroke-width='1.1' opacity='0.8'/>
    <circle cx='256' cy='256' r='74' stroke-width='0.9' opacity='0.6'/>
  </g>
  <circle cx='256' cy='256' r='9' fill='#05060c' opacity='0.85'/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
