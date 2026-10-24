/**
 * The drifting colour field the glass sits on.
 *
 * Performance: the blur is baked into each blob's own compositor layer and the
 * animation only moves `transform`, so the whole thing runs on the compositor —
 * no repaint, no style recalc, nothing on the main thread. There is deliberately
 * no `mix-blend-mode` and no blur filter on this container: both would force the
 * entire subtree to be re-composited every frame.
 */
export function AmbientBackground() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient__blob ambient__blob--1" />
      <span className="ambient__blob ambient__blob--2" />
      <span className="ambient__blob ambient__blob--3" />
    </div>
  );
}
