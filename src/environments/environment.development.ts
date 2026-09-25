export const environment = {
  production: false,
  // Relativo, no absoluto: así el request sale desde el mismo origen (:4200) y lo toma
  // proxy.conf.json hacia :8080 (angular.json, serve.options.proxyConfig). Apuntar acá
  // directo a http://localhost:8080/api salta el proxy y el navegador lo bloquea por
  // CORS, porque el backend no manda Access-Control-Allow-Origin.
  apiBaseUrl: '/api',
};
