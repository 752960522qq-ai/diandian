// Alternate RE4 infinite-launcher raise clips remain installed for authoring
// and compatibility, but duplicate the three raise categories in the picker.
const authoringOnlyMotions = new Set([
  'RocketRaiseInfiniteLevel', 'RocketRaiseInfiniteUp', 'RocketRaiseInfiniteDown'
]);

export function selectableMotions(...groups) {
  const seen = new Set();
  return groups.flat().filter(motion => {
    if (authoringOnlyMotions.has(motion.name) || seen.has(motion.name)) return false;
    seen.add(motion.name);
    return true;
  });
}
