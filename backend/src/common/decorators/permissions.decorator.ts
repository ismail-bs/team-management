import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RESOURCE_KEY = 'resource';
export const Resource = (
  resource: 'project' | 'task' | 'document' | 'meeting',
) => SetMetadata(RESOURCE_KEY, resource);
