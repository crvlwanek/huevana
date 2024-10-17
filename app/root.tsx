import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";

import "./tailwind.css";
import { DEFAULT_COLOR, isValidHex } from "./lib/colors";

export const BODY_ID = "body";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export const getColorFromRequest = (request: Request) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("color") ?? "";
  const color = `#${query}`;

  const defaultColor = isValidHex(color) ? color : DEFAULT_COLOR;
  return { defaultColor };
};

export async function loader({ request }: LoaderFunctionArgs) {
  return getColorFromRequest(request);
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { defaultColor } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body
        id={BODY_ID}
        style={{ backgroundColor: defaultColor }}
        className="bg-opacity-20"
      >
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
