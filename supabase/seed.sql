-- ============================================================
-- FloorUX seed — datos demo basados en data.js
-- Ejecutar DESPUÉS del schema y DESPUÉS de crear el super_super_admin
-- manualmente vía Supabase Auth o script bootstrap.
-- ============================================================

-- 1. Crear un super_admin demo (reemplazar UUID con el de auth.users)
-- INSERT INTO public.profiles (id, full_name, email, role, activo, color)
-- VALUES ('<super_admin_uuid>', 'Demo Super Admin', 'superadmin@demo.com', 'super_admin', true, '#B57BE0');

-- 2. Comercio demo (reemplazar super_admin_id)
-- INSERT INTO public.comercios (id, super_admin_id, name, type, city, plan, kind, status, color, tables_count)
-- VALUES
--   ('aaaaaaaa-0000-0000-0000-000000000001', '<super_admin_uuid>', 'Discoteca Aurora', 'Discoteca', 'Medellín', 'Pro', 'Principal', 'activo', '#7F77DD', 24),
--   ('aaaaaaaa-0000-0000-0000-000000000002', '<super_admin_uuid>', 'Taberna El Farol', 'Taberna', 'Bogotá', 'Pro', 'Franquicia', 'activo', '#27C3D8', 14),
--   ('aaaaaaaa-0000-0000-0000-000000000003', '<super_admin_uuid>', 'Club Neón', 'Discoteca', 'Cali', 'Pro', 'Franquicia', 'activo', '#F5C400', 20),
--   ('aaaaaaaa-0000-0000-0000-000000000004', '<super_admin_uuid>', 'Bar Puerto Madero', 'Bar', 'Cartagena', 'Básico', 'Franquicia', 'activo', '#B57BE0', 12),
--   ('aaaaaaaa-0000-0000-0000-000000000005', '<super_admin_uuid>', 'Taberna La Luna', 'Taberna', 'Pereira', 'Básico', 'Franquicia', 'inactivo', '#E0708A', 10);

-- 3. Productos para Discoteca Aurora (ejecutar por cada comercio)
-- Reemplazar comercio_id con el UUID real del comercio
DO $$
DECLARE
  c_id uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.products (comercio_id, name, dist, cat, sub, unit, cost, price, stock, min_stock) VALUES
    (c_id, 'Águila', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2200, 7000, 96, 36),
    (c_id, 'Águila Light', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2200, 7000, 60, 36),
    (c_id, 'Poker', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2100, 6500, 8, 36),
    (c_id, 'Costeña', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2000, 6000, 120, 36),
    (c_id, 'Pilsen', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 2100, 6500, 44, 24),
    (c_id, 'Club Colombia Dorada', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 3000, 9000, 52, 24),
    (c_id, 'Club Colombia Roja', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 3000, 9000, 30, 24),
    (c_id, 'Corona', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 5200, 12000, 0, 18),
    (c_id, 'Stella Artois', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 4800, 11000, 24, 18),
    (c_id, 'Budweiser', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 4300, 10000, 16, 18),
    (c_id, 'BBC Cajicá', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 5500, 13000, 12, 12),
    (c_id, 'Redd''s', 'Bavaria', 'licor', 'Cerveza', 'Botella 330ml', 3200, 9000, 28, 18),
    (c_id, 'Postobón Manzana', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml', 1400, 4000, 72, 24),
    (c_id, 'Colombiana', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml', 1400, 4000, 64, 24),
    (c_id, 'Pepsi', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml', 1400, 4000, 58, 24),
    (c_id, '7Up', 'Postobón', 'bebida', 'Gaseosa', 'Personal 400ml', 1400, 4000, 40, 24),
    (c_id, 'Agua Cristal', 'Postobón', 'bebida', 'Agua', 'Botella 600ml', 900, 3000, 88, 30),
    (c_id, 'Gatorade', 'Postobón', 'bebida', 'Hidratante', 'Botella 500ml', 2200, 6000, 40, 18),
    (c_id, 'Speed Max', 'Postobón', 'bebida', 'Energizante', 'Lata 269ml', 2400, 6500, 34, 18),
    (c_id, 'Aguardiente Antioqueño', 'Licores', 'licor', 'Aguardiente', 'Botella 750ml', 32000, 75000, 14, 6),
    (c_id, 'Aguardiente Néctar', 'Licores', 'licor', 'Aguardiente', 'Botella 750ml', 31000, 72000, 9, 6),
    (c_id, 'Ron Medellín Añejo', 'Licores', 'licor', 'Ron', 'Botella 750ml', 38000, 85000, 8, 5),
    (c_id, 'Ron Viejo de Caldas', 'Licores', 'licor', 'Ron', 'Botella 750ml', 36000, 82000, 3, 5),
    (c_id, 'Old Parr', 'Licores', 'licor', 'Whisky', 'Botella 750ml', 92000, 175000, 5, 3),
    (c_id, 'Buchanan''s Deluxe', 'Licores', 'licor', 'Whisky', 'Botella 750ml', 110000, 210000, 2, 3),
    (c_id, 'Smirnoff', 'Licores', 'licor', 'Vodka', 'Botella 750ml', 34000, 78000, 6, 4),
    (c_id, 'José Cuervo', 'Licores', 'licor', 'Tequila', 'Botella 750ml', 58000, 120000, 4, 3),
    (c_id, 'Papas Margarita', 'Snacks', 'snack', 'Papas', 'Paquete 105g', 2200, 5000, 40, 18),
    (c_id, 'Maní La Especial', 'Snacks', 'snack', 'Maní', 'Paquete 45g', 1200, 3000, 30, 18),
    (c_id, 'Picada para 2', 'Cocina', 'snack', 'Picada', 'Plato', 9000, 22000, 99, 0),
    (c_id, 'Marlboro', 'Tabaco', 'cigarro', 'Caja', 'Cajetilla x20', 8500, 14000, 12, 8),
    (c_id, 'Cuba Libre', 'Casa', 'coctel', 'Cóctel de la casa', 'Vaso', 6000, 18000, 99, 0),
    (c_id, 'Mojito', 'Casa', 'coctel', 'Cóctel de la casa', 'Vaso', 7000, 20000, 99, 0),
    (c_id, 'Gin Tonic', 'Casa', 'coctel', 'Cóctel de la casa', 'Vaso', 8000, 24000, 99, 0);

  -- Mesas demo para Aurora
  INSERT INTO public.mesas (comercio_id, name) VALUES
    (c_id, 'Mesa 1'), (c_id, 'Mesa 2'), (c_id, 'Mesa 3'), (c_id, 'Mesa 4'),
    (c_id, 'Mesa 5'), (c_id, 'Mesa 6'), (c_id, 'Mesa 7'), (c_id, 'Mesa 8'),
    (c_id, 'Barra 1'), (c_id, 'Barra 2'), (c_id, 'VIP 1'), (c_id, 'VIP 2');
END $$;
