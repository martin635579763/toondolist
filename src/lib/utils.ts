import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function getContrastingTextColor(hexBgColor: string): string {
  const rgb = hexToRgb(hexBgColor);
  if (!rgb) return '#000000'; // Default to black if color is invalid

  // Calculate luminance (per WCAG)
  // https://www.w3.org/TR/WCAG20/#relativeluminancedef
  const { r, g, b } = rgb;
  const sRGB_r = r / 255;
  const sRGB_g = g / 255;
  const sRGB_b = b / 255;

  const R = sRGB_r <= 0.03928 ? sRGB_r / 12.92 : Math.pow((sRGB_r + 0.055) / 1.055, 2.4);
  const G = sRGB_g <= 0.03928 ? sRGB_g / 12.92 : Math.pow((sRGB_g + 0.055) / 1.055, 2.4);
  const B = sRGB_b <= 0.03928 ? sRGB_b / 12.92 : Math.pow((sRGB_b + 0.055) / 1.055, 2.4);
  
  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;

  // Compare luminance against a threshold (0.5 is common)
  // If background is light, use dark text. If dark, use light text.
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
