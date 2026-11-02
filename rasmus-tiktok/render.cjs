// Render index.html frame-by-frame with headless Chromium and pipe to ffmpeg.
// Usage: node render.cjs <timeline.json> <out.mp4|framesDir> [--stills t1,t2,...]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');

(async () => {
  const [tlPath, out, flag, list] = process.argv.slice(2);
  // optional --range a:b renders only frames [a,b)
  const ri = process.argv.indexOf('--range');
  const range = ri > 0 ? process.argv[ri + 1].split(':').map(Number) : null;
  const timeline = JSON.parse(fs.readFileSync(tlPath, 'utf8'));
  const FPS = 30;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  const info = await page.evaluate(tl => window.init(tl), timeline);
  fs.writeFileSync(path.join(path.dirname(tlPath), 'sfx.json'), JSON.stringify(info.sfx, null, 1));

  if (flag === '--stills') {
    fs.mkdirSync(out, { recursive: true });
    for (const ts of list.split(',').map(Number)) {
      // warm up previous frames so stateful bits (captions) are right
      await page.evaluate(([t, f]) => window.render(t, f), [ts, Math.round(ts * FPS)]);
      await page.screenshot({ path: path.join(out, `still_${ts.toFixed(2)}.jpg`), type: 'jpeg', quality: 85 });
    }
    await browser.close(); return;
  }

  const total = Math.ceil(info.duration * FPS);
  const [f0, f1] = range || [0, total];
  const frames = Math.min(f1, total);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < frames; f++) {
    await page.evaluate(([t, f]) => window.render(t, f), [f / FPS, f]);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 150 === 0) console.log(`frame ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done', out);
})();
