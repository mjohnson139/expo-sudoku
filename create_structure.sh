#!/bin/bash

# Navigate to the SudokuApp directory
cd /workspaces/expo-sudoku/SudokuApp

# Create directories
mkdir -p assets
mkdir -p components
mkdir -p screens

# Create component files
touch components/Grid.js
touch components/Cell.js
touch components/NumberPad.js

# Create screens file
touch screens/GameScreen.js

# Create App.js if it doesn't exist
touch App.js

# These files likely exist already, but creating them if not
touch package.json
touch app.json
touch .gitignore

echo "Directory structure created successfully!"
