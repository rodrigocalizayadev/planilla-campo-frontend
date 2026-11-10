import { EnvironmentProviders, Provider } from '@angular/core';
import { provideLocaleEsAr } from './app/core/locale/locale';

/**
 * Providers applied to every TestBed (angular.json `test.options.providersFile`), so
 * component specs render with the same es-AR locale as the app instead of Angular's
 * default en-US.
 */
const testProviders: (Provider | EnvironmentProviders)[] = [provideLocaleEsAr()];

export default testProviders;
