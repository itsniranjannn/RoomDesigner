import { test, expect } from './fixtures.js';
import { addByClick, createRoomFromPreset, openApp, piecePosition } from './helpers.js';

/**
 * Keyboard-only paths across the drawing surfaces. Everything here is driven with real key
 * presses: the plan, the measure tool and the flat designer are transparent SVG surfaces, so
 * a mouse-shaped test would pass while a keyboard user was stuck.
 */

const plan = (page) => page.getByLabel('Room plan');
const crosshair = (page) => page.getByTestId('keyboard-crosshair');

/** The service points marked on the plan. */
const serviceMarks = (page) => page.locator('[data-service]');

async function openServices(page) {
  await page.getByRole('button', { name: /^Services/ }).focus();
  await page.keyboard.press('Enter');
  const panel = page.getByRole('dialog', { name: 'Services' });
  await expect(panel).toBeVisible();
  return panel;
}

test.describe('placing service points by keyboard', () => {
  test('arrow keys move a crosshair and Enter marks a socket', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room'); // 500 x 400 cm
    const panel = await openServices(page);

    await panel.getByRole('button', { name: 'Socket' }).focus();
    await page.keyboard.press('Enter');
    await expect(panel.getByRole('status')).toContainText('arrow keys');
    // Choosing a kind hands the plan the keyboard, so the arrows reach it straight away
    await expect(plan(page)).toBeFocused();
    await expect(crosshair(page)).toHaveCount(0);

    // The first arrow brings the crosshair out in the middle of the room
    await page.keyboard.press('ArrowRight');
    await expect(crosshair(page)).toHaveAttribute('data-crosshair', '250,200');
    await expect(panel.getByRole('status')).toContainText('250 cm across, 200 cm down');

    // 10 cm a step, 50 cm with Shift
    await page.keyboard.press('ArrowRight');
    await expect(crosshair(page)).toHaveAttribute('data-crosshair', '260,200');
    await page.keyboard.press('Shift+ArrowUp');
    await expect(crosshair(page)).toHaveAttribute('data-crosshair', '260,150');

    // Enter marks the point. A socket is wall-mounted, so it lands on the nearest wall.
    await expect(serviceMarks(page)).toHaveCount(0);
    await page.keyboard.press('Enter');
    await expect(serviceMarks(page)).toHaveCount(1);
    await expect(serviceMarks(page)).toHaveAttribute('data-service', 'socket');
    await expect(panel.getByRole('status')).toContainText('Socket placed at');

    // Still placing: another Enter somewhere else marks a second point
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Enter');
    await expect(serviceMarks(page)).toHaveCount(2);

    // Esc clears the crosshair and leaves the tool, as clicking Done would
    await page.keyboard.press('Escape');
    await expect(crosshair(page)).toHaveCount(0);
    await expect(panel.getByText(/2 points marked/)).toBeVisible();
  });

  test('the crosshair stops at the walls and places a floor point where it is', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    const panel = await openServices(page);
    await panel.getByRole('button', { name: 'Drain' }).focus();
    await page.keyboard.press('Enter');

    await page.keyboard.press('ArrowUp'); // brings it out at 250,200
    for (let i = 0; i < 12; i += 1) await page.keyboard.press('Shift+ArrowLeft');
    await expect(crosshair(page)).toHaveAttribute('data-crosshair', '0,200');
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('Shift+ArrowRight');
    await expect(crosshair(page)).toHaveAttribute('data-crosshair', '150,200');

    await page.keyboard.press('Enter');
    await expect(serviceMarks(page)).toHaveCount(1);
    // A drain sits on the floor, so it stays exactly where the crosshair was
    await expect(serviceMarks(page)).toHaveAttribute('data-service', 'drain');
    await expect(serviceMarks(page)).toHaveAttribute('transform', 'translate(150 200) rotate(0)');
  });
});

test.describe('measuring by keyboard', () => {
  test('Enter sets each end of the line and the length is announced', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    await plan(page).focus();
    await page.keyboard.press('m');
    const card = page.getByTestId('measure-card');
    await expect(card).toHaveRole('status');
    await expect(card).toContainText('arrow keys');
    await expect(plan(page)).toBeFocused();

    await page.keyboard.press('ArrowLeft'); // out at 250,200, then one step left
    await expect(crosshair(page)).toHaveAttribute('data-crosshair', '250,200');
    await page.keyboard.press('Enter');
    await expect(card).toContainText('First point at 250 cm across, 200 cm down');
    await expect(page.getByTestId('measure-start')).toHaveCount(1);

    for (let i = 0; i < 2; i += 1) await page.keyboard.press('Shift+ArrowRight');
    await expect(page.getByTestId('measurement-live')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('measurement')).toHaveCount(1);
    await expect(card).toContainText('Measured 1.00 m');
    await expect(card).toContainText('from 250 cm across, 200 cm down to 350 cm across');

    // A second measurement can be taken straight after
    await page.keyboard.press('Enter');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('measurement')).toHaveCount(2);
  });

  test('Escape drops a half-taken measurement, then leaves the tool', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    await plan(page).focus();
    await page.keyboard.press('m');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('measure-start')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('measure-start')).toHaveCount(0);
    await expect(page.getByTestId('measure-card')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('measure-card')).toHaveCount(0);
    await expect(crosshair(page)).toHaveCount(0);
  });

  test('the arrows nudge the selected piece, not the crosshair, with no tool running', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    await addByClick(page, '3-Seater Sofa');
    await plan(page).focus();
    await page.keyboard.press('ArrowRight');
    await expect(crosshair(page)).toHaveCount(0);
  });
});

test.describe('drawing a flat by keyboard', () => {
  /** A blank flat, created without touching the mouse on the plan. */
  async function blankFlat(page) {
    await openApp(page);
    await page.getByRole('button', { name: 'Design a flat' }).click();
    const dialog = page.getByRole('dialog', { name: 'Design a flat' });
    await dialog.getByRole('combobox', { name: 'Start from' }).selectOption({ label: 'Blank' });
    await dialog.getByRole('button', { name: 'Create flat' }).click();
    await expect(page.getByRole('application')).toBeVisible();
    await page.getByRole('button', { name: 'Start with a blank plan' }).click();
  }

  const details = (page) => page.getByRole('complementary', { name: 'Details' });
  const stat = (page, label) =>
    details(page).getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');

  /** Presses an arrow n times. */
  async function arrows(page, key, n) {
    for (let i = 0; i < n; i += 1) await page.keyboard.press(key);
  }

  /** Where the crosshair stands, in cm. */
  async function at(page) {
    const value = await crosshair(page).getAttribute('data-crosshair');
    const [x, y] = value.split(',').map(Number);
    return { x, y };
  }

  /**
   * Draws a 400 by 300 cm box with the Wall tool, using only the arrow keys and Enter.
   * Returns the top-left corner it started from.
   */
  async function drawBoxByKeyboard(page) {
    await page.keyboard.press('ArrowRight');
    const home = await at(page);
    await page.keyboard.press('Enter');
    await arrows(page, 'Shift+ArrowRight', 8);
    await page.keyboard.press('Enter');
    await arrows(page, 'Shift+ArrowDown', 6);
    await page.keyboard.press('Enter');
    await arrows(page, 'Shift+ArrowLeft', 8);
    await page.keyboard.press('Enter');
    await arrows(page, 'Shift+ArrowUp', 6);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    return home;
  }

  test('the plan says the arrow keys work, and they draw a closed room', async ({ page }) => {
    await blankFlat(page);
    const svg = page.getByRole('application');
    await expect(svg).toHaveAttribute('aria-label', /arrow keys/);
    await expect(svg).toHaveAttribute('aria-label', /press Enter/);
    // The Wall tool is already chosen on a blank plan
    await expect(page.getByRole('button', { name: 'Draw wall (W)' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await svg.focus();
    await expect(crosshair(page)).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    await expect(crosshair(page)).toHaveCount(1);
    const home = await at(page);

    // 10 cm a step, 50 cm with Shift
    await page.keyboard.press('ArrowRight');
    expect(await at(page)).toEqual({ x: home.x + 10, y: home.y });
    await page.keyboard.press('Shift+ArrowDown');
    expect(await at(page)).toEqual({ x: home.x + 10, y: home.y + 50 });
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Shift+ArrowUp');
    expect(await at(page)).toEqual(home);
    await expect(page.getByTestId('flat-status')).toContainText('Crosshair at');

    // Four walls, each drawn with Enter at the corner: 400 cm by 300 cm
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('flat-status')).toContainText('Wall started at');
    await arrows(page, 'Shift+ArrowRight', 8);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('flat-status')).toContainText('Wall drawn to');
    await arrows(page, 'Shift+ArrowDown', 6);
    await page.keyboard.press('Enter');
    await arrows(page, 'Shift+ArrowLeft', 8);
    await page.keyboard.press('Enter');
    await arrows(page, 'Shift+ArrowUp', 6);
    await page.keyboard.press('Enter');

    // The box is closed, so the room appears
    await expect(page.getByRole('region', { name: 'Flat plan' }).getByText('1 room')).toBeVisible();
    await expect(stat(page, 'Rooms in the flat')).toHaveText('1');

    // Esc finishes the run of walls and takes the crosshair down
    await page.keyboard.press('Escape');
    await expect(crosshair(page)).toHaveCount(0);
  });

  test('a door and a window go onto a wall, and a wall can be selected and deleted', async ({
    page,
  }) => {
    await blankFlat(page);
    const svg = page.getByRole('application');
    await svg.focus();
    const home = await drawBoxByKeyboard(page);
    await expect(stat(page, 'Rooms in the flat')).toHaveText('1');

    /**
     * Picks a tool and puts the crosshair `alongCm` to the right of the box's top-left
     * corner, which runs along its top wall. Esc first, so the crosshair comes back out
     * at the same spot every time.
     */
    async function aimAlongTopWall(toolName, alongCm) {
      await svg.focus();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: toolName }).click();
      await svg.focus();
      await page.keyboard.press('ArrowRight');
      expect(await at(page)).toEqual(home);
      await arrows(page, 'Shift+ArrowRight', Math.floor(alongCm / 50));
      await arrows(page, 'ArrowRight', (alongCm % 50) / 10);
      expect(await at(page)).toEqual({ x: home.x + alongCm, y: home.y });
    }

    await aimAlongTopWall('Door (D)', 100);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('flat-status')).toContainText('Door added at');
    // Placing an opening selects it, so the Details panel becomes the door's
    await expect(details(page).getByRole('heading', { name: 'Door', level: 2 })).toBeVisible();

    // A window further along the same wall, clear of the door
    await aimAlongTopWall('Window (N)', 300);
    await page.keyboard.press('Enter');
    await expect(details(page).getByRole('heading', { name: 'Window', level: 2 })).toBeVisible();

    await details(page).getByRole('button', { name: 'Flat overview' }).click();
    await expect(stat(page, 'Doors on this floor')).toHaveText('1');
    await expect(stat(page, 'Windows on this floor')).toHaveText('1');

    // Select that wall with the crosshair, clear of both openings, then delete it
    await aimAlongTopWall('Select (V)', 170);
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('flat-status')).toContainText('Wall selected');
    await page.keyboard.press('Delete');
    await expect(stat(page, 'Doors on this floor')).toHaveText('0');
    await expect(stat(page, 'Rooms in the flat')).toHaveText('0');
  });
});

/** What has focus now: its accessible name, or BODY when focus was dropped. */
const focusName = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'BODY';
    return (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 48);
  });

test.describe('focus is handed on, never dropped', () => {
  test('Create room leaves focus in the editor', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Start a new room' }).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'New room' });
    await dialog.getByRole('button', { name: 'Create room' }).focus();
    await page.keyboard.press('Enter');
    await expect(plan(page)).toBeVisible();
    await expect(plan(page)).toBeFocused();
  });

  test('choosing a piece from the Pieces list moves focus into its panel', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    await addByClick(page, '3-Seater Sofa');
    await addByClick(page, 'Coffee Table');
    const piece = page.getByRole('complementary', { name: 'Selected piece' });
    await piece.getByRole('button', { name: 'Room overview' }).focus();
    await page.keyboard.press('Enter');

    const room = page.getByRole('complementary', { name: 'Room details' });
    await room
      .getByRole('button', { name: /3-Seater Sofa/ })
      .first()
      .focus();
    await page.keyboard.press('Enter');
    await expect(piece).toBeVisible();
    // The row that was focused has gone, so the panel that replaced it takes over
    await expect(piece.getByRole('button', { name: 'Room overview' })).toBeFocused();
  });

  test('Back to all rooms leaves focus on the page that replaced the editor', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    await page.getByRole('button', { name: 'Back to all rooms' }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Start a new room' })).toBeVisible();
    // The hand-over happens on the next animation frame, which can be after the button is on
    // screen: reading once right here was a race, and on a quick machine it lost.
    await expect(async () => {
      expect(await focusName(page)).not.toBe('BODY');
    }).toPass({ timeout: 3000 });
  });
});

test.describe('the walkthrough hands focus on and gives it back', () => {
  test('a room walkthrough lands on Stop walking, and Escape comes back to the walk button', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    await page.getByRole('button', { name: '3D view' }).click();
    await expect(page.getByLabel('3D room preview')).toBeVisible();

    const walk = page.getByRole('button', { name: 'Walk through the room' });
    await walk.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Walkthrough controls')).toBeVisible();
    // The pad keys are all out of the tab order, so the exit button is the landing place
    await expect(page.getByRole('button', { name: 'Stop walking (Esc)' })).toBeFocused();

    // WalkHud's own Escape ends the walk, and the focus goes back where it came from
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Walkthrough controls')).toBeHidden();
    await expect(walk).toBeFocused();
  });

  test('the flat walkthrough does the same', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Design a flat' }).click();
    const dialog = page.getByRole('dialog', { name: 'Design a flat' });
    await dialog
      .getByRole('combobox', { name: 'Start from' })
      .selectOption({ label: 'Two-bedroom flat' });
    await dialog.getByRole('button', { name: 'Create flat' }).click();
    await expect(page.getByRole('application')).toBeVisible();

    await page.getByRole('button', { name: '3D view' }).click();
    await expect(page.getByLabel('3D view of the flat')).toBeVisible();

    const walk = page.getByRole('button', { name: 'Walk through the flat' });
    await walk.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Walkthrough controls')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stop walking (Esc)' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Walkthrough controls')).toBeHidden();
    await expect(walk).toBeFocused();
  });
});

test.describe('doors and windows can be placed by typing a number', () => {
  /** Selects everything in a number box and types a new value, then commits it with Enter. */
  async function retype(page, box, value) {
    await box.focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type(value);
    await page.keyboard.press('Enter');
  }

  test('the room panel slides a door along its wall and widens a window', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room'); // 500 x 400 cm
    const panel = page.getByRole('complementary', { name: 'Room details' });
    await expect(
      panel.getByText(/Set the position above to place a door or window exactly/)
    ).toBeVisible();

    // The door starts 50 cm along the bottom wall; it can be put anywhere by typing
    const door = panel.locator('[data-opening="door-1"]');
    const position = door.getByRole('spinbutton', { name: 'Position' });
    await expect(position).toHaveValue('50');
    await retype(page, position, '260');
    await expect(position).toHaveValue('260');

    // The arrows step it, in the 5 cm the box asks for, and Enter commits the step
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(position).toHaveValue('265');

    // It reached the room, not just the box: Undo puts the door back where it stood before
    const undo = page.getByRole('button', { name: /^Undo/ });
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(position).toHaveValue('260');

    // The far corner is as far as it goes: 500 wall, 90 door, 15 cm corner margin
    await retype(page, position, '480');
    await expect(position).toHaveValue('395');
    await expect(door.getByText('Maximum is 395, so 480 was set to 395.')).toBeVisible();

    // A door has one width, so it has no width box; a window does
    await expect(door.getByRole('spinbutton', { name: 'Width' })).toHaveCount(0);
    const win = panel.locator('[data-opening="window-1"]');
    const width = win.getByRole('spinbutton', { name: 'Width' });
    await expect(width).toHaveValue('120');
    await retype(page, width, '200');
    await expect(width).toHaveValue('200');
  });

  test('the flat designer places a door on its wall piece by number', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Design a flat' }).click();
    const dialog = page.getByRole('dialog', { name: 'Design a flat' });
    await dialog.getByRole('combobox', { name: 'Start from' }).selectOption({ label: 'Blank' });
    await dialog.getByRole('button', { name: 'Create flat' }).click();
    await expect(page.getByRole('application')).toBeVisible();
    await page.getByRole('button', { name: 'Start with a blank plan' }).click();

    // A 400 by 300 box and a door 100 cm along its top wall, all with the keyboard
    const svg = page.getByRole('application');
    await svg.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    for (let i = 0; i < 8; i += 1) await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Enter');
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Enter');
    for (let i = 0; i < 8; i += 1) await page.keyboard.press('Shift+ArrowLeft');
    await page.keyboard.press('Enter');
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('Shift+ArrowUp');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Door (D)' }).click();
    await svg.focus();
    await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 2; i += 1) await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Enter');

    const details = page.getByRole('complementary', { name: 'Details' });
    await expect(details.getByRole('heading', { name: 'Door', level: 2 })).toBeVisible();
    // The door is centred on the point it was placed at, 100 cm along a wall that starts at 0
    const position = details.getByRole('spinbutton', { name: 'Position' });
    await expect(position).toHaveValue('60');
    await retype(page, position, '220');
    await expect(position).toHaveValue('220');

    // 400 cm of wall and a 90 cm door, so 310 is the end of it
    await retype(page, position, '390');
    await expect(position).toHaveValue('310');
    // A door is one standard width, so there is no width box for it
    await expect(details.getByRole('spinbutton', { name: 'Width' })).toHaveCount(0);
  });
});

test.describe('a room can be resized after it was created', () => {
  test('Width and Depth refit the furniture and the openings, and Undo puts the size back', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room'); // 500 x 400 cm
    await addByClick(page, 'Coffee Table');
    expect(await piecePosition(page)).toEqual({ x: 220, y: 170 });

    const piece = page.getByRole('complementary', { name: 'Selected piece' });
    await piece.getByRole('button', { name: 'Room overview' }).click();
    const panel = page.getByRole('complementary', { name: 'Room details' });
    const size = panel.locator('[data-room-size]');
    const width = size.getByRole('spinbutton', { name: 'Width' });
    await expect(width).toHaveValue('500');

    // 500 cm down to 200: the table no longer fits where it stood, nor does the window
    await width.focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('200');
    await page.keyboard.press('Enter');

    await expect(panel.getByText('2.00 x 2.00 m')).toHaveCount(0);
    await expect(panel.getByText('2.00 x 4.00 m')).toBeVisible();
    const said = panel.getByRole('status');
    await expect(said).toContainText('The room is now 200 by 400 cm.');
    await expect(said).toContainText('1 piece was moved to fit the new size.');
    await expect(said).toContainText('1 door or window was moved to fit its wall.');

    // The window was 190 cm along a 500 cm wall; on a 200 cm wall it goes as far as it can
    await expect(
      panel.locator('[data-opening="window-1"]').getByRole('spinbutton', { name: 'Position' })
    ).toHaveValue('65');

    // The table was brought back inside rather than left outside the room or dropped
    await panel
      .getByRole('button', { name: /Coffee Table/ })
      .first()
      .click();
    expect(await piecePosition(page)).toEqual({ x: 145, y: 170 });

    // One Undo gives the old room back, with the window where it was
    await page.getByRole('button', { name: /^Undo/ }).click();
    await expect(panel.getByText('5.00 x 4.00 m')).toBeVisible();
    await expect(
      panel.locator('[data-opening="window-1"]').getByRole('spinbutton', { name: 'Position' })
    ).toHaveValue('190');
    // And the line about the resize goes with it, rather than describing a room that is gone
    await expect(panel.getByRole('status')).toHaveCount(0);

    // The range is the one the New room dialog allows, and a number outside it says so
    await width.focus();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('1600');
    await page.keyboard.press('Enter');
    await expect(width).toHaveValue('1500');
    await expect(size.getByText('Maximum is 1500, so 1600 was set to 1500.')).toBeVisible();
    await expect(panel.getByText('15.00 x 4.00 m')).toBeVisible();
  });
});

/** A plain "photo" drawn on a canvas inside the page: a solid cabinet on a light backdrop. */
async function makeCabinetPng(page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 480;
    const g = canvas.getContext('2d');
    const r = (x, y, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x, y, w, h);
    };
    r(0, 0, 320, 480, '#cfcfcf');
    r(60, 30, 200, 420, '#8a6a4a'); // carcass
    r(66, 36, 188, 200, '#93724f'); // upper door
    r(66, 244, 188, 200, '#9c7a55'); // lower door
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(base64, 'base64');
}

test.describe('the photo dialog hands focus back when the model is built', () => {
  test('the build button keeps the keyboard, and the dialog says the model is ready', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    const catalog = page.getByRole('complementary', { name: 'Furniture' });
    await catalog.getByRole('button', { name: /Create from photos/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Create furniture from photos' });
    await dialog.getByLabel('Front photo', { exact: true }).setInputFiles({
      name: 'cabinet.png',
      mimeType: 'image/png',
      buffer: await makeCabinetPng(page),
    });

    // Build it with the keyboard. The button is disabled while it works, which drops the focus.
    const build = dialog.getByRole('button', { name: 'Build 3D model' });
    await expect(build).toBeEnabled();
    await build.focus();
    await page.keyboard.press('Enter');

    // The same button, now relabelled, has the keyboard back when the work is finished
    const rebuild = dialog.getByRole('button', { name: 'Rebuild model' });
    await expect(rebuild).toBeEnabled({ timeout: 45_000 });
    await expect(rebuild).toBeFocused();

    // And it is said out loud, for anyone who was not watching the preview
    await expect(
      dialog.getByRole('status').filter({ hasText: 'The model is built' })
    ).toBeVisible();
  });
});

test.describe('getting around with Tab', () => {
  test('a skip link is the first thing in the furniture list and reaches the plan', async ({
    page,
  }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    const skip = page.getByRole('link', { name: 'Skip the furniture list' });

    // It is the first focusable thing in the panel, and it shows itself when focused
    const aside = page.getByRole('complementary', { name: 'Furniture' });
    await expect(aside.locator('a, button, input').first()).toHaveAttribute('href', '#room-plan');
    const box = async () => (await skip.boundingBox()) || { width: 0, height: 0 };
    expect((await box()).width).toBeLessThan(4);
    await skip.focus();
    const shown = await box();
    expect(shown.width).toBeGreaterThan(100);
    expect(shown.height).toBeGreaterThan(20);
    await expect(skip).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(plan(page)).toBeFocused();

    // And from the plan the tools are a few presses away, not a hundred and seventy
    let presses = 0;
    for (; presses < 20; presses += 1) {
      await page.keyboard.press('Tab');
      if ((await focusName(page)).startsWith('Measure distance')) break;
    }
    expect(presses).toBeLessThan(6);
  });

  test('the plan tools are one tab stop that the arrow keys walk', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    const toolbar = page.getByRole('toolbar', { name: 'Plan tools' });
    await expect(toolbar.locator('button:not([tabindex="-1"])')).toHaveCount(1);

    await toolbar.getByRole('button', { name: 'Measure distance (M)' }).focus();
    await page.keyboard.press('ArrowDown');
    expect(await focusName(page)).toBe('Show distances to walls');
    await page.keyboard.press('ArrowDown');
    expect(await focusName(page)).toBe('Show clearance zones');
    await page.keyboard.press('ArrowUp');
    expect(await focusName(page)).toBe('Show distances to walls');
    await page.keyboard.press('End');
    expect(await focusName(page)).toBe('Keyboard shortcuts (?)');
    await page.keyboard.press('Home');
    expect(await focusName(page)).toBe('Measure distance (M)');

    // One Tab leaves the whole strip rather than stepping through eight buttons
    await page.keyboard.press('Tab');
    expect(await focusName(page)).not.toMatch(/^(Show|Services|Plan checks|Trace|Suggest)/);
  });

  test('the Room menu answers to the arrow keys, and Tab leaves it', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    const trigger = page.getByRole('button', { name: 'Room menu' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu', { name: 'Room menu' });
    await expect(menu).toBeVisible();
    // Focus starts on the first item instead of staying behind on the trigger
    expect(await focusName(page)).toBe('Delete room');

    await page.keyboard.press('ArrowDown');
    // Only one item here, so the arrows wrap round to it
    expect(await focusName(page)).toBe('Delete room');
    await page.keyboard.press('Tab');
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('Share & export opens on its first control, not a switch further down', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    await page.getByRole('button', { name: 'Share and export' }).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Share & export' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Copy link' })).toBeFocused();
  });
});

test.describe('the furniture list keeps the arrow keys', () => {
  test('arrows scroll the list instead of nudging the selected piece', async ({ page }) => {
    await openApp(page);
    await createRoomFromPreset(page, 'Living room');
    await addByClick(page, '3-Seater Sofa');
    const panel = page.getByRole('complementary', { name: 'Selected piece' });
    const readXY = async () => {
      const text = (await panel.innerText()).replace(/\s+/g, ' ');
      return (text.match(/From left wall ([-\d]+) cm.*?From top wall ([-\d]+) cm/) || []).join(',');
    };

    const before = await readXY();
    expect(before).not.toBe('');
    await page.getByRole('button', { name: 'Bedroom', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    expect(await readXY()).toBe(before);

    // With focus on the plan the arrows still nudge, as they always did
    await plan(page).focus();
    await page.keyboard.press('ArrowRight');
    expect(await readXY()).not.toBe(before);
  });
});
