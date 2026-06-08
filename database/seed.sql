-- ============================================================
-- FloraERP 测试种子数据
-- 运行: source seed.sql
-- 清除: source seed_drop.sql
-- ============================================================

USE flora_erp;

-- ── 供应商 ───────────────────────────────────────────────────
INSERT INTO suppliers (code, name, phone, status) VALUES
  ('133', '绿源花卉基地', '13800138001', 1),
  ('205', '芳草花木场',   '13900139002', 1),
  ('318', '天成园艺',     '13700137003', 1);

-- ── 客户 ─────────────────────────────────────────────────────
INSERT INTO customers (code, name, phone, status) VALUES
  ('1001', '花城花鸟市场A铺', '13600136001', 1),
  ('1002', '顺德绿美园艺',    '13500135002', 1),
  ('1003', '番禺芳草坪',      '13400134003', 1),
  ('1004', '中山益华花木',    '13300133004', 1);

-- ── 货品 ─────────────────────────────────────────────────────
INSERT INTO products (code, supplier_id, name, category, unit, cost_price, price, units_per_piece, status) VALUES
  ('133.51', 1, '金钱树小型',   '观叶植物', '盆', 18.00, 28.00, 30, 1),
  ('133.52', 1, '金钱树中型',   '观叶植物', '盆', 35.00, 55.00, 20, 1),
  ('133.61', 1, '绿萝吊篮',     '观叶植物', '盆',  8.00, 15.00, 50, 1),
  ('205.10', 2, '蝴蝶兰粉色',   '兰花',     '盆', 45.00, 88.00, 12, 1),
  ('205.11', 2, '蝴蝶兰白色',   '兰花',     '盆', 45.00, 88.00, 12, 1),
  ('205.20', 2, '大花蕙兰',     '兰花',     '盆', 60.00,110.00, 10, 1),
  ('318.01', 3, '平安树大型',   '观叶植物', '盆', 80.00,150.00,  5, 1),
  ('318.05', 3, '发财树三杆',   '观叶植物', '盆', 55.00, 98.00, 10, 1);

-- ── 库存（与货品同步） ────────────────────────────────────────
INSERT INTO inventory (product_id, quantity) VALUES
  (1, 120), (2, 60), (3, 200), (4, 45), (5, 38), (6, 22), (7, 15), (8, 30);

-- ── 采购单 1 ─────────────────────────────────────────────────
INSERT INTO purchase_orders (order_no, supplier_id, date, total_qty, total_amount, discount, final_amount, operator, notes)
VALUES ('C20261G01_D1', 1, '2026-06-01', 200, 6100.00, 100, 6100.00, 'admin', '首批备货');

INSERT INTO purchase_order_items (order_id, product_id, qty, unit_price, amount, discount, final_amount) VALUES
  (1, 1, 120, 18.00, 2160.00, 100, 2160.00),
  (1, 2,  60, 35.00, 2100.00, 100, 2100.00),
  (1, 3,  20,  8.00,  160.00, 100,  160.00);  -- extra beyond inventory for demo

-- ── 采购单 2 ─────────────────────────────────────────────────
INSERT INTO purchase_orders (order_no, supplier_id, date, total_qty, total_amount, discount, final_amount, operator)
VALUES ('C20261G03_D2', 2, '2026-06-03', 95, 8265.00, 95, 7851.75, 'admin');

INSERT INTO purchase_order_items (order_id, product_id, qty, unit_price, amount, discount, final_amount) VALUES
  (2, 4, 45, 45.00, 2025.00, 95, 1923.75),
  (2, 5, 38, 45.00, 1710.00, 95, 1624.50),
  (2, 6, 12, 60.00,  720.00, 95,  684.00);

-- ── 销售单 1（已收款） ────────────────────────────────────────
INSERT INTO sales_orders (order_no, customer_id, date, total_qty, total_amount, total_pieces, operator, payment_status)
VALUES ('X20261G02_D1', 1, '2026-06-02', 60, 2940.00, 3, 'admin', '已收款');

INSERT INTO sales_order_items (order_id, product_id, supplier_id, qty, unit_price, amount, discount, final_amount, pieces) VALUES
  (1, 1, 1, 30, 28.00,  840.00, 100,  840.00, 1),
  (1, 2, 1, 20, 55.00, 1100.00, 100, 1100.00, 1),
  (1, 4, 2, 10, 88.00,  880.00, 100,  880.00, 1);

INSERT INTO payments (sales_order_id, customer_id, amount, payment_date, method, operator)
VALUES (1, 1, 2940.00, '2026-06-02', '转账', 'admin');

-- ── 销售单 2（部分收款） ──────────────────────────────────────
INSERT INTO sales_orders (order_no, customer_id, date, total_qty, total_amount, total_pieces, operator, payment_status)
VALUES ('X20261G04_D2', 2, '2026-06-04', 40, 3256.00, 4, 'admin', '部分收款');

INSERT INTO sales_order_items (order_id, product_id, supplier_id, qty, unit_price, amount, discount, final_amount, pieces) VALUES
  (2, 3, 1, 20, 15.00,  300.00, 100,  300.00, 1),
  (2, 5, 2, 12, 88.00, 1056.00,  90,  950.40, 1),
  (2, 7, 3,  8,150.00, 1200.00, 100, 1200.00, 1);

INSERT INTO payments (sales_order_id, customer_id, amount, payment_date, method, operator)
VALUES (2, 2, 1500.00, '2026-06-05', '微信', 'admin');

-- ── 销售单 3（未收款） ────────────────────────────────────────
INSERT INTO sales_orders (order_no, customer_id, date, total_qty, total_amount, total_pieces, operator, payment_status)
VALUES ('X20261G06_D3', 3, '2026-06-06', 25, 2646.00, 3, 'admin', '未收款');

INSERT INTO sales_order_items (order_id, product_id, supplier_id, qty, unit_price, amount, discount, final_amount, pieces) VALUES
  (3, 4, 2, 10, 88.00,  880.00, 100,  880.00, 1),
  (3, 6, 2,  5,110.00,  550.00, 100,  550.00, 1),
  (3, 8, 3, 10, 98.00,  980.00, 100,  980.00, 1);

-- ── 报损记录 ─────────────────────────────────────────────────
INSERT INTO loss_records (product_id, qty, reason, operator, date)
VALUES (3, 5, '运输损坏', 'admin', '2026-06-05');

UPDATE inventory SET quantity = quantity - 5 WHERE product_id = 3;

INSERT INTO inventory_adjustments (product_id, type, qty_before, qty_change, qty_after, reason, ref_type, ref_id, operator)
VALUES (3, 'out', 205, -5, 200, '运输损坏', 'loss', 1, 'admin');
