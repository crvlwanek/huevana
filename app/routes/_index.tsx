import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useFetcher,
  useRouteError,
  useSearchParams,
} from "@remix-run/react";
import { env } from "env";
import OpenAI from "openai";
import { useCallback, useMemo, useState } from "react";
import { BODY_ID } from "~/root";
import DiceIcon from "~/svg/DiceIcon";
import GitHubIcon from "~/svg/GitHubIcon";
import SpinnerIcon from "~/svg/SpinnerIcon";
import UpArrowIcon from "~/svg/UpArrowIcon";

export const meta: MetaFunction = () => {
  return [
    { title: "Huevana" },
    { name: "description", content: "Welcome to Huevana!" },
  ];
};

const DEFAULT_COLOR = "#98FB98";
const DICE_ICON_ID = "diceIcon";

const openai = new OpenAI({ apiKey: env.get("OPEN_AI_KEY") });

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

/** Converts an RBG value to a hex string */
const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

/** Converts a hex string to RGB */
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

export async function action({ request }: ActionFunctionArgs) {
  const data = await request.formData();
  const color = data.get("color")?.toString() ?? "";
  // Don't accept an invalid color; could throw an error here in debug mode
  if (!isValidHex(color)) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant who is a skilled expert in art and graphic design.",
        },
        {
          role: "user",
          content: `If you had to come up with a name for a the color with the hex code ${color} what would you call it? Please give your answer in just the color name, no other explanation is necessary.`,
        },
      ],
    });
    return {
      submittedColorName: completion.choices[0].message.content,
      submittedColor: color,
    };
  } catch (err) {
    return null;
  }
}

export default function Index() {
  const fetcher = useFetcher<typeof action>();
  const { submittedColor, submittedColorName } = fetcher.data ?? {};

  const [_, setSearchParams] = useSearchParams();

  const [inputTextColor, setInputTextColor] = useState(DEFAULT_COLOR);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [colorFormat, setColorFormat] = useState<"hex" | "rgb">("hex");
  const isValidColor = useMemo(
    () => isValidHexOrRGB(inputTextColor),
    [inputTextColor]
  );
  const isLoading = useMemo(() => fetcher.state !== "idle", [fetcher.state]);
  const hideText = useMemo(
    () => !submittedColorName || color !== submittedColor,
    [submittedColor, color, submittedColorName]
  );

  const changeColor = useCallback((color: string) => {
    setColor(color);
    setSearchParams((prev) => {
      // Remove the "#" from the front
      prev.set("color", color.slice(1));
      return prev;
    });
    const body = document?.getElementById(BODY_ID);
    if (body) body.style.backgroundColor = color;
  }, []);

  const onColorTextChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setInputTextColor(value);
      const parsedColor = tryParseInputColor(value);
      if (!parsedColor) return;
      changeColor(parsedColor);
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
      changeColor(value);
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
    changeColor(newColor);
    document
      ?.getElementById(DICE_ICON_ID)
      ?.animate(
        [
          { transform: "rotate(0) scale(1.05)" },
          { transform: "rotate(30deg) scale(1.05)" },
          { transform: "rotate(0) scale(1.05)" },
          { transform: "rotate(-25deg) scale(1.05)" },
          { transform: "rotate(0) scale(1)" },
          { transform: "rotate(20deg) scale(1)" },
          { transform: "rotate(0) scale(1)" },
        ],
        {
          duration: 300,
          iterations: 1,
        }
      );
  }, [colorFormat]);

  return (
    <div className="flex h-dvh items-center justify-center flex-col">
      <div className="grid gap-3 place-items-center bg-slate-50 p-8 rounded-3xl relative z-10">
        <h1 className="text-4xl mb-4 text-slate-800 font-extrabold">Huevana</h1>
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
              "cursor-pointer px-4 py-1 rounded-l-2xl font-semibold outline-slate-700/20 text-sm select-none" +
              (colorFormat === "hex"
                ? " bg-blue-100  text-blue-600 outline outline-1 z-10 hover:bg-blue-200"
                : "  bg-slate-100 outline outline-1 text-slate-600 hover:bg-slate-200")
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
              "cursor-pointer px-4 py-1 rounded-r-2xl font-semibold outline-slate-700/20 text-sm select-none" +
              (colorFormat === "rgb"
                ? " bg-blue-100 font-bold text-blue-600 outline outline-1 z-10 hover:bg-blue-200"
                : " bg-slate-100 outline outline-1 text-slate-600 hover:bg-slate-200")
            }
          >
            RGB
          </label>
        </div>
        <fetcher.Form
          className="grid grid-flow-col items-center gap-[1px] relative"
          method="POST"
        >
          <div className="absolute cursor-pointer left-[10px]">
            <div className="h-[30px] w-[30px] overflow-hidden rounded-full outline outline-1 outline-black/20">
              <input
                name="color"
                type="color"
                value={color}
                onChange={onColorInputChanged}
                className="h-10 w-10 scale-[2] cursor-pointer"
              />
            </div>
          </div>
          <input
            name="inputTextColor"
            type="text"
            value={inputTextColor}
            onChange={onColorTextChanged}
            spellCheck={false}
            className="outline-1 outline-slate-700/20 text-slate-700 font-bold outline p-3 rounded-full focus-visible:outline-blue-600 focus-visible:outline-2 focus-visible:z-10 pl-12 max-w-[250px] bg-transparent hover:outline-slate-700/40"
          />
          <button
            disabled={!isValidColor || isLoading || submittedColor === color}
            type="submit"
            className="h-8 w-8 absolute right-2 fill-slate-50 bg-slate-800 rounded-full cursor-pointer disabled:cursor-default disabled:bg-slate-700/10 hover:bg-slate-600 grid place-items-center"
          >
            {isLoading ? (
              <SpinnerIcon className="fill-slate-700 animate-spin" />
            ) : (
              <UpArrowIcon />
            )}
          </button>
        </fetcher.Form>
        <button
          onClick={onRandomizeColor}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-full fill-slate-700 flex items-center justify-center gap-1 shadow-sm font-semibold place-self-stretch focus-visible:outline-blue-600 focus-visible:outline-2 hover:shadow-md transition-all hover:bg-slate-300 active:scale-95 select-none"
        >
          <DiceIcon id={DICE_ICON_ID} />
          <span>Randomize</span>
        </button>
        <a
          href="https://github.com/crvlwanek/huevana"
          rel="noreferrer"
          target="_blank"
          className=" text-slate-700 fill-slate-700 rounded-full flex items-center gap-2 active:scale-95 transition-all focus-visible:outline-blue-600 focus-visible:outline-2 cursor-pointer select-none place-self-stretch justify-center"
        >
          <GitHubIcon />
          <span>View on GitHub</span>
        </a>
      </div>
      <div className="relative">
        <span
          className={
            "text-2xl font-extrabold absolute px-4 py-2 rounded-full bg-slate-700/80 text-white whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(.77,-.58,.3,1.47)] translate-x-[-50%] " +
            (hideText ? "bottom-4 opacity-0 scale-0" : "bottom-[-60px]")
          }
        >
          {submittedColorName}
        </span>
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
