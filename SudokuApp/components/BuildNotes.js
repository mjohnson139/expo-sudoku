import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import BUILD_NOTES from '../utils/buildNotes';

const BuildNotes = ({ version, isVisible, onClose, theme }) => {
  if (!isVisible) return null;
  
  const notes = BUILD_NOTES[version] || { title: 'Unknown Version', notes: ['No notes available'] };
  
  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: theme.colors.numberPad.background,
        borderColor: theme.colors.numberPad.border
      }
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.title }]}>
          {notes.title} (Build {version})
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.closeButton, { color: theme.colors.title }]}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
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
    right: 10,
    top: 60,
    width: 200,
    maxHeight: 400,
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