import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  const content = readFileSync(path, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv('.env.local');

const apply = process.argv.includes('--apply');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const config = {
  comercio: {
    name: 'Taberna La Estación Demo',
    type: 'Taberna',
    city: 'Bogotá',
    address: 'Carrera 13 # 72-18',
    phone: '3000000000',
    nit: '900999888-1',
    plan: 'Pro',
    kind: 'Principal',
    status: 'activo',
    color: '#C87A3D',
    tables_count: 8,
  },
  superAdmin: {
    full_name: 'Valentina Ríos',
    email: 'superadmin.taberna@floorux.demo',
    role: 'super_admin',
    color: '#C87A3D',
  },
  empleado: {
    full_name: 'Mateo Vargas',
    email: 'empleado.taberna@floorux.demo',
    role: 'empleado',
    color: '#27C3D8',
    alias: 'Mateo',
  },
};

const products = [
  ['Águila Original', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2300, 7000, 72, 24],
  ['Poker', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2200, 6500, 18, 24],
  ['Club Colombia', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 3200, 9000, 30, 18],
  ['Corona', 'Bavaria', 'licor', 'Cerveza', 'Botella 355ml', 5400, 13000, 8, 12],
  ['Aguardiente Antioqueño', 'FLA', 'licor', 'Aguardiente', 'Botella 750ml', 34000, 78000, 10, 5],
  ['Ron Medellín', 'FLA', 'licor', 'Ron', 'Botella 750ml', 40000, 90000, 6, 4],
  ['Old Parr', 'Diageo', 'licor', 'Whisky', 'Botella 750ml', 98000, 190000, 2, 3],
  ['Coca-Cola', 'Coca-Cola', 'bebida', 'Gaseosa', 'Botella 400ml', 1600, 4500, 48, 18],
  ['Agua', 'Postobón', 'bebida', 'Agua', 'Botella 600ml', 1000, 3500, 36, 12],
  ['Mojito de la casa', 'Casa', 'coctel', 'Cóctel', 'Vaso', 7500, 22000, 99, 0],
  ['Picada para dos', 'Cocina', 'comida', 'Picada', 'Plato', 12000, 30000, 99, 0],
  ['Papas artesanales', 'Cocina', 'comida', 'Snack', 'Porción', 3500, 9000, 99, 0],
].map(([name, dist, cat, sub, unit, cost, price, stock, min_stock]) => ({
  name, dist, cat, sub, unit, cost, price, stock, min_stock,
}));

const tableNames = [
  'Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4',
  'Mesa 5', 'Mesa 6', 'Barra 1', 'VIP 1',
];

function makePassword() {
  return `Fx1!${randomBytes(12).toString('base64url')}`;
}

function fail(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function findAuthUser(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    fail(error, 'No se pudieron listar usuarios Auth');
    const found = data.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureAuthUser(profile, password) {
  let user = await findAuthUser(profile.email);
  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: profile.full_name, role: profile.role },
    });
    fail(error, `No se pudo actualizar Auth para ${profile.email}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: profile.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: profile.full_name, role: profile.role },
  });
  fail(error, `No se pudo crear Auth para ${profile.email}`);
  return data.user;
}

async function findProfile(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, comercio_id, super_admin_id, activo')
    .eq('email', email)
    .maybeSingle();
  fail(error, `No se pudo consultar ${email}`);
  return data;
}

async function findComercio(superAdminId) {
  const { data, error } = await supabase
    .from('comercios')
    .select('id, name, city, status')
    .eq('super_admin_id', superAdminId)
    .eq('name', config.comercio.name)
    .is('deleted_at', null)
    .maybeSingle();
  fail(error, 'No se pudo consultar la taberna demo');
  return data;
}

async function inspect() {
  const superProfile = await findProfile(config.superAdmin.email);
  const employeeProfile = await findProfile(config.empleado.email);
  const comercio = superProfile ? await findComercio(superProfile.id) : null;
  let counts = null;

  if (comercio) {
    const tables = ['products', 'mesas', 'shifts', 'sales'];
    counts = {};
    for (const table of tables) {
      let query = supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('comercio_id', comercio.id);
      if (table === 'shifts') query = query.eq('status', 'open');
      const { count, error } = await query;
      fail(error, `No se pudo verificar ${table}`);
      counts[table === 'shifts' ? 'open_shifts' : table] = count ?? 0;
    }

    const { count: occupied, error: occupiedError } = await supabase
      .from('mesas')
      .select('*', { count: 'exact', head: true })
      .eq('comercio_id', comercio.id)
      .eq('status', 'ocupada');
    fail(occupiedError, 'No se pudieron verificar las mesas ocupadas');
    counts.occupied_tables = occupied ?? 0;
  }

  console.log(JSON.stringify({
    mode: 'dry-run',
    target: url,
    existing: {
      super_admin: superProfile,
      comercio,
      empleado: employeeProfile,
    },
    valid_links: {
      comercio_belongs_to_super_admin: Boolean(
        comercio && superProfile && comercio.id && superProfile.id,
      ),
      empleado_belongs_to_super_admin: Boolean(
        employeeProfile && superProfile &&
        employeeProfile.super_admin_id === superProfile.id,
      ),
      empleado_belongs_to_comercio: Boolean(
        employeeProfile && comercio &&
        employeeProfile.comercio_id === comercio.id,
      ),
    },
    counts,
    planned: {
      users: 2,
      comercios: 1,
      products: products.length,
      mesas: tableNames.length,
      open_shifts: 1,
      occupied_tables: 2,
      historical_sales: 6,
    },
  }, null, 2));
}

async function upsertProfile(user, profile, links = {}) {
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    super_admin_id: links.super_admin_id ?? null,
    comercio_id: links.comercio_id ?? null,
    activo: true,
    deleted_at: null,
    color: profile.color,
    alias: profile.alias ?? null,
  }, { onConflict: 'id' });
  fail(error, `No se pudo guardar el perfil ${profile.email}`);
}

async function ensureComercio(superAdminId) {
  const existing = await findComercio(superAdminId);
  if (existing) {
    const { data, error } = await supabase
      .from('comercios')
      .update(config.comercio)
      .eq('id', existing.id)
      .select()
      .single();
    fail(error, 'No se pudo actualizar la taberna demo');
    return data;
  }

  const { data, error } = await supabase
    .from('comercios')
    .insert({ ...config.comercio, super_admin_id: superAdminId })
    .select()
    .single();
  fail(error, 'No se pudo crear la taberna demo');
  return data;
}

async function ensureProducts(comercioId) {
  const { data: existing, error: readError } = await supabase
    .from('products')
    .select('id, name')
    .eq('comercio_id', comercioId);
  fail(readError, 'No se pudo consultar el inventario');
  const byName = new Map(existing.map(item => [item.name, item.id]));

  for (const product of products) {
    const id = byName.get(product.name);
    const query = id
      ? supabase.from('products').update({ ...product, deleted_at: null }).eq('id', id)
      : supabase.from('products').insert({ ...product, comercio_id: comercioId });
    const { error } = await query;
    fail(error, `No se pudo guardar el producto ${product.name}`);
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('comercio_id', comercioId);
  fail(error, 'No se pudo recargar el inventario');
  return data;
}

async function ensureTables(comercioId, employeeId) {
  const { data: existing, error: readError } = await supabase
    .from('mesas')
    .select('*')
    .eq('comercio_id', comercioId);
  fail(readError, 'No se pudieron consultar las mesas');
  const byName = new Map(existing.map(item => [item.name, item]));

  for (const name of tableNames) {
    if (byName.has(name)) continue;
    const { error } = await supabase.from('mesas').insert({ comercio_id: comercioId, name });
    fail(error, `No se pudo crear ${name}`);
  }

  const openedAt = new Date(Date.now() - 55 * 60_000).toISOString();
  const occupied = [
    ['Mesa 2', 'Cumpleaños Laura'],
    ['VIP 1', 'Reserva Gómez'],
  ];
  for (const [name, alias] of occupied) {
    const { error } = await supabase
      .from('mesas')
      .update({ status: 'ocupada', alias, opened_at: openedAt, opened_by: employeeId })
      .eq('comercio_id', comercioId)
      .eq('name', name);
    fail(error, `No se pudo ocupar ${name}`);
  }

  const { data, error } = await supabase
    .from('mesas')
    .select('*')
    .eq('comercio_id', comercioId);
  fail(error, 'No se pudieron recargar las mesas');
  return data;
}

async function ensureShift(comercioId, employeeId) {
  const { data: existing, error: readError } = await supabase
    .from('shifts')
    .select('*')
    .eq('comercio_id', comercioId)
    .eq('empleado_id', employeeId)
    .eq('status', 'open')
    .maybeSingle();
  fail(readError, 'No se pudo consultar el turno');
  if (existing) return existing;

  const { data, error } = await supabase
    .from('shifts')
    .insert({
      comercio_id: comercioId,
      empleado_id: employeeId,
      started_at: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
      status: 'open',
    })
    .select()
    .single();
  fail(error, 'No se pudo crear el turno');
  return data;
}

async function ensureOpenTableItems(tables, inventory) {
  const productByName = new Map(inventory.map(item => [item.name, item]));
  const orders = {
    'Mesa 2': [['Águila Original', 4], ['Picada para dos', 1]],
    'VIP 1': [['Old Parr', 1], ['Coca-Cola', 4], ['Papas artesanales', 2]],
  };

  for (const [tableName, lines] of Object.entries(orders)) {
    const table = tables.find(item => item.name === tableName);
    if (!table) continue;
    const { count, error: countError } = await supabase
      .from('mesa_items')
      .select('*', { count: 'exact', head: true })
      .eq('mesa_id', table.id);
    fail(countError, `No se pudo consultar el consumo de ${tableName}`);
    if (count) continue;

    const rows = lines.map(([productName, qty]) => {
      const product = productByName.get(productName);
      if (!product) throw new Error(`Producto no encontrado: ${productName}`);
      return {
        mesa_id: table.id,
        product_id: product.id,
        qty,
        unit_price: product.price,
        unit_cost: product.cost,
      };
    });
    const { error } = await supabase.from('mesa_items').insert(rows);
    fail(error, `No se pudo cargar el consumo de ${tableName}`);
  }
}

async function ensureSales(comercioId, employeeId, inventory) {
  const { count, error: countError } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .eq('comercio_id', comercioId);
  fail(countError, 'No se pudieron consultar las ventas');
  if (count) return count;

  const productByName = new Map(inventory.map(item => [item.name, item]));
  const samples = [
    ['Mesa 1', 'efectivo', [['Águila Original', 6], ['Papas artesanales', 2]], 1],
    ['Mesa 3', 'nequi', [['Poker', 8], ['Picada para dos', 1]], 2],
    ['Barra 1', 'datafono', [['Mojito de la casa', 3]], 4],
    ['Mesa 4', 'transferencia', [['Club Colombia', 5], ['Papas artesanales', 1]], 7],
    ['Mesa 5', 'qr', [['Aguardiente Antioqueño', 1], ['Coca-Cola', 4]], 12],
    ['VIP 1', 'datafono', [['Ron Medellín', 1], ['Coca-Cola', 5], ['Picada para dos', 2]], 20],
  ];

  for (const [mesaName, paymentMethod, lines, hoursAgo] of samples) {
    const totals = lines.reduce((acc, [productName, qty]) => {
      const product = productByName.get(productName);
      if (!product) throw new Error(`Producto no encontrado: ${productName}`);
      acc.total += Number(product.price) * qty;
      acc.cost += Number(product.cost) * qty;
      return acc;
    }, { total: 0, cost: 0 });

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        comercio_id: comercioId,
        mesa_name: mesaName,
        total: totals.total,
        cost: totals.cost,
        payment_method: paymentMethod,
        evidence: false,
        closed_at: new Date(Date.now() - hoursAgo * 60 * 60_000).toISOString(),
        closed_by: employeeId,
      })
      .select()
      .single();
    fail(saleError, `No se pudo crear la venta de ${mesaName}`);

    const saleItems = lines.map(([productName, qty]) => {
      const product = productByName.get(productName);
      return {
        sale_id: sale.id,
        product_id: product.id,
        product_name: product.name,
        qty,
        unit_price: product.price,
        unit_cost: product.cost,
      };
    });
    const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
    fail(itemsError, `No se pudo crear el detalle de ${mesaName}`);
  }
  return samples.length;
}

async function applySeed() {
  const superPassword = makePassword();
  const employeePassword = makePassword();

  const superUser = await ensureAuthUser(config.superAdmin, superPassword);
  await upsertProfile(superUser, config.superAdmin);

  const comercio = await ensureComercio(superUser.id);

  const employeeUser = await ensureAuthUser(config.empleado, employeePassword);
  await upsertProfile(employeeUser, config.empleado, {
    super_admin_id: superUser.id,
    comercio_id: comercio.id,
  });

  const inventory = await ensureProducts(comercio.id);
  const tables = await ensureTables(comercio.id, employeeUser.id);
  const shift = await ensureShift(comercio.id, employeeUser.id);
  await ensureOpenTableItems(tables, inventory);
  const sales = await ensureSales(comercio.id, employeeUser.id, inventory);

  const { error: auditError } = await supabase.from('audit_logs').insert({
    actor_id: superUser.id,
    actor_role: 'super_admin',
    action: 'CREATE',
    table_name: 'comercios',
    record_id: comercio.id,
    payload: { source: 'seed-taberna-demo', comercio: comercio.name },
    ip: 'seed-script',
  });
  fail(auditError, 'No se pudo registrar la auditoría');

  console.log(JSON.stringify({
    mode: 'applied',
    target: url,
    comercio: { id: comercio.id, name: comercio.name },
    data: {
      products: inventory.length,
      mesas: tables.length,
      open_shift_id: shift.id,
      historical_sales: sales,
    },
    credentials: {
      super_admin: {
        email: config.superAdmin.email,
        password: superPassword,
        route: '/super',
      },
      empleado: {
        email: config.empleado.email,
        password: employeePassword,
        route: '/empleado/mesas',
      },
    },
  }, null, 2));
}

if (apply) {
  await applySeed();
} else {
  await inspect();
}
