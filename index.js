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

const wallPad = 64;
const loseHeight = 84;
const statusBarHeight = 48;
const previewBallHeight = 32;
const friction = {
	friction: 0.006,
	frictionStatic: 0.006,
	frictionAir: 0,
	restitution: 0.1
};

const GameStates = {
	MENU: 0,
	READY: 1,
	DROP: 2,
	LOSE: 3,
};

const Game = {
	width: 640,
	height: 960,
	elements: {
		canvas: document.getElementById('game-canvas'),
		ui: document.getElementById('game-ui'),
		score: document.getElementById('game-score'),
		end: document.getElementById('game-end-container'),
		endTitle: document.getElementById('game-end-title'),
		statusValue: document.getElementById('game-highscore-value'),
		nextFruitImg: document.getElementById('game-next-fruit'),
		validatorStatus: document.getElementById('validator-status'),
		previewBall: null,
		secretCodePopup: document.getElementById('secret-code-popup'),
		secretCodeMessage: document.getElementById('secret-code-message'),
		secretCodeValue: document.getElementById('secret-code-value'),
		copyCodeBtn: document.getElementById('copy-code-btn'),
		shareTwitterBtn: document.getElementById('share-twitter-btn'),
		shareGenericBtn: document.getElementById('share-generic-btn'),
		closePopupBtn: document.getElementById('close-popup-btn'),
		progressContainer: document.getElementById('progress-container'),
		progressLabel: document.getElementById('progress-label'),
		progressBar: document.getElementById('progress-bar'),
		progressFill: document.getElementById('progress-fill'),
		progressText: document.getElementById('progress-text'),
		validatorAchievement: document.getElementById('validator-achievement'),
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
	
	sounds: {
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
		Game.elements.score.innerText = `XRP Score: ${Game.score}`;
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

	// XRP ecosystem token sizes with proper progression from smaller to larger elements
	fruitSizes: [
		{ radius: 24,  scoreValue: 1,  img: './assets/new_generated/cropped_super_opt_optimized_xrpl_coin.png', name: "Baby Ripple" },
		{ radius: 32,  scoreValue: 3,  img: './assets/new_generated/cropped_super_opt_optimized_xrpl_coin.png', name: "XRP Coin" },
		{ radius: 40,  scoreValue: 6,  img: './assets/new_generated/cropped_optimized_rocket_fuel_vertical.png', name: "Rocket Fuel" },
		{ radius: 56,  scoreValue: 10, img: './assets/new_generated/cropped_optimized_diamond.png', name: "Diamond Hands" },
		{ radius: 64,  scoreValue: 15, img: './assets/new_generated/cropped_optimized_hold_shield.png', name: "HODL Shield" },
		{ radius: 72,  scoreValue: 21, img: './assets/new_generated/cropped_optimized_whale_circular.png', name: "Crypto Whale" },
		{ radius: 84,  scoreValue: 28, img: './assets/new_generated/cropped_optimized_rocket_vertical.png', name: "Rocket Launch" },
		{ radius: 96,  scoreValue: 36, img: './assets/new_generated/cropped_optimized_rocket_vertical.png', name: "Moon Base" },
		{ radius: 128, scoreValue: 45, img: './assets/new_generated/cropped_super_opt_optimized_Spiral_galaxy_formation.png', name: "Crypto Galaxy" },
		{ radius: 160, scoreValue: 55, img: './assets/new_generated/cropped_optimized_hodl_square.png', name: "Interstellar XRP" },
		{ radius: 192, scoreValue: 66, img: './assets/new_generated/cropped_optimized_crown.png', name: "Crypto God" },
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
		Game.elements.statusValue.innerText = Game.cache.highscore;
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
		// Show the validator achievement display
		Game.elements.validatorAchievement.style.display = 'block';
		
		// Update whale status to show validator
		Game.updateWhaleStatus();
		
		// Hide after 5 seconds but keep validator status
		setTimeout(() => {
			Game.elements.validatorAchievement.style.display = 'none';
		}, 5000);
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
				document.execCommand('copy');
				Game.elements.shareGenericBtn.innerText = '✅ Copied to Clipboard!';
				setTimeout(function() {
					Game.elements.shareGenericBtn.innerText = '📱 Share Achievement';
				}, 2000);
			} catch (err) {
				console.error('Fallback share copy failed: ', err);
			}
			
			document.body.removeChild(textArea);
		}
	},

	// Preload images to prevent canvas errors
	preloadImages: function () {
		return new Promise((resolve, reject) => {
			const imagesToLoad = [
				...Game.fruitSizes.map(fruit => fruit.img),
				'./assets/new_generated/optimized_Seamless_cosmic_nebula_texture.jpeg',
				'./assets/new_generated/optimized_start_button.png',
				'./assets/new_generated/super_opt_optimized_particle_blast.png'
			];
			
			let loadedCount = 0;
			let failedCount = 0;
			const totalImages = imagesToLoad.length;
			
			console.log(`🖼️ Preloading ${totalImages} images...`);
			
			if (totalImages === 0) {
				resolve();
				return;
			}
			
			imagesToLoad.forEach((src, index) => {
				const img = new Image();
				
				img.onload = () => {
					loadedCount++;
					console.log(`✅ Loaded image ${loadedCount}/${totalImages}: ${src}`);
					
					if (loadedCount + failedCount === totalImages) {
						if (loadedCount > 0) {
							console.log(`🎉 Successfully loaded ${loadedCount}/${totalImages} images`);
							resolve();
						} else {
							console.error(`❌ Failed to load any images`);
							reject(new Error('No images could be loaded'));
						}
					}
				};
				
				img.onerror = () => {
					failedCount++;
					console.warn(`⚠️ Failed to load image: ${src}`);
					
					if (loadedCount + failedCount === totalImages) {
						if (loadedCount > 0) {
							console.log(`🎉 Loaded ${loadedCount}/${totalImages} images (${failedCount} failed)`);
							resolve();
						} else {
							console.error(`❌ Failed to load any images`);
							reject(new Error('No images could be loaded'));
						}
					}
				};
				
				img.src = src;
			});
			
			// Timeout after 10 seconds
			setTimeout(() => {
				if (loadedCount + failedCount < totalImages) {
					console.warn(`⏰ Image loading timeout - continuing with ${loadedCount} loaded images`);
					resolve();
				}
			}, 10000);
		});
	},

	initGame: async function () {
		console.log('🎮 Initializing XRP Crypto Meme Suika Game...');
		
		try {
			// Preload images first
			await Game.preloadImages();
			
			console.log('🚀 Starting game engine...');
			
			// Only start rendering after images are loaded
			Render.run(render);
			Runner.run(runner, engine);

			Composite.add(engine.world, menuStatics);

			Game.loadHighscore();
			Game.elements.ui.style.display = 'none';
			Game.fruitsMerged = Array.apply(null, Array(Game.fruitSizes.length)).map(() => 0);
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

			const menuMouseDown = function () {
				if (mouseConstraint.body === null || mouseConstraint.body?.label !== 'btn-start') {
					return;
				}

				Events.off(mouseConstraint, 'mousedown', menuMouseDown);
				Game.startGame();
			}

			Events.on(mouseConstraint, 'mousedown', menuMouseDown);
			
			console.log('✅ Game initialized successfully!');
			
		} catch (error) {
			console.error('❌ Failed to initialize game:', error);
			throw error;
		}
	},

	startGame: function () {
		Game.sounds.click.play();

		Composite.remove(engine.world, menuStatics);
		Composite.add(engine.world, gameStatics);

		Game.calculateScore();
		Game.elements.endTitle.innerText = 'Ledger Closed!';
		Game.elements.ui.style.display = 'block';
		Game.elements.end.style.display = 'none';
		Game.updateWhaleStatus();
		Game.updateProgressBar();
		
		// Check if all codes are already unlocked and show validator achievement
		const allCodesUnlocked = Game.secretCodes.every(code => code.revealed);
		if (allCodesUnlocked) {
			setTimeout(() => {
				Game.showValidatorAchievement();
			}, 1000);
		}
		
		// Initialize current token size and preview
		Game.currentFruitSize = Game.nextFruitSize;
		Game.setNextFruitSize();
		
		Game.elements.previewBall = Game.generateFruitBody(Game.width / 2, previewBallHeight, Game.currentFruitSize, { isStatic: true });
		Composite.add(engine.world, Game.elements.previewBall);

		setTimeout(() => {
			Game.stateIndex = GameStates.READY;
		}, 250);

		Events.on(mouseConstraint, 'mouseup', function (e) {
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

				Game.sounds[`pop${bodyA.sizeIndex}`].play();
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
			collisionFilter: { mask: 0x0040 },
			angle: rand() * (Math.PI * 2),
			render: {
				sprite: {
					texture: './assets/img/pop.png',
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
		const circle = Bodies.circle(x, y, size.radius, {
			...friction,
			...extraConfig,
			render: { sprite: { texture: size.img, xScale: size.radius / 512, yScale: size.radius / 512 } },
		});
		circle.sizeIndex = sizeIndex;
		circle.popped = false;

		return circle;
	},

	addFruit: function (x) {
		if (Game.stateIndex !== GameStates.READY) return;

		Game.sounds.click.play();

		Game.stateIndex = GameStates.DROP;
		const latestFruit = Game.generateFruitBody(x, previewBallHeight, Game.currentFruitSize);
		Composite.add(engine.world, latestFruit);

		Game.currentFruitSize = Game.nextFruitSize;
		Game.setNextFruitSize();
		Game.calculateScore();

		Composite.remove(engine.world, Game.elements.previewBall);
		Game.elements.previewBall = Game.generateFruitBody(render.mouse.position.x, previewBallHeight, Game.currentFruitSize, {
			isStatic: true,
			collisionFilter: { mask: 0x0040 }
		});

		setTimeout(() => {
			if (Game.stateIndex === GameStates.DROP) {
				Composite.add(engine.world, Game.elements.previewBall);
				Game.stateIndex = GameStates.READY;
			}
		}, 500);
	}
}

const engine = Engine.create();
const runner = Runner.create();
const render = Render.create({
	element: Game.elements.canvas,
	engine,
	options: {
		width: Game.width,
		height: Game.height,
		wireframes: false,
		background: '#0C152E'
	}
});

const menuStatics = [
	Bodies.rectangle(Game.width / 2, Game.height * 0.4, 512, 512, {
		isStatic: true,
		render: { sprite: { texture: './assets/new_generated/optimized_Seamless_cosmic_nebula_texture.jpeg' } },
	}),

	// Add each XRP ecosystem token in a circle
	...Array.apply(null, Array(Game.fruitSizes.length)).map((_, index) => {
		const x = (Game.width / 2) + 192 * Math.cos((Math.PI * 2 * index)/12);
		const y = (Game.height * 0.4) + 192 * Math.sin((Math.PI * 2 * index)/12);
		const r = 64;

		return Bodies.circle(x, y, r, {
			isStatic: true,
			render: {
				sprite: {
					texture: Game.fruitSizes[index].img,
					xScale: r / 1024,
					yScale: r / 1024,
				},
			},
		});
	}),

	Bodies.rectangle(Game.width / 2, Game.height * 0.75, 512, 96, {
		isStatic: true,
		label: 'btn-start',
		render: { sprite: { texture: './assets/new_generated/optimized_start_button.png' } },
	}),
];

const wallProps = {
	isStatic: true,
	render: { fillStyle: '#1A2A4A', strokeStyle: '#00B4FF', lineWidth: 2 },
	...friction,
};

const gameStatics = [
	// Left
	Bodies.rectangle(-(wallPad / 2), Game.height / 2, wallPad, Game.height, wallProps),

	// Right
	Bodies.rectangle(Game.width + (wallPad / 2), Game.height / 2, wallPad, Game.height, wallProps),

	// Bottom
	Bodies.rectangle(Game.width / 2, Game.height + (wallPad / 2) - statusBarHeight, Game.width, wallPad, wallProps),
];

// add mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
	mouse: mouse,
	constraint: {
		stiffness: 0.2,
		render: {
			visible: false,
		},
	},
});
render.mouse = mouse;

Game.initGame().catch(error => {
	console.error('Failed to initialize game:', error);
	// Fallback initialization without preloading
	Game.loadHighscore();
	Game.elements.ui.style.display = 'none';
	Game.fruitsMerged = Array.apply(null, Array(Game.fruitSizes.length)).map(() => 0);
	Game.elements.validatorStatus.innerText = 'Ready to HODL';
});

const resizeCanvas = () => {
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

	render.canvas.style.width = `${newWidth}px`;
	render.canvas.style.height = `${newHeight}px`;

	Game.elements.ui.style.width = `${Game.width}px`;
	Game.elements.ui.style.height = `${Game.height}px`;
	Game.elements.ui.style.transform = `scale(${scaleUI})`;
};

document.body.onload = resizeCanvas;
document.body.onresize = resizeCanvas;
