import { Component, inject } from '@angular/core';
import { AvisoService } from './aviso.service';

/** Renderiza el toast de `AvisoService`. Se monta una sola vez en `Shell`. */
@Component({
  selector: 'app-aviso',
  templateUrl: './aviso.html',
  styleUrl: './aviso.scss',
})
export class Aviso {
  private readonly avisoService = inject(AvisoService);
  readonly aviso = this.avisoService.aviso;
}
