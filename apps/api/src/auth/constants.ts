export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  refreshSecret:
    process.env.REFRESH_TOKEN_SECRET || 'your-super-secret-refresh-token-key-change-in-production',
  accessTokenExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
};
