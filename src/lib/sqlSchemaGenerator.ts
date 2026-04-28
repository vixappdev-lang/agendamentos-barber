/**
 * Gera o arquivo SQL completo para importar no phpMyAdmin / MySQL.
 * Compatível com MySQL 5.7+ e MariaDB 10+.
 * Espelha as tabelas usadas no Lovable Cloud (Supabase) deste projeto.
 */

const HEADER = `-- =====================================================================
-- Barber SaaS — Schema MySQL
-- Gerado automaticamente pelo painel admin
-- Compatível com MySQL 5.7+ / MariaDB 10+
-- =====================================================================
-- Como usar:
--   1. Crie um banco no seu cPanel/phpMyAdmin (ex: barber_saas)
--   2. Selecione o banco e vá em "Importar"
--   3. Faça upload deste arquivo .sql
--   4. Volte ao painel, configure o perfil e clique em "Conectar"
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET time_zone = '+00:00';

`;

const TABLES = `
-- ---------------------------------------------------------------------
-- Tabela: services
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`services\`;
CREATE TABLE \`services\` (
  \`id\` CHAR(36) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`subtitle\` VARCHAR(255) DEFAULT NULL,
  \`duration\` VARCHAR(50) NOT NULL,
  \`price\` DECIMAL(10,2) NOT NULL,
  \`image_url\` TEXT,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_services_active\` (\`active\`),
  KEY \`idx_services_sort\` (\`sort_order\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: barbers
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`barbers\`;
CREATE TABLE \`barbers\` (
  \`id\` CHAR(36) NOT NULL,
  \`name\` VARCHAR(255) NOT NULL,
  \`specialty\` VARCHAR(255) DEFAULT NULL,
  \`avatar_url\` TEXT,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_barbers_active\` (\`active\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: appointments
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`appointments\`;
CREATE TABLE \`appointments\` (
  \`id\` CHAR(36) NOT NULL,
  \`customer_name\` VARCHAR(255) NOT NULL,
  \`customer_phone\` VARCHAR(50) DEFAULT NULL,
  \`customer_email\` VARCHAR(255) DEFAULT NULL,
  \`service_id\` CHAR(36) DEFAULT NULL,
  \`barber_name\` VARCHAR(255) DEFAULT NULL,
  \`appointment_date\` DATE NOT NULL,
  \`appointment_time\` TIME NOT NULL,
  \`status\` VARCHAR(20) DEFAULT 'pending',
  \`coupon_code\` VARCHAR(100) DEFAULT NULL,
  \`total_price\` DECIMAL(10,2) DEFAULT NULL,
  \`notes\` TEXT,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_appointments_date\` (\`appointment_date\`),
  KEY \`idx_appointments_status\` (\`status\`),
  KEY \`idx_appointments_phone\` (\`customer_phone\`),
  CONSTRAINT \`fk_appointments_service\` FOREIGN KEY (\`service_id\`)
    REFERENCES \`services\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: products
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`products\`;
CREATE TABLE \`products\` (
  \`id\` CHAR(36) NOT NULL,
  \`title\` VARCHAR(255) NOT NULL,
  \`description\` TEXT,
  \`price\` DECIMAL(10,2) NOT NULL,
  \`image_url\` TEXT,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_products_active\` (\`active\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: orders
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`orders\`;
CREATE TABLE \`orders\` (
  \`id\` CHAR(36) NOT NULL,
  \`customer_name\` VARCHAR(255) NOT NULL,
  \`customer_phone\` VARCHAR(50) DEFAULT NULL,
  \`customer_email\` VARCHAR(255) DEFAULT NULL,
  \`delivery_mode\` VARCHAR(20) NOT NULL DEFAULT 'pickup',
  \`address\` VARCHAR(500) DEFAULT NULL,
  \`address_number\` VARCHAR(20) DEFAULT NULL,
  \`address_complement\` VARCHAR(255) DEFAULT NULL,
  \`neighborhood\` VARCHAR(255) DEFAULT NULL,
  \`city\` VARCHAR(255) DEFAULT NULL,
  \`payment_method\` VARCHAR(50) DEFAULT 'pix',
  \`total_price\` DECIMAL(10,2) NOT NULL DEFAULT 0,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending',
  \`notes\` TEXT,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_orders_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: order_items
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`order_items\`;
CREATE TABLE \`order_items\` (
  \`id\` CHAR(36) NOT NULL,
  \`order_id\` CHAR(36) NOT NULL,
  \`product_id\` CHAR(36) DEFAULT NULL,
  \`product_title\` VARCHAR(255) NOT NULL,
  \`product_price\` DECIMAL(10,2) NOT NULL,
  \`quantity\` INT NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_order_items_order\` (\`order_id\`),
  CONSTRAINT \`fk_order_items_order\` FOREIGN KEY (\`order_id\`)
    REFERENCES \`orders\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_order_items_product\` FOREIGN KEY (\`product_id\`)
    REFERENCES \`products\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: coupons
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`coupons\`;
CREATE TABLE \`coupons\` (
  \`id\` CHAR(36) NOT NULL,
  \`code\` VARCHAR(100) NOT NULL,
  \`discount_percent\` DECIMAL(5,2) DEFAULT NULL,
  \`discount_value\` DECIMAL(10,2) DEFAULT NULL,
  \`active\` TINYINT(1) DEFAULT 1,
  \`expires_at\` TIMESTAMP NULL DEFAULT NULL,
  \`max_uses\` INT DEFAULT NULL,
  \`current_uses\` INT DEFAULT 0,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_coupons_code\` (\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: business_settings (chave/valor)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`business_settings\`;
CREATE TABLE \`business_settings\` (
  \`id\` CHAR(36) NOT NULL,
  \`key\` VARCHAR(255) NOT NULL,
  \`value\` LONGTEXT,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_business_settings_key\` (\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: chatpro_config
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`chatpro_config\`;
CREATE TABLE \`chatpro_config\` (
  \`id\` CHAR(36) NOT NULL,
  \`endpoint\` VARCHAR(500) NOT NULL DEFAULT 'https://v5.chatpro.com.br',
  \`token\` VARCHAR(500) NOT NULL DEFAULT '',
  \`instance_id\` VARCHAR(255) NOT NULL DEFAULT '',
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: prize_wheel_slices
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`prize_wheel_slices\`;
CREATE TABLE \`prize_wheel_slices\` (
  \`id\` CHAR(36) NOT NULL,
  \`label\` VARCHAR(255) NOT NULL,
  \`icon\` VARCHAR(50) NOT NULL DEFAULT '🎁',
  \`image_url\` TEXT,
  \`discount_percent\` DECIMAL(5,2) DEFAULT NULL,
  \`discount_value\` DECIMAL(10,2) DEFAULT NULL,
  \`custom_prize\` VARCHAR(255) DEFAULT NULL,
  \`probability\` INT NOT NULL DEFAULT 10,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`sort_order\` INT NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: user_roles (mantida só para compatibilidade; auth fica no Cloud)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`user_roles\`;
CREATE TABLE \`user_roles\` (
  \`id\` CHAR(36) NOT NULL,
  \`user_id\` VARCHAR(255) NOT NULL,
  \`role\` VARCHAR(20) NOT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_user_roles\` (\`user_id\`, \`role\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- Fim do schema. Banco pronto para uso.
-- =====================================================================
`;

export const TABLES_LIST = [
  "services",
  "barbers",
  "appointments",
  "products",
  "orders",
  "order_items",
  "coupons",
  "business_settings",
  "chatpro_config",
  "prize_wheel_slices",
  "user_roles",
] as const;

export const generateSchemaSQL = (): string => HEADER + TABLES;

export const downloadSchemaSQL = (filename = "barber-saas-schema.sql") => {
  const sql = generateSchemaSQL();
  const blob = new Blob([sql], { type: "application/sql;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
