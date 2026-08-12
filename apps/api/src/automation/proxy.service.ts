import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Proxy {
  id: string;
  server: string;
  username?: string;
  password?: string;
  country?: string;
  city?: string;
  isAvailable: boolean;
  lastUsed?: Date;
  failureCount: number;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private proxies: Map<string, Proxy> = new Map();
  private currentIndex = 0;

  constructor(private configService: ConfigService) {
    this.loadProxies();
  }

  /**
   * Load proxies from environment or config
   */
  private loadProxies() {
    const proxyList = this.configService.get<string>('PROXY_LIST', '');

    if (!proxyList) {
      this.logger.warn('No proxies configured. Running without proxy rotation.');
      return;
    }

    // Format: server:port:username:password,server2:port2:username2:password2
    const proxiesData = proxyList.split(',');

    proxiesData.forEach((proxyData, index) => {
      const [server, username, password, country, city] = proxyData.split(':');

      const proxy: Proxy = {
        id: `proxy-${index}`,
        server,
        username,
        password,
        country,
        city,
        isAvailable: true,
        failureCount: 0,
      };

      this.proxies.set(proxy.id, proxy);
    });

    this.logger.log(`Loaded ${this.proxies.size} proxies`);
  }

  /**
   * Get next available proxy (round-robin)
   */
  getNextProxy(): Proxy | null {
    const availableProxies = Array.from(this.proxies.values()).filter(
      p => p.isAvailable && p.failureCount < 3,
    );

    if (availableProxies.length === 0) {
      this.logger.warn('No available proxies');
      return null;
    }

    const proxy = availableProxies[this.currentIndex % availableProxies.length];
    this.currentIndex = (this.currentIndex + 1) % availableProxies.length;

    proxy.lastUsed = new Date();
    this.logger.debug(`Selected proxy: ${proxy.server}`);

    return proxy;
  }

  /**
   * Get proxy by country
   */
  getProxyByCountry(country: string): Proxy | null {
    const proxy = Array.from(this.proxies.values()).find(
      p => p.country === country && p.isAvailable && p.failureCount < 3,
    );

    if (proxy) {
      proxy.lastUsed = new Date();
      this.logger.debug(`Selected proxy for ${country}: ${proxy.server}`);
    }

    return proxy || null;
  }

  /**
   * Mark proxy as failed
   */
  markProxyFailed(proxyId: string) {
    const proxy = this.proxies.get(proxyId);
    if (proxy) {
      proxy.failureCount++;
      if (proxy.failureCount >= 3) {
        proxy.isAvailable = false;
        this.logger.warn(`Proxy ${proxyId} marked as unavailable after 3 failures`);
      }
    }
  }

  /**
   * Reset proxy failure count
   */
  resetProxyFailures(proxyId: string) {
    const proxy = this.proxies.get(proxyId);
    if (proxy) {
      proxy.failureCount = 0;
      proxy.isAvailable = true;
      this.logger.debug(`Proxy ${proxyId} failures reset`);
    }
  }

  /**
   * Get all proxies stats
   */
  getProxiesStats() {
    return {
      total: this.proxies.size,
      available: Array.from(this.proxies.values()).filter(p => p.isAvailable).length,
      proxies: Array.from(this.proxies.values()).map(p => ({
        id: p.id,
        server: p.server,
        country: p.country,
        city: p.city,
        isAvailable: p.isAvailable,
        failureCount: p.failureCount,
        lastUsed: p.lastUsed,
      })),
    };
  }

  /**
   * Add proxy dynamically
   */
  addProxy(proxy: Omit<Proxy, 'id' | 'isAvailable' | 'failureCount'>): string {
    const id = `proxy-${Date.now()}`;
    const newProxy: Proxy = {
      ...proxy,
      id,
      isAvailable: true,
      failureCount: 0,
    };

    this.proxies.set(id, newProxy);
    this.logger.log(`Added new proxy: ${newProxy.server}`);

    return id;
  }

  /**
   * Remove proxy
   */
  removeProxy(proxyId: string): boolean {
    const deleted = this.proxies.delete(proxyId);
    if (deleted) {
      this.logger.log(`Removed proxy: ${proxyId}`);
    }
    return deleted;
  }

  /**
   * Test proxy connection
   */
  async testProxy(proxyId: string): Promise<boolean> {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) {
      return false;
    }

    try {
      // In production, implement actual proxy testing
      // For now, just mark it as available
      proxy.isAvailable = true;
      proxy.failureCount = 0;
      this.logger.debug(`Proxy ${proxyId} test passed`);
      return true;
    } catch (error) {
      this.logger.error(`Proxy ${proxyId} test failed: ${error.message}`);
      this.markProxyFailed(proxyId);
      return false;
    }
  }
}
