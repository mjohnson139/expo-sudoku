# Current work in progress

## Pause Screen Feature Implementation

This feature will create a separate pause modal that appears when the game is paused, rather than using the same menu modal for both functions.

### Tasks

- [x] Create new `PauseModal.js` component in the `components/modals` directory
- [x] Implement basic modal with resume and quit buttons
- [x] Style the modal to match the app's design language
- [x] Update `GameContext.js` to include separate states for pause modal and menu modal 
- [x] Add pause modal to `GameScreen.js`
- [x] Implement resume button functionality (unpause game)
- [x] Implement quit button functionality (return to menu)
- [x] Test modal appearance and functionality on different screen sizes
- [x] Add animation for modal appearance (included with the Modal component)
- [x] Update relevant components to use the new pause modal
- [x] Add entry to build notes in `buildNotes.js` for this feature
