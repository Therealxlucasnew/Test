// Report text elements that extend outside the TikTok safe zone (tall phones crop ~95px per side).
// Usage: node check_safe.cjs <timeline.json> [margin=110]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const tl = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const M = Number(process.argv[3] || 110);
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(t => window.init(t), tl);
  const worst = {};
  for (let t = 0; t < tl.duration; t += 0.1) {
    const hits = await page.evaluate(([t, M]) => {
      window.render(t, Math.round(t * 30));
      const out = [];
      const els = [...document.querySelectorAll('.scene .el, #captions span')];
      for (const e of els) {
        if (e.closest('.scene') && e.closest('.scene').style.display === 'none') continue;
        if (parseFloat(getComputedStyle(e).opacity) < 0.95) continue;
        const txt = (e.innerText || '').trim().replace(/\s+/g, ' ');
        if (!txt || txt === '?') continue;
        const r = e.getBoundingClientRect();
        const over = Math.max(M - r.left, r.right - (1080 - M));
        if (over > 2) out.push([txt.slice(0, 40), Math.round(over), Math.round(r.left), Math.round(r.right)]);
      }
      return out;
    }, [t, M]);
    // keep only the latest state of each element = its settled position (slam-in overshoot is ignored)
    const seen = await page.evaluate(() => [...document.querySelectorAll('.scene .el, #captions span')].filter(e => parseFloat(getComputedStyle(e).opacity) >= .95 && !(e.closest('.scene') && e.closest('.scene').style.display === 'none')).map(e => (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40)));
    for (const k of seen) delete worst[k];
    for (const [txt, over, l, r] of hits) worst[txt] = { over, l, r, t: +t.toFixed(1) };
  }
  console.log(JSON.stringify(worst, null, 1));
  await b.close();
})();
