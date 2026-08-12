import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';

export interface TypingOptions {
  minDelay?: number;
  maxDelay?: number;
  mistakes?: boolean;
  mistakeChance?: number;
}

export interface MouseMoveOptions {
  steps?: number;
  duration?: number;
}

@Injectable()
export class HumanBehaviorService {
  private readonly logger = new Logger(HumanBehaviorService.name);

  /**
   * Type text like a human with random delays and occasional mistakes
   */
  async humanType(
    page: Page,
    selector: string,
    text: string,
    options: TypingOptions = {},
  ): Promise<void> {
    const {
      minDelay = 50,
      maxDelay = 150,
      mistakes = true,
      mistakeChance = 0.05,
    } = options;

    const element = await page.locator(selector);
    await element.click();

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Random chance of making a typo
      if (mistakes && Math.random() < mistakeChance && i > 0) {
        // Type wrong character
        const wrongChar = String.fromCharCode(
          char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1),
        );
        await page.keyboard.type(wrongChar);
        await this.randomDelay(100, 300);

        // Backspace to correct
        await page.keyboard.press('Backspace');
        await this.randomDelay(50, 150);
      }

      // Type the correct character
      await page.keyboard.type(char);

      // Random delay between keystrokes
      await this.randomDelay(minDelay, maxDelay);

      // Occasional longer pause (thinking)
      if (Math.random() < 0.1) {
        await this.randomDelay(300, 800);
      }
    }

    this.logger.debug(`Typed text into ${selector} with human-like behavior`);
  }

  /**
   * Move mouse in a natural curved path
   */
  async humanMouseMove(
    page: Page,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options: MouseMoveOptions = {},
  ): Promise<void> {
    const { steps = 20, duration = 500 } = options;

    const points = this.generateBezierCurve(fromX, fromY, toX, toY, steps);
    const delayPerStep = duration / steps;

    for (const point of points) {
      await page.mouse.move(point.x, point.y);
      await this.randomDelay(delayPerStep * 0.8, delayPerStep * 1.2);
    }

    this.logger.debug(`Moved mouse from (${fromX},${fromY}) to (${toX},${toY})`);
  }

  /**
   * Click element with human-like behavior (move, pause, click)
   */
  async humanClick(
    page: Page,
    selector: string,
    options?: { delay?: number; button?: 'left' | 'right' | 'middle' },
  ): Promise<void> {
    const element = await page.locator(selector);
    const box = await element.boundingBox();

    if (!box) {
      throw new Error(`Element ${selector} not found or not visible`);
    }

    // Random point within element bounds
    const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
    const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);

    // Get current mouse position (approximate)
    const currentX = 100 + Math.random() * 100;
    const currentY = 100 + Math.random() * 100;

    // Move mouse to element
    await this.humanMouseMove(page, currentX, currentY, targetX, targetY);

    // Small pause before clicking
    await this.randomDelay(100, 300);

    // Click
    await page.mouse.click(targetX, targetY, {
      button: options?.button || 'left',
      delay: options?.delay || this.randomInt(50, 150),
    });

    // Small pause after clicking
    await this.randomDelay(100, 200);

    this.logger.debug(`Clicked ${selector} with human-like behavior`);
  }

  /**
   * Scroll page naturally
   */
  async humanScroll(
    page: Page,
    distance: number,
    options?: { duration?: number },
  ): Promise<void> {
    const duration = options?.duration || 1000;
    const steps = 20;
    const stepDistance = distance / steps;
    const delayPerStep = duration / steps;

    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, stepDistance);
      await this.randomDelay(delayPerStep * 0.8, delayPerStep * 1.2);
    }

    this.logger.debug(`Scrolled ${distance}px naturally`);
  }

  /**
   * Random delay between min and max milliseconds
   */
  async randomDelay(min: number, max: number): Promise<void> {
    const delay = this.randomInt(min, max);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a bezier curve for natural mouse movement
   */
  private generateBezierCurve(
    x0: number,
    y0: number,
    x3: number,
    y3: number,
    steps: number,
  ): Array<{ x: number; y: number }> {
    // Control points for bezier curve
    const x1 = x0 + (x3 - x0) * (0.25 + Math.random() * 0.25);
    const y1 = y0 + (y3 - y0) * (0.25 + Math.random() * 0.25);
    const x2 = x0 + (x3 - x0) * (0.5 + Math.random() * 0.25);
    const y2 = y0 + (y3 - y0) * (0.5 + Math.random() * 0.25);

    const points: Array<{ x: number; y: number }> = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = this.cubicBezier(t, x0, x1, x2, x3);
      const y = this.cubicBezier(t, y0, y1, y2, y3);
      points.push({ x: Math.round(x), y: Math.round(y) });
    }

    return points;
  }

  /**
   * Calculate cubic bezier point
   */
  private cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
  }

  /**
   * Simulate reading the page (random scrolls and pauses)
   */
  async simulateReading(page: Page, duration: number = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      // Random scroll
      const scrollDistance = this.randomInt(100, 300);
      await this.humanScroll(page, scrollDistance, { duration: 1000 });

      // Pause to "read"
      await this.randomDelay(1000, 3000);

      // Occasionally scroll up
      if (Math.random() < 0.2) {
        await this.humanScroll(page, -scrollDistance / 2, { duration: 500 });
        await this.randomDelay(500, 1000);
      }
    }

    this.logger.debug(`Simulated reading for ${duration}ms`);
  }

  /**
   * Random mouse movements to appear more human
   */
  async randomMouseMovements(page: Page, count: number = 5): Promise<void> {
    const viewport = page.viewportSize();
    if (!viewport) return;

    for (let i = 0; i < count; i++) {
      const fromX = this.randomInt(0, viewport.width);
      const fromY = this.randomInt(0, viewport.height);
      const toX = this.randomInt(0, viewport.width);
      const toY = this.randomInt(0, viewport.height);

      await this.humanMouseMove(page, fromX, fromY, toX, toY);
      await this.randomDelay(500, 1500);
    }

    this.logger.debug(`Performed ${count} random mouse movements`);
  }

  /**
   * Fill form with human-like behavior
   */
  async fillForm(
    page: Page,
    fields: Array<{ selector: string; value: string }>,
  ): Promise<void> {
    for (const field of fields) {
      // Random pause before filling next field
      await this.randomDelay(500, 1500);

      // Click field
      await this.humanClick(page, field.selector);

      // Small pause after clicking
      await this.randomDelay(200, 500);

      // Type value
      await this.humanType(page, field.selector, field.value);

      // Occasional pause to "think"
      if (Math.random() < 0.3) {
        await this.randomDelay(1000, 3000);
      }
    }

    this.logger.debug(`Filled form with ${fields.length} fields`);
  }

  /**
   * Hover over element naturally
   */
  async humanHover(page: Page, selector: string): Promise<void> {
    const element = await page.locator(selector);
    const box = await element.boundingBox();

    if (!box) {
      throw new Error(`Element ${selector} not found or not visible`);
    }

    const targetX = box.x + box.width / 2;
    const targetY = box.y + box.height / 2;
    const currentX = targetX - this.randomInt(100, 300);
    const currentY = targetY - this.randomInt(100, 300);

    await this.humanMouseMove(page, currentX, currentY, targetX, targetY);
    await this.randomDelay(300, 800);

    this.logger.debug(`Hovered over ${selector}`);
  }
}
