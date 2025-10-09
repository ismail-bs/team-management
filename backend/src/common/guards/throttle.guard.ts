import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface ThrottleRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class ThrottleGuard implements OnModuleInit, OnModuleDestroy {
  private readonly requests = new Map<string, ThrottleRecord>();
  private readonly ttl: number;
  private readonly limit: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private configService: ConfigService) {
    this.ttl = (this.configService.get('app.throttleTtl') || 60) * 1000; // Convert to milliseconds
    this.limit = this.configService.get('app.throttleLimit') || 100;
  }

  onModuleInit() {
    // Run cleanup every 5 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.generateKey(request);

    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.ttl,
      });
      return true;
    }

    if (record.count >= this.limit) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }

  private generateKey(request: Request): string {
    // Use IP address as the key for rate limiting
    // Support both direct connections and proxied requests
    const ip =
      request.ip ||
      request.headers['x-forwarded-for']?.toString().split(',')[0] ||
      request.socket.remoteAddress ||
      'unknown';

    return ip;
  }

  // Clean up expired records periodically to prevent memory leaks
  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(
        `ThrottleGuard: Cleaned up ${deletedCount} expired rate limit records`,
      );
    }
  }
}
