// Renders the app icon to PNG at the sizes iOS and the web manifest need.
const { chromium } = require('playwright');
const path = require('path');

const OUT = path.join(__dirname, '..', 'docs', 'icons');
const C = 2 * Math.PI * 148;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#2F43E0"/>
  <circle cx="256" cy="256" r="148" fill="none" stroke="#FFFFFF" stroke-opacity="0.26" stroke-width="40"/>
  <circle cx="256" cy="256" r="148" fill="none" stroke="#FFFFFF" stroke-width="40" stroke-linecap="round"
    stroke-dasharray="${(C * 0.78).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 256 256)"/>
  <path d="M190 262 L236 306 L326 212" fill="none" stroke="#FFFFFF" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await page.screenshot({ path: path.join(OUT, name), clip: { x: 0, y: 0, width: size, height: size } });
  }
  await browser.close();
  console.log('icons written to', OUT);
})();
