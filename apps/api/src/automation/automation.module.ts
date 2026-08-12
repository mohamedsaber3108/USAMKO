import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { BrowserService } from './browser.service';
import { HumanBehaviorService } from './human-behavior.service';
import { ProxyService } from './proxy.service';
import { CaptchaService } from './captcha.service';

@Module({
  controllers: [AutomationController],
  providers: [
    BrowserService,
    HumanBehaviorService,
    ProxyService,
    CaptchaService,
  ],
  exports: [
    BrowserService,
    HumanBehaviorService,
    ProxyService,
    CaptchaService,
  ],
})
export class AutomationModule {}
