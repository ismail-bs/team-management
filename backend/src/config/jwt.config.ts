import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!secret || !refreshSecret) {
    throw new Error(
      'CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables. ' +
        'Never use default secrets in production!',
    );
  }

  return {
    secret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  };
});
