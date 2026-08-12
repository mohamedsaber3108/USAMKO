import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { chromium, Browser, BrowserContext, Page, LaunchOptions } from 'playwright';
import { v4 as uuidv4 } from 'uuid';

export interface BrowserSessionConfig {
  headless?: boolean;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  userAgent?: string;
  viewport?: { width: number; height: number };
  timeout?: number;
  locale?: string;
  timezone?: string;
}

export interface BrowserSession {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  createdAt: Date;
  lastUsedAt: Date;
  config: BrowserSessionConfig;
}

@Injectable()
export class BrowserService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserService.name);
  private sessions = new Map<string, BrowserSession>();
  private readonly MAX_SESSIONS = 10;
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start cleanup job for idle sessions
    this.cleanupInterval = setInterval(() => this.cleanupIdleSessions(), 60000);
  }

  async onModuleDestroy() {
    clearInterval(this.cleanupInterval);
    await this.closeAllSessions();
  }

  /**
   * Create a new browser session with anti-detection features
   */
  async createSession(config: BrowserSessionConfig = {}): Promise<string> {
    // Enforce max sessions limit
    if (this.sessions.size >= this.MAX_SESSIONS) {
      await this.cleanupOldestSession();
    }

    const sessionId = uuidv4();

    try {
      // Launch browser with anti-detection
      const launchOptions: LaunchOptions = {
        headless: config.headless ?? true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      };

      if (config.proxy) {
        launchOptions.proxy = {
          server: config.proxy.server,
          username: config.proxy.username,
          password: config.proxy.password,
        };
      }

      const browser = await chromium.launch(launchOptions);

      // Create context with fingerprinting
      const context = await browser.newContext({
        userAgent: config.userAgent || await this.generateUserAgent(),
        viewport: config.viewport || { width: 1920, height: 1080 },
        locale: config.locale || 'en-US',
        timezoneId: config.timezone || 'America/New_York',
        permissions: [],
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      // Apply anti-detection scripts
      await this.applyAntiDetection(context);

      // Create initial page
      const page = await context.newPage();

      // Set default timeout
      page.setDefaultTimeout(config.timeout || 30000);

      const session: BrowserSession = {
        id: sessionId,
        browser,
        context,
        page,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        config,
      };

      this.sessions.set(sessionId, session);
      this.logger.log(`Created browser session: ${sessionId}`);

      return sessionId;
    } catch (error) {
      this.logger.error(`Failed to create browser session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): BrowserSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastUsedAt = new Date();
    }
    return session;
  }

  /**
   * Close a specific session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      try {
        await session.browser.close();
        this.sessions.delete(sessionId);
        this.logger.log(`Closed browser session: ${sessionId}`);
      } catch (error) {
        this.logger.error(`Error closing session ${sessionId}: ${error.message}`);
      }
    }
  }

  /**
   * Close all sessions
   */
  async closeAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map(id => this.closeSession(id)));
    this.logger.log('Closed all browser sessions');
  }

  /**
   * Navigate to a URL
   */
  async navigate(sessionId: string, url: string): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await session.page.goto(url, { waitUntil: 'domcontentloaded' });
    this.logger.log(`Navigated to ${url} in session ${sessionId}`);
  }

  /**
   * Execute a script in the page context
   */
  async executeScript<T = any>(sessionId: string, script: string): Promise<T> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return await session.page.evaluate(script);
  }

  /**
   * Take a screenshot
   */
  async screenshot(sessionId: string, options?: { fullPage?: boolean }): Promise<Buffer> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return await session.page.screenshot({ fullPage: options?.fullPage ?? false });
  }

  /**
   * Get cookies from the session
   */
  async getCookies(sessionId: string): Promise<any[]> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return await session.context.cookies();
  }

  /**
   * Set cookies in the session
   */
  async setCookies(sessionId: string, cookies: any[]): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await session.context.addCookies(cookies);
  }

  /**
   * Apply anti-detection techniques
   */
  private async applyAntiDetection(context: BrowserContext): Promise<void> {
    await context.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override chrome property
      (window as any).chrome = {
        runtime: {},
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);

      // Randomize canvas fingerprint
      const getImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(...args) {
        const imageData = getImageData.apply(this, args);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] + Math.floor(Math.random() * 3) - 1;
        }
        return imageData;
      };

      // Randomize WebGL fingerprint
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, [parameter]);
      };
    });
  }

  /**
   * Generate a realistic user agent
   */
  private async generateUserAgent(): Promise<string> {
    const versions = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    return versions[Math.floor(Math.random() * versions.length)];
  }

  /**
   * Clean up idle sessions
   */
  private async cleanupIdleSessions(): Promise<void> {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      const idleTime = now - session.lastUsedAt.getTime();
      if (idleTime > this.IDLE_TIMEOUT) {
        await this.closeSession(sessionId);
      }
    }
  }

  /**
   * Close the oldest session to free up resources
   */
  private async cleanupOldestSession(): Promise<void> {
    let oldestSessionId: string | null = null;
    let oldestTime = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.createdAt.getTime() < oldestTime) {
        oldestTime = session.createdAt.getTime();
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      await this.closeSession(oldestSessionId);
    }
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      maxSessions: this.MAX_SESSIONS,
      sessions: Array.from(this.sessions.values()).map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        idleTimeMs: Date.now() - s.lastUsedAt.getTime(),
      })),
    };
  }
}
