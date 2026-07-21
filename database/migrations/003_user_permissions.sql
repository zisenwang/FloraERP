-- Migration 003: per-user permissions for restricted modules
-- Permissions: inventory_adjust, inventory_check, payment, loss
CREATE TABLE IF NOT EXISTS user_permissions (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  permission  VARCHAR(50)  NOT NULL,
  granted_by  INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_perm (user_id, permission),
  CONSTRAINT fk_up_user    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_up_granted FOREIGN KEY (granted_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
