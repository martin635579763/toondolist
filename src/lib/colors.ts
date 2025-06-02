export const cartoonColors: string[] = [
  '#D9000D', // Lego Bright Red
  '#FFD400', // Lego Bright Yellow
  '#0057A8', // Lego Bright Blue
  '#009624', // Lego Dark Green
  '#FF7F00', // Lego Bright Orange
  '#A0D2DB', // Lego Light Blue
  '#95B90B', // Lego Lime
  '#DF1A87', // Lego Bright Purple (Magenta-ish)
  '#FECBCB', // Lego Light Pink
  '#BBE90B', // Lego Bright Green
  '#00A29F', // Lego Teal
  '#C3900B', // Lego Dark Orange (Earth Orange)
];

export function getRandomColor(): string {
  return cartoonColors[Math.floor(Math.random() * cartoonColors.length)];
}
