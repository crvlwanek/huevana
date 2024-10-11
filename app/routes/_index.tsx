import type { MetaFunction } from "@remix-run/node";
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";
import { useCallback, useMemo, useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Huevana" },
    { name: "description", content: "Welcome to Huevana!" },
  ];
};

const DEFAULT_COLOR = "#98FB98";
const colorName = "Minty green";

const isValidHexOrRGB = (color: string): boolean => {
  // Don't care about whitespace or case sensitivity
  color = color.trim().toLowerCase();
  const isProbablyHex = color.startsWith("#");
  if (isProbablyHex) return isValidHex(color);

  const isProbablyRGB = color.startsWith("rgb");
  if (isProbablyRGB) return isValidRGB(color);

  // No other formats supported, yet...
  return false;
};

const isValidHex = (color: string): boolean => {
  // https://regex101.com/ - If this ever stops working...
  const regex = new RegExp(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
  return regex.test(color); // Trust the regex magic
};

const isValidRGB = (color: string): boolean => {
  // https://regex101.com/ - If this ever stops working...
  const regex = new RegExp(/^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/);
  const matches = color.match(regex);
  if (!matches) return false;
  const [r, g, b] = matches;
  return +r < 256 && +g < 256 && +b < 256;
};

export default function Index() {
  const [color, setColor] = useState(DEFAULT_COLOR);
  const isValidColor = useMemo(() => isValidHexOrRGB(color), [color]);

  const onColorChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = event.target.value;
      if (!isValidHexOrRGB(newColor)) {
        //return;
      }

      setColor(newColor);
    },
    []
  );

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="grid gap-4 place-items-center">
        <h1 className="text-4xl">Huevana</h1>
        <input type="color" value={color} onChange={onColorChange} />
        <div>
          <input
            type="text"
            value={color}
            onChange={onColorChange}
            className="outline-1 outline-slate-700 outline rounded-l-md p-2 border-r-transparent focus-within:outline-blue-600 focus-within:outline-2"
          />
          <button
            disabled={!isValidColor}
            className="px-4 py-2 bg-slate-200 outline-1 outline-slate-700 outline rounded-r-md focus-within:outline-blue-600 focus-within:outline-2 disabled:bg-slate-50"
          >
            Submit
          </button>
        </div>
        <div>{colorName}</div>
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
