/* ============================================================
   RUMBA — datos semilla (window.RUMBA)
   Catálogo real Bavaria / Postobón / AJE + licores de bar.
   Precios en COP aproximados de barra.
   ============================================================ */
(function () {
  // ---- conceptos: categorías y subcategorías (las crea el Admin) ----
  const CATS = [
    { id: 'licor', name: 'Licor', icon: 'bottle', subs: ['Cerveza', 'Aguardiente', 'Ron', 'Whisky', 'Vodka', 'Tequila', 'Ginebra', 'Vino'] },
    { id: 'bebida', name: 'Bebida', icon: 'soda', subs: ['Gaseosa', 'Agua', 'Energizante', 'Jugo', 'Hidratante', 'Té'] },
    { id: 'coctel', name: 'Cóctel', icon: 'cocktail', subs: ['Cóctel de la casa', 'Sin alcohol'] },
    { id: 'snack', name: 'Snack', icon: 'snack', subs: ['Papas', 'Maní', 'Confitería', 'Picada'] },
    { id: 'cigarro', name: 'Cigarrillos', icon: 'smoke', subs: ['Caja', 'Unidad'] },
  ];

  // dist: distribuidor | cat: categoría | sub: subcategoría
  // cost: costo | price: precio venta | stock: existencias | min: alerta mínima
  const P = (id, name, dist, cat, sub, unit, cost, price, stock, min) =>
    ({ id, name, dist, cat, sub, unit, cost, price, stock, min });

  const PRODUCTS = [
    // -------- BAVARIA · Cervezas --------
    P('agu', 'Águila', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2200, 7000, 96, 36),
    P('agl', 'Águila Light', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2200, 7000, 60, 36),
    P('pok', 'Poker', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2100, 6500, 8, 36),
    P('cos', 'Costeña', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2000, 6000, 120, 36),
    P('pil', 'Pilsen', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2100, 6500, 44, 24),
    P('ccd', 'Club Colombia Dorada', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 3000, 9000, 52, 24),
    P('ccr', 'Club Colombia Roja', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 3000, 9000, 30, 24),
    P('cor', 'Corona', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 5200, 12000, 0, 18),
    P('stl', 'Stella Artois', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 4800, 11000, 24, 18),
    P('bud', 'Budweiser', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 4300, 10000, 16, 18),
    P('bbc', 'BBC Cajicá', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 5500, 13000, 12, 12),
    P('rds', 'Redd\u2019s', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 3200, 9000, 28, 18),

    // -------- POSTOBÓN · Gaseosas, aguas, jugos, energía --------
    P('man', 'Postobón Manzana', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml', 1400, 4000, 72, 24),
    P('col', 'Colombiana', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml', 1400, 4000, 64, 24),
    P('pep', 'Pepsi', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml', 1400, 4000, 58, 24),
    P('7up', '7Up', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml', 1400, 4000, 40, 24),
    P('uva', 'Postobón Uva', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml', 1400, 4000, 36, 24),
    P('cri', 'Agua Cristal', 'Postobón', 'bebida', 'Agua', 'Botella 600ml', 900, 3000, 88, 30),
    P('h2o', 'H2OH!', 'Postobón', 'bebida', 'Agua', 'Botella 600ml', 1600, 4500, 30, 18),
    P('hit', 'Hit Naranja', 'Postobón', 'bebida', 'Jugo', 'Botella 400ml', 1500, 4000, 26, 18),
    P('mrt', 'Mr. Tea Limón', 'Postobón', 'bebida', 'Té', 'Botella 400ml', 1700, 4500, 22, 18),
    P('pkk', 'Peak', 'Postobón', 'bebida', 'Energizante', 'Lata 269ml', 2600, 7000, 6, 18),
    P('spd', 'Speed Max', 'Postobón', 'bebida', 'Energizante', 'Lata 269ml', 2400, 6500, 34, 18),
    P('gat', 'Gatorade', 'Postobón', 'bebida', 'Hidratante', 'Botella 500ml', 2200, 6000, 40, 18),

    // -------- AJE --------
    P('big', 'Big Cola', 'AJE', 'bebida', 'Gaseosa', 'Personal 400ml', 1100, 3500, 50, 24),
    P('cif', 'Cifrut', 'AJE', 'bebida', 'Jugo', 'Botella 400ml', 1200, 3500, 30, 18),
    P('vol', 'Volt', 'AJE', 'bebida', 'Energizante', 'Lata 269ml', 1900, 5500, 10, 18),
    P('cie', 'Cielo', 'AJE', 'bebida', 'Agua', 'Botella 600ml', 800, 2500, 70, 30),
    P('spo', 'Sporade', 'AJE', 'bebida', 'Hidratante', 'Botella 500ml', 1700, 5000, 24, 18),
    P('fte', 'Free Tea', 'AJE', 'bebida', 'Té', 'Botella 400ml', 1300, 4000, 18, 18),

    // -------- LICORES · botella --------
    P('ant', 'Aguardiente Antioqueño', 'Licores', 'licor', 'Aguardiente', 'Botella 750ml', 32000, 75000, 14, 6),
    P('nec', 'Aguardiente Néctar', 'Licores', 'licor', 'Aguardiente', 'Botella 750ml', 31000, 72000, 9, 6),
    P('med', 'Ron Medellín Añejo', 'Licores', 'licor', 'Ron', 'Botella 750ml', 38000, 85000, 8, 5),
    P('vca', 'Ron Viejo de Caldas', 'Licores', 'licor', 'Ron', 'Botella 750ml', 36000, 82000, 3, 5),
    P('opr', 'Old Parr', 'Licores', 'licor', 'Whisky', 'Botella 750ml', 92000, 175000, 5, 3),
    P('buc', 'Buchanan\u2019s Deluxe', 'Licores', 'licor', 'Whisky', 'Botella 750ml', 110000, 210000, 2, 3),
    P('smi', 'Smirnoff', 'Licores', 'licor', 'Vodka', 'Botella 750ml', 34000, 78000, 6, 4),
    P('jcu', 'José Cuervo', 'Licores', 'licor', 'Tequila', 'Botella 750ml', 58000, 120000, 4, 3),

    // -------- SNACKS / CIGARRILLOS --------
    P('pap', 'Papas Margarita', 'Snacks', 'snack', 'Papas', 'Paquete 105g', 2200, 5000, 40, 18),
    P('man2', 'Maní La Especial', 'Snacks', 'snack', 'Maní', 'Paquete 45g', 1200, 3000, 30, 18),
    P('pic', 'Picada para 2', 'Cocina', 'snack', 'Picada', 'Plato', 9000, 22000, 99, 0),
    P('mar', 'Marlboro', 'Tabaco', 'cigarro', 'Caja', 'Cajetilla x20', 8500, 14000, 12, 8),
    P('l&m', 'L&M', 'Tabaco', 'cigarro', 'Caja', 'Cajetilla x20', 7000, 11000, 6, 8),

    // -------- CÓCTELES de la casa --------
    P('cb1', 'Cuba Libre', 'Casa', 'coctel', 'Cóctel de la casa', 'Vaso', 6000, 18000, 99, 0),
    P('mji', 'Mojito', 'Casa', 'coctel', 'Cóctel de la casa', 'Vaso', 7000, 20000, 99, 0),
    P('grg', 'Gin Tonic', 'Casa', 'coctel', 'Cóctel de la casa', 'Vaso', 8000, 24000, 99, 0),
  ];

  // ---- comercios (Super Admin) ----
  const BIZ = [
    { id: 'aurora', name: 'Discoteca Aurora', type: 'Discoteca', city: 'Medellín', owner: 'Laura Restrepo', plan: 'Pro', kind: 'Principal', status: 'activo', users: 9, color: '#7F77DD', month: 86400000, growth: 14, tables: 24 },
    { id: 'farol', name: 'Taberna El Farol', type: 'Taberna', city: 'Bogotá', owner: 'Andrés Gómez', plan: 'Pro', kind: 'Franquicia', status: 'activo', users: 5, color: '#27C3D8', month: 41200000, growth: 9, tables: 14 },
    { id: 'neon', name: 'Club Neón', type: 'Discoteca', city: 'Cali', owner: 'Mónica Vélez', plan: 'Pro', kind: 'Franquicia', status: 'activo', users: 7, color: '#F5C400', month: 63800000, growth: -3, tables: 20 },
    { id: 'puerto', name: 'Bar Puerto Madero', type: 'Bar', city: 'Cartagena', owner: 'Julián Mejía', plan: 'Básico', kind: 'Franquicia', status: 'activo', users: 4, color: '#B57BE0', month: 28900000, growth: 22, tables: 12 },
    { id: 'luna', name: 'Taberna La Luna', type: 'Taberna', city: 'Pereira', owner: 'Carolina Díaz', plan: 'Básico', kind: 'Franquicia', status: 'inactivo', users: 3, color: '#E0708A', month: 0, growth: 0, tables: 10 },
  ];

  // ---- empleados (Admin) ----
  const STAFF = [
    { id: 'e1', name: 'Yulieth Mosquera', role: 'Cajera', alias: 'La china', shifts: 22, lastLogin: 'Hoy 8:42 p. m.', sales: 142, total: 4820000, color: '#27C3D8', active: true },
    { id: 'e2', name: 'Brayan Cardona', role: 'Mesero', alias: 'Bray', shifts: 18, lastLogin: 'Hoy 8:30 p. m.', sales: 98, total: 3210000, color: '#7F77DD', active: true },
    { id: 'e3', name: 'Daniela Quiroz', role: 'Mesera', alias: 'Dani', shifts: 20, lastLogin: 'Ayer 2:10 a. m.', sales: 120, total: 3950000, color: '#F5C400', active: true },
    { id: 'e4', name: 'Kevin Ríos', role: 'Cajero', alias: 'Kev', shifts: 9, lastLogin: 'Hace 4 días', sales: 41, total: 1380000, color: '#B57BE0', active: false },
  ];

  // ---- reportes ----
  const PAYMENTS = [
    { id: 'efectivo', name: 'Efectivo', color: '#34d399' },
    { id: 'transferencia', name: 'Transferencia', color: '#5A82EE' },
    { id: 'qr', name: 'QR', color: '#B57BE0' },
    { id: 'datafono', name: 'Datáfono', color: '#27C3D8' },
    { id: 'nequi', name: 'Nequi / Daviplata', color: '#F5C400' },
  ];

  // ventas por hora del turno de hoy (8 p.m. -> 3 a.m.)
  const TODAY_HOURLY = [
    { h: '8 pm', v: 380000 }, { h: '9 pm', v: 720000 }, { h: '10 pm', v: 1240000 },
    { h: '11 pm', v: 2150000 }, { h: '12 am', v: 2980000 }, { h: '1 am', v: 2410000 },
    { h: '2 am', v: 1560000 }, { h: '3 am', v: 640000 },
  ];
  const WEEK = [
    { d: 'Lun', v: 3200000 }, { d: 'Mar', v: 2800000 }, { d: 'Mié', v: 4100000 },
    { d: 'Jue', v: 7400000 }, { d: 'Vie', v: 13800000 }, { d: 'Sáb', v: 16200000 }, { d: 'Dom', v: 5600000 },
  ];
  const MONTH = [
    { d: 'Sem 1', v: 38400000 }, { d: 'Sem 2', v: 41200000 }, { d: 'Sem 3', v: 44800000 }, { d: 'Sem 4', v: 53100000 },
  ];
  const TODAY_PAY = { efectivo: 4820000, transferencia: 3210000, qr: 2680000, datafono: 1140000, nequi: 730000 };

  const TOP_PRODUCTS = [
    { id: 'agu', qty: 184, total: 1288000 },
    { id: 'ant', qty: 22, total: 1650000 },
    { id: 'ccd', qty: 96, total: 864000 },
    { id: 'cb1', qty: 41, total: 738000 },
    { id: 'med', qty: 8, total: 680000 },
    { id: 'man', qty: 120, total: 480000 },
  ];

  // turnos cerrados (historial del empleado / reporte de mesas del admin)
  const PAST_SHIFTS = [
    { id: 's-101', emp: 'Yulieth Mosquera', date: 'Vie 30 may', open: '8:00 p. m.', close: '3:20 a. m.', tables: 19, sales: 64, total: 4180000 },
    { id: 's-100', emp: 'Brayan Cardona', date: 'Vie 30 may', open: '8:00 p. m.', close: '3:05 a. m.', tables: 14, sales: 47, total: 2960000 },
    { id: 's-099', emp: 'Daniela Quiroz', date: 'Jue 29 may', open: '8:30 p. m.', close: '2:40 a. m.', tables: 11, sales: 38, total: 2210000 },
  ];

  // cuadre de inventario vs ventas (vendidas según ventas vs descontadas del inventario)
  const RECON = [
    { id: 'agu', vendidas: 184, descontadas: 189 },
    { id: 'ccd', vendidas: 96, descontadas: 96 },
    { id: 'pok', vendidas: 64, descontadas: 64 },
    { id: 'cor', vendidas: 30, descontadas: 33 },
    { id: 'ant', vendidas: 22, descontadas: 23 },
    { id: 'med', vendidas: 8, descontadas: 8 },
    { id: 'man', vendidas: 120, descontadas: 118 },
    { id: 'cb1', vendidas: 41, descontadas: 41 },
    { id: 'opr', vendidas: 4, descontadas: 5 },
  ];

  window.RUMBA = {
    CATS, PRODUCTS, BIZ, STAFF, PAYMENTS,
    TODAY_HOURLY, WEEK, MONTH, TODAY_PAY, TOP_PRODUCTS, PAST_SHIFTS, RECON,
    productById: id => PRODUCTS.find(p => p.id === id),
  };
})();
