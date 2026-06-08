-- ============================================================
-- 清除所有种子数据（保留表结构和 admin 账号）
-- 运行: source seed_drop.sql
-- ============================================================

USE flora_erp;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE payments;
TRUNCATE TABLE loss_records;
TRUNCATE TABLE inventory_adjustments;
TRUNCATE TABLE sales_return_items;
TRUNCATE TABLE sales_returns;
TRUNCATE TABLE sales_order_items;
TRUNCATE TABLE sales_orders;
TRUNCATE TABLE purchase_return_items;
TRUNCATE TABLE purchase_returns;
TRUNCATE TABLE purchase_order_items;
TRUNCATE TABLE purchase_orders;
TRUNCATE TABLE inventory;
TRUNCATE TABLE products;
TRUNCATE TABLE customers;
TRUNCATE TABLE suppliers;

SET FOREIGN_KEY_CHECKS = 1;
