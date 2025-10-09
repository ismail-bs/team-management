import { Request } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: Role;
  };
}
