import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
export const STATS_STORAGE_KEY = '@SudokuStats';
export const STATS_VERSION = 1;

/**
 * Interface for game statistics
 * 
 * @typedef {Object} GameStatistics
 * @property {number} gamesPlayed - Total number of games started
 * @property {number} gamesCompleted - Total number of games completed
 * @property {Object} difficulty - Statistics by difficulty level
 * @property {Object} difficulty.easy - Easy difficulty statistics
 * @property {number} difficulty.easy.played - Games played on easy
 * @property {number} difficulty.easy.completed - Games completed on easy
 * @property {number} difficulty.easy.bestTime - Best time in seconds (easy)
 * @property {number} difficulty.easy.bestScore - Best score achieved on easy
 * @property {Object} difficulty.medium - Medium difficulty statistics
 * @property {number} difficulty.medium.played - Games played on medium
 * @property {number} difficulty.medium.completed - Games completed on medium
 * @property {number} difficulty.medium.bestTime - Best time in seconds (medium)
 * @property {number} difficulty.medium.bestScore - Best score achieved on medium
 * @property {Object} difficulty.hard - Hard difficulty statistics
 * @property {number} difficulty.hard.played - Games played on hard
 * @property {number} difficulty.hard.completed - Games completed on hard
 * @property {number} difficulty.hard.bestTime - Best time in seconds (hard)
 * @property {number} difficulty.hard.bestScore - Best score achieved on hard
 * @property {Object} difficulty.expert - Expert difficulty statistics
 * @property {number} difficulty.expert.played - Games played on expert
 * @property {number} difficulty.expert.completed - Games completed on expert
 * @property {number} difficulty.expert.bestTime - Best time in seconds (expert)
 * @property {number} difficulty.expert.bestScore - Best score achieved on expert
 * @property {Object} streaks - Streak information
 * @property {number} streaks.current - Current streak of completed games
 * @property {number} streaks.best - Best streak of completed games
 * @property {string} lastPlayed - ISO date string of last played game
 */

/**
 * Initial statistics structure
 */
export const initialStatistics = {
  _v: STATS_VERSION,
  gamesPlayed: 0,
  gamesCompleted: 0,
  difficulty: {
    easy: {
      played: 0,
      completed: 0,
      bestTime: null, // null means no games completed yet
      bestScore: null, // null means no games completed yet
    },
    medium: {
      played: 0,
      completed: 0,
      bestTime: null,
      bestScore: null,
    },
    hard: {
      played: 0,
      completed: 0,
      bestTime: null,
      bestScore: null,
    },
    expert: {
      played: 0,
      completed: 0,
      bestTime: null,
      bestScore: null,
    },
  },
  streaks: {
    current: 0,
    best: 0,
  },
  lastPlayed: null,
};

/**
 * Load statistics from AsyncStorage
 * @returns {Promise<GameStatistics>} - The loaded statistics or default if not found
 */
export const loadStatistics = async () => {
  try {
    const serializedStats = await AsyncStorage.getItem(STATS_STORAGE_KEY);
    
    if (serializedStats === null) {
      return initialStatistics; // No saved statistics
    }
    
    const parsedStats = JSON.parse(serializedStats);
    
    // Check for version mismatch - handle migrations here in the future
    if (!parsedStats._v || parsedStats._v !== STATS_VERSION) {
      console.log('Statistics version mismatch, using default stats');
      return initialStatistics;
    }
    
    // Handle migration of existing data without bestScore fields
    const difficulties = ['easy', 'medium', 'hard', 'expert'];
    difficulties.forEach(difficulty => {
      if (parsedStats.difficulty && 
          parsedStats.difficulty[difficulty] && 
          parsedStats.difficulty[difficulty].bestScore === undefined) {
        parsedStats.difficulty[difficulty].bestScore = null;
      }
    });
    
    return parsedStats;
  } catch (error) {
    console.error('Error loading game statistics:', error);
    return initialStatistics;
  }
};

/**
 * Save statistics to AsyncStorage
 * @param {GameStatistics} statistics - The statistics to save
 */
export const saveStatistics = async (statistics) => {
  try {
    // Ensure version is set
    const statsToSave = {
      ...statistics,
      _v: STATS_VERSION,
    };
    
    // Save to AsyncStorage
    const serializedStats = JSON.stringify(statsToSave);
    await AsyncStorage.setItem(STATS_STORAGE_KEY, serializedStats);
  } catch (error) {
    console.error('Error saving game statistics:', error);
  }
};

/**
 * Record a new game being started
 * @param {GameStatistics} currentStats - Current statistics
 * @param {string} difficulty - Game difficulty level
 * @returns {GameStatistics} - Updated statistics
 */
export const recordGameStarted = (currentStats, difficulty) => {
  // Deep clone the stats to avoid mutation
  const newStats = JSON.parse(JSON.stringify(currentStats));
  
  // Update general stats
  newStats.gamesPlayed += 1;
  
  // Update difficulty-specific stats
  if (newStats.difficulty[difficulty]) {
    newStats.difficulty[difficulty].played += 1;
  }
  
  // Update last played timestamp
  newStats.lastPlayed = new Date().toISOString();
  
  return newStats;
};

/**
 * Record a game being completed
 * @param {GameStatistics} currentStats - Current statistics
 * @param {string} difficulty - Game difficulty level
 * @param {number} timeInSeconds - Time taken to complete the game
 * @param {number} score - Score achieved in the game
 * @returns {GameStatistics} - Updated statistics
 */
export const recordGameCompleted = (currentStats, difficulty, timeInSeconds, score) => {
  // Deep clone the stats to avoid mutation
  const newStats = JSON.parse(JSON.stringify(currentStats));
  
  // Update general stats
  newStats.gamesCompleted += 1;
  
  // Update difficulty-specific stats
  if (newStats.difficulty[difficulty]) {
    const diffStats = newStats.difficulty[difficulty];
    diffStats.completed += 1;
    
    // Update best time if this is better than previous or first completion
    if (diffStats.bestTime === null || timeInSeconds < diffStats.bestTime) {
      diffStats.bestTime = timeInSeconds;
    }
    
    // Update best score if this is better than previous or first completion
    if (diffStats.bestScore === null || score > diffStats.bestScore) {
      diffStats.bestScore = score;
    }
  }
  
  // Update streak information
  newStats.streaks.current += 1;
  if (newStats.streaks.current > newStats.streaks.best) {
    newStats.streaks.best = newStats.streaks.current;
  }
  
  return newStats;
};