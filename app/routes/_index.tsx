import type { MetaFunction } from "@remix-run/node";
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { useCallback, useMemo, useState } from "react";
import DiceIcon from "~/svg/DiceIcon";
import UpArrowIcon from "~/svg/UpArrowIcon";

export const meta: MetaFunction = () => {
  return [
    { title: "Huevana" },
    { name: "description", content: "Welcome to Huevana!" },
  ];
};

const DEFAULT_COLOR = "#98FB98";
const colorName = "Minty green";

/** Determines if the given string is a valid hex or RGB color */
const isValidHexOrRGB = (color: string): boolean => {
  color = color.trim().toLowerCase();
  const isProbablyHex = color.startsWith("#");
  if (isProbablyHex) return isValidHex(color);

  const isProbablyRGB = color.startsWith("r");
  if (isProbablyRGB) return isValidRGB(color);

  // No other formats supported, yet...
  return false;
};

/** Determines if the given string is a valid hex color */
const isValidHex = (color: string): boolean => {
  // https://regex101.com/ - If this ever stops working...
  const regex = new RegExp(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
  return regex.test(color); // Trust the regex magic
};

/** Determines if the given string is a valid RGB color */
const isValidRGB = (color: string): boolean => {
  // https://regex101.com/ - If this ever stops working...
  const regex = new RegExp(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/);
  const matches = color.match(regex);
  if (matches?.length !== 4) return false;
  const [_, r, g, b] = matches;
  return +r < 256 && +g < 256 && +b < 256;
};

const tryParseRGBColor = (color: string): string | undefined => {
  // https://regex101.com/ - If this ever stops working...
  const regex = new RegExp(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/);
  const matches = color.match(regex);
  if (matches?.length !== 4) return undefined;

  const [_, r, g, b] = matches;
  if (+r > 255 || +g > 255 || +b > 255) return undefined;

  return rgbToHex(+r, +g, +b);
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const hexToRgb = (hex: string): string => {
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

const tryParseInputColor = (color: string): string | undefined => {
  color = color.trim();
  // If it's a hex just return it
  if (isValidHex(color)) return color;
  // No other formats supported for now
  return tryParseRGBColor(color);
};

/** Gets a single random hex value */
const getRandomHexValue = (): string => {
  const number = Math.round(Math.random() * 255);
  return number.toString(16).padStart(2, "0");
};

/** Get a random hex color */
const getRandomHexColor = (): string => {
  const r = getRandomHexValue();
  const g = getRandomHexValue();
  const b = getRandomHexValue();

  return `#${r}${g}${b}`;
};

export default function Index() {
  const [inputTextColor, setInputTextColor] = useState(DEFAULT_COLOR);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [colorFormat, setColorFormat] = useState<"hex" | "rgb">("hex");
  const isValidColor = useMemo(
    () => isValidHexOrRGB(inputTextColor),
    [inputTextColor]
  );

  const onColorTextChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setInputTextColor(value);
      const parsedColor = tryParseInputColor(value);
      if (!parsedColor) return;
      setColor(parsedColor);
      if (isValidHex(value)) setColorFormat("hex");
      else setColorFormat("rgb");
    },
    []
  );

  const onColorInputChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      const newInputTextColor = colorFormat === "hex" ? value : hexToRgb(value);
      setInputTextColor(newInputTextColor);
      setColor(value);
    },
    [colorFormat]
  );

  const onColorFormatChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      const isRGB = value === "rgb";
      const isHex = value === "hex";
      if (!isRGB && !isHex) return;
      const newInputTextColor = isHex ? color : hexToRgb(color);
      setInputTextColor(newInputTextColor);
      setColorFormat(value);
    },
    [color]
  );

  const onRandomizeColor = useCallback(() => {
    const newColor = getRandomHexColor();
    const newInputTextColor =
      colorFormat === "hex" ? newColor : hexToRgb(newColor);
    setInputTextColor(newInputTextColor);
    setColor(newColor);
  }, [colorFormat]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="grid gap-4 place-items-center bg-slate-50 p-10 rounded-3xl">
        <h1 className="text-4xl mb-6">Huevana</h1>
        <div className="grid grid-flow-col shadow-sm">
          <input
            type="radio"
            id="hex"
            name="hex"
            value="hex"
            className="hidden"
            checked={colorFormat === "hex"}
            onChange={onColorFormatChanged}
          />
          <label
            htmlFor="hex"
            className={
              "cursor-pointer px-4 py-1 rounded-l-2xl font-semibold outline-slate-700/20 text-sm" +
              (colorFormat === "hex"
                ? " bg-blue-100  text-blue-600 outline outline-1 z-10"
                : "  bg-slate-100 outline outline-1 text-slate-600")
            }
          >
            Hex
          </label>
          <input
            type="radio"
            id="rgb"
            name="rgb"
            value="rgb"
            className="hidden"
            checked={colorFormat === "rgb"}
            onChange={onColorFormatChanged}
          />
          <label
            htmlFor="rgb"
            className={
              "cursor-pointer px-4 py-1 rounded-r-2xl font-semibold outline-slate-700/20 text-sm" +
              (colorFormat === "rgb"
                ? " bg-blue-100 font-bold text-blue-600 outline outline-slate-700/20 outline-1 z-10"
                : " bg-slate-100 outline outline-1 text-slate-600")
            }
          >
            RGB
          </label>
        </div>
        <div className="grid grid-flow-col items-center gap-[1px] relative">
          <div className="absolute cursor-pointer left-[10px]">
            <div className="h-[30px] w-[30px] overflow-hidden rounded-full outline outline-2 outline-black/20">
              <input
                type="color"
                value={color}
                onChange={onColorInputChanged}
                className="h-10 w-10 scale-[2] cursor-pointer"
              />
            </div>
          </div>
          <input
            type="text"
            value={inputTextColor}
            onChange={onColorTextChanged}
            spellCheck={false}
            className="outline-1 outline-slate-700/20 text-slate-700 font-bold outline p-3 rounded-full focus-visible:outline-blue-600 focus-visible:outline-2 focus-visible:z-10 pl-12 max-w-[250px] bg-transparent"
          />
          <button
            disabled={!isValidColor}
            className="absolute right-2 fill-slate-50 bg-slate-700 rounded-full disabled:bg-slate-700/10"
          >
            <UpArrowIcon />
          </button>
        </div>
        <button
          onClick={onRandomizeColor}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-full fill-slate-700 flex items-center justify-center gap-1 shadow-sm font-semibold place-self-stretch focus-visible:outline-blue-600 focus-visible:outline-2"
        >
          <DiceIcon />
          <span>Randomize</span>
        </button>
        {/* TODO: Add color name */}
        {/*<div>{colorName}</div>*/}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div>
        <h1>
          {error.status} {error.statusText}
        </h1>
        <p>{error.data}</p>
        <p>This is ugly and I should fix it if I encounter this</p>
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <h1>Error</h1>
        <p>An error was encountered: {error.message}</p>
        {/** TODO: log this and/or show in debug mode
         * <p>The stack trace is:</p>
         * <pre>{error.stack}</pre>
         */}
      </div>
    );
  }

  return <h1>Unknown Error</h1>;
}
