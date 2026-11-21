import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import legacy from "@vitejs/plugin-legacy";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(projectRoot, "web");

/** Every index.html under web/ (except public/) is a page. */
function findPages(dir: string, out: Record<string, string> = {}) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "public" && name !== "src" && name !== "partials") findPages(full, out);
    } else if (name === "index.html") {
      out[relative(webRoot, dir) || "home"] = full;
    }
  }
  return out;
}

/** Shared header/footer markup, copied verbatim from the original site. */
const HEADER =
  '<header class="top"><a class="brand" href="/" aria-label="Kamana home"><span class="mark">K</span></a>' +
  '<nav><a href="/search">Find Employees</a><a href="/post">Apply for Job</a></nav></header>';
const FOOTER =
  '<footer><span>Good work starts with the right connection.</span><span class="footer-links">' +
  '<a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/safety">Safety</a>' +
  '<a href="/grievance">Complaints</a><a href="/delete">Delete profile</a></span><span>Kamana</span></footer>';
const FOOTER_HI =
  '<footer><span>Good work starts with the right connection. / सही जुड़ाव से अच्छा काम शुरू होता है।</span>' +
  '<span class="footer-links"><a href="/privacy">Privacy / गोपनीयता</a><a href="/terms">Terms / शर्तें</a>' +
  '<a href="/safety">Safety / सुरक्षा</a><a href="/grievance">Complaints / शिकायतें</a>' +
  '<a href="/delete">Delete profile / प्रोफ़ाइल हटाएँ</a></span><span>Kamana</span></footer>';

function partials(): Plugin {
  return {
    name: "kamana-partials",
    transformIndexHtml: (html) =>
      html.replace("<!--header-->", HEADER).replace("<!--footer:hi-->", FOOTER_HI).replace("<!--footer-->", FOOTER),
  };
}

/** Runs the Vercel functions in /api inside the Vite dev server, so `npm run dev` is all you need. */
function devApi(): Plugin {
  return {
    name: "kamana-dev-api",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      // Clean URLs like Vercel: /search → /search/index.html
      server.middlewares.use((req, _res, next) => {
        const [path, query = ""] = (req.url ?? "/").split("?");
        if (path !== "/" && !path.includes(".") && !path.startsWith("/api/") && !path.startsWith("/@")) {
          const candidate = resolve(webRoot, `.${path.replace(/\/$/, "")}`, "index.html");
          if (existsSync(candidate)) req.url = `${path.replace(/\/$/, "")}/index.html${query ? `?${query}` : ""}`;
        }
        next();
      });
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/([a-z-]+)$/);
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(resolve(projectRoot, "api", `${match[1]}.ts`));
          const handler = mod[req.method ?? "GET"];
          if (!handler) {
            res.statusCode = 405;
            return res.end();
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
          headers.set("x-real-ip", req.socket.remoteAddress ?? "127.0.0.1");
          const response: Response = await handler(
            new Request(`http://${req.headers.host}${req.url}`, {
              method: req.method,
              headers,
              body: chunks.length ? Buffer.concat(chunks) : undefined,
            }),
          );
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Make .env.local available to the /api functions during dev, like Vercel does in production.
  Object.assign(process.env, loadEnv(mode, projectRoot, ""));
  return {
    root: webRoot,
    envDir: projectRoot,
    appType: "mpa",
    plugins: [
      partials(),
      devApi(),
      // Modern browsers get small ES modules; old ones (Android 5+, iOS 10+) get a polyfilled build.
      legacy({ targets: ["defaults", "chrome >= 49", "android >= 5", "ios >= 10", "firefox >= 52"] }),
    ],
    build: {
      outDir: resolve(projectRoot, "dist"),
      emptyOutDir: true,
      rollupOptions: { input: findPages(webRoot) },
    },
  };
});
