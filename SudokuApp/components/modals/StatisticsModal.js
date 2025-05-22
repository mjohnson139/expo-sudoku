import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Modal, View, ScrollView } from 'react-native';
import { useGameContext } from '../../contexts/GameContext';
import { ACTIONS } from '../../contexts/GameContext';

/**
 * Statistics Modal to display player game statistics
 */
const StatisticsModal = () => {
  const { theme, showStatistics, statistics, statsLoaded, formatTime, dispatch } = useGameContext();

  const handleClose = () => {
    dispatch({ type: ACTIONS.HIDE_STATISTICS });
  };

  // Format best time or show placeholder
  const formatBestTime = (bestTime) => {
    try {
      return bestTime !== null && bestTime !== undefined ? formatTime(bestTime) : '--:--';
    } catch (error) {
      console.warn('Error formatting best time:', error);
      return '--:--';
    }
  };

  // Format best score or show placeholder
  const formatBestScore = (bestScore) => {
    try {
      return bestScore !== null && bestScore !== undefined ? bestScore.toLocaleString() : '---';
    } catch (error) {
      console.warn('Error formatting best score:', error);
      return '---';
    }
  };

  // Calculate completion rate
  const getCompletionRate = (played, completed) => {
    if (played === 0) return '0%';
    return `${Math.round((completed / played) * 100)}%`;
  };

  // Return a loading state if statistics aren't loaded yet
  if (!statsLoaded) {
    return (
      <Modal 
        visible={showStatistics} 
        transparent 
        animationType="slide"
      >
        <View style={styles.overlay}>
          <View style={[styles.container, { backgroundColor: theme.colors.numberPad.background }]}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.title }]}>Loading Statistics...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal 
      visible={showStatistics} 
      transparent 
      animationType="slide"
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.numberPad.background }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: theme.colors.title }]}>Game Statistics</Text>
          
          <ScrollView style={styles.scrollContent}>
            {/* Overall Stats */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.title }]}>Overall</Text>
              
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Games Played:</Text>
                <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                  {statistics.gamesPlayed}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Games Completed:</Text>
                <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                  {statistics.gamesCompleted}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Completion Rate:</Text>
                <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                  {getCompletionRate(statistics.gamesPlayed, statistics.gamesCompleted)}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Current Streak:</Text>
                <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                  {statistics.streaks.current}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Best Streak:</Text>
                <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                  {statistics.streaks.best}
                </Text>
              </View>
            </View>
            
            {/* Difficulty Stats */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.title }]}>By Difficulty</Text>
              
              {/* Easy */}
              <View style={styles.difficultySection}>
                <Text style={[styles.difficultyTitle, { backgroundColor: '#d4edda', color: '#333' }]}>
                  😊 Easy
                </Text>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Games Played:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {statistics.difficulty.easy.played}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Games Completed:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {statistics.difficulty.easy.completed}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Completion Rate:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {getCompletionRate(
                      statistics.difficulty.easy?.played || 0, 
                      statistics.difficulty.easy?.completed || 0
                    )}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Best Time:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {formatBestTime(statistics.difficulty.easy?.bestTime)}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Best Score:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {formatBestScore(statistics.difficulty.easy?.bestScore)}
                  </Text>
                </View>
              </View>
              
              {/* Medium */}
              <View style={styles.difficultySection}>
                <Text style={[styles.difficultyTitle, { backgroundColor: '#ffeeba', color: '#333' }]}>
                  😐 Medium
                </Text>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Games Played:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {statistics.difficulty.medium.played}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Games Completed:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {statistics.difficulty.medium.completed}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Completion Rate:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {getCompletionRate(
                      statistics.difficulty.medium.played, 
                      statistics.difficulty.medium.completed
                    )}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Best Time:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {formatBestTime(statistics.difficulty.medium?.bestTime)}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Best Score:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {formatBestScore(statistics.difficulty.medium?.bestScore)}
                  </Text>
                </View>
              </View>
              
              {/* Hard */}
              <View style={styles.difficultySection}>
                <Text style={[styles.difficultyTitle, { backgroundColor: '#f8d7da', color: '#333' }]}>
                  😎 Hard
                </Text>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Games Played:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {statistics.difficulty.hard.played}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Games Completed:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {statistics.difficulty.hard.completed}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Completion Rate:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {getCompletionRate(
                      statistics.difficulty.hard.played, 
                      statistics.difficulty.hard.completed
                    )}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Best Time:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {formatBestTime(statistics.difficulty.hard?.bestTime)}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Best Score:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {formatBestScore(statistics.difficulty.hard?.bestScore)}
                  </Text>
                </View>
              </View>
              
              {/* Expert */}
              <View style={styles.difficultySection}>
                <Text style={[styles.difficultyTitle, { backgroundColor: '#f8d7da', color: '#333' }]}>
                  😈 Expert
                </Text>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Games Played:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {statistics.difficulty.expert.played}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Games Completed:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {statistics.difficulty.expert.completed}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Completion Rate:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {getCompletionRate(
                      statistics.difficulty.expert.played, 
                      statistics.difficulty.expert.completed
                    )}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Best Time:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {formatBestTime(statistics.difficulty.expert?.bestTime)}
                  </Text>
                </View>
                
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: theme.colors.cell.text }]}>Best Score:</Text>
                  <Text style={[styles.statValue, { color: theme.colors.cell.text }]}>
                    {formatBestScore(statistics.difficulty.expert?.bestScore)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 2,
  },
  closeText: {
    fontSize: 18,
    color: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  scrollContent: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: {
    marginVertical: 12,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  difficultySection: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  difficultyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StatisticsModal;