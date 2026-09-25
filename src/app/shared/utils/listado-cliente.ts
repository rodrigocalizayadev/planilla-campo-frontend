/**
 * Búsqueda, orden y paginado resueltos en el cliente para listados ya cargados por
 * completo (catálogos acotados, ver CLAUDE.md/docs/resumen-slices.md). Funciones
 * puras: cada componente decide qué extractor usar por campo y sigue siendo dueño de
 * cuál de sus listas ya cargadas usa para agregados (totales, reparto) — estas
 * funciones nunca reemplazan esa lista, solo derivan la que se renderiza.
 */

export function filtrarPorTexto<T>(items: T[], texto: string, extraerTexto: (item: T) => string): T[] {
  const normalizado = texto.trim().toLowerCase();
  if (!normalizado) {
    return items;
  }
  return items.filter((item) => extraerTexto(item).toLowerCase().includes(normalizado));
}

export function ordenarPor<T>(
  items: T[],
  extractor: ((item: T) => string | number) | null,
  direccion: 'asc' | 'desc',
): T[] {
  if (!extractor) {
    return items;
  }
  const signo = direccion === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const va = extractor(a);
    const vb = extractor(b);
    if (va < vb) return -1 * signo;
    if (va > vb) return 1 * signo;
    return 0;
  });
}

export function paginarCliente<T>(items: T[], pagina: number, tamanio: number): T[] {
  const inicio = pagina * tamanio;
  return items.slice(inicio, inicio + tamanio);
}

export function totalPaginasCliente(totalItems: number, tamanio: number): number {
  return Math.max(1, Math.ceil(totalItems / tamanio));
}
