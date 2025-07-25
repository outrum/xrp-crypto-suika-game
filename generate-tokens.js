// Script to generate XRP ecosystem token images using Ideogram API
const fs = require('fs');
const path = require('path');
const https = require('https');
const FormData = require('form-data');
const fetch = require('node-fetch');

// API Key from design document
const API_KEY = 'QIX2yPBqTSSjSVPtjsayIM9o87KaxtPW4c-QvcI_VMCVdKiWM91b-EFjQoMErS7z8QTuQDlEASZ8YnBylL6QZA';

// Token definitions with prompts from the design document
const tokens = [
  { 
    id: 0, 
    name: "Baby Ripple", 
    prompt: "A cute tiny blue ripple in water with cartoon eyes and smile, circular token design, white background, game icon style"
  },
  { 
    id: 1, 
    name: "XRP Coin", 
    prompt: "XRP cryptocurrency coin with cool sunglasses and smirking face, circular token design, white background, game icon style"
  },
  { 
    id: 2, 
    name: "Rocket Fuel", 
    prompt: "Rocket fuel canister with XRP logo and blue flames, circular token design, white background, game icon style"
  },
  { 
    id: 3, 
    name: "Diamond Hands", 
    prompt: "Blue diamond-encrusted hands holding XRP coin, circular token design, white background, game icon style"
  },
  { 
    id: 4, 
    name: "HODL Shield", 
    prompt: "Medieval shield with HODL text and XRP emblem, blue and silver colors, circular token design, white background, game icon style"
  },
  { 
    id: 5, 
    name: "Crypto Whale", 
    prompt: "Cartoon blue whale with XRP symbols on its body, circular token design, white background, game icon style"
  },
  { 
    id: 6, 
    name: "Rocket Launch", 
    prompt: "Rocket with XRP logo blasting off with blue flames, circular token design, white background, game icon style"
  },
  { 
    id: 7, 
    name: "Moon Base", 
    prompt: "Lunar base with XRP flag planted on surface, Earth visible in background, circular token design, white background, game icon style"
  },
  { 
    id: 8, 
    name: "Crypto Galaxy", 
    prompt: "Spiral galaxy with stars and nebula forming XRP symbol, cosmic blue colors, circular token design, white background, game icon style"
  },
  { 
    id: 9, 
    name: "Interstellar XRP", 
    prompt: "Massive glowing XRP symbol as a bright star or sun with planets orbiting around it, cosmic blue and white colors, circular token design, game icon style"
  },
  { 
    id: 10, 
    name: "Crypto God", 
    prompt: "Cosmic deity figure with XRP symbols, controlling the universe with energy beams, blue and purple cosmic colors, circular token design, game icon style"
  }
];

// Function to generate an image using Ideogram API
async function generateImage(token) {
  console.log(`Generating image for ${token.name}...`);
  
  // Correct Ideogram API v2 payload structure
  const payload = {
    image_request: {
      prompt: token.prompt,
      aspect_ratio: "ASPECT_1_1", // Square format for tokens
      model: "V_2", // Use V2 model
      magic_prompt_option: "AUTO"
    }
  };
  
  try {
    const response = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Api-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP Error ${response.status} for ${token.name}:`, errorText);
      return null;
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`API Error generating image for ${token.name}:`, data.error);
      return null;
    }
    
    // Check if we have a generation ID for async processing
    if (data.generation_id) {
      console.log(`Generation started for ${token.name}, ID: ${data.generation_id}`);
      
      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts with 2-second intervals = 1 minute max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        try {
          const statusResponse = await fetch(`https://api.ideogram.ai/generate/${data.generation_id}`, {
            headers: {
              'Api-Key': API_KEY
            }
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            
            if (statusData.status === 'success' && statusData.data && statusData.data.length > 0) {
              console.log(`Image generation completed for ${token.name}`);
              return await downloadImage(statusData.data[0].url, token);
            } else if (statusData.status === 'failed') {
              console.error(`Image generation failed for ${token.name}:`, statusData.error);
              return null;
            }
            // If still processing, continue polling
          }
        } catch (pollError) {
          console.error(`Error polling status for ${token.name}:`, pollError);
        }
        
        attempts++;
        console.log(`Polling attempt ${attempts}/${maxAttempts} for ${token.name}...`);
      }
      
      console.error(`Timeout waiting for image generation for ${token.name}`);
      return null;
    }
    
    // Handle immediate response (if API returns images directly)
    if (data.data && data.data.length > 0) {
      console.log(`Image generated immediately for ${token.name}`);
      return await downloadImage(data.data[0].url, token);
    }
    
    console.error(`Unexpected response format for ${token.name}:`, data);
    return null;
    
  } catch (error) {
    console.error(`Error generating image for ${token.name}:`, error);
    return null;
  }
}

// Helper function to download and save image
async function downloadImage(imageUrl, token) {
  const outputPath = path.join(__dirname, 'assets', 'img', 'tokens', `token${token.id}.png`);
  
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (response) => {
      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        console.log(`Image for ${token.name} saved to ${outputPath}`);
        resolve(outputPath);
      });
      
      fileStream.on('error', (err) => {
        console.error(`Error saving image for ${token.name}:`, err);
        reject(err);
      });
    }).on('error', (err) => {
      console.error(`Error downloading image for ${token.name}:`, err);
      reject(err);
    });
  });
}

// Generate images for all tokens
async function generateAllTokens() {
  console.log('Starting token image generation...');
  
  // Create tokens directory if it doesn't exist
  const tokensDir = path.join(__dirname, 'assets', 'img', 'tokens');
  if (!fs.existsSync(tokensDir)) {
    fs.mkdirSync(tokensDir, { recursive: true });
  }
  
  // Generate images sequentially to avoid API rate limits
  let successCount = 0;
  let failureCount = 0;
  
  for (const token of tokens) {
    try {
      const result = await generateImage(token);
      if (result) {
        successCount++;
        console.log(`✅ Successfully generated ${token.name} (${successCount}/${tokens.length})`);
      } else {
        failureCount++;
        console.log(`❌ Failed to generate ${token.name} (${failureCount} failures so far)`);
      }
      
      // Add a delay between requests to avoid rate limiting
      if (token.id < tokens.length - 1) { // Don't wait after the last token
        console.log('Waiting before next generation...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      failureCount++;
      console.error(`Failed to generate image for ${token.name}:`, error);
    }
  }
  
  console.log(`\n📊 Generation Summary:`);
  console.log(`✅ Successful: ${successCount}/${tokens.length}`);
  console.log(`❌ Failed: ${failureCount}/${tokens.length}`);
  
  console.log('Token image generation complete!');
}

// Run the generation process
generateAllTokens().catch(console.error);