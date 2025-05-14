import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import BUILD_NOTES from '../utils/buildNotes';

const BuildNotes = ({ version, isVisible, onClose, theme }) => {
  if (!isVisible) return null;

  const notes = BUILD_NOTES[version] || { title: 'Unknown Version', notes: ['No notes available'] };

  // Get screen dimensions to position the notes panel properly
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  // Determine if we should display in center or side position based on screen size
  const isCenterPosition = screenWidth < 500;

  return (
    <View style={[
      styles.container,
      isCenterPosition ? styles.centerContainer : styles.sideContainer,
      {
        backgroundColor: theme.colors.numberPad.background,
        borderColor: theme.colors.numberPad.border
      }
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.title }]}>
          {notes.title} (Build {version})
        </Text>
        <TouchableOpacity 
          onPress={onClose} 
          accessibilityLabel="Close build notes"
          accessibilityRole="button"
          accessibilityHint="Closes the build notes panel"
        >
          <Text style={[styles.closeButton, { color: theme.colors.title }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={[
          styles.scrollView,
          isCenterPosition ? styles.centerScrollView : {}
        ]}
        accessibilityLabel="Build notes content"
      >
        {notes.notes.map((note, index) => (
          <View key={index} style={styles.noteItem}>
            <Text style={[styles.bulletPoint, { color: theme.colors.title }]}>•</Text>
            <Text style={[styles.noteText, { color: theme.colors.title }]}>{note}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  sideContainer: {
    right: 10,
    top: 60,
    width: 200,
    maxHeight: 400,
  },
  centerContainer: {
    top: '15%',
    left: '10%',
    right: '10%',
    width: '80%',
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  closeButton: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 2,
  },
  scrollView: {
    maxHeight: 300,
  },
  centerScrollView: {
    // Use fixed pixel value instead of percentage to avoid nested percentage issues
    maxHeight: 400,
  },
  noteItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletPoint: {
    marginRight: 6,
  },
  noteText: {
    fontSize: 12,
    flex: 1,
  }
});

export default BuildNotes;