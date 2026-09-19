/**
 * undoRedo.test.js
 * Comprehensive automated test suite verifying:
 * 1. 5-step sequential test (place, move, rotate, delete, add window)
 * 2. Complete undo sequence across all 5 steps with exact state verification at each step
 * 3. Complete redo sequence across all 5 steps with exact state verification at each step
 * 4. Filtering of continuous drag frames (drag does not pollute history)
 * 5. Session-only history reset on room initialization / switch / creation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomStore } from '../roomStore.js';

describe('Undo / Redo Architecture and Execution', () => {
  const initialRoom = {
    id: 'test-room-1',
    name: 'Test Living Room',
    widthCm: 500,
    depthCm: 400,
    doors: [
      { id: 'door-1', wall: 'bottom', offsetCm: 50, widthCm: 90 },
    ],
    windows: [
      { id: 'win-1', wall: 'top', offsetCm: 150, widthCm: 120 },
    ],
    placedFurniture: [],
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset store state cleanly before each test
    useRoomStore.setState({
      room: JSON.parse(JSON.stringify(initialRoom)),
      selectedItemId: null,
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
      collidingItemIds: new Set(),
      boundaryCollidingIds: new Set(),
    });
  });

  it('executes the 5-step sequential test, undoes all 5, and redoes all 5 with exact assertions', () => {
    const store = useRoomStore.getState();

    // Baseline assertions
    expect(useRoomStore.getState().room.placedFurniture.length).toBe(0);
    expect(useRoomStore.getState().room.windows.length).toBe(1);
    expect(useRoomStore.getState().canUndo).toBe(false);
    expect(useRoomStore.getState().canRedo).toBe(false);

    // ==========================================
    // STEP 1: Place furniture piece
    // ==========================================
    useRoomStore.getState().addFurniture('sofa-3seat', 200, 200);
    const step1Furniture = useRoomStore.getState().room.placedFurniture;
    expect(step1Furniture.length).toBe(1);
    const pieceId = step1Furniture[0].id;
    const initialPos = { x: step1Furniture[0].x, y: step1Furniture[0].y };
    expect(useRoomStore.getState().canUndo).toBe(true);
    expect(useRoomStore.getState().canRedo).toBe(false);

    // ==========================================
    // STEP 2: Move furniture piece (discrete drag simulation)
    // ==========================================
    const preMoveSnapshot = useRoomStore.getState().getCurrentSnapshot();
    // Simulate live drag frames
    useRoomStore.getState().updateFurniturePosition(pieceId, 220, 220, false);
    useRoomStore.getState().updateFurniturePosition(pieceId, 240, 240, false);
    useRoomStore.getState().updateFurniturePosition(pieceId, 250, 250, false);
    // Pointer up commits pre-drag snapshot
    useRoomStore.getState().pushExplicitSnapshot(preMoveSnapshot);

    const step2Piece = useRoomStore.getState().room.placedFurniture.find((i) => i.id === pieceId);
    expect(step2Piece.x).toBe(250);
    expect(step2Piece.y).toBe(250);
    expect(step2Piece.rotationDeg).toBe(0);

    // ==========================================
    // STEP 3: Rotate furniture piece (discrete rotate simulation)
    // ==========================================
    const preRotateSnapshot = useRoomStore.getState().getCurrentSnapshot();
    // Simulate live knob rotation frames
    useRoomStore.getState().updateFurnitureRotation(pieceId, 45, false);
    useRoomStore.getState().updateFurnitureRotation(pieceId, 90, false);
    // Pointer up commits pre-rotate snapshot
    useRoomStore.getState().pushExplicitSnapshot(preRotateSnapshot);

    const step3Piece = useRoomStore.getState().room.placedFurniture.find((i) => i.id === pieceId);
    expect(step3Piece.rotationDeg).toBe(90);
    expect(step3Piece.x).toBe(250);
    expect(step3Piece.y).toBe(250);

    // ==========================================
    // STEP 4: Delete furniture piece
    // ==========================================
    useRoomStore.getState().removeFurniture(pieceId);
    expect(useRoomStore.getState().room.placedFurniture.length).toBe(0);

    // ==========================================
    // STEP 5: Add window
    // ==========================================
    useRoomStore.getState().addOpening('window', 'right');
    const windowsAfterStep5 = useRoomStore.getState().room.windows;
    expect(windowsAfterStep5.length).toBe(2);
    const addedWindow = windowsAfterStep5.find((w) => w.wall === 'right');
    expect(addedWindow).toBeDefined();

    // Verify history stack has exactly 5 undo actions
    expect(useRoomStore.getState().undoStack.length).toBe(5);

    // =========================================================================
    // UNDO ALL 5 IN REVERSE ORDER WITH EXACT STATE VERIFICATION AT EACH STEP
    // =========================================================================

    // Undo 1 (reverts Step 5: add window) -> back to post-Step 4 state
    useRoomStore.getState().undo();
    expect(useRoomStore.getState().room.windows.length).toBe(1);
    expect(useRoomStore.getState().room.windows.some((w) => w.wall === 'right')).toBe(false);
    expect(useRoomStore.getState().room.placedFurniture.length).toBe(0);
    expect(useRoomStore.getState().canUndo).toBe(true);
    expect(useRoomStore.getState().canRedo).toBe(true);

    // Undo 2 (reverts Step 4: delete piece) -> back to post-Step 3 state
    useRoomStore.getState().undo();
    expect(useRoomStore.getState().room.placedFurniture.length).toBe(1);
    const restoredStep3Piece = useRoomStore.getState().room.placedFurniture[0];
    expect(restoredStep3Piece.id).toBe(pieceId);
    expect(restoredStep3Piece.x).toBe(250);
    expect(restoredStep3Piece.y).toBe(250);
    expect(restoredStep3Piece.rotationDeg).toBe(90);

    // Undo 3 (reverts Step 3: rotate to 90°) -> back to post-Step 2 state
    useRoomStore.getState().undo();
    const restoredStep2Piece = useRoomStore.getState().room.placedFurniture[0];
    expect(restoredStep2Piece.x).toBe(250);
    expect(restoredStep2Piece.y).toBe(250);
    expect(restoredStep2Piece.rotationDeg).toBe(0);

    // Undo 4 (reverts Step 2: move to (250, 250)) -> back to post-Step 1 state
    useRoomStore.getState().undo();
    const restoredStep1Piece = useRoomStore.getState().room.placedFurniture[0];
    expect(restoredStep1Piece.x).toBe(initialPos.x);
    expect(restoredStep1Piece.y).toBe(initialPos.y);
    expect(restoredStep1Piece.rotationDeg).toBe(0);

    // Undo 5 (reverts Step 1: add furniture) -> back to initial room
    useRoomStore.getState().undo();
    expect(useRoomStore.getState().room.placedFurniture.length).toBe(0);
    expect(useRoomStore.getState().room.windows.length).toBe(1);
    expect(useRoomStore.getState().canUndo).toBe(false);
    expect(useRoomStore.getState().canRedo).toBe(true);

    // =========================================================================
    // REDO ALL 5 FORWARD WITH EXACT STATE VERIFICATION AT EACH STEP
    // =========================================================================

    // Redo 1 (re-applies Step 1: place sofa)
    useRoomStore.getState().redo();
    expect(useRoomStore.getState().room.placedFurniture.length).toBe(1);
    const redo1Piece = useRoomStore.getState().room.placedFurniture[0];
    expect(redo1Piece.x).toBe(initialPos.x);
    expect(redo1Piece.y).toBe(initialPos.y);
    expect(redo1Piece.rotationDeg).toBe(0);
    expect(useRoomStore.getState().canUndo).toBe(true);

    // Redo 2 (re-applies Step 2: move sofa to 250, 250)
    useRoomStore.getState().redo();
    const redo2Piece = useRoomStore.getState().room.placedFurniture[0];
    expect(redo2Piece.x).toBe(250);
    expect(redo2Piece.y).toBe(250);
    expect(redo2Piece.rotationDeg).toBe(0);

    // Redo 3 (re-applies Step 3: rotate sofa to 90°)
    useRoomStore.getState().redo();
    const redo3Piece = useRoomStore.getState().room.placedFurniture[0];
    expect(redo3Piece.x).toBe(250);
    expect(redo3Piece.y).toBe(250);
    expect(redo3Piece.rotationDeg).toBe(90);

    // Redo 4 (re-applies Step 4: delete sofa)
    useRoomStore.getState().redo();
    expect(useRoomStore.getState().room.placedFurniture.length).toBe(0);

    // Redo 5 (re-applies Step 5: add right-wall window)
    useRoomStore.getState().redo();
    expect(useRoomStore.getState().room.windows.length).toBe(2);
    expect(useRoomStore.getState().room.windows.some((w) => w.wall === 'right')).toBe(true);
    expect(useRoomStore.getState().canUndo).toBe(true);
    expect(useRoomStore.getState().canRedo).toBe(false);
  });

  it('guarantees intermediate drag frames do not flood the history stack', () => {
    useRoomStore.getState().addFurniture('armchair', 100, 100);
    const piece = useRoomStore.getState().room.placedFurniture[0];

    const preDragSnapshot = useRoomStore.getState().getCurrentSnapshot();

    // 25 intermediate frames of mouse drag
    for (let i = 1; i <= 25; i++) {
      useRoomStore.getState().updateFurniturePosition(piece.id, 100 + i, 100 + i, false);
    }

    // Pointer up commits only once
    useRoomStore.getState().pushExplicitSnapshot(preDragSnapshot);

    // History stack should have exactly 2 actions (1 for add, 1 for the completed drag)
    expect(useRoomStore.getState().undoStack.length).toBe(2);

    // Undoing once brings it back to (100, 100)
    useRoomStore.getState().undo();
    const restored = useRoomStore.getState().room.placedFurniture[0];
    expect(restored.x).toBe(100);
    expect(restored.y).toBe(100);
  });

  it('resets history on clearHistory (session-only guarantee)', () => {
    useRoomStore.getState().addFurniture('dining-table-large', 200, 200);
    expect(useRoomStore.getState().undoStack.length).toBe(1);
    expect(useRoomStore.getState().canUndo).toBe(true);

    useRoomStore.getState().clearHistory();
    expect(useRoomStore.getState().undoStack.length).toBe(0);
    expect(useRoomStore.getState().redoStack.length).toBe(0);
    expect(useRoomStore.getState().canUndo).toBe(false);
    expect(useRoomStore.getState().canRedo).toBe(false);
  });

  it('reorders furniture and records undo/redo history correctly', () => {
    // Add two items: coffee table first, then rug
    useRoomStore.getState().addFurniture('coffee-table', 150, 150);
    useRoomStore.getState().addFurniture('rug-living', 150, 150);

    const itemsInitial = useRoomStore.getState().room.placedFurniture;
    expect(itemsInitial.length).toBe(2);
    const tableId = itemsInitial[0].id;
    const rugId = itemsInitial[1].id;

    // Initially table is index 0, rug is index 1 (rug covers table)
    expect(useRoomStore.getState().room.placedFurniture[0].id).toBe(tableId);
    expect(useRoomStore.getState().room.placedFurniture[1].id).toBe(rugId);

    // Send rug backward ('down')
    useRoomStore.getState().reorderFurniture(rugId, 'down');

    // Rug is now index 0, table is index 1 (table sits on rug)
    expect(useRoomStore.getState().room.placedFurniture[0].id).toBe(rugId);
    expect(useRoomStore.getState().room.placedFurniture[1].id).toBe(tableId);

    // Undo restores initial order
    useRoomStore.getState().undo();
    expect(useRoomStore.getState().room.placedFurniture[0].id).toBe(tableId);
    expect(useRoomStore.getState().room.placedFurniture[1].id).toBe(rugId);

    // Redo re-applies reorder
    useRoomStore.getState().redo();
    expect(useRoomStore.getState().room.placedFurniture[0].id).toBe(rugId);
    expect(useRoomStore.getState().room.placedFurniture[1].id).toBe(tableId);
  });
});
