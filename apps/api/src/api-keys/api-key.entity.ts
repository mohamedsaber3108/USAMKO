/**
 * API Key entity for storing user API keys
 * This is a DTO/Model class - actual schema is in prisma/schema.prisma
 */
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  description?: string;
  userId: string;
  isActive: boolean;
  permissions?: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyWithUser extends ApiKey {
  user: {
    id: string;
    email: string;
    name: string;
  };
}