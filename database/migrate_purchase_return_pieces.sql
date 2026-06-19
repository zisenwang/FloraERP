-- Add pieces to purchase return tables
ALTER TABLE purchase_return_items
  ADD COLUMN pieces INT NOT NULL DEFAULT 0 COMMENT '件数' AFTER qty;

ALTER TABLE purchase_returns
  ADD COLUMN total_pieces INT NOT NULL DEFAULT 0 COMMENT '合计件数' AFTER total_qty;
