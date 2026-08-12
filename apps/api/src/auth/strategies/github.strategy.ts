import { Strategy } from 'passport-github2';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email', 'read:user'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const { email, displayName, photos } = profile;

    if (!email) {
      throw new UnauthorizedException('No email found in GitHub profile');
    }

    try {
      const user = await this.authService.findOrCreateOAuthUser(
        email,
        displayName,
        '',
        photos?.[0]?.value,
        'github',
      );

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (error) {
      throw new UnauthorizedException('Failed to authenticate with GitHub');
    }
  }
}