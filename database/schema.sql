-- ============================================================
-- 广阔园艺 花卉批发 ERP 系统数据库 Schema v2
-- 数据库: flora_erp
-- 字符集: utf8mb4 / utf8mb4_unicode_ci
--
-- 命名规范：
--   · 列名与 API 字段名一致，查询无需 alias
--   · status TINYINT(1): 1=启用, 0=停用
--   · 金额字段: DECIMAL(10,2)
--   · discount: INT 百分比整数 0-100 (100 = 不打折)
-- ============================================================

CREATE DATABASE IF NOT EXISTS flora_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE flora_erp;

-- ============================================================
-- 按依赖顺序删除旧表
-- ============================================================
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS loss_records;
DROP TABLE IF EXISTS inventory_adjustments;
DROP TABLE IF EXISTS sales_return_items;
DROP TABLE IF EXISTS sales_returns;
DROP TABLE IF EXISTS sales_order_items;
DROP TABLE IF EXISTS sales_orders;
DROP TABLE IF EXISTS purchase_return_items;
DROP TABLE IF EXISTS purchase_returns;
DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS users;

-- ============================================================
-- 1. 用户表
-- ============================================================
CREATE TABLE users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)     NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  name          VARCHAR(50)     NOT NULL,
  role          ENUM('admin','operator') NOT NULL DEFAULT 'operator',
  status        TINYINT(1)      NOT NULL DEFAULT 1  COMMENT '1=启用 0=停用',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. 供应商表
-- ============================================================
CREATE TABLE suppliers (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  code       VARCHAR(20)   NOT NULL              COMMENT '供应商编码，如 133',
  name       VARCHAR(100)  NOT NULL              COMMENT '供应商名称',
  phone      VARCHAR(30)   DEFAULT NULL,
  address    VARCHAR(200)  DEFAULT NULL,
  status     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_suppliers_code (code),
  KEY idx_suppliers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. 客户表
-- ============================================================
CREATE TABLE customers (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  code       VARCHAR(20)   NOT NULL              COMMENT '客户编码，如 1300',
  name       VARCHAR(100)  NOT NULL,
  phone      VARCHAR(30)   DEFAULT NULL,
  address    VARCHAR(200)  DEFAULT NULL,
  status     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_code (code),
  KEY idx_customers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. 货品表
-- ============================================================
CREATE TABLE products (
  id             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  code           VARCHAR(30)    NOT NULL              COMMENT '货品编码，如 133.51',
  supplier_id    INT UNSIGNED   NOT NULL,
  name           VARCHAR(100)   NOT NULL,
  category       VARCHAR(50)    DEFAULT NULL          COMMENT '品类',
  grade          VARCHAR(20)    DEFAULT NULL          COMMENT '等级，如 A级',
  spec           VARCHAR(50)    DEFAULT NULL          COMMENT '规格描述',
  unit           VARCHAR(10)    NOT NULL DEFAULT '盆',
  cost_price     DECIMAL(10,2)  DEFAULT NULL          COMMENT '进货价',
  price          DECIMAL(10,2)  DEFAULT NULL          COMMENT '销售价',
  units_per_piece INT UNSIGNED  DEFAULT NULL
    COMMENT '默认每件包含多少盆/株（件=piece，盆=unit）。NULL=不固定，开单时手动填写',
  status         TINYINT(1)     NOT NULL DEFAULT 1,
  created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_code (code),
  KEY idx_products_supplier_id (supplier_id),
  KEY idx_products_category (category),
  KEY idx_products_name (name),
  CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. 库存表（每个货品一行）
-- ============================================================
CREATE TABLE inventory (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED  NOT NULL,
  quantity   INT           NOT NULL DEFAULT 0,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_product (product_id),
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. 采购单主表
-- ============================================================
CREATE TABLE purchase_orders (
  id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  order_no     VARCHAR(30)    NOT NULL              COMMENT '单号，如 C20265G20_D44',
  supplier_id  INT UNSIGNED   NOT NULL,
  date         DATE           NOT NULL,
  total_qty    INT            NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  discount     INT            NOT NULL DEFAULT 100  COMMENT '整单折扣百分比',
  final_amount DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  operator     VARCHAR(50)    DEFAULT NULL,
  notes        TEXT           DEFAULT NULL,
  status       ENUM('草稿','已入库') NOT NULL DEFAULT '已入库',
  created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_orders_no (order_no),
  KEY idx_po_supplier (supplier_id),
  KEY idx_po_date (date),
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. 采购单明细
-- ============================================================
CREATE TABLE purchase_order_items (
  id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  order_id     INT UNSIGNED   NOT NULL,
  product_id   INT UNSIGNED   NOT NULL,
  qty          INT            NOT NULL DEFAULT 0,
  unit_price   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  amount       DECIMAL(10,2)  NOT NULL DEFAULT 0.00  COMMENT '折前小计',
  discount     INT            NOT NULL DEFAULT 100,
  final_amount DECIMAL(10,2)  NOT NULL DEFAULT 0.00  COMMENT '折后小计',
  notes        TEXT           DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_poi_order (order_id),
  KEY idx_poi_product (product_id),
  CONSTRAINT fk_poi_order   FOREIGN KEY (order_id)   REFERENCES purchase_orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. 采购退货单主表
-- ============================================================
CREATE TABLE purchase_returns (
  id                INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  return_no         VARCHAR(30)    NOT NULL,
  supplier_id       INT UNSIGNED   NOT NULL,
  original_order_id INT UNSIGNED   DEFAULT NULL,
  date              DATE           NOT NULL,
  total_qty         INT            NOT NULL DEFAULT 0,
  total_amount      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  operator          VARCHAR(50)    DEFAULT NULL,
  notes             TEXT           DEFAULT NULL,
  created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_returns_no (return_no),
  KEY idx_pr_supplier (supplier_id),
  KEY idx_pr_date (date),
  CONSTRAINT fk_pr_supplier       FOREIGN KEY (supplier_id)       REFERENCES suppliers (id),
  CONSTRAINT fk_pr_original_order FOREIGN KEY (original_order_id) REFERENCES purchase_orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. 采购退货明细
-- ============================================================
CREATE TABLE purchase_return_items (
  id        INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  return_id INT UNSIGNED   NOT NULL,
  product_id INT UNSIGNED  NOT NULL,
  qty       INT            NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount    DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  notes     TEXT           DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_pri_return (return_id),
  KEY idx_pri_product (product_id),
  CONSTRAINT fk_pri_return  FOREIGN KEY (return_id)  REFERENCES purchase_returns (id) ON DELETE CASCADE,
  CONSTRAINT fk_pri_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. 销售单主表
-- ============================================================
CREATE TABLE sales_orders (
  id             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  order_no       VARCHAR(30)    NOT NULL              COMMENT '单号，如 X20265G20_D701',
  customer_id    INT UNSIGNED   NOT NULL,
  date           DATE           NOT NULL,
  total_qty      INT            NOT NULL DEFAULT 0,
  total_amount   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  total_pieces   INT            NOT NULL DEFAULT 0    COMMENT '合计件数',
  operator       VARCHAR(50)    DEFAULT NULL,
  notes          TEXT           DEFAULT NULL,
  status         ENUM('draft','confirmed') NOT NULL DEFAULT 'confirmed',
  payment_status ENUM('未收款','已收款','部分收款') NOT NULL DEFAULT '未收款',
  created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_orders_no (order_no),
  KEY idx_so_customer (customer_id),
  KEY idx_so_date (date),
  KEY idx_so_payment_status (payment_status),
  CONSTRAINT fk_so_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. 销售单明细
-- ============================================================
CREATE TABLE sales_order_items (
  id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  order_id     INT UNSIGNED   NOT NULL,
  product_id   INT UNSIGNED   NOT NULL,
  supplier_id  INT UNSIGNED   NOT NULL              COMMENT '冗余，用于分供应商显示',
  qty          INT            NOT NULL DEFAULT 0,
  unit_price   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  amount       DECIMAL(10,2)  NOT NULL DEFAULT 0.00  COMMENT '折前小计',
  discount     INT            NOT NULL DEFAULT 100   COMMENT '行级折扣百分比',
  final_amount DECIMAL(10,2)  NOT NULL DEFAULT 0.00  COMMENT '折后小计',
  pieces       INT            NOT NULL DEFAULT 0     COMMENT '件数（本行）',
  notes        TEXT           DEFAULT NULL           COMMENT '行备注',
  PRIMARY KEY (id),
  KEY idx_soi_order (order_id),
  KEY idx_soi_product (product_id),
  KEY idx_soi_supplier (supplier_id),
  CONSTRAINT fk_soi_order    FOREIGN KEY (order_id)   REFERENCES sales_orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_soi_product  FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT fk_soi_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. 销售退货单主表
-- ============================================================
CREATE TABLE sales_returns (
  id                INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  return_no         VARCHAR(30)    NOT NULL,
  customer_id       INT UNSIGNED   NOT NULL,
  original_order_id INT UNSIGNED   DEFAULT NULL,
  date              DATE           NOT NULL,
  total_qty         INT            NOT NULL DEFAULT 0,
  total_amount      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  total_pieces      INT            NOT NULL DEFAULT 0,
  operator          VARCHAR(50)    DEFAULT NULL,
  notes             TEXT           DEFAULT NULL,
  created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_returns_no (return_no),
  KEY idx_sr_customer (customer_id),
  KEY idx_sr_date (date),
  CONSTRAINT fk_sr_customer       FOREIGN KEY (customer_id)       REFERENCES customers (id),
  CONSTRAINT fk_sr_original_order FOREIGN KEY (original_order_id) REFERENCES sales_orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. 销售退货明细
-- ============================================================
CREATE TABLE sales_return_items (
  id         INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  return_id  INT UNSIGNED   NOT NULL,
  product_id INT UNSIGNED   NOT NULL,
  qty        INT            NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  amount     DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  pieces     INT            NOT NULL DEFAULT 0,
  notes      TEXT           DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_sri_return (return_id),
  KEY idx_sri_product (product_id),
  CONSTRAINT fk_sri_return  FOREIGN KEY (return_id)  REFERENCES sales_returns (id) ON DELETE CASCADE,
  CONSTRAINT fk_sri_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. 库存变动流水
-- ============================================================
CREATE TABLE inventory_adjustments (
  id         INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED   NOT NULL,
  type       ENUM('in','out','adjust') NOT NULL,
  qty_before INT            NOT NULL,
  qty_change INT            NOT NULL              COMMENT '正=增加 负=减少',
  qty_after  INT            NOT NULL,
  reason     VARCHAR(200)   DEFAULT NULL,
  ref_type   ENUM('purchase','sale','purchase_return','sale_return','loss','manual') NOT NULL,
  ref_id     INT UNSIGNED   DEFAULT NULL,
  operator   VARCHAR(50)    DEFAULT NULL,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ia_product (product_id),
  KEY idx_ia_ref (ref_type, ref_id),
  KEY idx_ia_created (created_at),
  CONSTRAINT fk_ia_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. 报损记录
-- ============================================================
CREATE TABLE loss_records (
  id         INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED   NOT NULL,
  qty        INT            NOT NULL,
  reason     VARCHAR(200)   DEFAULT NULL,
  operator   VARCHAR(50)    DEFAULT NULL,
  date       DATE           NOT NULL,
  notes      TEXT           DEFAULT NULL,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lr_product (product_id),
  KEY idx_lr_date (date),
  CONSTRAINT fk_lr_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. 收款记录
-- ============================================================
CREATE TABLE payments (
  id             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  sales_order_id INT UNSIGNED   NOT NULL,
  customer_id    INT UNSIGNED   NOT NULL              COMMENT '冗余，便于查询',
  amount         DECIMAL(10,2)  NOT NULL,
  payment_date   DATE           NOT NULL,
  method         ENUM('现金','转账','微信','支付宝') NOT NULL DEFAULT '转账',
  notes          TEXT           DEFAULT NULL,
  operator       VARCHAR(50)    DEFAULT NULL,
  created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_order (sales_order_id),
  KEY idx_payments_customer (customer_id),
  KEY idx_payments_date (payment_date),
  CONSTRAINT fk_payments_order    FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id),
  CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id)    REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 初始管理员账号（密码: admin123）
-- 上线前改密码
-- ============================================================
INSERT INTO users (username, password_hash, name, role, status)
VALUES ('admin', '$2b$10$.KT6XQ1SoyDKAnEEVgrY0OTXYU4IRFC5X9zxeFmDG9v7xiQYDxbBm', '管理员', 'admin', 1);
