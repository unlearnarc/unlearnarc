// Reproducible install icons. Run: node scripts/generate-pwa-icons.mjs
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const size of [192, 512]) {
    const data = await page.evaluate(size => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.scale(size / 512, size / 512);
      ctx.fillStyle = '#1B252D';
      ctx.fillRect(0, 0, 512, 512);
      const gradient = ctx.createLinearGradient(150, 140, 362, 370);
      gradient.addColorStop(0, '#3478D4');
      gradient.addColorStop(0.35, '#18B6C9');
      gradient.addColorStop(0.65, '#20C997');
      gradient.addColorStop(1, '#F59E0B');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 42;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(160, 148);
      ctx.lineTo(160, 272);
      ctx.bezierCurveTo(160, 398, 352, 398, 352, 272);
      ctx.lineTo(352, 148);
      ctx.stroke();
      return canvas.toDataURL('image/png').split(',')[1];
    }, size);
    await writeFile(new URL(`../public/pwa-${size}.png`, import.meta.url), Buffer.from(data, 'base64'));
  }
} finally { await browser.close(); }
