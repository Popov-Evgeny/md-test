import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello12 from MIND-AWAKE +++++++ PostgreSQL!!!!!!!!!';
  }
}
