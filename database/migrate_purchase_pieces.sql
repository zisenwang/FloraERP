-- Add pieces to purchase_order_items and total_pieces to purchase_orders
ALTER TABLE purchase_order_items
  ADD COLUMN pieces INT NOT NULL DEFAULT 0 COMMENT '件数' AFTER qty;

ALTER TABLE purchase_orders
  ADD COLUMN total_pieces INT NOT NULL DEFAULT 0 COMMENT '合计件数' AFTER total_qty;
