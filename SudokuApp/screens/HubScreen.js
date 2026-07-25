import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GAMES } from '../games/registry';
import { APP_NAME, APP_TAGLINE } from '../utils/appIdentity';
import useAppTheme from '../hooks/useAppTheme';

const ICON_SIZE = 30;

/**
 * The hub: the app's front door (docs/fungiku-plan.md §6).
 *
 * Cards come from the game registry, so a third game is a registry entry rather
 * than an edit here. A card shows a Continue badge when that game has state
 * worth resuming — the hub always shows first, keeping every game discoverable
 * instead of dropping the player straight back into one of them.
 */
const HubScreen = ({ onSelectGame }) => {
  const theme = useAppTheme();

  // Keyed by game id; a missing entry just means "nothing to continue".
  const [progress, setProgress] = useState({});

  // The hub mounts fresh every time the player comes back from a game, so
  // reading progress on mount is enough to keep the badges current.
  useEffect(() => {
    let cancelled = false;

    const readAll = async () => {
      const entries = await Promise.all(
        GAMES.map(async (game) => {
          if (typeof game.readProgress !== 'function') return [game.id, null];
          try {
            return [game.id, await game.readProgress()];
          } catch (error) {
            // A card without a badge is a fine outcome — never block the hub.
            console.error(`Error reading progress for ${game.id}:`, error);
            return [game.id, null];
          }
        })
      );

      if (!cancelled) {
        setProgress(Object.fromEntries(entries));
      }
    };

    readAll();

    return () => {
      cancelled = true;
    };
  }, []);

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Text style={[styles.appName, { color: titleColor }]}>{APP_NAME}</Text>
        <Text style={[styles.appTagline, { color: titleColor }]}>{APP_TAGLINE}</Text>

        {GAMES.map((game) => {
          const resumable = progress[game.id];

          return (
            <TouchableOpacity
              key={game.id}
              style={[styles.card, { backgroundColor: surface, borderColor: border }]}
              onPress={() => onSelectGame(game.id)}
              accessibilityRole="button"
              accessibilityLabel={
                resumable
                  ? `${game.title}, game in progress: ${resumable.label}`
                  : `Play ${game.title}`
              }
              accessibilityHint={game.tagline}
            >
              <View style={[styles.iconTile, { backgroundColor: game.accent }]}>
                <MaterialCommunityIcons name={game.icon} size={ICON_SIZE} color="#ffffff" />
              </View>

              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: titleColor }]}>{game.title}</Text>
                <Text style={[styles.cardTagline, { color: titleColor }]}>{game.tagline}</Text>

                {resumable && (
                  <View style={styles.continueRow}>
                    <View style={[styles.continueBadge, { backgroundColor: game.accent }]}>
                      <MaterialCommunityIcons name="play" size={12} color="#ffffff" />
                      <Text style={styles.continueBadgeText}>Continue</Text>
                    </View>
                    <Text style={[styles.continueMeta, { color: titleColor }]}>
                      {resumable.label} · {resumable.detail}
                    </Text>
                  </View>
                )}
              </View>

              <MaterialCommunityIcons name="chevron-right" size={24} color={titleColor} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 600,
          marginHorizontal: 'auto',
          width: '100%',
        }
      : {}),
  },
  scrollBody: {
    padding: 20,
    paddingTop: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  appTagline: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 28,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardTagline: {
    fontSize: 13,
    opacity: 0.75,
    marginTop: 2,
  },
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  continueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  continueBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  continueMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
});

export default HubScreen;
