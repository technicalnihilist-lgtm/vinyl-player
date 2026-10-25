/**
 * Procedural album covers.
 *
 * The supplied files carry no embedded cover art, so rather than show a broken
 * image we derive a distinct, deterministic cover for every track from its
 * palette.
 *
 * This used to be an SVG data URI with two Gaussian blur filters inside it —
 * one at a 46px radius. On a library of a few hundred songs that meant a few
 * hundred blurred SVGs to rasterise before the list could settle, which is a
 * large part of why the app felt heavy on open. The same picture is now a plain
 * CSS gradient: no image, no data URI, no filter, nothing to decode.
 */
export function coverGradient(palette: [string, string, string], seed: number): string {
  const [a, b, c] = palette;
  const ax = 24 + ((seed * 7) % 44);
  const ay = 20 + ((seed * 11) % 36);
  const bx = 56 + ((seed * 13) % 36);
  const by = 60 + ((seed * 17) % 32);
  const ang = (seed * 37) % 360;
  return [
    `radial-gradient(circle at ${ax}% ${ay}%, ${a} 0%, ${a}00 76%)`,
    `radial-gradient(circle at ${bx}% ${by}%, ${b} 0%, ${b}00 72%)`,
    `radial-gradient(circle at 50% 46%, ${c} 0%, ${c}00 80%)`,
    `linear-gradient(${ang}deg, #2a1f52 0%, #100c22 62%, #05060c 100%)`,
  ].join(', ');
}
