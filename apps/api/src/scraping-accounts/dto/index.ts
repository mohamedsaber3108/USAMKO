export class CreateScrapingAccountDto {
  platform: 'linkedin' | 'google' | 'facebook' | 'instagram' | 'twitter';
  accountType: 'credentials' | 'cookies' | 'api_key' | 'oauth';
  accountName: string;
  credentials?: {
    email?: string;
    password?: string;
    apiKey?: string;
  };
  cookies?: {
    [key: string]: string;
  };
  apiKey?: string;
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    type: 'http' | 'https' | 'socks5';
  };
}

export class TestConnectionDto {
  accountId: string;
}

export class SetDefaultAccountDto {
  accountId: string;
}
