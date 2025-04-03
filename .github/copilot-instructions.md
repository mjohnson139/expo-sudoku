# Expo Sudoku Development Guide

## Build Notes and Version Management

### When Making Changes

1. **Update Build Notes**:
   - When implementing new features or fixing bugs, add details to the build notes in `/SudokuApp/utils/buildNotes.js`
   - Create a new version entry with an incremented build number (e.g., from `1.4.0` to `1.4.1` for minor changes or `1.5.0` for significant features)
   - Include a descriptive title and list all changes in bullet points
   - Example:
     ```javascript
     '1.5.0': {
       title: 'Feature Name or Bug Fix',
       date: '2023-11-XX', // Update with current date
       notes: [
         'Added new feature description',
         'Fixed specific bug description',
         'Improved specific component description',
         'Other notable changes'
       ]
     }
     ```
   - Add your entry at the end of the `BUILD_NOTES` object

2. **Update App Version**:
   - Ensure the app's version in other relevant files is consistent with your build notes

## Git Workflow

After making changes and updating build notes:

```bash
# Stage all changes
git add .

# Create a commit with a concise message that references the build version
git commit -m "v1.5.0: Added new feature X and fixed Y bug"

# Push changes to the repository (if appropriate)
git push origin main
```

## Starting the App

To start the app for testing:

```bash
# Change to the SudokuApp directory
cd SudokuApp

# Run the start script
./start-app.sh
```

This script handles:
- Detecting previous Expo processes
- Offering to kill conflicting processes
- Starting the app with consistent port usage

## Common Development Tasks

- **Add a new theme**: Add a new theme object to `/SudokuApp/utils/themes.js`
- **Modify UI components**: Update relevant files in `/SudokuApp/components/`
- **Implement game logic**: Update game logic in the appropriate files in `/SudokuApp/screens/` or `/SudokuApp/utils/`

Always test your changes thoroughly on multiple devices or emulators before committing.