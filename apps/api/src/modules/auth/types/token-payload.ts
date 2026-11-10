export interface AccessTokenPayload {
  sub: string;
  email: string;
  tokenType: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  tokenType: 'refresh';
  jti: string;
}
