-- Migration 001: Change payments.method from ENUM to VARCHAR(20)
-- This allows new payment methods without requiring another schema change.
-- Run once on the server: mysql -u root -p flora_erp < 001_payment_method_varchar.sql

ALTER TABLE payments
  MODIFY COLUMN method VARCHAR(20) NOT NULL DEFAULT '转账';
