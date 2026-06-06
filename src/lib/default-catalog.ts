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
  { name: 'Águila',                cat: 'Cerveza',     unit: 'Botella 330ml',   cost: 2200,  price: 7000,  stock: 96,  min_stock: 36 },
  { name: 'Águila Light',          cat: 'Cerveza',     unit: 'Botella 330ml',   cost: 2200,  price: 7000,  stock: 60,  min_stock: 36 },
  { name: 'Poker',                 cat: 'Cerveza',     unit: 'Botella 330ml',   cost: 2100,  price: 6500,  stock: 8,   min_stock: 36 },
  { name: 'Costeña',               cat: 'Cerveza',     unit: 'Botella 330ml',   cost: 2000,  price: 6000,  stock: 120, min_stock: 36 },
  { name: 'Club Colombia Dorada',  cat: 'Cerveza',     unit: 'Botella 330ml',   cost: 3000,  price: 9000,  stock: 52,  min_stock: 24 },
  { name: 'Corona',                cat: 'Cerveza',     unit: 'Botella 330ml',   cost: 5200,  price: 12000, stock: 0,   min_stock: 18 },
  { name: 'Águila Postobón Manzana', cat: 'Gaseosa',   unit: 'Personal 400ml',  cost: 1400,  price: 4000,  stock: 72,  min_stock: 24 },
  { name: 'Colombiana',            cat: 'Gaseosa',     unit: 'Personal 400ml',  cost: 1400,  price: 4000,  stock: 64,  min_stock: 24 },
  { name: 'Agua Cristal',          cat: 'Agua',        unit: 'Botella 600ml',   cost: 900,   price: 3000,  stock: 88,  min_stock: 30 },
  { name: 'Aguardiente Antioqueño', cat: 'Aguardiente', unit: 'Botella 750ml',  cost: 32000, price: 75000, stock: 14,  min_stock: 6  },
  { name: 'Ron Medellín Añejo',    cat: 'Ron',         unit: 'Botella 750ml',   cost: 38000, price: 85000, stock: 8,   min_stock: 5  },
  { name: 'Cuba Libre',            cat: 'Cóctel',      unit: 'Vaso',            cost: 6000,  price: 18000, stock: 99,  min_stock: 0  },
  { name: 'Mojito',                cat: 'Cóctel',      unit: 'Vaso',            cost: 7000,  price: 20000, stock: 99,  min_stock: 0  },
  { name: 'Papas Margarita',       cat: 'Snack',       unit: 'Paquete 105g',    cost: 2200,  price: 5000,  stock: 40,  min_stock: 18 },
];
