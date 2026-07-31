import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'USAMKO API v2.0 - Cloud-Native Enterprise Platform 🚀';
  }
}
