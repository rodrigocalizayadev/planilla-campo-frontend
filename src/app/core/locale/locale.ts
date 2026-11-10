import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { EnvironmentProviders, LOCALE_ID, makeEnvironmentProviders } from '@angular/core';

/**
 * Sets es-AR as the app locale so Angular's built-in pipes (`number`) format like the
 * `importe` pipe: comma for decimals, dot for thousands ("14,5 ha", "12.345 kg").
 * Without it Angular defaults to en-US and shows "14.5 ha".
 */
export function provideLocaleEsAr(): EnvironmentProviders {
  registerLocaleData(localeEsAr);
  return makeEnvironmentProviders([{ provide: LOCALE_ID, useValue: 'es-AR' }]);
}
