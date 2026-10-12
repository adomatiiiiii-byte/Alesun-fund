export function formatBreakdownLabel(value) {
  if (!value) {
    return "Not provided";
  }

  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}
