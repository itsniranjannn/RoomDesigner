import { test, expect } from './fixtures.js';
import { addByClick, createRoomFromPreset, openApp } from './helpers.js';

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
