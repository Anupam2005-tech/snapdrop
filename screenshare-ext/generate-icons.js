const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const outputDir = path.join(__dirname, 'icons');
const masterIconPath = path.join(__dirname, 'icons', 'master_icon.png');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function resizeIcon() {
  if (!fs.existsSync(masterIconPath)) {
    console.error(`Master icon not found at: ${masterIconPath}`);
    process.exit(1);
  }

  const image = await loadImage(masterIconPath);
  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Draw the image scaled down to the exact size
    ctx.drawImage(image, 0, 0, size, size);
    
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(outputDir, `icon${size}.png`);
    fs.writeFileSync(filename, buffer);
    console.log(`Generated ${filename} (${size}x${size})`);
  }
}

resizeIcon().then(() => {
  console.log('All icons updated successfully!');
}).catch(err => {
  console.error('Error generating icons:', err);
});