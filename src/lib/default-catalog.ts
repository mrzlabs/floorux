export interface CatalogItem {
  reference: string;
  name: string;
  dist: string;
  cat: string;
  sub: string;
  unit: string;
}

const item = (
  reference: string,
  name: string,
  dist: string,
  cat: string,
  sub: string,
  unit: string,
): CatalogItem => ({ reference, name, dist, cat, sub, unit });

export const DEFAULT_CATALOG: CatalogItem[] = [
  item('agu', 'Águila', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('agl', 'Águila Light', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('pok', 'Poker', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('cos', 'Costeña', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('pil', 'Pilsen', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('ccd', 'Club Colombia Dorada', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('ccr', 'Club Colombia Roja', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('cor', 'Corona', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('stl', 'Stella Artois', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('bud', 'Budweiser', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('bbc', 'BBC Cajicá', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('rds', 'Redd’s', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml'),
  item('man', 'Postobón Manzana', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml'),
  item('col', 'Colombiana', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml'),
  item('pep', 'Pepsi', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml'),
  item('7up', '7Up', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml'),
  item('uva', 'Postobón Uva', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml'),
  item('cri', 'Agua Cristal', 'Postobón', 'bebida', 'Agua', 'Botella 600ml'),
  item('h2o', 'H2OH!', 'Postobón', 'bebida', 'Agua', 'Botella 600ml'),
  item('hit', 'Hit Naranja', 'Postobón', 'bebida', 'Jugo', 'Botella 400ml'),
  item('mrt', 'Mr. Tea Limón', 'Postobón', 'bebida', 'Té', 'Botella 400ml'),
  item('pkk', 'Peak', 'Postobón', 'bebida', 'Energizante', 'Lata 269ml'),
  item('spd', 'Speed Max', 'Postobón', 'bebida', 'Energizante', 'Lata 269ml'),
  item('gat', 'Gatorade', 'Postobón', 'bebida', 'Hidratante', 'Botella 500ml'),
  item('big', 'Big Cola', 'AJE', 'bebida', 'Gaseosa', 'Personal 400ml'),
  item('cif', 'Cifrut', 'AJE', 'bebida', 'Jugo', 'Botella 400ml'),
  item('vol', 'Volt', 'AJE', 'bebida', 'Energizante', 'Lata 269ml'),
  item('cie', 'Cielo', 'AJE', 'bebida', 'Agua', 'Botella 600ml'),
  item('spo', 'Sporade', 'AJE', 'bebida', 'Hidratante', 'Botella 500ml'),
  item('fte', 'Free Tea', 'AJE', 'bebida', 'Té', 'Botella 400ml'),
  item('ant', 'Aguardiente Antioqueño', 'Licores', 'licor', 'Aguardiente', 'Botella 750ml'),
  item('nec', 'Aguardiente Néctar', 'Licores', 'licor', 'Aguardiente', 'Botella 750ml'),
  item('med', 'Ron Medellín Añejo', 'Licores', 'licor', 'Ron', 'Botella 750ml'),
  item('vca', 'Ron Viejo de Caldas', 'Licores', 'licor', 'Ron', 'Botella 750ml'),
  item('opr', 'Old Parr', 'Licores', 'licor', 'Whisky', 'Botella 750ml'),
  item('buc', 'Buchanan’s Deluxe', 'Licores', 'licor', 'Whisky', 'Botella 750ml'),
  item('smi', 'Smirnoff', 'Licores', 'licor', 'Vodka', 'Botella 750ml'),
  item('jcu', 'José Cuervo', 'Licores', 'licor', 'Tequila', 'Botella 750ml'),
  item('pap', 'Papas Margarita', 'Snacks', 'snack', 'Papas', 'Paquete 105g'),
  item('man2', 'Maní La Especial', 'Snacks', 'snack', 'Maní', 'Paquete 45g'),
  item('pic', 'Picada para 2', 'Cocina', 'snack', 'Picada', 'Plato'),
  item('mar', 'Marlboro', 'Tabaco', 'cigarro', 'Caja', 'Cajetilla x20'),
  item('lm', 'L&M', 'Tabaco', 'cigarro', 'Caja', 'Cajetilla x20'),
  item('cb1', 'Cuba Libre', 'Casa', 'coctel', 'Cóctel de la casa', 'Vaso'),
  item('mji', 'Mojito', 'Casa', 'coctel', 'Cóctel de la casa', 'Vaso'),
  item('grg', 'Gin Tonic', 'Casa', 'coctel', 'Cóctel de la casa', 'Vaso'),
];
