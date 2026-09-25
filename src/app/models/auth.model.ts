/** POST /api/auth/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /api/auth/login y POST /api/auth/registro */
export interface JwtResponse {
  token: string;
}
