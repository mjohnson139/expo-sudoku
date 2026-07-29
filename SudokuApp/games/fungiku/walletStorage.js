import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from '../../utils/debounce';
import { normalizeWallet } from './wallet';

/**
 * The assist wallet's persistence (docs/fungiku-plan.md §14.4).
 *
 * **Its own global key**, deliberately not part of `@FungikuGame`. The saved
 * game describes one board — its identity, its marks, its lives, its
 * `hintsUsed` — and is thrown away and rebuilt every time the player starts a
 * new puzzle. A balance that spans puzzles and sessions cannot live in a record
 * with that lifetime, so it gets the shape `utils/appTheme.js` already
 * established for a small global value: one key, load, save, and nothing else.
 *
 * Which is also why there is no `_v` here and no entry in ./saveMigration.js.
 * `FUNGIKU_STORAGE_VERSION` describes the *board* save; the wallet adds no field
 * to it, so it needs no bump. An unreadable wallet is answered by
 * `normalizeWallet`, which hands back a fresh one rather than guessing.
 */
export const FUNGIKU_WALLET_KEY = '@FungikuWallet';

/**
 * Load the wallet, or a fresh one if there is nothing saved.
 *
 * Never returns null: a game whose Hint button depends on a balance cannot have
 * "no wallet" as a state, and a read failure is not a reason to leave the player
 * with no assists.
 *
 * @returns {Promise<Object>} a normalized wallet
 */
export const loadFungikuWallet = async () => {
  try {
    const serialized = await AsyncStorage.getItem(FUNGIKU_WALLET_KEY);
    return normalizeWallet(serialized === null ? null : JSON.parse(serialized));
  } catch (error) {
    console.error('Error loading Fungiku wallet:', error);
    return normalizeWallet(null);
  }
};

/**
 * Write the wallet (debounced, with `.flush()` for unmount and backgrounding,
 * exactly like the board save).
 *
 * The debounce matters more here than it looks: a win grants both kinds in one
 * transition and the daily floor may run in the same breath as hydration, so
 * several wallet updates can land within a frame of each other.
 */
export const saveFungikuWallet = debounce(async (wallet) => {
  try {
    await AsyncStorage.setItem(FUNGIKU_WALLET_KEY, JSON.stringify(wallet));
  } catch (error) {
    console.error('Error saving Fungiku wallet:', error);
  }
}, 500);
