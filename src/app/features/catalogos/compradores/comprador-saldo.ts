import { Component, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { EnumsService } from '../../../core/enums/enums.service';
import { ImportePipe } from '../../../shared/pipes/importe.pipe';
import type { CompradorSaldo } from '../../../models';

/**
 * Saldo de un comprador (`GET /api/compradores/{id}/saldo`) en **dos bloques separados**:
 * lo que debe en pesos (ventas a precio cerrado, según los cobros registrados) y las
 * unidades de consignación que todavía no se liquidaron. No se suman ni se valúan las
 * unidades: todavía no tienen precio (se fija al liquidar), así que cualquier equivalente
 * en plata sería inventado.
 */
@Component({
  selector: 'app-comprador-saldo',
  imports: [DecimalPipe, ImportePipe],
  templateUrl: './comprador-saldo.html',
  styleUrl: './comprador-saldo.scss',
})
export class CompradorSaldoPanel {
  protected readonly enums = inject(EnumsService);

  readonly compradorId = input.required<number>();

  protected readonly saldo = httpResource<CompradorSaldo>(
    () => `${environment.apiBaseUrl}/compradores/${this.compradorId()}/saldo`,
  );
}
