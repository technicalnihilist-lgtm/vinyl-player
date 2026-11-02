/**
 * Moving the selection with the arrow keys.
 *
 * The list on screen is not the whole library: the Liked tab shows a subset, and
 * a search shows fewer still. Stepping by one through the *library* while a
 * filter is on therefore walked the highlight through rows nobody could see —
 * pressing the down arrow with three search results on screen selected a fourth
 * song that was not one of them, and the list scrolled to a row that was not
 * there.
 *
 * This steps through the rows that are actually visible, in display order. It
 * returns `null` at either end so the caller can leave the selection alone
 * rather than wrap around.
 */
export function stepVisible(
  visible: number[],
  currentIndex: number,
  dir: 1 | -1,
): number | null {
  if (visible.length === 0) return null;

  const at = visible.indexOf(currentIndex);
  if (at >= 0) {
    const next = at + dir;
    if (next < 0 || next >= visible.length) return null;
    return visible[next];
  }

  // The playing track is not on screen (filtered out, or searched away): land on
  // the first row past it in the direction of travel, so the first press always
  // does something visible.
  if (dir === 1) {
    for (const index of visible) if (index > currentIndex) return index;
    return null;
  }
  for (let i = visible.length - 1; i >= 0; i--) {
    if (visible[i] < currentIndex) return visible[i];
  }
  return null;
}
