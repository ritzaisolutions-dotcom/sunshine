import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const LONG =
  "M30 18.2C25.6 12.4 23.4 5.6 31.6 0.4C32.2 6.2 34.6 12.2 34.2 18.2Z";
const SHORT =
  "M30.6 17.6C27.6 13.2 27.2 8.4 32 5.2C32.2 8.8 34.2 13 33.8 17.6Z";
const longAngles = [0, 45, 90, 135, 180, 225, 270, 315];
const shortAngles = [22, 67, 112, 157, 202, 247, 292, 337];

function sunSvg(size, maskable) {
  const pad = maskable ? size * 0.18 : size * 0.08;
  const inner = size - pad * 2;
  const scale = inner / 64;
  const rays = [
    ...longAngles.map(
      (d) =>
        `<path d="${LONG}" transform="rotate(${d} 32 32)"/>`
    ),
    ...shortAngles.map(
      (d) =>
        `<path d="${SHORT}" transform="rotate(${d} 32 32)"/>`
    ),
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${maskable ? size * 0.22 : size * 0.18}" fill="#7B4B9A"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})" fill="#F2C14E">
    ${rays}
    <circle cx="32" cy="32" r="15"/>
  </g>
</svg>`;
}

async function write(name, size, maskable) {
  const dir = path.join("public", "icons");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, name);
  await sharp(Buffer.from(sunSvg(size, maskable))).png().toFile(out);
  console.log("wrote", out);
}

await write("icon-192.png", 192, false);
await write("icon-512.png", 512, false);
await write("icon-192-maskable.png", 192, true);
await write("icon-512-maskable.png", 512, true);
await write("apple-touch-icon.png", 180, false);
