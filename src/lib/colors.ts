export const cartoonColors: string[] = [
  '#FFADAD', // Light Pink
  '#FFD6A5', // Light Orange
  '#FDFFB6', // Pale Yellow
  '#CAFFBF', // Light Green
  '#9BF6FF', // Light Blue
  '#A0C4FF', // Cornflower Blue
  '#BDB2FF', // Light Purple
  '#FFC6FF', // Light Magenta
  '#FFB7C3', // Pastel Pink
  '#FFFFE0', // Light Yellow
  '#E0FFFF', // Pale Cyan
  '#FFE5B4', // Peach
];

export function getRandomColor(): string {
  return cartoonColors[Math.floor(Math.random() * cartoonColors.length)];
}
