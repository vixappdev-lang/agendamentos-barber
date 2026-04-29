/**
 * SQL das tabelas dos novos módulos:
 *  - cash_sessions (caixa: abertura/fechamento)
 *  - cash_movements (sangrias, suprimentos, vendas avulsas)
 *  - commands (comandas abertas por cliente)
 *  - command_items (itens da comanda)
 *  - commission_rules (% por barbeiro / serviço, com fallback global)
 *  - commission_payouts (cálculo + status pago/pendente por período)
 *  - credit_accounts (clientes em conta corrente / fiado)
 *  - credit_entries (lançamentos: débito/crédito)
 *  - inventory_items (vincula a products + estoque + alerta mínimo)
 *  - inventory_movements (entrada, saída, ajuste, perda)
 *  - suppliers (fornecedores)
 *
 * Reutilizado em sqlSchemaGenerator (schema base) e profileSqlGenerator
 * (sql por barbearia novo). O upgrade Genesis usa o mesmo bloco.
 */
export const NEW_MODULES_SQL = `
-- ---------------------------------------------------------------------
-- Módulo: Caixa
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`cash_movements\`;
DROP TABLE IF EXISTS \`cash_sessions\`;
CREATE TABLE \`cash_sessions\` (
  \`id\` CHAR(36) NOT NULL,
  \`opened_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`closed_at\` TIMESTAMP NULL DEFAULT NULL,
  \`opened_by\` VARCHAR(255) DEFAULT NULL,
  \`closed_by\` VARCHAR(255) DEFAULT NULL,
  \`opening_balance\` DECIMAL(10,2) NOT NULL DEFAULT 0,
  \`closing_balance\` DECIMAL(10,2) DEFAULT NULL,
  \`expected_balance\` DECIMAL(10,2) DEFAULT NULL,
  \`difference\` DECIMAL(10,2) DEFAULT NULL,
  \`notes\` TEXT,
  \`status\` ENUM('open','closed') NOT NULL DEFAULT 'open',
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_cash_sessions_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`cash_movements\` (
  \`id\` CHAR(36) NOT NULL,
  \`session_id\` CHAR(36) NOT NULL,
  \`kind\` ENUM('sale','withdrawal','deposit','expense','tip','refund','other') NOT NULL,
  \`amount\` DECIMAL(10,2) NOT NULL,
  \`payment_method\` VARCHAR(30) DEFAULT 'cash',
  \`description\` VARCHAR(255) DEFAULT NULL,
  \`reference_type\` VARCHAR(30) DEFAULT NULL,
  \`reference_id\` CHAR(36) DEFAULT NULL,
  \`barber_name\` VARCHAR(255) DEFAULT NULL,
  \`created_by\` VARCHAR(255) DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_cash_mov_session\` (\`session_id\`),
  KEY \`idx_cash_mov_kind\` (\`kind\`),
  CONSTRAINT \`fk_cash_mov_session\` FOREIGN KEY (\`session_id\`)
    REFERENCES \`cash_sessions\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Módulo: Comandas
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`command_items\`;
DROP TABLE IF EXISTS \`commands\`;
CREATE TABLE \`commands\` (
  \`id\` CHAR(36) NOT NULL,
  \`number\` INT NOT NULL AUTO_INCREMENT,
  \`customer_name\` VARCHAR(255) NOT NULL,
  \`customer_phone\` VARCHAR(50) DEFAULT NULL,
  \`barber_name\` VARCHAR(255) DEFAULT NULL,
  \`status\` ENUM('open','closed','cancelled') NOT NULL DEFAULT 'open',
  \`subtotal\` DECIMAL(10,2) NOT NULL DEFAULT 0,
  \`discount\` DECIMAL(10,2) NOT NULL DEFAULT 0,
  \`total\` DECIMAL(10,2) NOT NULL DEFAULT 0,
  \`payment_method\` VARCHAR(30) DEFAULT NULL,
  \`appointment_id\` CHAR(36) DEFAULT NULL,
  \`session_id\` CHAR(36) DEFAULT NULL,
  \`opened_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`closed_at\` TIMESTAMP NULL DEFAULT NULL,
  \`notes\` TEXT,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_commands_number\` (\`number\`),
  KEY \`idx_commands_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`command_items\` (
  \`id\` CHAR(36) NOT NULL,
  \`command_id\` CHAR(36) NOT NULL,
  \`kind\` ENUM('service','product') NOT NULL,
  \`reference_id\` CHAR(36) DEFAULT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`unit_price\` DECIMAL(10,2) NOT NULL,
  \`quantity\` INT NOT NULL DEFAULT 1,
  \`subtotal\` DECIMAL(10,2) NOT NULL DEFAULT 0,
  \`barber_name\` VARCHAR(255) DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_command_items_cmd\` (\`command_id\`),
  CONSTRAINT \`fk_command_items_cmd\` FOREIGN KEY (\`command_id\`)
    REFERENCES \`commands\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Módulo: Comissões
--   commission_rules.scope = 'global' (fallback) | 'barber' | 'service' | 'barber_service'
--   percent  = 0..100 (% sobre o valor do item)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`commission_payouts\`;
DROP TABLE IF EXISTS \`commission_rules\`;
CREATE TABLE \`commission_rules\` (
  \`id\` CHAR(36) NOT NULL,
  \`scope\` ENUM('global','barber','service','barber_service') NOT NULL DEFAULT 'global',
  \`barber_id\` CHAR(36) DEFAULT NULL,
  \`barber_name\` VARCHAR(255) DEFAULT NULL,
  \`service_id\` CHAR(36) DEFAULT NULL,
  \`percent\` DECIMAL(5,2) NOT NULL DEFAULT 0,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_commission_rules_scope\` (\`scope\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`commission_payouts\` (
  \`id\` CHAR(36) NOT NULL,
  \`barber_name\` VARCHAR(255) NOT NULL,
  \`period_start\` DATE NOT NULL,
  \`period_end\` DATE NOT NULL,
  \`gross_revenue\` DECIMAL(10,2) NOT NULL DEFAULT 0,
  \`commission_amount\` DECIMAL(10,2) NOT NULL DEFAULT 0,
  \`status\` ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  \`paid_at\` TIMESTAMP NULL DEFAULT NULL,
  \`payment_method\` VARCHAR(30) DEFAULT NULL,
  \`notes\` TEXT,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_payouts_barber\` (\`barber_name\`),
  KEY \`idx_payouts_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Módulo: Fiados
--   credit_accounts: 1 por cliente (chave: telefone OU nome+telefone)
--   credit_entries: cada lançamento (debit = adicionou dívida; payment = recebeu)
--   balance é recalculado pela aplicação
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`credit_entries\`;
DROP TABLE IF EXISTS \`credit_accounts\`;
CREATE TABLE \`credit_accounts\` (
  \`id\` CHAR(36) NOT NULL,
  \`customer_name\` VARCHAR(255) NOT NULL,
  \`customer_phone\` VARCHAR(50) DEFAULT NULL,
  \`limit_amount\` DECIMAL(10,2) DEFAULT NULL,
  \`balance\` DECIMAL(10,2) NOT NULL DEFAULT 0,
  \`status\` ENUM('active','blocked') NOT NULL DEFAULT 'active',
  \`notes\` TEXT,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_credit_accounts_phone\` (\`customer_phone\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`credit_entries\` (
  \`id\` CHAR(36) NOT NULL,
  \`account_id\` CHAR(36) NOT NULL,
  \`kind\` ENUM('debit','payment') NOT NULL,
  \`amount\` DECIMAL(10,2) NOT NULL,
  \`description\` VARCHAR(255) DEFAULT NULL,
  \`reference_type\` VARCHAR(30) DEFAULT NULL,
  \`reference_id\` CHAR(36) DEFAULT NULL,
  \`payment_method\` VARCHAR(30) DEFAULT NULL,
  \`due_date\` DATE DEFAULT NULL,
  \`paid_at\` TIMESTAMP NULL DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_credit_entries_acc\` (\`account_id\`),
  CONSTRAINT \`fk_credit_entries_acc\` FOREIGN KEY (\`account_id\`)
    REFERENCES \`credit_accounts\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Módulo: Estoque + Fornecedores
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`inventory_movements\`;
DROP TABLE IF EXISTS \`inventory_items\`;
DROP TABLE IF EXISTS \`suppliers\`;

CREATE TABLE \`suppliers\` (
  \`id\` CHAR(36) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`contact_name\` VARCHAR(255) DEFAULT NULL,
  \`phone\` VARCHAR(50) DEFAULT NULL,
  \`email\` VARCHAR(255) DEFAULT NULL,
  \`document\` VARCHAR(40) DEFAULT NULL,
  \`address\` VARCHAR(500) DEFAULT NULL,
  \`category\` VARCHAR(60) DEFAULT NULL,
  \`notes\` TEXT,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_suppliers_active\` (\`active\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`inventory_items\` (
  \`id\` CHAR(36) NOT NULL,
  \`product_id\` CHAR(36) DEFAULT NULL,
  \`supplier_id\` CHAR(36) DEFAULT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`sku\` VARCHAR(80) DEFAULT NULL,
  \`unit\` VARCHAR(20) NOT NULL DEFAULT 'un',
  \`cost_price\` DECIMAL(10,2) DEFAULT NULL,
  \`sale_price\` DECIMAL(10,2) DEFAULT NULL,
  \`quantity\` DECIMAL(10,3) NOT NULL DEFAULT 0,
  \`min_quantity\` DECIMAL(10,3) NOT NULL DEFAULT 0,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_inventory_sku\` (\`sku\`),
  KEY \`idx_inventory_supplier\` (\`supplier_id\`),
  KEY \`idx_inventory_product\` (\`product_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`inventory_movements\` (
  \`id\` CHAR(36) NOT NULL,
  \`item_id\` CHAR(36) NOT NULL,
  \`kind\` ENUM('in','out','adjust','loss','sale') NOT NULL,
  \`quantity\` DECIMAL(10,3) NOT NULL,
  \`unit_cost\` DECIMAL(10,2) DEFAULT NULL,
  \`reference_type\` VARCHAR(30) DEFAULT NULL,
  \`reference_id\` CHAR(36) DEFAULT NULL,
  \`notes\` VARCHAR(255) DEFAULT NULL,
  \`created_by\` VARCHAR(255) DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_inv_mov_item\` (\`item_id\`),
  KEY \`idx_inv_mov_kind\` (\`kind\`),
  CONSTRAINT \`fk_inv_mov_item\` FOREIGN KEY (\`item_id\`)
    REFERENCES \`inventory_items\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export const NEW_MODULES_TABLES = [
  "cash_sessions",
  "cash_movements",
  "commands",
  "command_items",
  "commission_rules",
  "commission_payouts",
  "credit_accounts",
  "credit_entries",
  "suppliers",
  "inventory_items",
  "inventory_movements",
] as const;
