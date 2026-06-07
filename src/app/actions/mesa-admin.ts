'use server';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';

export async function removeItemAdmin(mesaId: string, productId: string, qty: number, motivo: string) {
  const profile = await getProfile();

  if (!profile || !['admin', 'super_admin', 'super_super_admin'].includes(profile.role)) {
    return { error: 'Sin permisos para esta acción' };
  }

  const supabase = await createClient();

  // Devolver stock
  const { data: product } = await supabase
    .from('products')
    .select('stock')
    .eq('id', productId)
    .single();

  if (product) {
    await supabase
      .from('products')
      .update({ stock: product.stock + qty })
      .eq('id', productId);
  }

  // Eliminar mesa_items
  const { error } = await supabase
    .from('mesa_items')
    .delete()
    .eq('mesa_id', mesaId)
    .eq('product_id', productId);

  if (error) {
    return { error: 'Error al eliminar el item' };
  }

  return { success: true };
}

export async function closeMesaSinCobrar(mesaId: string, motivo: string) {
  const profile = await getProfile();

  if (!profile || !['admin', 'super_admin', 'super_super_admin'].includes(profile.role)) {
    return { error: 'Sin permisos para esta acción' };
  }

  const supabase = await createClient();

  // Obtener items de la mesa para devolver stock
  const { data: items } = await supabase
    .from('mesa_items')
    .select('product_id, qty')
    .eq('mesa_id', mesaId);

  if (items) {
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      if (product) {
        await supabase
          .from('products')
          .update({ stock: product.stock + item.qty })
          .eq('id', item.product_id);
      }
    }
  }

  // Eliminar items de la mesa
  await supabase.from('mesa_items').delete().eq('mesa_id', mesaId);

  // Liberar mesa
  const { error } = await supabase
    .from('mesas')
    .update({ status: 'libre', alias: null, opened_at: null, opened_by: null })
    .eq('id', mesaId);

  if (error) {
    return { error: 'Error al cerrar la mesa' };
  }

  return { success: true };
}

export async function updateItemQtyAdmin(mesaId: string, productId: string, delta: number) {
  const profile = await getProfile();

  if (!profile || !['admin', 'super_admin', 'super_super_admin'].includes(profile.role)) {
    return { error: 'Sin permisos para esta acción' };
  }

  const supabase = await createClient();

  // Obtener producto y item actual
  const { data: product } = await supabase
    .from('products')
    .select('stock')
    .eq('id', productId)
    .single();

  const { data: item } = await supabase
    .from('mesa_items')
    .select('qty')
    .eq('mesa_id', mesaId)
    .eq('product_id', productId)
    .single();

  if (!product || !item) {
    return { error: 'Producto o item no encontrado' };
  }

  const newQty = item.qty + delta;

  // Actualizar stock
  if (delta < 0) {
    // Devolver al inventario
    await supabase
      .from('products')
      .update({ stock: product.stock + Math.abs(delta) })
      .eq('id', productId);
  } else {
    // Descontar del inventario
    if (product.stock < delta) {
      return { error: 'Stock insuficiente' };
    }
    await supabase
      .from('products')
      .update({ stock: product.stock - delta })
      .eq('id', productId);
  }

  // Actualizar o eliminar item
  if (newQty <= 0) {
    await supabase
      .from('mesa_items')
      .delete()
      .eq('mesa_id', mesaId)
      .eq('product_id', productId);
  } else {
    const { error } = await supabase
      .from('mesa_items')
      .update({ qty: newQty })
      .eq('mesa_id', mesaId)
      .eq('product_id', productId);

    if (error) {
      return { error: 'Error al actualizar cantidad' };
    }
  }

  return { success: true };
}
