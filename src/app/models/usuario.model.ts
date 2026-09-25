export type Rol = 'ADMIN' | 'OPERADOR';

/** GET /api/auth/me */
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
}
