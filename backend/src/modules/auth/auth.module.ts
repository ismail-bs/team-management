import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    forwardRef(() => ChatModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const rawExpires = configService.get<string>('jwt.expiresIn');
        const expiresIn = rawExpires
          ? Number.isFinite(Number(rawExpires))
            ? Number(rawExpires)
            : (rawExpires as unknown as import('jsonwebtoken').SignOptions['expiresIn'])
          : undefined;

        return {
          secret: configService.get<string>('jwt.secret'),
          signOptions: {
            expiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
