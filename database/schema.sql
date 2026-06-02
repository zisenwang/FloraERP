-- ============================================================
-- 广阔园艺 花卉批发 ERP 系统数据库 Schema
-- 数据库: flora_erp
-- 字符集: utf8mb4 / utf8mb4_unicode_ci
-- ============================================================

CREATE DATABASE IF NOT EXISTS flora_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE flora_erp;

-- ============================================================
-- 按依赖顺序删除表（先删子表，再删父表）
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
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  username      VARCHAR(50)     NOT NULL                COMMENT '登录用户名',
  password_hash VARCHAR(255)    NOT NULL                COMMENT '密码哈希（bcrypt）',
  name          VARCHAR(50)     NOT NULL                COMMENT '真实姓名',
  role          ENUM('admin','operator') NOT NULL DEFAULT 'operator' COMMENT '角色：admin=管理员，operator=操作员',
  active        TINYINT(1)      NOT NULL DEFAULT 1      COMMENT '是否启用：1=启用，0=禁用',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='用户账号表';

-- ============================================================
-- 2. 供应商表
-- ============================================================
CREATE TABLE suppliers (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  code          VARCHAR(20)     NOT NULL                COMMENT '供应商编号（唯一，如：133）',
  name          VARCHAR(100)    NOT NULL                COMMENT '供应商名称',
  contact_name  VARCHAR(50)     DEFAULT NULL            COMMENT '联系人姓名',
  phone         VARCHAR(30)     DEFAULT NULL            COMMENT '联系电话',
  address       VARCHAR(200)    DEFAULT NULL            COMMENT '详细地址',
  city          VARCHAR(50)     DEFAULT NULL            COMMENT '城市',
  province      VARCHAR(50)     DEFAULT NULL            COMMENT '省份',
  notes         TEXT            DEFAULT NULL            COMMENT '备注',
  active        TINYINT(1)      NOT NULL DEFAULT 1      COMMENT '是否启用：1=启用，0=禁用',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uq_suppliers_code (code),
  KEY idx_suppliers_name (name),
  KEY idx_suppliers_province (province)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='供应商信息表';

-- ============================================================
-- 3. 客户表
-- ============================================================
CREATE TABLE customers (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  code          VARCHAR(20)     NOT NULL                COMMENT '客户编号（唯一）',
  name          VARCHAR(100)    NOT NULL                COMMENT '客户名称',
  contact_name  VARCHAR(50)     DEFAULT NULL            COMMENT '联系人姓名',
  phone         VARCHAR(30)     DEFAULT NULL            COMMENT '联系电话',
  city          VARCHAR(50)     DEFAULT NULL            COMMENT '城市',
  province      VARCHAR(50)     DEFAULT NULL            COMMENT '省份',
  address       VARCHAR(200)    DEFAULT NULL            COMMENT '详细地址',
  notes         TEXT            DEFAULT NULL            COMMENT '备注',
  active        TINYINT(1)      NOT NULL DEFAULT 1      COMMENT '是否启用：1=启用，0=禁用',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_code (code),
  KEY idx_customers_name (name),
  KEY idx_customers_province (province)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='客户信息表';

-- ============================================================
-- 4. 商品（花卉）表
-- ============================================================
CREATE TABLE products (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  code          VARCHAR(30)     NOT NULL                COMMENT '商品编号（格式：供应商编号.序号，如：133.51）',
  supplier_id   INT UNSIGNED    NOT NULL                COMMENT '所属供应商ID',
  name          VARCHAR(100)    NOT NULL                COMMENT '商品名称',
  category      VARCHAR(50)     DEFAULT NULL            COMMENT '品类（如：观叶、鲜花、多肉）',
  grade         VARCHAR(20)     DEFAULT NULL            COMMENT '规格等级（如：A级、B级）',
  spec          VARCHAR(50)     DEFAULT NULL            COMMENT '规格描述（如：冠幅30cm）',
  unit          VARCHAR(10)     NOT NULL DEFAULT '盆'  COMMENT '计量单位（默认：盆）',
  cost_price    DECIMAL(10,2)   DEFAULT NULL            COMMENT '进货价（元）',
  sell_price    DECIMAL(10,2)   DEFAULT NULL            COMMENT '销售价（元）',
  active        TINYINT(1)      NOT NULL DEFAULT 1      COMMENT '是否启用：1=启用，0=禁用',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_code (code),
  KEY idx_products_supplier_id (supplier_id),
  KEY idx_products_category (category),
  KEY idx_products_name (name),
  CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='花卉商品信息表';

-- ============================================================
-- 5. 库存表
-- ============================================================
CREATE TABLE inventory (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  product_id    INT UNSIGNED    NOT NULL                COMMENT '商品ID',
  quantity      INT             NOT NULL DEFAULT 0      COMMENT '当前库存数量',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uq_inventory_product_id (product_id),
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='商品库存表（每商品一行）';

-- ============================================================
-- 6. 采购订单表
-- ============================================================
CREATE TABLE purchase_orders (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  order_no      VARCHAR(30)     NOT NULL                COMMENT '采购单号（格式：C20265G20_D44）',
  supplier_id   INT UNSIGNED    NOT NULL                COMMENT '供应商ID',
  date          DATE            NOT NULL                COMMENT '采购日期',
  total_qty     INT             NOT NULL DEFAULT 0      COMMENT '合计数量',
  total_amount  DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '合计金额（元）',
  discount      INT             NOT NULL DEFAULT 100    COMMENT '折扣（百分比整数，100=不打折）',
  final_amount  DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '折后实际金额（元）',
  operator      VARCHAR(50)     DEFAULT NULL            COMMENT '操作员',
  notes         TEXT            DEFAULT NULL            COMMENT '备注',
  status        ENUM('draft','confirmed') NOT NULL DEFAULT 'confirmed' COMMENT '状态：draft=草稿，confirmed=已确认',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_orders_order_no (order_no),
  KEY idx_purchase_orders_supplier_id (supplier_id),
  KEY idx_purchase_orders_date (date),
  KEY idx_purchase_orders_status (status),
  CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='采购订单主表';

-- ============================================================
-- 7. 采购订单明细表
-- ============================================================
CREATE TABLE purchase_order_items (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  order_id      INT UNSIGNED    NOT NULL                COMMENT '采购订单ID',
  product_id    INT UNSIGNED    NOT NULL                COMMENT '商品ID',
  qty           INT             NOT NULL DEFAULT 0      COMMENT '采购数量',
  unit_price    DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '单价（元）',
  amount        DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '小计金额（元）',
  discount      INT             NOT NULL DEFAULT 100    COMMENT '行级折扣（百分比整数，100=不打折）',
  final_amount  DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '折后行金额（元）',
  spec          VARCHAR(50)     DEFAULT NULL            COMMENT '规格备注（可覆盖商品默认规格）',
  notes         TEXT            DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (id),
  KEY idx_poi_order_id (order_id),
  KEY idx_poi_product_id (product_id),
  CONSTRAINT fk_poi_order   FOREIGN KEY (order_id)   REFERENCES purchase_orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='采购订单明细表';

-- ============================================================
-- 8. 采购退货单表
-- ============================================================
CREATE TABLE purchase_returns (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  return_no        VARCHAR(30)     NOT NULL                COMMENT '退货单号',
  supplier_id      INT UNSIGNED    NOT NULL                COMMENT '供应商ID',
  original_order_id INT UNSIGNED   DEFAULT NULL            COMMENT '原始采购订单ID（可为空）',
  date             DATE            NOT NULL                COMMENT '退货日期',
  total_qty        INT             NOT NULL DEFAULT 0      COMMENT '退货合计数量',
  total_amount     DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '退货合计金额（元）',
  operator         VARCHAR(50)     DEFAULT NULL            COMMENT '操作员',
  notes            TEXT            DEFAULT NULL            COMMENT '备注',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_returns_return_no (return_no),
  KEY idx_pr_supplier_id (supplier_id),
  KEY idx_pr_original_order_id (original_order_id),
  KEY idx_pr_date (date),
  CONSTRAINT fk_pr_supplier       FOREIGN KEY (supplier_id)       REFERENCES suppliers (id),
  CONSTRAINT fk_pr_original_order FOREIGN KEY (original_order_id) REFERENCES purchase_orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='采购退货单主表';

-- ============================================================
-- 9. 采购退货明细表
-- ============================================================
CREATE TABLE purchase_return_items (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  return_id     INT UNSIGNED    NOT NULL                COMMENT '采购退货单ID',
  product_id    INT UNSIGNED    NOT NULL                COMMENT '商品ID',
  qty           INT             NOT NULL DEFAULT 0      COMMENT '退货数量',
  unit_price    DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '单价（元）',
  amount        DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '退货金额（元）',
  notes         TEXT            DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (id),
  KEY idx_pri_return_id (return_id),
  KEY idx_pri_product_id (product_id),
  CONSTRAINT fk_pri_return  FOREIGN KEY (return_id)  REFERENCES purchase_returns (id) ON DELETE CASCADE,
  CONSTRAINT fk_pri_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='采购退货明细表';

-- ============================================================
-- 10. 销售订单表
-- ============================================================
CREATE TABLE sales_orders (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  order_no        VARCHAR(30)     NOT NULL                COMMENT '销售单号（格式：X20265G20_D701）',
  customer_id     INT UNSIGNED    NOT NULL                COMMENT '客户ID',
  date            DATE            NOT NULL                COMMENT '销售日期',
  total_qty       INT             NOT NULL DEFAULT 0      COMMENT '合计数量',
  total_amount    DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '合计金额（元）',
  total_pieces    INT             NOT NULL DEFAULT 0      COMMENT '合计件数',
  operator        VARCHAR(50)     DEFAULT NULL            COMMENT '操作员',
  notes           TEXT            DEFAULT NULL            COMMENT '备注',
  status          ENUM('draft','confirmed') NOT NULL DEFAULT 'confirmed' COMMENT '状态：draft=草稿，confirmed=已确认',
  payment_status  ENUM('未收款','已收款','部分收款') NOT NULL DEFAULT '未收款' COMMENT '收款状态',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_orders_order_no (order_no),
  KEY idx_so_customer_id (customer_id),
  KEY idx_so_date (date),
  KEY idx_so_status (status),
  KEY idx_so_payment_status (payment_status),
  CONSTRAINT fk_so_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='销售订单主表';

-- ============================================================
-- 11. 销售订单明细表
-- ============================================================
CREATE TABLE sales_order_items (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  order_id      INT UNSIGNED    NOT NULL                COMMENT '销售订单ID',
  product_id    INT UNSIGNED    NOT NULL                COMMENT '商品ID',
  supplier_id   INT UNSIGNED    NOT NULL                COMMENT '供应商ID（冗余字段，用于分供应商开票显示）',
  qty           INT             NOT NULL DEFAULT 0      COMMENT '销售数量',
  unit_price    DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '销售单价（元）',
  amount        DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '小计金额（元）',
  pieces        INT             NOT NULL DEFAULT 0      COMMENT '件数',
  notes         TEXT            DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (id),
  KEY idx_soi_order_id (order_id),
  KEY idx_soi_product_id (product_id),
  KEY idx_soi_supplier_id (supplier_id),
  CONSTRAINT fk_soi_order    FOREIGN KEY (order_id)   REFERENCES sales_orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_soi_product  FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT fk_soi_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='销售订单明细表';

-- ============================================================
-- 12. 销售退货单表
-- ============================================================
CREATE TABLE sales_returns (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  return_no        VARCHAR(30)     NOT NULL                COMMENT '退货单号',
  customer_id      INT UNSIGNED    NOT NULL                COMMENT '客户ID',
  original_order_id INT UNSIGNED   DEFAULT NULL            COMMENT '原始销售订单ID（可为空）',
  date             DATE            NOT NULL                COMMENT '退货日期',
  total_qty        INT             NOT NULL DEFAULT 0      COMMENT '退货合计数量',
  total_amount     DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '退货合计金额（元）',
  total_pieces     INT             NOT NULL DEFAULT 0      COMMENT '退货合计件数',
  operator         VARCHAR(50)     DEFAULT NULL            COMMENT '操作员',
  notes            TEXT            DEFAULT NULL            COMMENT '备注',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_returns_return_no (return_no),
  KEY idx_sr_customer_id (customer_id),
  KEY idx_sr_original_order_id (original_order_id),
  KEY idx_sr_date (date),
  CONSTRAINT fk_sr_customer        FOREIGN KEY (customer_id)        REFERENCES customers (id),
  CONSTRAINT fk_sr_original_order  FOREIGN KEY (original_order_id)  REFERENCES sales_orders (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='销售退货单主表';

-- ============================================================
-- 13. 销售退货明细表
-- ============================================================
CREATE TABLE sales_return_items (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  return_id     INT UNSIGNED    NOT NULL                COMMENT '销售退货单ID',
  product_id    INT UNSIGNED    NOT NULL                COMMENT '商品ID',
  qty           INT             NOT NULL DEFAULT 0      COMMENT '退货数量',
  unit_price    DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '单价（元）',
  amount        DECIMAL(10,2)   NOT NULL DEFAULT 0.00   COMMENT '退货金额（元）',
  pieces        INT             NOT NULL DEFAULT 0      COMMENT '件数',
  notes         TEXT            DEFAULT NULL            COMMENT '备注',
  PRIMARY KEY (id),
  KEY idx_sri_return_id (return_id),
  KEY idx_sri_product_id (product_id),
  CONSTRAINT fk_sri_return  FOREIGN KEY (return_id)  REFERENCES sales_returns (id) ON DELETE CASCADE,
  CONSTRAINT fk_sri_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='销售退货明细表';

-- ============================================================
-- 14. 库存变动记录表
-- ============================================================
CREATE TABLE inventory_adjustments (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  product_id    INT UNSIGNED    NOT NULL                COMMENT '商品ID',
  type          ENUM('in','out','adjust') NOT NULL      COMMENT '变动类型：in=入库，out=出库，adjust=调整',
  qty_before    INT             NOT NULL                COMMENT '变动前数量',
  qty_change    INT             NOT NULL                COMMENT '变动量（正数=增加，负数=减少）',
  qty_after     INT             NOT NULL                COMMENT '变动后数量',
  reason        VARCHAR(200)    DEFAULT NULL            COMMENT '变动原因',
  ref_type      ENUM('purchase','sale','purchase_return','sale_return','loss','manual') NOT NULL COMMENT '来源业务类型',
  ref_id        INT UNSIGNED    DEFAULT NULL            COMMENT '来源业务单据ID（对应各业务表主键）',
  operator      VARCHAR(50)     DEFAULT NULL            COMMENT '操作员',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_ia_product_id (product_id),
  KEY idx_ia_ref_type_ref_id (ref_type, ref_id),
  KEY idx_ia_created_at (created_at),
  CONSTRAINT fk_ia_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='库存变动流水记录表';

-- ============================================================
-- 15. 损耗记录表
-- ============================================================
CREATE TABLE loss_records (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  product_id    INT UNSIGNED    NOT NULL                COMMENT '商品ID',
  qty           INT             NOT NULL                COMMENT '损耗数量',
  reason        VARCHAR(200)    DEFAULT NULL            COMMENT '损耗原因',
  operator      VARCHAR(50)     DEFAULT NULL            COMMENT '操作员',
  date          DATE            NOT NULL                COMMENT '损耗日期',
  notes         TEXT            DEFAULT NULL            COMMENT '备注',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_lr_product_id (product_id),
  KEY idx_lr_date (date),
  CONSTRAINT fk_lr_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='花卉损耗记录表';

-- ============================================================
-- 16. 收款记录表
-- ============================================================
CREATE TABLE payments (
  id              INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT '主键',
  sales_order_id  INT UNSIGNED    NOT NULL                COMMENT '销售订单ID',
  customer_id     INT UNSIGNED    NOT NULL                COMMENT '客户ID（冗余，便于查询）',
  amount          DECIMAL(10,2)   NOT NULL                COMMENT '收款金额（元）',
  payment_date    DATE            NOT NULL                COMMENT '收款日期',
  method          ENUM('现金','转账','微信','支付宝') NOT NULL DEFAULT '转账' COMMENT '收款方式',
  notes           TEXT            DEFAULT NULL            COMMENT '备注',
  operator        VARCHAR(50)     DEFAULT NULL            COMMENT '操作员',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_payments_sales_order_id (sales_order_id),
  KEY idx_payments_customer_id (customer_id),
  KEY idx_payments_payment_date (payment_date),
  CONSTRAINT fk_payments_sales_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id),
  CONSTRAINT fk_payments_customer    FOREIGN KEY (customer_id)    REFERENCES customers (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='客户收款记录表';

-- ============================================================
-- 初始化数据：默认管理员账号
-- 注意：上线前请将 password_hash 替换为真实的 bcrypt 哈希值
-- ============================================================
INSERT INTO users (username, password_hash, name, role, active)
VALUES ('admin', 'CHANGE_ME', '管理员', 'admin', 1);
