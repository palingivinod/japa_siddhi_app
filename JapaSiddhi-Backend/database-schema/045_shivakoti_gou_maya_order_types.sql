-- Allow Shivakoti Books + Gou Maya Bhasma order types (and future free sevas).
-- Runtime also widens order_type via order.repository.ensureOrderTypeEnum().

ALTER TABLE orders
  MODIFY COLUMN order_type VARCHAR(64) NOT NULL;
