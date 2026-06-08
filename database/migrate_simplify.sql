-- ============================================================
-- 简化数据库结构
-- 运行: source migrate_simplify.sql
-- ============================================================

USE flora_erp;

-- suppliers: 去掉 contact, city, province, notes
ALTER TABLE suppliers
  DROP COLUMN IF EXISTS contact,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS province,
  DROP COLUMN IF EXISTS notes;

-- customers: 去掉 contact, city, province, level, notes
ALTER TABLE customers
  DROP COLUMN IF EXISTS contact,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS province,
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS notes;

-- purchase_order_items: 去掉 spec
ALTER TABLE purchase_order_items
  DROP COLUMN IF EXISTS spec;
