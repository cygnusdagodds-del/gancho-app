import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

export function loader() {
  return {
    ENV: {
      SUPABASE_URL: process.env.SUPABASE_URL || "",
      SUPABASE_KEY: process.env.SUPABASE_KEY || "",
    },
  };
}

export function Layout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>RH Cygnuss</title>
        <Meta />
        <Links />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body { height: 100%; }
          body {
            font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f1f5f9;
            color: #1e293b;
            line-height: 1.5;
          }
          a { color: inherit; text-decoration: none; }
        `}</style>
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.ENV = ${JSON.stringify(loaderData.ENV)}`,
        }}
      />
      <Outlet />
    </>
  );
}

export function ErrorBoundary({ error }) {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Erro inesperado</h1>
      <p style={{ color: "#64748b" }}>
        {error?.message || "Algo deu errado. Tente novamente."}
      </p>
    </div>
  );
}
