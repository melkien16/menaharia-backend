export type JwtTokenType = 'access' | 'refresh';

export interface JwtAccessPayload {
  sub: string;
  roles: string[];
  typ: 'access';
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
  typ: 'refresh';
}

export interface AuthJwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  phone?: string;
  fullName?: string;
  profilePicture?: string | null;
  roles: string[];
  refreshTokenId?: string;
}
