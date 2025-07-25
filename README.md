# Crypto Meme Suika Game

![](./screenshot.png)

A crypto-themed version of the popular Suika/Watermelon game, featuring XRP ecosystem tokens instead of fruits. Built using plain JavaScript and the [matter.js](https://github.com/liabru/matter-js) physics engine.

**[Play the game](https://tombofry.github.io/suika-game/)**

## Token Generation

The game uses custom XRP ecosystem token images generated using the Ideogram API. To generate the token images:

1. Install dependencies:
   ```
   npm install
   ```

2. Generate token images:
   ```
   node generate-tokens.js
   ```

3. Process and optimize the images for game use:
   ```
   node process-tokens.js
   ```

This will create the necessary token images in the `assets/img` directory, replacing the default fruit images.
