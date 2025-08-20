// const Matter = require('matter-js');

// Import Supabase client - using CDN for browser compatibility
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

function mulberry32(a) {
	return function() {
		let t = a += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}

const rand = mulberry32(Date.now());

const {
	Engine, Render, Runner, Composites, Common, MouseConstraint, Mouse,
	Composite, Bodies, Events,
} = Matter;

// Game constants for better maintainability
const GAME_CONSTANTS = {
	WALL_PADDING: 120,
	LOSE_HEIGHT: 84,
	STATUS_BAR_HEIGHT: 185,
	PREVIEW_BALL_HEIGHT: 32,
	PREVIEW_DROP_HEIGHT: 150,
	FRICTION: {
		friction: 0.3,      // More friction for realistic sliding
		frictionStatic: 0.5, // Higher static friction to prevent sliding when settled
		frictionAir: 0.001,  // Slight air resistance for natural falling
		restitution: 0.2     // Slightly bouncy but not too much
	},
	IMAGE_LOAD_TIMEOUT: 10000,
	FEEDBACK_TIMEOUT: 2000,
	GAME_READY_TIMEOUT: 250,
	DROP_TIMEOUT: 500,
	DROP_COOLDOWN: 800, // Minimum time between drops (milliseconds)
	POP_EFFECT_TIMEOUT: 100,
	THRESHOLD_CELEBRATION_TIMEOUT: 1000
};

// Keep these for backward compatibility
const wallPad = GAME_CONSTANTS.WALL_PADDING;
const loseHeight = GAME_CONSTANTS.LOSE_HEIGHT;
const statusBarHeight = GAME_CONSTANTS.STATUS_BAR_HEIGHT;
const previewBallHeight = GAME_CONSTANTS.PREVIEW_BALL_HEIGHT;
const friction = GAME_CONSTANTS.FRICTION;

const GameStates = {
	MENU: 0,
	READY: 1,
	DROP: 2,
	LOSE: 3,
};

// Make Game global so it can be accessed from HTML
window.Game = {
	width: 640,
	height: 960,
	elements: {
		previewBall: null,
	},

	initializeElements: function() {
		Game.elements.canvas = document.getElementById('game-canvas');
		Game.elements.ui = document.getElementById('game-ui');
		Game.elements.score = document.getElementById('game-score');
		Game.elements.end = document.getElementById('game-end-container');
		Game.elements.endTitle = document.getElementById('game-end-title');
		Game.elements.statusValue = document.getElementById('game-highscore-value');
		Game.elements.nextFruitImg = document.getElementById('game-next-fruit');
		Game.elements.validatorStatus = document.getElementById('validator-status');
		Game.elements.secretCodePopup = document.getElementById('secret-code-popup');
		Game.elements.secretCodeMessage = document.getElementById('secret-code-message');
		Game.elements.secretCodeValue = document.getElementById('secret-code-value');
		Game.elements.copyCodeBtn = document.getElementById('copy-code-btn');
		Game.elements.shareTwitterBtn = document.getElementById('share-twitter-btn');
		Game.elements.shareGenericBtn = document.getElementById('share-generic-btn');
		Game.elements.closePopupBtn = document.getElementById('close-popup-btn');
		Game.elements.progressContainer = document.getElementById('progress-container-inline');
		Game.elements.progressLabel = document.getElementById('progress-label-inline');
		Game.elements.progressBar = document.getElementById('progress-bar-inline');
		Game.elements.progressFill = document.getElementById('progress-fill');
		Game.elements.progressText = document.getElementById('progress-text');
		Game.elements.startScreen = document.getElementById('start-screen');
		
		// Create render after canvas element is available
		if (Game.elements.canvas && !render) {
			
			render = Render.create({
				element: Game.elements.canvas,
				engine,
				options: {
					width: Game.width,
					height: Game.height,
					wireframes: false,
					background: '#0C152E'
				}
			});
			
			
			// Ensure canvas is visible and properly positioned
			if (render.canvas) {
				render.canvas.style.position = 'absolute';
				render.canvas.style.top = '0';
				render.canvas.style.left = '0';
				render.canvas.style.display = 'block';
				render.canvas.style.zIndex = '10';
			}
			
			// Create mouse control after render is ready
			if (render.canvas) {
				mouse = Mouse.create(render.canvas);
				mouseConstraint = MouseConstraint.create(engine, {
					mouse: mouse,
					constraint: {
						stiffness: 0.1, // Lower stiffness for less influence
						damping: 0.9,   // High damping to reduce oscillation
						render: {
							visible: false,
						},
					},
					// Only allow interaction with static objects (preview ball)
					collisionFilter: {
						mask: 0x0002 // Only interact with category 0x0002 (static preview objects)
					}
				});
				render.mouse = mouse;
			} else {
				console.error('❌ Render canvas is null - cannot create mouse controls');
			}
			
		}
		
	},
	
	// Crypto meme phrases for various game states
	cryptoPhrases: {
		gameOver: [
			'Paper Hands Detected! 📄🙌',
			'HODL Harder Next Time! 💪',
			'Whale Down! Try Again! 🐋',
			'Diamond Hands Loading... 💎',
			'Rocket Fuel Depleted! 🚀'
		],
		newRecord: [
			'Diamond Hands Achievement! 💎🙌',
			'To the Moon! New Record! 🚀🌙',
			'Whale Status Achieved! 🐋👑',
			'HODL Champion! 🏆',
			'Crypto God Mode! ⚡'
		],
		whaleStatus: [
			'Baby Whale 🐋',
			'HODLING 💎',
			'Mooning 🚀',
			'Whale Mode 🐋👑',
			'Crypto God ⚡'
		]
	},
	cache: { 
		highscore: 0,
		highscoreDate: null,
		totalGamesPlayed: 0,
		lastPlayedDate: null,
		unlockedCodes: [false, false, false, false, false],
		codeUnlockDates: [null, null, null, null, null]
	},
	
	// Secret code system
	secretCodes: [
		{ threshold: 100, code: "TOTHEMOON", revealed: false, message: "🚀 First milestone reached! You're heading to the moon!" },
		{ threshold: 500, code: "DIAMONDHANDS", revealed: false, message: "💎🙌 Diamond hands detected! HODL strong!" },
		{ threshold: 1000, code: "HODLGANG", revealed: false, message: "💪 Welcome to the HODL gang! Never selling!" },
		{ threshold: 2500, code: "XRPWHALE", revealed: false, message: "🐋 Whale status achieved! You're swimming with the big fish!" },
		{ threshold: 5000, code: "CRYPTOGOD", revealed: false, message: "⚡ Crypto God mode activated! Ultimate achievement unlocked!" }
	],
	
	// Progress tracking
	currentProgressThreshold: 100,
	previousProgressThreshold: 0,
	
	// Supabase configuration
	supabase: null,
	playerID: null,
	isOnline: navigator.onLine,
	supabaseConnected: false,
	offlineModeLogged: false,
	
	sounds: null,
	audioContext: null,
	reverbNode: null,
	distortionNode: null,
	alienModulatorLFO: null,
	
	initSounds: function() {
		if (Game.sounds) return;
		
		// Don't initialize Web Audio Context until user interaction
		// This will be handled in enableAudioAfterUserGesture()
		
		Game.sounds = {
			click: new Audio('./assets/click.mp3'),
			pop0: new Audio('./assets/pop0.mp3'),
			pop1: new Audio('./assets/pop1.mp3'),
			pop2: new Audio('./assets/pop2.mp3'),
			pop3: new Audio('./assets/pop3.mp3'),
			pop4: new Audio('./assets/pop4.mp3'),
			pop5: new Audio('./assets/pop5.mp3'),
			pop6: new Audio('./assets/pop6.mp3'),
			pop7: new Audio('./assets/pop7.mp3'),
			pop8: new Audio('./assets/pop8.mp3'),
			pop9: new Audio('./assets/pop9.mp3'),
			pop10: new Audio('./assets/pop10.mp3'),
		};
		
		// Preload sounds with alien processing
		Object.entries(Game.sounds).forEach(([name, audio]) => {
			audio.volume = 0.6;
			audio.preload = 'auto';
			// Add alien characteristics to different sound types
			if (name.startsWith('pop')) {
				audio.alienType = 'organic';
			} else if (name === 'click') {
				audio.alienType = 'mechanical';
			}
		});
	},
	
	enableAudioAfterUserGesture: function() {
		if (Game.audioContext) return; // Already initialized
		
		try {
			Game.audioContext = new (window.AudioContext || window.webkitAudioContext)();
			
			// Resume audio context if it's suspended
			if (Game.audioContext.state === 'suspended') {
				Game.audioContext.resume();
			}
			
			Game.createAlienAudioNodes();
		} catch (e) {
			console.warn('Web Audio API not supported, falling back to basic audio');
		}
	},
	
	createAlienAudioNodes: function() {
		if (!Game.audioContext) return;
		
		try {
			// Create reverb for spacious alien atmosphere
			Game.reverbNode = Game.audioContext.createConvolver();
			const reverbBuffer = Game.createReverbImpulse(2.5, 0.8, false);
			Game.reverbNode.buffer = reverbBuffer;
			
			// Create distortion for alien artifacts
			Game.distortionNode = Game.audioContext.createWaveShaper();
			Game.distortionNode.curve = Game.createDistortionCurve(15);
			Game.distortionNode.oversample = '2x';
			
			// Create LFO for alien modulation
			Game.alienModulatorLFO = Game.audioContext.createOscillator();
			Game.alienModulatorLFO.type = 'sine';
			Game.alienModulatorLFO.frequency.value = 0.3;
			
			// Create gain node for LFO modulation
			const lfoGain = Game.audioContext.createGain();
			lfoGain.gain.value = 0.15;
			
			// Connect alien audio chain
			Game.alienModulatorLFO.connect(lfoGain);
			Game.reverbNode.connect(Game.audioContext.destination);
			Game.distortionNode.connect(Game.reverbNode);
			
			// Start LFO
			Game.alienModulatorLFO.start();
		} catch (e) {
			console.warn('Alien audio processing setup failed:', e);
		}
	},
	
	createReverbImpulse: function(duration, decay, reverse) {
		const sampleRate = Game.audioContext.sampleRate;
		const length = sampleRate * duration;
		const impulse = Game.audioContext.createBuffer(2, length, sampleRate);
		
		for (let channel = 0; channel < 2; channel++) {
			const channelData = impulse.getChannelData(channel);
			for (let i = 0; i < length; i++) {
				const n = reverse ? length - i : i;
				channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
			}
		}
		return impulse;
	},
	
	createDistortionCurve: function(amount) {
		const samples = 44100;
		const curve = new Float32Array(samples);
		const deg = Math.PI / 180;
		
		for (let i = 0; i < samples; i++) {
			const x = (i * 2) / samples - 1;
			curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
		}
		return curve;
	},
	
	playSound: function(soundName, options = {}) {
		try {
			if (Game.sounds && Game.sounds[soundName]) {
				const sound = Game.sounds[soundName].cloneNode();
				
				// Apply alien audio processing if Web Audio is available
				if (Game.audioContext && Game.audioContext.state === 'running') {
					Game.playAlienSound(sound, soundName, options);
				} else {
					// Fallback to basic audio with some alien characteristics
					const baseVolume = 0.5;
					const alienVolume = Game.calculateAlienVolume(soundName, options);
					sound.volume = Math.min(1, baseVolume * alienVolume);
					
					// Add slight pitch variation for alien effect
					if (sound.playbackRate !== undefined) {
						sound.playbackRate = 1 + (Math.random() - 0.5) * 0.1;
					}
					
					sound.play().catch(() => {});
				}
			}
		} catch (e) {}
	},
	
	playAlienSound: function(audioElement, soundName, options) {
		try {
			const source = Game.audioContext.createMediaElementSource(audioElement);
			const gainNode = Game.audioContext.createGain();
			const filterNode = Game.audioContext.createBiquadFilter();
			
			// Configure alien filter characteristics
			filterNode.type = Game.sounds[soundName].alienType === 'organic' ? 'lowpass' : 'bandpass';
			filterNode.frequency.value = 800 + Math.random() * 1200;
			filterNode.Q.value = 3 + Math.random() * 7;
			
			// Calculate spatial positioning and alien modulation
			const alienIntensity = Game.calculateAlienIntensity(options);
			gainNode.gain.value = 0.4 * (0.7 + alienIntensity * 0.6);
			
			// Create alien modulation effect (simplified to prevent memory leaks)
			let lfoGain = null;
			if (Game.alienModulatorLFO && options.position) {
				lfoGain = Game.audioContext.createGain();
				lfoGain.gain.value = 0.05 * alienIntensity;
				Game.alienModulatorLFO.connect(lfoGain);
				lfoGain.connect(gainNode.gain);
			}
			
			// Connect alien audio processing chain
			source.connect(filterNode);
			filterNode.connect(gainNode);
			
			if (alienIntensity > 0.6) {
				gainNode.connect(Game.distortionNode);
			} else {
				gainNode.connect(Game.reverbNode);
			}
			
			// Apply alien frequency modulation
			const now = Game.audioContext.currentTime;
			filterNode.frequency.setValueAtTime(filterNode.frequency.value, now);
			filterNode.frequency.exponentialRampToValueAtTime(
				filterNode.frequency.value * (1.2 + alienIntensity * 0.8), 
				now + 0.1
			);
			filterNode.frequency.exponentialRampToValueAtTime(
				filterNode.frequency.value * 0.8, 
				now + 0.3
			);
			
			// Cleanup function to prevent memory leaks
			const cleanup = () => {
				try {
					if (lfoGain) {
						Game.alienModulatorLFO.disconnect(lfoGain);
						lfoGain.disconnect();
					}
					source.disconnect();
					filterNode.disconnect();
					gainNode.disconnect();
				} catch (e) {
					// Ignore cleanup errors
				}
			};
			
			// Auto-cleanup after sound duration (estimated 2 seconds max)
			setTimeout(cleanup, 2000);
			
			audioElement.play().catch(() => {});
		} catch (e) {
			console.warn('Alien sound processing failed:', e);
		}
	},
	
	calculateAlienIntensity: function(options) {
		let intensity = 0.3; // Base alien intensity
		
		// Increase intensity based on score (higher scores = more alien)
		if (Game.score) {
			intensity += Math.min(0.4, Game.score / 5000);
		}
		
		// Increase intensity for special events
		if (options.event === 'merge') {
			intensity += 0.3;
		} else if (options.event === 'collision') {
			intensity += 0.2;
		} else if (options.event === 'gameOver') {
			intensity = 1.0; // Maximum alien effect for game over
		}
		
		return Math.min(1, intensity);
	},
	
	calculateAlienVolume: function(soundName, options) {
		let volumeMultiplier = 1;
		
		// Organic sounds (pops) have different volume characteristics
		if (soundName.startsWith('pop')) {
			const popLevel = parseInt(soundName.replace('pop', ''));
			volumeMultiplier = 0.8 + (popLevel * 0.02); // Louder for higher levels
		}
		
		// Apply alien distancing effect
		if (options.position) {
			const distance = Math.sqrt(options.position.x * options.position.x + options.position.y * options.position.y);
			volumeMultiplier *= Math.max(0.3, 1 - distance / 1000);
		}
		
		return volumeMultiplier;
	},
	
	// Alien visual effects system
	triggerAlienEffect: function(element, effectType) {
		if (!element) return;
		
		// Remove any existing effects
		element.classList.remove('chromatic-glitch', 'alien-collision', 'score-quantum-flux', 'game-over-glitch');
		
		// Add new effect
		setTimeout(() => {
			element.classList.add(effectType);
		}, 10);
		
		// Remove effect after animation
		setTimeout(() => {
			element.classList.remove(effectType);
		}, effectType === 'game-over-glitch' ? 2000 : 600);
	},
	
	triggerScoreEffect: function() {
		if (Game.elements.score) {
			Game.triggerAlienEffect(Game.elements.score, 'score-quantum-flux');
		}
	},
	
	triggerCollisionEffect: function() {
		if (Game.elements.canvas) {
			Game.triggerAlienEffect(Game.elements.canvas, 'alien-collision');
		}
	},
	
	triggerGameOverEffect: function() {
		if (Game.elements.endTitle) {
			Game.triggerAlienEffect(Game.elements.endTitle, 'game-over-glitch');
		}
	},

	stateIndex: GameStates.MENU,

	score: 0,
	fruitsMerged: [],
	calculateScore: function () {
		const score = Game.fruitsMerged.reduce((total, count, sizeIndex) => {
			const value = Game.fruitSizes[sizeIndex].scoreValue * count;
			return total + value;
		}, 0);

		Game.score = score;
		if (Game.elements.score) {
			Game.elements.score.innerText = Game.score;
			// Trigger alien score effect
			Game.triggerScoreEffect();
		} else {
			console.error('❌ Score element not found!');
		}
		Game.updateWhaleStatus();
		Game.updateProgressBar();
		Game.checkSecretCodeUnlock();
	},
	
	updateWhaleStatus: function () {
		// Check if all secret codes are unlocked for validator status
		const allCodesUnlocked = Game.secretCodes.every(code => code.revealed);
		
		let status = 'Baby Whale 🐋';
		let color = 'var(--col-crypto-green)';
		
		if (allCodesUnlocked) {
			status = 'XRP Validator ⚡👑';
			color = 'var(--col-crypto-gold)';
			// Add special validator styling
			Game.elements.validatorStatus.style.textShadow = '0 0 15px var(--col-crypto-gold), 0 0 25px rgba(247, 147, 26, 0.5)';
			Game.elements.validatorStatus.style.animation = 'validatorPulse 2s infinite ease-in-out';
		} else if (Game.score >= 5000) {
			status = 'Crypto God ⚡';
			color = 'var(--col-crypto-gold)';
		} else if (Game.score >= 2500) {
			status = 'Whale Mode 🐋👑';
			color = 'var(--col-xrp-accent)';
		} else if (Game.score >= 1000) {
			status = 'Mooning 🚀';
			color = 'var(--col-primary-light)';
		} else if (Game.score >= 500) {
			status = 'HODLING 💎';
			color = 'var(--col-xrp-light)';
		}
		
		if (Game.stateIndex !== GameStates.LOSE) {
			Game.elements.validatorStatus.innerText = status;
			Game.elements.validatorStatus.style.color = color;
			
			// Reset styling if not validator
			if (!allCodesUnlocked) {
				Game.elements.validatorStatus.style.textShadow = '0 0 8px ' + color;
				Game.elements.validatorStatus.style.animation = 'none';
			}
		}
	},

	// XRP ecosystem token sizes - BETTER SIZE with safe physics boundaries
	fruitSizes: [
		{ radius: 28,  scoreValue: 1,  img: './assets/tokens/token_01_xrp.png', name: "Baby Ripple", imgWidth: 399, imgHeight: 400 },
		{ radius: 33,  scoreValue: 3,  img: './assets/tokens/token_01_xrp.png', name: "XRP Coin", imgWidth: 399, imgHeight: 400 },
		{ radius: 38,  scoreValue: 6,  img: './assets/tokens/token_03_rocket.png', name: "Rocket Fuel", imgWidth: 173, imgHeight: 400 },
		{ radius: 43,  scoreValue: 10, img: './assets/tokens/token_04_diamond.png', name: "Diamond Hands", imgWidth: 400, imgHeight: 350 },
		{ radius: 48,  scoreValue: 15, img: './assets/tokens/token_05_shield.png', name: "HODL Shield", imgWidth: 512, imgHeight: 512 },
		{ radius: 53,  scoreValue: 21, img: './assets/tokens/token_06_whale.png', name: "Crypto Whale", imgWidth: 400, imgHeight: 334 },
		{ radius: 58,  scoreValue: 28, img: './assets/tokens/token_03_rocket.png', name: "Rocket Launch", imgWidth: 173, imgHeight: 400 },
		{ radius: 63,  scoreValue: 36, img: './assets/tokens/token_03_rocket.png', name: "Moon Base", imgWidth: 173, imgHeight: 400 },
		{ radius: 68,  scoreValue: 45, img: './assets/tokens/token_09_galaxy.png', name: "Crypto Galaxy", imgWidth: 399, imgHeight: 400 },
		{ radius: 73,  scoreValue: 55, img: './assets/tokens/token_10_hodl.png', name: "Interstellar XRP", imgWidth: 400, imgHeight: 127 },
		{ radius: 78,  scoreValue: 66, img: './assets/tokens/token_11_crown.png', name: "Crypto God", imgWidth: 378, imgHeight: 396 },
	],
	currentFruitSize: 0,
	nextFruitSize: 0,
	setNextFruitSize: function () {
		Game.nextFruitSize = Math.floor(rand() * 5);
		const nextToken = Game.fruitSizes[Game.nextFruitSize];
		Game.elements.nextFruitImg.src = nextToken.img;
		Game.elements.nextFruitImg.alt = nextToken.name;
		Game.elements.nextFruitImg.title = nextToken.name;
	},

	showHighscore: function () {
		if (Game.elements.statusValue) {
			Game.elements.statusValue.innerText = Game.cache.highscore;
			} else {
			console.error('❌ High score element not found!');
		}
	},
	loadHighscore: function () {
		const gameCache = localStorage.getItem('xrp-suika-game-cache');
		if (gameCache === null) {
			Game.saveHighscore();
		} else {
			Game.cache = JSON.parse(gameCache);
		}
		
		// Ensure all cache properties exist for backward compatibility
		if (!Game.cache.unlockedCodes) {
			Game.cache.unlockedCodes = [false, false, false, false, false];
		}
		if (!Game.cache.codeUnlockDates) {
			Game.cache.codeUnlockDates = [null, null, null, null, null];
		}
		if (typeof Game.cache.totalGamesPlayed === 'undefined') {
			Game.cache.totalGamesPlayed = 0;
		}
		if (!Game.cache.highscoreDate) {
			Game.cache.highscoreDate = null;
		}
		if (!Game.cache.lastPlayedDate) {
			Game.cache.lastPlayedDate = null;
		}
		
		// Restore revealed status from cache
		Game.cache.unlockedCodes.forEach((unlocked, index) => {
			if (unlocked && index < Game.secretCodes.length) {
				Game.secretCodes[index].revealed = true;
			}
		});
		
		// Initialize progress tracking based on unlocked codes
		Game.initializeProgressTracking();
		
		Game.showHighscore();
		
		// Initialize Supabase after loading local data
		Game.initSupabase();
	},
	
	initializeProgressTracking: function () {
		// Find the next unrevealed code to set initial thresholds
		const nextCode = Game.secretCodes.find(code => !code.revealed);
		
		if (nextCode) {
			Game.currentProgressThreshold = nextCode.threshold;
			
			// Find the previous threshold (last revealed code or 0)
			let previousThreshold = 0;
			for (let i = 0; i < Game.secretCodes.length; i++) {
				if (Game.secretCodes[i].revealed) {
					previousThreshold = Game.secretCodes[i].threshold;
				} else {
					break;
				}
			}
			Game.previousProgressThreshold = previousThreshold;
		} else {
			// All codes already unlocked - prepare validator display
			Game.elements.progressContainer.style.display = 'none';
		}
	},
	
	showValidatorAchievement: function () {
		// Validator achievement removed - just update whale status
		Game.updateWhaleStatus();
	},
	
	
	showStartScreen: function () {
		Game.stateIndex = GameStates.MENU;
		Game.elements.startScreen.style.display = 'flex';
		Game.elements.ui.style.display = 'none';
		
		// Clear the world but don't add any physics bodies
		Composite.clear(engine.world);
		
		console.log('📱 Showing start screen');
	},
	saveHighscore: function () {
		Game.calculateScore();
		const isNewHighScore = Game.score >= Game.cache.highscore;
		const currentDate = new Date().toISOString();
		
		// Update game statistics
		Game.cache.totalGamesPlayed++;
		Game.cache.lastPlayedDate = currentDate;
		
		if (isNewHighScore) {
			Game.cache.highscore = Game.score;
			Game.cache.highscoreDate = currentDate;
			Game.showHighscore();
			const randomPhrase = Game.cryptoPhrases.newRecord[Math.floor(rand() * Game.cryptoPhrases.newRecord.length)];
			Game.elements.endTitle.innerText = randomPhrase;
		}

		// Always save the updated cache (for game statistics)
		localStorage.setItem('xrp-suika-game-cache', JSON.stringify(Game.cache));
		
		// Save to Supabase
		Game.saveToSupabase();
		
		// Always save to leaderboard (even if not a personal high score)
		Game.saveToLeaderboard();
	},
	
	saveGameState: function () {
		// Update cache with current secret code status and timestamps
		Game.cache.unlockedCodes = Game.secretCodes.map(code => code.revealed);
		Game.cache.codeUnlockDates = Game.secretCodes.map((code, index) => {
			// If code was just unlocked and we don't have a date, set it now
			if (code.revealed && !Game.cache.codeUnlockDates[index]) {
				return new Date().toISOString();
			}
			// Otherwise keep existing date
			return Game.cache.codeUnlockDates[index];
		});
		
		localStorage.setItem('xrp-suika-game-cache', JSON.stringify(Game.cache));
		
		// Also save to Supabase if available
		Game.saveToSupabase();
	},
	
	// Initialize Supabase client
	initSupabase: function () {
		try {
			// Get environment variables (these should be set in Netlify)
			// In browser context, import.meta.env might not be available, so we handle gracefully
			let supabaseUrl, supabaseKey;
			
			try {
				supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined);
				supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined);
			} catch (e) {
				// Environment variables not available, continue in offline mode
				// Only log this once to avoid console spam
				if (!Game.offlineModeLogged) {
					console.log('🔧 Running in offline mode (Supabase env vars not configured)');
					Game.offlineModeLogged = true;
				}
			}
			
			if (supabaseUrl && supabaseKey) {
				Game.supabase = createClient(supabaseUrl, supabaseKey);
				
				// Generate or retrieve player ID
				let playerId = localStorage.getItem('xrp-game-player-id');
				if (!playerId) {
					playerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
					localStorage.setItem('xrp-game-player-id', playerId);
				}
				Game.playerID = playerId;
				
				console.log('🗄️ Supabase initialized successfully');
				Game.supabaseConnected = true;
				
				// Set up network status monitoring
				Game.setupNetworkMonitoring();
				
				// Load data from Supabase after initialization
				Game.loadFromSupabase();
			} else {
				// Only log this once to avoid console spam
				if (!Game.offlineModeLogged) {
					console.log('🔧 Running in offline mode (Supabase env vars not configured)');
					Game.offlineModeLogged = true;
				}
			}
		} catch (error) {
			console.error('Failed to initialize Supabase:', error);
			console.log('Continuing in offline mode...');
			Game.supabaseConnected = false;
		}
	},
	
	// Set up network status monitoring
	setupNetworkMonitoring: function () {
		// Monitor online/offline status
		window.addEventListener('online', function() {
			Game.isOnline = true;
			console.log('Network connection restored');
			
			// Try to sync data when coming back online
			if (Game.supabase && Game.playerID) {
				Game.syncDataOnReconnect();
			}
		});
		
		window.addEventListener('offline', function() {
			Game.isOnline = false;
			console.log('Network connection lost - switching to offline mode');
		});
	},
	
	// Sync data when reconnecting
	syncDataOnReconnect: async function () {
		try {
			console.log('Syncing data after reconnection...');
			
			// Load latest data from Supabase
			await Game.loadFromSupabase();
			
			// Save current local state to Supabase
			await Game.saveToSupabase();
			
			// Sync any pending leaderboard entries
			await Game.syncPendingLeaderboardEntries();
			
			console.log('Data sync completed successfully');
		} catch (error) {
			console.error('Failed to sync data on reconnect:', error);
		}
	},
	
	// Save game state to Supabase
	saveToSupabase: async function () {
		if (!Game.supabase || !Game.playerID || !Game.isOnline) {
			if (!Game.isOnline) {
				console.log('Offline mode - data saved locally only');
			}
			return;
		}
		
		try {
			const gameState = {
				player_id: Game.playerID,
				high_score: Game.cache.highscore,
				high_score_date: Game.cache.highscoreDate,
				total_games_played: Game.cache.totalGamesPlayed,
				unlocked_codes: Game.cache.unlockedCodes,
				code_unlock_dates: Game.cache.codeUnlockDates,
				last_played: Game.cache.lastPlayedDate || new Date().toISOString()
			};
			
			const { error } = await Game.supabase
				.from('game_states')
				.upsert(gameState);
				
			if (error) {
				console.error('Error saving to Supabase:', error);
				Game.supabaseConnected = false;
			} else {
				console.log('Game state saved to Supabase successfully');
				Game.supabaseConnected = true;
			}
		} catch (error) {
			console.error('Failed to save to Supabase:', error);
			Game.supabaseConnected = false;
		}
	},
	
	// Load game state from Supabase
	loadFromSupabase: async function () {
		if (!Game.supabase || !Game.playerID || !Game.isOnline) {
			if (!Game.isOnline) {
				console.log('Offline mode - using local data only');
			}
			return;
		}
		
		try {
			const { data, error } = await Game.supabase
				.from('game_states')
				.select('*')
				.eq('player_id', Game.playerID)
				.single();
				
			if (error) {
				if (error.code !== 'PGRST116') { // PGRST116 is "not found" error
					console.error('Error loading from Supabase:', error);
					Game.supabaseConnected = false;
				}
				return;
			}
			
			if (data) {
				// Merge Supabase data with local data, keeping the higher score
				const shouldUpdate = data.high_score > Game.cache.highscore;
				
				if (shouldUpdate) {
					Game.cache.highscore = data.high_score;
					Game.cache.highscoreDate = data.high_score_date;
					Game.cache.totalGamesPlayed = Math.max(Game.cache.totalGamesPlayed, data.total_games_played || 0);
					Game.cache.unlockedCodes = data.unlocked_codes || [false, false, false, false, false];
					Game.cache.codeUnlockDates = data.code_unlock_dates || [null, null, null, null, null];
					Game.cache.lastPlayedDate = data.last_played;
					
					// Update secret codes revealed status
					Game.cache.unlockedCodes.forEach((unlocked, index) => {
						if (unlocked && index < Game.secretCodes.length) {
							Game.secretCodes[index].revealed = true;
						}
					});
					
					// Save merged data back to local storage
					localStorage.setItem('xrp-suika-game-cache', JSON.stringify(Game.cache));
					
					// Update UI
					Game.showHighscore();
					Game.initializeProgressTracking();
					
					console.log('Game state loaded from Supabase and merged with local data');
				} else {
					// Even if we don't update the high score, we might want to merge other data
					Game.cache.totalGamesPlayed = Math.max(Game.cache.totalGamesPlayed, data.total_games_played || 0);
					
					// Merge unlock dates if we don't have them locally
					if (data.code_unlock_dates) {
						data.code_unlock_dates.forEach((date, index) => {
							if (date && !Game.cache.codeUnlockDates[index]) {
								Game.cache.codeUnlockDates[index] = date;
							}
						});
					}
					
					// Save merged data back to local storage
					localStorage.setItem('xrp-suika-game-cache', JSON.stringify(Game.cache));
				}
				
				Game.supabaseConnected = true;
			}
		} catch (error) {
			console.error('Failed to load from Supabase:', error);
			Game.supabaseConnected = false;
		}
	},
	
	// Save high score to leaderboard
	saveToLeaderboard: async function (playerName = null) {
		if (!Game.supabase || !Game.playerID || !Game.isOnline) {
			if (!Game.isOnline) {
				console.log('Offline mode - leaderboard entry will be saved when connection is restored');
				// Store pending leaderboard entry for later sync
				Game.storePendingLeaderboardEntry(playerName);
			}
			return;
		}
		
		try {
			const leaderboardEntry = {
				player_id: Game.playerID,
				player_name: playerName || `Player_${Game.playerID.slice(-6)}`,
				score: Game.score,
				created_at: new Date().toISOString()
			};
			
			const { error } = await Game.supabase
				.from('leaderboard')
				.insert(leaderboardEntry);
				
			if (error) {
				console.error('Error saving to leaderboard:', error);
				Game.supabaseConnected = false;
			} else {
				console.log('Score saved to leaderboard successfully');
				Game.supabaseConnected = true;
			}
		} catch (error) {
			console.error('Failed to save to leaderboard:', error);
			Game.supabaseConnected = false;
		}
	},
	
	// Store pending leaderboard entry for offline sync
	storePendingLeaderboardEntry: function (playerName = null) {
		const pendingEntries = JSON.parse(localStorage.getItem('xrp-game-pending-leaderboard') || '[]');
		
		const entry = {
			player_id: Game.playerID,
			player_name: playerName || `Player_${Game.playerID.slice(-6)}`,
			score: Game.score,
			created_at: new Date().toISOString()
		};
		
		pendingEntries.push(entry);
		localStorage.setItem('xrp-game-pending-leaderboard', JSON.stringify(pendingEntries));
	},
	
	// Sync pending leaderboard entries when coming back online
	syncPendingLeaderboardEntries: async function () {
		const pendingEntries = JSON.parse(localStorage.getItem('xrp-game-pending-leaderboard') || '[]');
		
		if (pendingEntries.length === 0) return;
		
		try {
			for (const entry of pendingEntries) {
				const { error } = await Game.supabase
					.from('leaderboard')
					.insert(entry);
					
				if (error) {
					console.error('Error syncing pending leaderboard entry:', error);
				} else {
					console.log('Pending leaderboard entry synced successfully');
				}
			}
			
			// Clear pending entries after successful sync
			localStorage.removeItem('xrp-game-pending-leaderboard');
		} catch (error) {
			console.error('Failed to sync pending leaderboard entries:', error);
		}
	},
	
	updateProgressBar: function () {
		// Find the next unrevealed secret code threshold
		const nextCode = Game.secretCodes.find(code => !code.revealed);
		
		if (!nextCode) {
			// All codes unlocked - show validator achievement
			Game.elements.progressContainer.style.display = 'none';
			Game.showValidatorAchievement();
			return;
		}
		
		// Show progress container if hidden
		Game.elements.progressContainer.style.display = 'block';
		
		// Update current and previous thresholds
		Game.currentProgressThreshold = nextCode.threshold;
		
		// Find the previous threshold (last revealed code or 0)
		let previousThreshold = 0;
		for (let i = 0; i < Game.secretCodes.length; i++) {
			if (Game.secretCodes[i].revealed) {
				previousThreshold = Game.secretCodes[i].threshold;
			} else {
				break;
			}
		}
		Game.previousProgressThreshold = previousThreshold;
		
		// Calculate progress percentage
		const progressRange = Game.currentProgressThreshold - Game.previousProgressThreshold;
		const currentProgress = Math.max(0, Game.score - Game.previousProgressThreshold);
		const progressPercentage = Math.min(100, (currentProgress / progressRange) * 100);
		
		// Update progress bar
		Game.elements.progressFill.style.width = `${progressPercentage}%`;
		Game.elements.progressText.innerText = `${Math.round(progressPercentage)}%`;
		
		// Update progress label with next code info
		const pointsNeeded = Math.max(0, Game.currentProgressThreshold - Game.score);
		if (pointsNeeded > 0) {
			Game.elements.progressLabel.innerText = `${pointsNeeded} points to unlock "${nextCode.code}"`;
		} else {
			Game.elements.progressLabel.innerText = `Ready to unlock "${nextCode.code}"!`;
		}
		
		// Visual feedback based on progress
		Game.updateProgressVisualFeedback(progressPercentage);
	},
	
	updateProgressVisualFeedback: function (progressPercentage) {
		// Remove all existing classes
		Game.elements.progressContainer.classList.remove('approaching-threshold', 'threshold-reached');
		
		// Add visual feedback based on progress
		if (progressPercentage >= 100) {
			// Threshold reached - celebration effect
			Game.elements.progressContainer.classList.add('threshold-reached');
		} else if (progressPercentage >= 85) {
			// Approaching threshold - pulsing effect
			Game.elements.progressContainer.classList.add('approaching-threshold');
		}
		
		// Add intensity based on how close we are
		if (progressPercentage >= 95) {
			// Very close - increase animation speed
			Game.elements.progressContainer.style.animationDuration = '0.5s';
		} else if (progressPercentage >= 90) {
			// Close - normal animation speed
			Game.elements.progressContainer.style.animationDuration = '0.8s';
		} else {
			// Reset animation duration
			Game.elements.progressContainer.style.animationDuration = '1s';
		}
	},
	
	checkSecretCodeUnlock: function () {
		Game.secretCodes.forEach((secretCode, index) => {
			if (!secretCode.revealed && Game.score >= secretCode.threshold) {
				secretCode.revealed = true;
				Game.cache.unlockedCodes[index] = true;
				Game.cache.codeUnlockDates[index] = new Date().toISOString();
				Game.saveGameState();
				Game.resetProgressAfterUnlock();
				Game.showSecretCodePopup(index);
			}
		});
	},
	
	// Utility function to get secret code unlock statistics
	getSecretCodeStats: function () {
		const stats = {
			totalCodes: Game.secretCodes.length,
			unlockedCount: Game.cache.unlockedCodes.filter(unlocked => unlocked).length,
			unlockedCodes: [],
			nextCodeThreshold: null
		};
		
		Game.secretCodes.forEach((code, index) => {
			if (Game.cache.unlockedCodes[index]) {
				stats.unlockedCodes.push({
					code: code.code,
					threshold: code.threshold,
					unlockedDate: Game.cache.codeUnlockDates[index]
				});
			}
		});
		
		// Find next code to unlock
		const nextCode = Game.secretCodes.find(code => !code.revealed);
		if (nextCode) {
			stats.nextCodeThreshold = nextCode.threshold;
		}
		
		return stats;
	},
	
	// Utility function to reset all secret codes (for testing/debugging)
	resetSecretCodes: function () {
		Game.secretCodes.forEach(code => {
			code.revealed = false;
		});
		Game.cache.unlockedCodes = [false, false, false, false, false];
		Game.cache.codeUnlockDates = [null, null, null, null, null];
		Game.saveGameState();
		Game.initializeProgressTracking();
		Game.updateProgressBar();
		console.log('All secret codes have been reset');
	},
	
	resetProgressAfterUnlock: function () {
		// Add celebration effect
		Game.elements.progressContainer.classList.add('threshold-reached');
		
		// Reset progress bar to 100% with celebration colors
		Game.elements.progressFill.style.width = '100%';
		Game.elements.progressText.innerText = '100%';
		
		// Remove all effects after animation and reset for next threshold
		setTimeout(() => {
			Game.elements.progressContainer.classList.remove('approaching-threshold', 'threshold-reached');
			Game.elements.progressContainer.style.animationDuration = '1s';
			
			// Find next threshold and reset progress
			const nextUnrevealedCode = Game.secretCodes.find(code => !code.revealed);
			
			if (nextUnrevealedCode) {
				// Reset progress for next threshold
				Game.currentProgressThreshold = nextUnrevealedCode.threshold;
				
				// Find the new previous threshold (last revealed code)
				let newPreviousThreshold = 0;
				for (let i = 0; i < Game.secretCodes.length; i++) {
					if (Game.secretCodes[i].revealed) {
						newPreviousThreshold = Game.secretCodes[i].threshold;
					} else {
						break;
					}
				}
				Game.previousProgressThreshold = newPreviousThreshold;
				
				// Update progress bar for next threshold
				Game.updateProgressBar();
			} else {
				// All codes unlocked - hide progress bar
				Game.elements.progressContainer.style.display = 'none';
			}
		}, 1000);
	},
	
	showSecretCodePopup: function (codeIndex) {
		const secretCode = Game.secretCodes[codeIndex];
		
		// Pause the game
		runner.enabled = false;
		
		// Set popup content
		Game.elements.secretCodeMessage.innerText = secretCode.message;
		Game.elements.secretCodeValue.innerText = secretCode.code;
		
		// Show the popup
		Game.elements.secretCodePopup.style.display = 'flex';
		
		// Reset copy button state
		Game.elements.copyCodeBtn.innerText = '📋 Copy Code';
		Game.elements.copyCodeBtn.classList.remove('copied');
	},
	
	hideSecretCodePopup: function () {
		Game.elements.secretCodePopup.style.display = 'none';
		
		// Resume the game if not in lose state
		if (Game.stateIndex !== GameStates.LOSE) {
			runner.enabled = true;
		}
	},
	
	copyCodeToClipboard: function () {
		const codeText = Game.elements.secretCodeValue.innerText;
		
		// Use the modern Clipboard API if available
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(codeText).then(function() {
				Game.showCopyFeedback();
			}).catch(function(err) {
				console.error('Failed to copy code: ', err);
				Game.fallbackCopyToClipboard(codeText);
			});
		} else {
			// Fallback for older browsers or non-secure contexts
			Game.fallbackCopyToClipboard(codeText);
		}
	},
	
	fallbackCopyToClipboard: function (text) {
		// Create a temporary textarea element
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.style.position = 'fixed';
		textArea.style.left = '-999999px';
		textArea.style.top = '-999999px';
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
		
		try {
			document.execCommand('copy');
			Game.showCopyFeedback();
		} catch (err) {
			console.error('Fallback copy failed: ', err);
			// Show error feedback
			Game.elements.copyCodeBtn.innerText = '❌ Copy Failed';
			Game.elements.copyCodeBtn.style.background = 'var(--col-shadow)';
		}
		
		document.body.removeChild(textArea);
	},
	
	showCopyFeedback: function () {
		// Update button to show success
		Game.elements.copyCodeBtn.innerText = '✅ Copied!';
		Game.elements.copyCodeBtn.classList.add('copied');
		
		// Reset button after 2 seconds
		setTimeout(function() {
			Game.elements.copyCodeBtn.innerText = '📋 Copy Code';
			Game.elements.copyCodeBtn.classList.remove('copied');
		}, 2000);
	},
	
	shareOnTwitter: function () {
		const currentCode = Game.elements.secretCodeValue.innerText;
		const currentScore = Game.score;
		
		// Find which code was unlocked
		const codeIndex = Game.secretCodes.findIndex(code => code.code === currentCode);
		const secretCode = Game.secretCodes[codeIndex];
		
		// Create share messages based on the code unlocked
		const shareMessages = {
			"TOTHEMOON": [
				`🚀 Just unlocked my first secret code in XRP Crypto Meme Suika! TOTHEMOON with ${currentScore} points! 🌙`,
				`💎 First milestone reached! Got the TOTHEMOON code with ${currentScore} XRP Score! Ready for liftoff! 🚀`,
				`🌙 TOTHEMOON code unlocked! Scored ${currentScore} points in the crypto meme game! Who's joining me? 🚀`
			],
			"DIAMONDHANDS": [
				`💎🙌 DIAMONDHANDS code unlocked! ${currentScore} XRP Score and still HODLing strong! 💪`,
				`💎 Diamond hands detected! Just got the DIAMONDHANDS code with ${currentScore} points! Never selling! 🙌`,
				`🚀 DIAMONDHANDS achievement unlocked! ${currentScore} XRP Score and counting! HODL gang! 💎🙌`
			],
			"HODLGANG": [
				`💪 Welcome to the HODLGANG! Just unlocked the secret code with ${currentScore} XRP Score! 🐋`,
				`🔥 HODLGANG code unlocked! ${currentScore} points and never selling! Who else is HODLing? 💎`,
				`🚀 HODLGANG achievement! Scored ${currentScore} points in XRP Crypto Meme Suika! Diamond hands forever! 💎🙌`
			],
			"XRPWHALE": [
				`🐋 WHALE STATUS ACHIEVED! Just unlocked XRPWHALE code with ${currentScore} XRP Score! Swimming with the big fish! 🌊`,
				`🐋👑 XRPWHALE code unlocked! ${currentScore} points and whale mode activated! To the moon! 🚀`,
				`🌊 Whale alert! Got the XRPWHALE secret code with ${currentScore} XRP Score! Making waves! 🐋`
			],
			"CRYPTOGOD": [
				`⚡ CRYPTO GOD MODE ACTIVATED! Ultimate CRYPTOGOD code unlocked with ${currentScore} XRP Score! 👑`,
				`🏆 CRYPTOGOD achievement unlocked! ${currentScore} points - I've ascended to crypto deity status! ⚡`,
				`⚡👑 CRYPTOGOD code revealed! ${currentScore} XRP Score - Ultimate crypto achievement unlocked! 🚀🌙`
			]
		};
		
		// Get random message for the current code
		const messages = shareMessages[currentCode] || [`🎉 Secret code ${currentCode} unlocked with ${currentScore} XRP Score!`];
		const randomMessage = messages[Math.floor(Math.random() * messages.length)];
		
		// Add game URL and hashtags
		const gameUrl = window.location.href;
		const hashtags = "XRP,CryptoMemes,HODL,ToTheMoon,DiamondHands,SuikaGame,CryptoGaming";
		
		const tweetText = `${randomMessage}\n\nPlay XRP Crypto Meme Suika: ${gameUrl}\n\n#${hashtags.split(',').join(' #')}`;
		
		// Create Twitter share URL
		const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
		
		// Open Twitter in new window
		window.open(twitterUrl, '_blank', 'width=550,height=420');
	},
	
	shareGeneric: function () {
		const currentCode = Game.elements.secretCodeValue.innerText;
		const currentScore = Game.score;
		const gameUrl = window.location.href;
		
		const shareText = `🎉 Just unlocked secret code "${currentCode}" in XRP Crypto Meme Suika with ${currentScore} XRP Score! 🚀\n\nPlay the game: ${gameUrl}`;
		
		// Use Web Share API if available (mobile devices)
		if (navigator.share) {
			navigator.share({
				title: 'XRP Crypto Meme Suika - Secret Code Unlocked!',
				text: shareText,
				url: gameUrl
			}).catch(err => {
				console.log('Error sharing:', err);
				Game.fallbackShare(shareText);
			});
		} else {
			// Fallback to copying to clipboard
			Game.fallbackShare(shareText);
		}
	},
	
	fallbackShare: function (text) {
		// Copy share text to clipboard as fallback
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(text).then(function() {
				Game.elements.shareGenericBtn.innerText = '✅ Copied to Clipboard!';
				setTimeout(function() {
					Game.elements.shareGenericBtn.innerText = '📱 Share Achievement';
				}, 2000);
			}).catch(function(err) {
				console.error('Failed to copy share text: ', err);
			});
		} else {
			// Create temporary textarea for older browsers
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.left = '-999999px';
			document.body.appendChild(textArea);
			textArea.select();
			
			try {
				if (document.execCommand('copy')) {
					Game.elements.shareGenericBtn.innerText = '✅ Copied to Clipboard!';
					setTimeout(function() {
						Game.elements.shareGenericBtn.innerText = '📱 Share Achievement';
					}, 2000);
				} else {
					throw new Error('Copy command failed');
				}
			} catch (err) {
				Game.elements.shareGenericBtn.innerText = '❌ Copy Failed';
				setTimeout(function() {
					Game.elements.shareGenericBtn.innerText = '📱 Share Achievement';
				}, 2000);
			}
			
			document.body.removeChild(textArea);
		}
	},

	// Preload images to prevent canvas errors
	preloadImages: function () {
		return new Promise((resolve, reject) => {
			const imagesToLoad = [
				...Game.fruitSizes.map(fruit => fruit.img),
				'./assets/ui/background_nebula.jpg',
				'./assets/ui/start_button.png',
				'./assets/effects/particle_blast.png'
			];
			
			let loadedCount = 0;
			let failedCount = 0;
			const totalImages = imagesToLoad.length;
			
					
			if (totalImages === 0) {
				resolve();
				return;
			}
			
			imagesToLoad.forEach((src, index) => {
				const img = new Image();
				
				img.onload = () => {
					loadedCount++;
									
					if (loadedCount + failedCount === totalImages) {
						if (loadedCount > 0) {
													resolve();
						} else {
													reject(new Error('No images could be loaded'));
						}
					}
				};
				
				img.onerror = () => {
					failedCount++;
									
					if (loadedCount + failedCount === totalImages) {
						if (loadedCount > 0) {
													resolve();
						} else {
													reject(new Error('No images could be loaded'));
						}
					}
				};
				
				img.src = src;
			});
			
			// Timeout after 10 seconds
			setTimeout(() => {
				if (loadedCount + failedCount < totalImages) {
									resolve();
				}
			}, 10000);
		});
	},

	initGame: async function () {
		try {
			// Initialize sounds
			Game.initSounds();
			
			// Preload images first
			await Game.preloadImages();
			
			// Don't start render or runner until game actually starts

			Game.loadHighscore();
			Game.elements.ui.style.display = 'none';
			Game.fruitsMerged = new Array(Game.fruitSizes.length).fill(0);
			Game.elements.validatorStatus.innerText = 'Ready to HODL';
			
			// Initialize the next token preview
			Game.setNextFruitSize();
			
			// Set up secret code popup event listeners
			Game.elements.closePopupBtn.addEventListener('click', Game.hideSecretCodePopup);
			
			// Copy to clipboard functionality
			Game.elements.copyCodeBtn.addEventListener('click', Game.copyCodeToClipboard);
			
			// Social sharing functionality
			Game.elements.shareTwitterBtn.addEventListener('click', Game.shareOnTwitter);
			Game.elements.shareGenericBtn.addEventListener('click', Game.shareGeneric);

			// Removed menu mouse handling - start screen is now pure HTML/CSS
		} catch (error) {
			console.error('Failed to initialize game:', error);
		}
	},

	startGame: function () {
		console.log('🎮 Game.startGame() called');
		
		// Enable audio after user gesture (fixes Chrome AudioContext warning)
		Game.enableAudioAfterUserGesture();
		
		// Start the physics engine and render now
		if (!gameStarted) {
			if (render) {
				Render.run(render);
			}
			Runner.run(runner, engine);
			gameStarted = true;
			console.log('🚀 Physics engine started');
		}

		// Clear world and add game boundaries
		Composite.clear(engine.world);
		Composite.add(engine.world, gameStatics);
		Composite.add(engine.world, mouseConstraint);

		// Show game UI
		if (Game.elements.ui) {
			Game.elements.ui.style.display = 'block';
			
		} else {
			console.error('❌ Game UI element not found!');
		}
		
		// Show game canvas container
		if (Game.elements.canvas) {
			Game.elements.canvas.style.display = 'block';
		}
		
		// Hide end screen
		if (Game.elements.end) {
			Game.elements.end.style.display = 'none';
		}

		// Initialize game state
		Game.score = 0;
		Game.stateIndex = GameStates.READY;
		
		// Ensure high score is loaded
		Game.loadHighscore();
		
		Game.calculateScore();
		Game.updateWhaleStatus();
		Game.updateProgressBar();
		Game.showHighscore();
		
		// Initialize current token size and preview
		Game.currentFruitSize = Game.nextFruitSize || 0;
		Game.setNextFruitSize();
		
		const previewBallHeight = 150;
		Game.elements.previewBall = Game.generateFruitBody(Game.width / 2, previewBallHeight, Game.currentFruitSize, { 
			isStatic: true,
			collisionFilter: {
				category: 0x0002 // Static preview objects that can be moved by mouse
			}
		});
		Composite.add(engine.world, Game.elements.previewBall);

		setTimeout(() => {
			Game.stateIndex = GameStates.READY;
		}, 250);

		Events.on(mouseConstraint, 'mouseup', function (e) {
			// Don't handle clicks if we're on the menu
			if (Game.stateIndex === GameStates.MENU) {
				return;
			}
			
			// Handle fruit dropping
			Game.addFruit(e.mouse.position.x);
		});

		Events.on(mouseConstraint, 'mousemove', function (e) {
			if (Game.stateIndex !== GameStates.READY) return;
			if (Game.elements.previewBall === null) return;

			Game.elements.previewBall.position.x = e.mouse.position.x;
		});

		Events.on(engine, 'collisionStart', function (e) {
			for (let i = 0; i < e.pairs.length; i++) {
				const { bodyA, bodyB } = e.pairs[i];

				// Skip if collision is wall
				if (bodyA.isStatic || bodyB.isStatic) continue;

				const aY = bodyA.position.y + bodyA.circleRadius;
				const bY = bodyB.position.y + bodyB.circleRadius;

				// Uh oh, too high!
				if (aY < loseHeight || bY < loseHeight) {
					Game.loseGame();
					return;
				}

				// Skip different sizes
				if (bodyA.sizeIndex !== bodyB.sizeIndex) continue;

				// Skip if already popped
				if (bodyA.popped || bodyB.popped) continue;

				let newSize = bodyA.sizeIndex + 1;

				// Go back to smallest size
				if (bodyA.circleRadius >= Game.fruitSizes[Game.fruitSizes.length - 1].radius) {
					newSize = 0;
				}

				Game.fruitsMerged[bodyA.sizeIndex] += 1;

				// Therefore, circles are same size, so merge them.
				const midPosX = (bodyA.position.x + bodyB.position.x) / 2;
				const midPosY = (bodyA.position.y + bodyB.position.y) / 2;

				bodyA.popped = true;
				bodyB.popped = true;

				Game.playSound(`pop${bodyA.sizeIndex}`, {
					event: 'merge',
					position: { x: bodyA.position.x, y: bodyA.position.y },
					intensity: bodyA.sizeIndex / 10
				});
				// Trigger alien collision effect
				Game.triggerCollisionEffect();
				
				Composite.remove(engine.world, [bodyA, bodyB]);
				Composite.add(engine.world, Game.generateFruitBody(midPosX, midPosY, newSize));
				Game.addPop(midPosX, midPosY, bodyA.circleRadius);
				Game.calculateScore();
			}
		});
	},

	addPop: function (x, y, r) {
		const circle = Bodies.circle(x, y, r, {
			isStatic: true,
			angle: rand() * (Math.PI * 2),
			render: {
				sprite: {
					texture: './assets/effects/pop_effect.png',
					xScale: r / 384,
					yScale: r / 384,
				}
			},
		});

		Composite.add(engine.world, circle);
		setTimeout(() => {
			Composite.remove(engine.world, circle);
		}, 100);
	},

	loseGame: function () {
		Game.stateIndex = GameStates.LOSE;
		Game.elements.end.style.display = 'flex';
		Game.elements.validatorStatus.innerText = 'Rekt';
		Game.elements.validatorStatus.style.color = 'red';
		runner.enabled = false;
		
		// Show random crypto game over phrase if not a new high score
		if (Game.score < Game.cache.highscore) {
			const randomPhrase = Game.cryptoPhrases.gameOver[Math.floor(rand() * Game.cryptoPhrases.gameOver.length)];
			Game.elements.endTitle.innerText = randomPhrase;
		}
		
		// Trigger alien game over effect
		Game.triggerGameOverEffect();
		
		// Play alien game over sound
		Game.playSound('pop0', {
			event: 'gameOver',
			position: { x: 250, y: 100 },
			intensity: 1.0
		});
		
		Game.saveHighscore();
	},

	// Returns an index, or null
	lookupFruitIndex: function (radius) {
		const sizeIndex = Game.fruitSizes.findIndex(size => size.radius == radius);
		if (sizeIndex === undefined) return null;
		if (sizeIndex === Game.fruitSizes.length - 1) return null;

		return sizeIndex;
	},

	generateFruitBody: function (x, y, sizeIndex, extraConfig = {}) {
		const size = Game.fruitSizes[sizeIndex];
		
		// Calculate scale to better match visual boundaries with physics circles
		const targetDiameter = size.radius * 2;
		
		// Scale visuals to fill most of the physics circle - eliminate crazy gaps
		let scale;
		
		// Better scaling - good size without excessive overlap
		const targetFillRatio = 1.35; // Fill 135% - noticeable size with controlled overlap
		const maxDimension = Math.max(size.imgWidth, size.imgHeight);
		scale = (targetDiameter * targetFillRatio) / maxDimension;
		
		// Apply minor adjustments for specific shapes
		if (size.img.includes('rocket')) {
			// Rockets are tall/narrow, can scale them up more
			scale *= 1.1;
		} else if (sizeIndex === 9) { // HODL token (very wide text)
			// HODL is very wide, scale down slightly
			scale *= 0.9;
		} else if (size.img.includes('whale')) {
			// Whales are wide, standard scaling
			scale *= 1.0;
		}
		
		const defaultCollisionFilter = {
			category: 0x0001, // Default category for game objects
			mask: 0xFFFF // Can collide with everything
		};
		
		const circle = Bodies.circle(x, y, size.radius, {
			...friction,
			render: { sprite: { texture: size.img, xScale: scale, yScale: scale } },
			// Default collision filter for game objects - can't be grabbed by mouse
			collisionFilter: extraConfig.collisionFilter || defaultCollisionFilter,
			...extraConfig
		});
		circle.sizeIndex = sizeIndex;
		circle.popped = false;

		return circle;
	},

	addFruit: function (x) {
		if (Game.stateIndex !== GameStates.READY) return;

		Game.playSound('click', {
			event: 'interaction',
			position: { x: Game.mouse?.position?.x || 0, y: Game.mouse?.position?.y || 0 }
		});

		Game.stateIndex = GameStates.DROP;
		const latestFruit = Game.generateFruitBody(x, previewBallHeight, Game.currentFruitSize);
		
		// Ensure object falls straight down with no initial velocity or rotation
		Matter.Body.setVelocity(latestFruit, { x: 0, y: 0 });
		Matter.Body.setAngularVelocity(latestFruit, 0);
		Matter.Body.setAngle(latestFruit, 0);
		
		Composite.add(engine.world, latestFruit);

		Game.currentFruitSize = Game.nextFruitSize;
		Game.setNextFruitSize();
		Game.calculateScore();

		Composite.remove(engine.world, Game.elements.previewBall);
		
		// Create preview ball (will be semi-transparent during cooldown)
		Game.elements.previewBall = Game.generateFruitBody(x, previewBallHeight, Game.currentFruitSize, {
			isStatic: true,
			collisionFilter: {
				category: 0x0002 // Static preview objects that can be moved by mouse
			}
		});
		
		// Make it semi-transparent to show cooldown
		if (Game.elements.previewBall && Game.elements.previewBall.render) {
			Game.elements.previewBall.render.opacity = 0.3;
		}

		// Add cooldown before allowing next drop
		setTimeout(() => {
			if (Game.stateIndex === GameStates.DROP) {
				Composite.add(engine.world, Game.elements.previewBall);
				
				// Gradually restore opacity to show cooldown ending
				setTimeout(() => {
					if (Game.elements.previewBall && Game.elements.previewBall.render) {
						Game.elements.previewBall.render.opacity = 1.0;
					}
					Game.stateIndex = GameStates.READY;
				}, GAME_CONSTANTS.DROP_COOLDOWN - 100);
			}
		}, 100);
	}
}

const engine = Engine.create();
// Set proper gravity for natural falling
engine.gravity.y = 1.2; // Slightly stronger gravity for better fall feel
engine.gravity.x = 0;
engine.gravity.scale = 0.001;
const runner = Runner.create();
let render = null; // Will be created after elements are initialized

// Mouse control variables - need to be declared before use
let mouse = null;
let mouseConstraint = null;

// Don't add menu statics or start physics until game actually starts
let gameStarted = false;

// Removed menuStatics - start screen is now pure HTML/CSS
/*
const menuStatics = [
	// Game Title/Logo Area
	Bodies.rectangle(Game.width / 2, 120, 400, 80, {
		isStatic: true,
		render: { 
			fillStyle: 'transparent'
		},
		label: 'title-area'
	}),

	// Featured Tokens Preview (3 tokens in a row)
	Bodies.circle(Game.width / 2 - 120, Game.height * 0.4, 48, {
		isStatic: true,
		render: {
			sprite: {
				texture: Game.fruitSizes[0].img,
				xScale: 0.24,
				yScale: 0.24,
			},
		},
	}),
	
	Bodies.circle(Game.width / 2, Game.height * 0.4, 56, {
		isStatic: true,
		render: {
			sprite: {
				texture: Game.fruitSizes[4].img, // HODL Shield
				xScale: 0.22,
				yScale: 0.22,
			},
		},
	}),
	
	Bodies.circle(Game.width / 2 + 120, Game.height * 0.4, 48, {
		isStatic: true,
		render: {
			sprite: {
				texture: Game.fruitSizes[8].img, // Galaxy
				xScale: 0.24,
				yScale: 0.24,
			},
		},
	}),

	// Start Button
	Bodies.rectangle(Game.width / 2, Game.height * 0.75, 300, 80, {
		isStatic: true,
		label: 'btn-start',
		render: { 
			fillStyle: '#00B4FF',
			strokeStyle: '#FFD700',
			lineWidth: 3
		},
	}),
];
*/

const wallProps = {
	isStatic: true,
	render: { 
		fillStyle: 'rgba(15, 0, 30, 0.95)', // More solid alien surface
		strokeStyle: 'rgba(0, 255, 127, 0.9)', // Alien green glow
		lineWidth: 8,
		visible: true
	},
	// Force collision with all objects - no exceptions
	collisionFilter: {
		category: 0x0001,
		mask: 0xFFFF,
		group: 0
	},
	// Realistic wall physics
	restitution: 0.1,    // Low bounce off walls
	friction: 0.3,       // Some friction when sliding against walls
	frictionStatic: 0.5, // Prevent sliding when resting against walls
	frictionAir: 0,
	inertia: Infinity, // Prevent rotation
	inverseInertia: 0
};

const gameStatics = [
	// Left
	Bodies.rectangle(-(GAME_CONSTANTS.WALL_PADDING / 2), Game.height / 2, GAME_CONSTANTS.WALL_PADDING, Game.height, wallProps),

	// Right
	Bodies.rectangle(Game.width + (GAME_CONSTANTS.WALL_PADDING / 2), Game.height / 2, GAME_CONSTANTS.WALL_PADDING, Game.height, wallProps),

	// Bottom
	Bodies.rectangle(Game.width / 2, Game.height + (GAME_CONSTANTS.WALL_PADDING / 2) - GAME_CONSTANTS.STATUS_BAR_HEIGHT, Game.width, GAME_CONSTANTS.WALL_PADDING, wallProps),
];

// Mouse control variables declared above

// Debounced resize function for better performance
let resizeTimeout;
const resizeCanvas = () => {
	if (resizeTimeout) clearTimeout(resizeTimeout);
	resizeTimeout = setTimeout(() => {
	const screenWidth = document.body.clientWidth;
	const screenHeight = document.body.clientHeight;

	let newWidth = Game.width;
	let newHeight = Game.height;
	let scaleUI = 1;

	if (screenWidth * 1.5 > screenHeight) {
		newHeight = Math.min(Game.height, screenHeight);
		newWidth = newHeight / 1.5;
		scaleUI = newHeight / Game.height;
	} else {
		newWidth = Math.min(Game.width, screenWidth);
		newHeight = newWidth * 1.5;
		scaleUI = newWidth / Game.width;
	}

	if (render && render.canvas) {
		render.canvas.style.width = `${newWidth}px`;
		render.canvas.style.height = `${newHeight}px`;
	}

	if (Game.elements && Game.elements.ui) {
		Game.elements.ui.style.width = `${Game.width}px`;
		Game.elements.ui.style.height = `${Game.height}px`;
		Game.elements.ui.style.transform = `scale(${scaleUI})`;
	}
	}, 100);
};

// Remove duplicate - startGame is now in HTML

document.body.onload = () => {
	// Initialize elements first
	Game.initializeElements();
	
	// Then resize canvas now that render exists
	resizeCanvas();
	
	// Start screen is visible by default in CSS
	
	// Initialize game in background
	Game.initGame().then(() => {
	}).catch(error => {
		console.error('Failed to initialize game:', error);
	});
};
document.body.onresize = resizeCanvas;
