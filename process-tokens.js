// Script to process and optimize token images for game use
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Token definitions with sizes from the design document
const tokens = [
  { id: 0, name: "Baby Ripple", radius: 24 },
  { id: 1, name: "XRP Coin", radius: 32 },
  { id: 2, name: "Rocket Fuel", radius: 40 },
  { id: 3, name: "Diamond Hands", radius: 56 },
  { id: 4, name: "HODL Shield", radius: 64 },
  { id: 5, name: "Crypto Whale", radius: 72 },
  { id: 6, name: "Rocket Launch", radius: 84 },
  { id: 7, name: "Moon Base", radius: 96 },
  { id: 8, name: "Crypto Galaxy", radius: 128 },
  { id: 9, name: "Interstellar XRP", radius: 160 },
  { id: 10, name: "Crypto God", radius: 192 }
];

// Function to process a single token image
async function processTokenImage(token) {
  console.log(`Processing image for ${token.name}...`);
  
  try {
    // Source and destination paths
    const sourcePath = path.join(__dirname, 'assets', 'img', 'tokens', `token${token.id}.png`);
    const destPath = path.join(__dirname, 'assets', 'img', `circle${token.id}.png`);
    
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`Source image for ${token.name} not found at ${sourcePath}`);
      return;
    }
    
    // Load the image
    const image = await loadImage(sourcePath);
    
    // Create a canvas with diameter = 2 * radius
    const diameter = token.radius * 2;
    const canvas = createCanvas(diameter, diameter);
    const ctx = canvas.getContext('2d');
    
    // Draw a circular clipping path
    ctx.beginPath();
    ctx.arc(token.radius, token.radius, token.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Draw the image, scaling it to fit the circle
    ctx.drawImage(image, 0, 0, diameter, diameter);
    
    // Save the processed image
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(destPath, buffer);
    
    console.log(`Processed image for ${token.name} saved to ${destPath}`);
  } catch (error) {
    console.error(`Error processing image for ${token.name}:`, error);
  }
}

// Process all token images
async function processAllTokens() {
  console.log('Starting token image processing...');
  
  for (const token of tokens) {
    await processTokenImage(token);
  }
  
  console.log('Token image processing complete!');
}

// Run the processing
processAllTokens().catch(console.error);