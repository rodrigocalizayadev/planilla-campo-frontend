import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { UsuarioActualService } from '../../core/auth/usuario-actual.service';
import { AuthService } from '../../core/auth/auth.service';
import { EnumsService } from '../../core/enums/enums.service';
import { CampaniaActivaService } from '../../core/campania/campania-activa.service';
import { RUTAS } from '../../core/config/rutas';
import { SelectorCampania } from '../selector-campania/selector-campania';
import { Aviso } from '../../shared/ui/aviso/aviso';
import { CampaniaSelectorModal } from '../../features/campania/campania-selector-modal';
import { Modal } from '../../shared/ui/modal/modal';
import type { Usuario } from '../../models';

interface ItemNav {
  etiqueta: string;
  ruta: string;
}

const NAV_PRINCIPAL: ItemNav[] = [
  { etiqueta: 'Tablero', ruta: RUTAS.tablero },
  { etiqueta: 'Costos indirectos', ruta: RUTAS.costosIndirectos },
  { etiqueta: 'Reportes', ruta: RUTAS.reportes },
];

const NAV_CATALOGOS: ItemNav[] = [
  { etiqueta: 'Lotes', ruta: RUTAS.catalogoLotes },
  { etiqueta: 'Cultivos', ruta: RUTAS.catalogoCultivos },
  { etiqueta: 'Insumos', ruta: RUTAS.catalogoInsumos },
  { etiqueta: 'Compradores', ruta: RUTAS.catalogoCompradores },
];

/**
 * Shell de navegación: sidebar en escritorio, header + nav inferior en móvil
 * (docs/design-brief.md §3). La campaña activa se muestra siempre, en los dos
 * anchos. El contenido de cada pantalla llega por `router-outlet`.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    SelectorCampania,
    Aviso,
    CampaniaSelectorModal,
    Modal,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly usuarioActual = inject(UsuarioActualService);
  private readonly authService = inject(AuthService);
  private readonly enums = inject(EnumsService);
  private readonly router = inject(Router);
  protected readonly campaniaActiva = inject(CampaniaActivaService);

  readonly usuario = this.usuarioActual.usuario;
  readonly navPrincipal = NAV_PRINCIPAL;
  readonly navCatalogos = NAV_CATALOGOS;

  protected readonly masAbierto = signal(false);

  private readonly urlActual = toSignal(
    this.router.events.pipe(filter((evento) => evento instanceof NavigationEnd)),
    { initialValue: null },
  );

  protected readonly catalogoActivo = () => {
    this.urlActual();
    return this.navCatalogos.some((item) => this.router.url.startsWith(item.ruta));
  };

  abrirMas(): void {
    this.masAbierto.set(true);
  }

  cerrarMas(): void {
    this.masAbierto.set(false);
  }

  iniciales(usuario: Usuario): string {
    return `${usuario.nombre.charAt(0)}${usuario.apellido.charAt(0)}`.toUpperCase();
  }

  etiquetaRol(usuario: Usuario): string {
    return this.enums.etiqueta('rol', usuario.rol);
  }

  salir(): void {
    this.authService.salir();
    this.router.navigateByUrl('/login');
  }
}
