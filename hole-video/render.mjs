// Usage:
//   node render.mjs stills 0.5,2.9,7.2 [scale]     -> stills/t_XX.png
//   node render.mjs frames <start> <end> [fps]     -> frames/00001.jpg ... (frame indices [start,end))
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png" };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
      fs.readFile(p.endsWith("/") ? p + "index.html" : p, (err, data) => {
        if (err) { resp.writeHead(404); resp.end(); return; }
        resp.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
        resp.end(data);
      });
    });
    srv.listen(0, () => res(srv));
  });
}

const [mode, a, b, c] = process.argv.slice(2);
const srv = await serve();
const port = srv.address().port;
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 400, height: 700 } });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[page]", m.text()); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
const scale = mode === "stills" ? parseFloat(b || "0.5") : 1;
const PAGE = process.env.PAGE || "index.html";
const FRAMES = process.env.FRAMES || "frames";
await page.goto(`http://localhost:${port}/${PAGE}?scale=${scale}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });

if (process.env.DBG) await page.evaluate(process.env.DBG);
if (mode === "stills") {
  fs.mkdirSync(path.join(ROOT, "stills"), { recursive: true });
  for (const t of a.split(",").map(Number)) {
    const t0 = Date.now();
    await page.evaluate((t) => window.renderAt(t), t);
    const url = await page.evaluate(() => window.grab(0.9));
    const f = path.join(ROOT, "stills", (process.env.PREFIX || "") + `t_${t.toFixed(2)}.jpg`);
    fs.writeFileSync(f, Buffer.from(url.split(",")[1], "base64"));
    console.log(f, Date.now() - t0, "ms");
  }
} else if (mode === "frames") {
  const fps = parseFloat(c || "30");
  const start = parseInt(a), end = parseInt(b);
  fs.mkdirSync(path.join(ROOT, FRAMES), { recursive: true });
  const tStart = Date.now();
  for (let i = start; i < end; i++) {
    const f = path.join(ROOT, FRAMES, String(i + 1).padStart(5, "0") + ".jpg");
    if (fs.existsSync(f)) continue;
    await page.evaluate((t) => window.renderAt(t), i / fps);
    const url = await page.evaluate(() => window.grab(0.94));
    fs.writeFileSync(f, Buffer.from(url.split(",")[1], "base64"));
    if ((i - start) % 30 === 0) console.log(`frame ${i} / ${end}  ${((Date.now() - tStart) / (i - start + 1)).toFixed(0)} ms/frame`);
  }
}
await browser.close();
srv.close();
