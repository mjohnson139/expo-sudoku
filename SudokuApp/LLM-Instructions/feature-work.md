# Current Feature Work

    • Undo/redo
      – Maintain a history stack for cell changes and notes.
      – Record each user action (value set/clear, note add/remove) with previous and new state.
      – After each new action, clear the redo stack.
      – Implement “undo”: pop the last action from the undo stack, reverse it, and push it onto the redo stack.
      – Implement “redo”: pop the last action from the redo stack, reapply it, and push it back onto the undo stack.
      – Define a consistent action schema (type, cellKey, previousValue, newValue, previousNotes, newNotes).
      – Update board and cellNotes state appropriately when applying undo/redo.
      – Add Undo and Redo buttons to the UI, disabling them when their respective stack is empty.
      – Ensure cell selection, feedback highlighting, and related-cell highlighting are updated after undo/redo.