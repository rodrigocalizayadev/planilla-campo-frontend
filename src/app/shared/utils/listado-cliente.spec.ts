import { filtrarPorTexto, ordenarPor, paginarCliente, totalPaginasCliente } from './listado-cliente';

interface Item {
  nombre: string;
  valor: number;
}

const ITEMS: Item[] = [
  { nombre: 'Zapallo', valor: 3 },
  { nombre: 'cebolla', valor: 1 },
  { nombre: 'Melón', valor: 2 },
];

describe('filtrarPorTexto', () => {
  it('devuelve todo si el texto está vacío', () => {
    expect(filtrarPorTexto(ITEMS, '', (i) => i.nombre)).toEqual(ITEMS);
    expect(filtrarPorTexto(ITEMS, '   ', (i) => i.nombre)).toEqual(ITEMS);
  });

  it('filtra sin distinguir mayúsculas/minúsculas', () => {
    expect(filtrarPorTexto(ITEMS, 'CEBO', (i) => i.nombre)).toEqual([ITEMS[1]]);
    expect(filtrarPorTexto(ITEMS, 'zapallo', (i) => i.nombre)).toEqual([ITEMS[0]]);
  });

  it('sin coincidencias devuelve un array vacío', () => {
    expect(filtrarPorTexto(ITEMS, 'sandía', (i) => i.nombre)).toEqual([]);
  });
});

describe('ordenarPor', () => {
  it('sin extractor (null) preserva el orden original', () => {
    expect(ordenarPor(ITEMS, null, 'asc')).toEqual(ITEMS);
  });

  it('ordena ascendente y descendente por un campo numérico', () => {
    expect(ordenarPor(ITEMS, (i) => i.valor, 'asc').map((i) => i.valor)).toEqual([1, 2, 3]);
    expect(ordenarPor(ITEMS, (i) => i.valor, 'desc').map((i) => i.valor)).toEqual([3, 2, 1]);
  });

  it('no muta el array original', () => {
    const copia = [...ITEMS];
    ordenarPor(ITEMS, (i) => i.valor, 'asc');
    expect(ITEMS).toEqual(copia);
  });
});

describe('paginarCliente / totalPaginasCliente', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it('recorta la página pedida', () => {
    expect(paginarCliente(items, 0, 10)).toEqual(items.slice(0, 10));
    expect(paginarCliente(items, 2, 10)).toEqual(items.slice(20, 25));
  });

  it('calcula el total de páginas redondeando hacia arriba', () => {
    expect(totalPaginasCliente(25, 10)).toBe(3);
    expect(totalPaginasCliente(0, 10)).toBe(1);
    expect(totalPaginasCliente(10, 10)).toBe(1);
  });
});
