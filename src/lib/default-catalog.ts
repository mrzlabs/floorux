export interface CatalogItem {
  name: string;
  cat: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  min_stock: number;
}

export const DEFAULT_CATALOG: CatalogItem[] = [
  { name: 'Águila',                cat: 'Cerveza',      unit: 'Botella 330ml',   cost: 2200,   price: 7000,   stock: 0, min_stock: 0 },
  { name: 'Águila Light',          cat: 'Cerveza',      unit: 'Botella 330ml',   cost: 2200,   price: 7000,   stock: 0, min_stock: 0 },
  { name: 'Poker',                 cat: 'Cerveza',      unit: 'Botella 330ml',   cost: 2100,   price: 6500,   stock: 0, min_stock: 0 },
  { name: 'Costeña',               cat: 'Cerveza',      unit: 'Botella 330ml',   cost: 2000,   price: 6000,   stock: 0, min_stock: 0 },
  { name: 'Pilsen',                cat: 'Cerveza',      unit: 'Botella 330ml',   cost: 2100,   price: 6500,   stock: 0, min_stock: 0 },
  { name: 'Club Colombia Dorada',  cat: 'Cerveza',      unit: 'Botella 330ml',   cost: 3000,   price: 9000,   stock: 0, min_stock: 0 },
  { name: 'Club Colombia Roja',    cat: 'Cerveza',      unit: 'Botella 330ml',   cost: 3000,   price: 9000,   stock: 0, min_stock: 0 },
  { name: 'Corona',                cat: 'Cerveza',      unit: 'Botella 330ml',   cost: 5200,   price: 12000,  stock: 0, min_stock: 0 },
  { name: 'Stella Artois',         cat: 'Cerveza',      unit: 'Botella 330ml',   cost: 4800,   price: 11000,  stock: 0, min_stock: 0 },
  { name: 'Budweiser',             cat: 'Cerveza',      unit: 'Botella 330ml',   cost: 4300,   price: 10000,  stock: 0, min_stock: 0 },
  { name: 'Colombiana',            cat: 'Gaseosa',      unit: 'Personal 400ml',  cost: 1400,   price: 4000,   stock: 0, min_stock: 0 },
  { name: 'Pepsi',                 cat: 'Gaseosa',      unit: 'Personal 400ml',  cost: 1400,   price: 4000,   stock: 0, min_stock: 0 },
  { name: 'Postobón Manzana',      cat: 'Gaseosa',      unit: 'Personal 400ml',  cost: 1400,   price: 4000,   stock: 0, min_stock: 0 },
  { name: '7Up',                   cat: 'Gaseosa',      unit: 'Personal 400ml',  cost: 1400,   price: 4000,   stock: 0, min_stock: 0 },
  { name: 'Agua Cristal',          cat: 'Agua',         unit: 'Botella 600ml',   cost: 900,    price: 3000,   stock: 0, min_stock: 0 },
  { name: 'Gatorade',              cat: 'Hidratante',   unit: 'Botella 500ml',   cost: 2200,   price: 6000,   stock: 0, min_stock: 0 },
  { name: 'Peak',                  cat: 'Energizante',  unit: 'Lata 269ml',      cost: 2600,   price: 7000,   stock: 0, min_stock: 0 },
  { name: 'Aguardiente Antioqueño', cat: 'Aguardiente', unit: 'Botella 750ml',   cost: 32000,  price: 75000,  stock: 0, min_stock: 0 },
  { name: 'Aguardiente Néctar',    cat: 'Aguardiente',  unit: 'Botella 750ml',   cost: 31000,  price: 72000,  stock: 0, min_stock: 0 },
  { name: 'Ron Medellín Añejo',    cat: 'Ron',          unit: 'Botella 750ml',   cost: 38000,  price: 85000,  stock: 0, min_stock: 0 },
  { name: 'Ron Viejo de Caldas',   cat: 'Ron',          unit: 'Botella 750ml',   cost: 36000,  price: 82000,  stock: 0, min_stock: 0 },
  { name: 'Old Parr',              cat: 'Whisky',       unit: 'Botella 750ml',   cost: 92000,  price: 175000, stock: 0, min_stock: 0 },
  { name: "Buchanan's Deluxe",     cat: 'Whisky',       unit: 'Botella 750ml',   cost: 110000, price: 210000, stock: 0, min_stock: 0 },
  { name: 'Smirnoff',              cat: 'Vodka',        unit: 'Botella 750ml',   cost: 34000,  price: 78000,  stock: 0, min_stock: 0 },
  { name: 'José Cuervo',           cat: 'Tequila',      unit: 'Botella 750ml',   cost: 58000,  price: 120000, stock: 0, min_stock: 0 },
  { name: 'Cuba Libre',            cat: 'Cóctel',       unit: 'Vaso',            cost: 6000,   price: 18000,  stock: 0, min_stock: 0 },
  { name: 'Mojito',                cat: 'Cóctel',       unit: 'Vaso',            cost: 7000,   price: 20000,  stock: 0, min_stock: 0 },
  { name: 'Gin Tonic',             cat: 'Cóctel',       unit: 'Vaso',            cost: 8000,   price: 24000,  stock: 0, min_stock: 0 },
  { name: 'Papas Margarita',       cat: 'Snack',        unit: 'Paquete 105g',    cost: 2200,   price: 5000,   stock: 0, min_stock: 0 },
  { name: 'Maní',                  cat: 'Snack',        unit: 'Paquete 45g',     cost: 1200,   price: 3000,   stock: 0, min_stock: 0 },
  { name: 'Marlboro',              cat: 'Cigarrillos',  unit: 'Cajetilla x20',   cost: 8500,   price: 14000,  stock: 0, min_stock: 0 },
];
