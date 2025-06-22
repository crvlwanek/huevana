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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BubbleBox } from "~/components/Bubbles";
import {
  generateRandomHexColor,
  hexToRgb,
  isValidHex,
  isValidHexOrRGB,
  rgbToHex,
  tryParseInputColor,
} from "~/lib/colors";
import { BODY_ID, getColorFromRequest } from "~/root";
import DiceIcon from "~/svg/DiceIcon";
import GitHubIcon from "~/svg/GitHubIcon";
import SpinnerIcon from "~/svg/SpinnerIcon";
import ColorThief from "colorthief";
import CameraIcon from "~/svg/CameraIcon";

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

const getColorPallete = (img: HTMLImageElement): string[] => {
  const colorThief = new ColorThief();
  const colors = colorThief.getPalette(img, 5);
  return colors.map((color) => {
    const [r, g, b] = color;
    return rgbToHex(r, g, b);
  });
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [colorFormat, setColorFormat] = useState<"hex" | "rgb">("hex");
  const [videoShowing, setVideoShowing] = useState(false);
  const [photoShowing, setPhotoShowing] = useState(false);
  const [photoColors, setPhotoColors] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>();
  const canvasRef = useRef<HTMLCanvasElement>();
  const imgRef = useRef<HTMLImageElement>();

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

  const startVideo = useCallback(async (): Promise<boolean> => {
    if (!videoRef.current) return false;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "back",
      },
      audio: false,
    });
    videoRef.current.srcObject = stream;
    videoRef.current.play();
    return true;
  }, []);

  const stopVideo = useCallback(() => {
    if (!videoRef.current) return;
    const stream = videoRef.current.srcObject;
    const tracks: MediaStreamTrack[] = (stream as any).getTracks();
    tracks.forEach((track) => track.stop());
    videoRef.current.srcObject = null;
  }, []);

  const openCameraModal = useCallback(async () => {
    setVideoShowing(false);
    setPhotoShowing(false);
    setCameraOpen(true);

    const videoStarted = await startVideo();
    if (!videoStarted) {
      setCameraOpen(false);
      return;
    }
    setVideoShowing(true);
    setPhotoShowing(false);
  }, [startVideo]);

  const closeCamera = useCallback(() => {
    stopVideo();
    setCameraOpen(false);
  }, []);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const { videoWidth, videoHeight } = video;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    context.drawImage(video, 0, 0, videoWidth, videoHeight);
    const data = canvas.toDataURL("image/png");
    setPhotoShowing(true);
    setVideoShowing(false);
    if (imgRef.current) {
      imgRef.current.setAttribute("src", data);

      if (imgRef.current.complete) {
        setPhotoColors(getColorPallete(imgRef.current));
      } else {
        imgRef.current.addEventListener("load", () => {
          if (!imgRef.current) return;
          setPhotoColors(getColorPallete(imgRef.current));
        });
      }
    }
  }, []);

  const changeColor = useCallback((color: string) => {
    setColor(color);
    const body = document?.getElementById(BODY_ID);
    if (body) body.style.backgroundColor = color;
  }, []);

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
      <BubbleBox />
      <div className="grid gap-3 place-items-center p-8 rounded-3xl relative z-10 bg-slate-800/60 backdrop-blur-lg text-slate-50">
        <h1 className="text-4xl mb-4 font-extrabold">Huevana</h1>
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
              "cursor-pointer px-4 py-1 rounded-l-2xl font-semibold outline-slate-50/30 outline outline-1 text-sm select-none" +
              (colorFormat === "hex"
                ? " bg-blue-400/90  text-slate-50 z-10 hover:bg-blue-300/90"
                : "  bg-slate-100/20 text-slate-100 hover:bg-slate-50/30")
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
              "cursor-pointer px-4 py-1 rounded-r-2xl font-semibold outline-slate-50/30 outline outline-1 text-sm select-none" +
              (colorFormat === "rgb"
                ? " bg-blue-400/90  text-slate-50 z-10 hover:bg-blue-300/90"
                : " bg-slate-100/20 text-slate-100 hover:bg-slate-50/30")
            }
          >
            RGB
          </label>
        </div>
        <fetcher.Form className="flex flex-col gap-3" method="POST">
          <div className="relative">
            <div className="absolute cursor-pointer left-[10px] h-full flex items-center">
              <div className="h-[30px] w-[30px] overflow-hidden rounded-full outline outline-1 outline-slate-50/20">
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
              className="outline-1 outline-slate-50/20 text-slate-100 bg-slate-400/20 font-bold outline p-3 rounded-full focus-visible:outline-blue-300 focus-visible:outline-2 focus-visible:z-10 pl-12 max-w-[250px] hover:outline-slate-50/40"
            />
            <div className="h-full flex items-center absolute right-[10px] top-0">
              <button
                onClick={openCameraModal}
                type="button"
                className="hover:bg-black/20 p-2 rounded-full -mr-2"
              >
                <CameraIcon className="fill-white" size={28} />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onRandomizeColor}
            className="px-4 py-2 bg-slate-100 text-slate-700 fill-slate-700 rounded-full flex items-center justify-center gap-1 shadow-sm font-semibold place-self-stretch focus-visible:outline-blue-600 focus-visible:outline-2 hover:shadow-md transition-all hover:bg-slate-300 active:scale-95 select-none"
          >
            <DiceIcon id={DICE_ICON_ID} />
            <span>Randomize</span>
          </button>
          <button
            disabled={
              !isValidColor ||
              isLoading ||
              caseInsensitiveEquals(submittedColor ?? "", color)
            }
            type="submit"
            className="min-h-10 px-4 py-2 bg-blue-700 text-white fill-white rounded-full flex items-center justify-center gap-1 shadow-sm font-semibold place-self-stretch  focus-visible:outline-blue-600 focus-visible:outline-2 hover:shadow-md transition-all hover:bg-blue-600 active:scale-95 select-none disabled:cursor-default disabled:opacity-50 disabled:bg-blue-700 disabled:shadow-none"
          >
            {isLoading ? (
              <SpinnerIcon className="fill-slate-50 animate-spin" />
            ) : (
              "Submit"
            )}
          </button>
        </fetcher.Form>
        <a
          href="https://github.com/crvlwanek/huevana"
          rel="noreferrer"
          target="_blank"
          className=" text-slate-50 fill-slate-50 rounded-full flex items-center gap-2 active:scale-95 transition-all focus-visible:outline-blue-600 focus-visible:outline-2 cursor-pointer select-none place-self-stretch justify-center mt-8"
        >
          <GitHubIcon />
          <span>View on GitHub</span>
        </a>
      </div>
      <div className="relative">
        <span
          className={
            "text-2xl font-extrabold absolute px-4 py-2 rounded-full bg-slate-700/80 text-white whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(.77,-.58,.3,1.47)] translate-x-[-50%] z-[5] backdrop-blur-lg " +
            (hideText ? "bottom-4 opacity-0 scale-0" : "bottom-[-60px]")
          }
        >
          {submittedColorName}
        </span>
      </div>
      <div
        className={
          !cameraOpen
            ? "hidden"
            : "fixed inset-0 z-10 backdrop-blur-3xl bg-black/10 grid place-items-center"
        }
        onClick={closeCamera}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`max-w-screen max-h-screen bg-slate-100 z-20 rounded-3xl overflow-hidden relative`}
        >
          <video
            ref={(ref) => (videoRef.current = ref ?? undefined)}
            id="video"
            className={videoShowing ? undefined : "hidden"}
          >
            Video stream not available{" "}
          </video>
          <img
            ref={(ref) => (imgRef.current = ref ?? undefined)}
            className={photoShowing ? undefined : "hidden"}
          />
          <canvas
            className="hidden"
            ref={(ref) => (canvasRef.current = ref ?? undefined)}
          />
          <div className="absolute bottom-0 w-full flex flex-col items-center gap-4 justify-center pb-4">
            {photoShowing && (
              <div className="flex flex-col gap-4 justify-center items-center p-4 bg-slate-900/40 rounded-xl">
                <label className="text-3xl text-white drop-shadow-xl">
                  Select a color
                </label>
                <div className="flex gap-4">
                  {photoColors.map((color) => (
                    <button
                      className="h-10 w-10 rounded-full border-white border-2"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setColor(color);
                        setCameraOpen(false);
                      }}
                    />
                  ))}
                </div>
                <button
                  className="text-slate-800 bg-white px-4 py-2 rounded-xl hover:bg-slate-200"
                  onClick={() => {
                    setVideoShowing(true);
                    setPhotoShowing(false);
                  }}
                >
                  Retake Photo
                </button>
              </div>
            )}
            {cameraOpen && videoShowing && (
              <button
                className="p-1 bg-white rounded-full hover:bg-slate-100"
                onClick={takePhoto}
              >
                <div className="h-16 w-16 rounded-full bg-white ring-2 hover:bg-slate-100 ring-slate-800 ring-inset ring-offset-width-2"></div>
              </button>
            )}
          </div>
        </div>
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
