-- ============================================================
-- Migration: Simplify product codes
-- Before: code stored as '{supplier_code}.{seq}' (e.g. 'ABC.01')
-- After:  code stored as seq only             (e.g. '01')
--         full code derived at query time via CONCAT(s.code, '.', p.code)
--
-- Unique constraint changed from UNIQUE(code) to UNIQUE(supplier_id, code)
-- ============================================================

-- Step 0: Preview changes before applying (verify output looks correct)
SELECT id, supplier_id, code, SUBSTRING(code, LOCATE('.', code) + 1) AS new_code
FROM products
WHERE LOCATE('.', code) > 0;

-- Step 1: Strip supplier prefix from all product codes
UPDATE products
SET code = SUBSTRING(code, LOCATE('.', code) + 1)
WHERE LOCATE('.', code) > 0;

-- Step 2: Replace global unique constraint with per-supplier unique constraint
ALTER TABLE products
  DROP INDEX uq_products_code;

ALTER TABLE products
  ADD CONSTRAINT uq_products_supplier_code UNIQUE (supplier_id, code);

-- Step 3: Verify result
SELECT id, supplier_id, code FROM products ORDER BY supplier_id, code;
