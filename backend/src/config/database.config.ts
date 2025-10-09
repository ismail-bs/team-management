import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri:
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/team-management-platform',
  name: process.env.DATABASE_NAME || 'team-management-platform',
}));
