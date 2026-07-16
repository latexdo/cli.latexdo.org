import { createServer } from "node:http";
import { createReadStream, statSync, watch } from "node:fs";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSite, files } from "./build-site.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || "4173");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".sh": "text/x-shellscript; charset=utf-8",
};

function rebuild() {
  try {
    buildSite();
    console.log("Built dist/");
  } catch (error) {
    console.error(error);
  }
}

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0] || "/");
  const requestPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = normalize(join(dist, requestPath));
  const relativePath = relative(dist, filePath);

  if (relativePath.startsWith("..") || relativePath.includes(`..${sep}`)) {
    return null;
  }

  return filePath;
}

rebuild();

for (const [source] of files) {
  watch(join(root, source), { persistent: false }, rebuild);
}

function handleRequest(request, response) {
  const filePath = resolveRequestPath(request.url || "/");

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stat = statSync(filePath);

    if (!stat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] || "application/octet-stream",
      "content-length": stat.size,
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

function listen(candidatePort) {
  const server = createServer(handleRequest);

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && candidatePort < 65535) {
      listen(candidatePort + 1);
      return;
    }

    throw error;
  });

  server.listen(candidatePort, host, () => {
    console.log(`Serving http://${host}:${candidatePort}`);
  });
}

listen(port);
