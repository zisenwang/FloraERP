-- Migration 002: Add 作废 status, remove draft/草稿
-- Run once on the server: mysql -u root -p flora_erp < 002_void_status.sql

ALTER TABLE sales_orders
  MODIFY COLUMN status ENUM('confirmed','作废') NOT NULL DEFAULT 'confirmed';

ALTER TABLE purchase_orders
  MODIFY COLUMN status ENUM('已入库','作废') NOT NULL DEFAULT '已入库';
