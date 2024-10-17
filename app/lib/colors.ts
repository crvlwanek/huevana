export const DEFAULT_COLOR = "#98FB98";

/** Determines if the given string is a valid hex or RGB color */
export const isValidHexOrRGB = (color: string): boolean => {
  color = color.trim().toLowerCase();
  const isProbablyHex = color.startsWith("#");
  if (isProbablyHex) return isValidHex(color);

  const isProbablyRGB = color.startsWith("r");
  if (isProbablyRGB) return isValidRGB(color);

  // No other formats supported, yet...
  return false;
};

/** Determines if the given string is a valid hex color */
export const isValidHex = (color: string): boolean => {
  // https://regex101.com/ - If this ever stops working...
  const regex = new RegExp(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
  return regex.test(color); // Trust the regex magic
};

/** Determines if the given string is a valid RGB color */
export const isValidRGB = (color: string): boolean => {
  // https://regex101.com/ - If this ever stops working...
  const regex = new RegExp(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/);
  const matches = color.match(regex);
  if (matches?.length !== 4) return false;
  const [_, r, g, b] = matches;
  return +r < 256 && +g < 256 && +b < 256;
};

export const tryParseRGBColor = (color: string): string | undefined => {
  // https://regex101.com/ - If this ever stops working...
  const regex = new RegExp(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/);
  const matches = color.match(regex);
  if (matches?.length !== 4) return undefined;

  const [_, r, g, b] = matches;
  if (+r > 255 || +g > 255 || +b > 255) return undefined;

  return rgbToHex(+r, +g, +b);
};

/** Converts an RBG value to a hex string */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

/** Converts a hex string to RGB */
export const hexToRgb = (hex: string): string => {
  const chars = hex.split("");
  if (chars.length === 4) {
    const [_, r, g, b] = chars;
    return `rgb(${parseInt(r + r, 16)}, ${parseInt(g + g, 16)}, ${parseInt(
      b + b,
      16
    )})`;
  }

  if (chars.length !== 7) throw new Error(`Incorrect hex string: ${hex}`);

  const [_, r1, r2, g1, g2, b1, b2] = chars;
  return `rgb(${parseInt(r1 + r2, 16)}, ${parseInt(g1 + g2, 16)}, ${parseInt(
    b1 + b2,
    16
  )})`;
};

export const tryParseInputColor = (color: string): string | undefined => {
  color = color.trim();
  // If it's a hex just return it
  if (isValidHex(color)) return color;
  // No other formats supported for now
  return tryParseRGBColor(color);
};

/** Gets a single random hex value */
const generateRandomHexValue = (): string => {
  const number = Math.round(Math.random() * 255);
  return number.toString(16).padStart(2, "0");
};

/** Get a random hex color */
export const generateRandomHexColor = (): string => {
  const r = generateRandomHexValue();
  const g = generateRandomHexValue();
  const b = generateRandomHexValue();

  return `#${r}${g}${b}`;
};
