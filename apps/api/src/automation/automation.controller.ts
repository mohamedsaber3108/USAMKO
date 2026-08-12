import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrowserService, BrowserSessionConfig } from './browser.service';
import { HumanBehaviorService } from './human-behavior.service';

@Controller('automation')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  constructor(
    private readonly browserService: BrowserService,
    private readonly humanBehaviorService: HumanBehaviorService,
  ) {}

  /**
   * Create a new browser session
   */
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Body() config: BrowserSessionConfig) {
    const sessionId = await this.browserService.createSession(config);
    return {
      sessionId,
      message: 'Browser session created successfully',
    };
  }

  /**
   * Get session info
   */
  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const session = this.browserService.getSession(sessionId);
    if (!session) {
      return { error: 'Session not found' };
    }

    return {
      id: session.id,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      config: session.config,
    };
  }

  /**
   * Close a browser session
   */
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async closeSession(@Param('sessionId') sessionId: string) {
    await this.browserService.closeSession(sessionId);
  }

  /**
   * Navigate to URL
   */
  @Post('sessions/:sessionId/navigate')
  async navigate(
    @Param('sessionId') sessionId: string,
    @Body('url') url: string,
  ) {
    await this.browserService.navigate(sessionId, url);
    return { message: 'Navigation successful', url };
  }

  /**
   * Execute script
   */
  @Post('sessions/:sessionId/execute')
  async executeScript(
    @Param('sessionId') sessionId: string,
    @Body('script') script: string,
  ) {
    const result = await this.browserService.executeScript(sessionId, script);
    return { result };
  }

  /**
   * Take screenshot
   */
  @Post('sessions/:sessionId/screenshot')
  async screenshot(
    @Param('sessionId') sessionId: string,
    @Body('fullPage') fullPage?: boolean,
  ) {
    const screenshot = await this.browserService.screenshot(sessionId, {
      fullPage,
    });
    return {
      screenshot: screenshot.toString('base64'),
      encoding: 'base64',
    };
  }

  /**
   * Get cookies
   */
  @Get('sessions/:sessionId/cookies')
  async getCookies(@Param('sessionId') sessionId: string) {
    const cookies = await this.browserService.getCookies(sessionId);
    return { cookies };
  }

  /**
   * Set cookies
   */
  @Post('sessions/:sessionId/cookies')
  async setCookies(
    @Param('sessionId') sessionId: string,
    @Body('cookies') cookies: any[],
  ) {
    await this.browserService.setCookies(sessionId, cookies);
    return { message: 'Cookies set successfully' };
  }

  /**
   * Human-like typing
   */
  @Post('sessions/:sessionId/human-type')
  async humanType(
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      selector: string;
      text: string;
      minDelay?: number;
      maxDelay?: number;
    },
  ) {
    const session = this.browserService.getSession(sessionId);
    if (!session) {
      return { error: 'Session not found' };
    }

    await this.humanBehaviorService.humanType(
      session.page,
      body.selector,
      body.text,
      {
        minDelay: body.minDelay,
        maxDelay: body.maxDelay,
      },
    );

    return { message: 'Typing completed' };
  }

  /**
   * Human-like click
   */
  @Post('sessions/:sessionId/human-click')
  async humanClick(
    @Param('sessionId') sessionId: string,
    @Body() body: { selector: string; button?: 'left' | 'right' | 'middle' },
  ) {
    const session = this.browserService.getSession(sessionId);
    if (!session) {
      return { error: 'Session not found' };
    }

    await this.humanBehaviorService.humanClick(session.page, body.selector, {
      button: body.button,
    });

    return { message: 'Click completed' };
  }

  /**
   * Human-like form filling
   */
  @Post('sessions/:sessionId/fill-form')
  async fillForm(
    @Param('sessionId') sessionId: string,
    @Body() body: { fields: Array<{ selector: string; value: string }> },
  ) {
    const session = this.browserService.getSession(sessionId);
    if (!session) {
      return { error: 'Session not found' };
    }

    await this.humanBehaviorService.fillForm(session.page, body.fields);

    return { message: 'Form filled successfully' };
  }

  /**
   * Simulate reading behavior
   */
  @Post('sessions/:sessionId/simulate-reading')
  async simulateReading(
    @Param('sessionId') sessionId: string,
    @Body('duration') duration: number,
  ) {
    const session = this.browserService.getSession(sessionId);
    if (!session) {
      return { error: 'Session not found' };
    }

    await this.humanBehaviorService.simulateReading(
      session.page,
      duration || 5000,
    );

    return { message: 'Reading simulation completed' };
  }

  /**
   * Get all sessions stats
   */
  @Get('stats')
  getStats() {
    return this.browserService.getStats();
  }
}
