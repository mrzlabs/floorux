-- Migration: Create mesa_audit_log table
-- Purpose: Track admin actions on mesas (remove items, reduce qty, cancel mesa)

CREATE TABLE IF NOT EXISTS mesa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('remove_item', 'reduce_qty', 'cancel_mesa')),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  qty INT,
  motivo TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for queries by mesa
CREATE INDEX idx_mesa_audit_log_mesa_id ON mesa_audit_log(mesa_id);

-- Index for queries by admin
CREATE INDEX idx_mesa_audit_log_admin_id ON mesa_audit_log(admin_id);

-- Index for queries by date
CREATE INDEX idx_mesa_audit_log_created_at ON mesa_audit_log(created_at DESC);

-- RLS policies
ALTER TABLE mesa_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view audit logs for their comercio
CREATE POLICY "Admins can view audit logs"
  ON mesa_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = admin_id
      AND usuarios.comercio_id IN (
        SELECT comercio_id FROM usuarios WHERE id = auth.uid()
      )
    )
  );

-- Policy: Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
  ON mesa_audit_log
  FOR INSERT
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'super_root')
    )
  );

COMMENT ON TABLE mesa_audit_log IS 'Audit trail for admin actions on mesas';
COMMENT ON COLUMN mesa_audit_log.action IS 'Type of action: remove_item, reduce_qty, cancel_mesa';
COMMENT ON COLUMN mesa_audit_log.motivo IS 'Admin-provided reason for the action';
