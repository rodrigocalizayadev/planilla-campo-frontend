import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { Shell } from './layout/shell/shell';
import { RUTAS } from './core/config/rutas';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: RUTAS.tablero.slice(1), pathMatch: 'full' },
      {
        path: RUTAS.tablero.slice(1),
        loadComponent: () => import('./features/tablero/tablero').then((m) => m.Tablero),
      },
      {
        path: 'lote-campanias/:id',
        loadComponent: () =>
          import('./features/lote-campania/lote-campania-detalle').then(
            (m) => m.LoteCampaniaDetalle,
          ),
      },
      {
        path: RUTAS.costosIndirectos.slice(1),
        loadComponent: () =>
          import('./features/costos-indirectos/costos-indirectos-listado').then(
            (m) => m.CostosIndirectosListado,
          ),
      },
      {
        path: RUTAS.reportes.slice(1),
        loadComponent: () => import('./features/reportes/reportes').then((m) => m.Reportes),
      },
      {
        path: RUTAS.catalogoLotes.slice(1),
        loadComponent: () =>
          import('./features/catalogos/lotes/lotes-listado').then((m) => m.LotesListado),
      },
      {
        path: RUTAS.catalogoCultivos.slice(1),
        loadComponent: () =>
          import('./features/catalogos/cultivos/cultivos-listado').then((m) => m.CultivosListado),
      },
      {
        path: RUTAS.catalogoInsumos.slice(1),
        loadComponent: () =>
          import('./features/catalogos/insumos/insumos-listado').then((m) => m.InsumosListado),
      },
      {
        path: RUTAS.catalogoCompradores.slice(1),
        loadComponent: () =>
          import('./features/catalogos/compradores/compradores-listado').then(
            (m) => m.CompradoresListado,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
