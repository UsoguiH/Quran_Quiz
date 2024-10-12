// Function to remove Arabic diacritical marks
export function removeDiacritics(text: string): string {
  return text.replace(/[\u064B-\u0652]/g, '');
}