import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import {
  isRouteErrorResponse,
  useFetcher,
  useLoaderData,
  useRouteError,
  useSearchParams,
} from "@remix-run/react";
import { env } from "env";
import OpenAI from "openai";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  generateRandomHexColor,
  hexToRgb,
  isValidHex,
  isValidHexOrRGB,
  tryParseInputColor,
} from "~/lib/colors";
import { BODY_ID, getColorFromRequest } from "~/root";
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

const DICE_ICON_ID = "diceIcon";

const openai = new OpenAI({ apiKey: env.get("OPEN_AI_KEY") });

const caseInsensitiveEquals = (a: string, b: string): boolean => {
  return a.toLowerCase() === b.toLowerCase();
};

export async function loader({ request }: LoaderFunctionArgs) {
  return getColorFromRequest(request);
}

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
          content: `If you had to come up with a name for a the color with the hex code ${color} what would you call it? Please give your answer in just the color name, no other explanation is necessary. Try to make the color names as accurate as possible to describe the hue, but also use extra descriptive words to differentiate different shades of the same hue.`,
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
  const { defaultColor } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const { submittedColor, submittedColorName } = fetcher.data ?? {};

  const [_, setSearchParams] = useSearchParams();

  const [inputTextColor, setInputTextColor] = useState(defaultColor);
  const [color, setColor] = useState(defaultColor);
  const [colorFormat, setColorFormat] = useState<"hex" | "rgb">("hex");
  const isValidColor = useMemo(
    () => isValidHexOrRGB(inputTextColor),
    [inputTextColor]
  );
  const isLoading = useMemo(() => fetcher.state !== "idle", [fetcher.state]);
  const hideText = useMemo(
    () =>
      (false && !submittedColorName) ||
      !caseInsensitiveEquals(color, submittedColor ?? ""),
    [submittedColor, color, submittedColorName]
  );

  const changeColor = useCallback((color: string) => {
    setColor(color);
    const body = document?.getElementById(BODY_ID);
    if (body) body.style.backgroundColor = color;
  }, []);

  useEffect(() => {
    const body = document?.getElementById(BODY_ID);
    if (body) body.style.backgroundColor = color;
  });

  useEffect(() => {
    const timeout = setTimeout(
      () => setSearchParams(new URLSearchParams({ color: color.slice(1) })),
      100
    );
    return () => clearTimeout(timeout);
  }, [color]);

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
    const newColor = generateRandomHexColor();
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
    <div className="flex items-center justify-center flex-col min-h-dvh">
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
                className="h-10 w-10 scale-[2] cursor-pointer appearance-none"
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
            disabled={
              !isValidColor ||
              isLoading ||
              caseInsensitiveEquals(submittedColor ?? "", color)
            }
            type="submit"
            className="h-8 w-8 absolute right-2 fill-slate-50 bg-slate-800 rounded-full cursor-pointer disabled:cursor-default disabled:bg-slate-700/10 hover:bg-slate-600 grid place-items-center after:absolute after:inset-[-8px] after:rounded-full"
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
