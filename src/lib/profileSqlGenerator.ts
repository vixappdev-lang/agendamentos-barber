/**
 * Gera o arquivo .sql personalizado para uma barbearia específica.
 * Inclui: schema completo + tabela `users` com login do dono + seeds de business_settings.
 *
 * O hash da senha é o MESMO bcrypt gerado no Postgres (compatível com password_verify
 * em PHP, bcryptjs em Node, qualquer biblioteca bcrypt em qualquer linguagem).
 */

import type { BarbershopProfile } from "@/hooks/useBarbershops";
import { ALL_PERMISSION_KEYS, sanitizePermissions } from "@/lib/barbershopPermissions";

// gera UUID v4 sem dependências externas
const uuid = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// escape simples para strings SQL (single-quote)
const esc = (v: string | null | undefined): string => {
  if (v === null || v === undefined) return "NULL";
  return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
};

const HEADER = (p: BarbershopProfile) => `-- =====================================================================
-- Barber SaaS — ${p.name}
-- Slug: ${p.slug}
-- Dono: ${p.owner_name ?? "—"} <${p.owner_email}>
-- Gerado em: ${new Date().toISOString()}
-- =====================================================================
-- COMO IMPORTAR:
--   1. Acesse seu phpMyAdmin (cPanel)
--   2. Crie um banco de dados (ex: barber_${p.slug.replace(/-/g, "_")})
--   3. Selecione o banco e clique em "Importar"
--   4. Faça upload deste arquivo .sql e clique em "Executar"
--   5. Volte ao painel admin e configure a conexão MySQL deste perfil
--
-- O login deste arquivo é o mesmo configurado neste perfil:
--   Email: ${p.owner_email}
--   Senha: (a que você definiu — armazenada com bcrypt)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET time_zone = '+00:00';

`;

const TABLES = `
-- ---------------------------------------------------------------------
-- Tabela: users (login do painel)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` CHAR(36) NOT NULL,
  \`email\` VARCHAR(255) NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`name\` VARCHAR(255) DEFAULT NULL,
  \`role\` ENUM('admin','barber','customer') NOT NULL DEFAULT 'admin',
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`last_login_at\` TIMESTAMP NULL DEFAULT NULL,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_users_email\` (\`email\`),
  KEY \`idx_users_role\` (\`role\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
-- Tabela: business_settings
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
-- Tabela: reviews (avaliações de clientes)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`reviews\`;
CREATE TABLE \`reviews\` (
  \`id\` CHAR(36) NOT NULL,
  \`customer_name\` VARCHAR(255) NOT NULL,
  \`customer_phone\` VARCHAR(50) DEFAULT NULL,
  \`rating\` TINYINT NOT NULL,
  \`comment\` TEXT,
  \`status\` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  \`appointment_id\` CHAR(36) DEFAULT NULL,
  \`review_token\` VARCHAR(64) DEFAULT NULL,
  \`is_public\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_reviews_token\` (\`review_token\`),
  KEY \`idx_reviews_status\` (\`status\`),
  KEY \`idx_reviews_rating\` (\`rating\`),
  CONSTRAINT \`chk_reviews_rating\` CHECK (\`rating\` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabela: user_permissions (permissões de acesso ao painel)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS \`user_permissions\`;
CREATE TABLE \`user_permissions\` (
  \`id\` CHAR(36) NOT NULL,
  \`user_id\` CHAR(36) NOT NULL,
  \`permission_key\` VARCHAR(60) NOT NULL,
  \`enabled\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_user_permission\` (\`user_id\`, \`permission_key\`),
  KEY \`idx_user_permissions_user\` (\`user_id\`),
  CONSTRAINT \`fk_user_permissions_user\` FOREIGN KEY (\`user_id\`)
    REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;

const buildSeeds = (p: BarbershopProfile): string => {
  const userId = uuid();
  // Apenas dados ESPECÍFICOS desta barbearia. Painel inicia limpo
  // (sem serviços, barbeiros, agendamentos ou produtos de outras unidades).
  const settings: Array<[string, string]> = [
    ["business_name", p.name],
    ["business_slug", p.slug],
    ["tenant_slug", p.slug],
    ["owner_email", p.owner_email],
    ["site_status", "ativo"],
    ["confirmation_mode", "auto"],
  ];
  if (p.owner_name) settings.push(["owner_name", p.owner_name]);
  if (p.phone) settings.push(["phone", p.phone]);
  if (p.phone) settings.push(["whatsapp_number", p.phone.replace(/\D/g, "")]);
  if (p.address) settings.push(["address", p.address]);

  const settingsValues = settings
    .map(([k, v]) => `  (${esc(uuid())}, ${esc(k)}, ${esc(v)})`)
    .join(",\n");

  const perms = sanitizePermissions(p.permissions);
  const permissionsValues = ALL_PERMISSION_KEYS
    .map(
      (k) =>
        `  (${esc(uuid())}, ${esc(userId)}, ${esc(k)}, ${perms[k] ? 1 : 0})`,
    )
    .join(",\n");

  return `
-- =====================================================================
-- SEEDS — somente dados específicos desta barbearia.
-- Tabelas operacionais (services, barbers, appointments, products,
-- orders, coupons, reviews) ficam VAZIAS para o painel iniciar limpo.
-- =====================================================================

-- Login do dono (senha bcrypt — mesma definida no painel admin)
INSERT INTO \`users\` (\`id\`, \`email\`, \`password_hash\`, \`name\`, \`role\`)
VALUES (${esc(userId)}, ${esc(p.owner_email)}, ${esc(p.owner_password)}, ${esc(p.owner_name ?? "Admin")}, 'admin');

-- Permissões granulares do painel
INSERT INTO \`user_permissions\` (\`id\`, \`user_id\`, \`permission_key\`, \`enabled\`) VALUES
${permissionsValues};

-- Configurações iniciais da barbearia
INSERT INTO \`business_settings\` (\`id\`, \`key\`, \`value\`) VALUES
${settingsValues};

-- (ChatPro NÃO é semeado — cada barbearia configura no painel)

-- =====================================================================
-- Login no painel:
--   Email: ${p.owner_email}
--   Senha: (a definida ao criar o perfil)
-- =====================================================================
`;
};

export const generateProfileSQL = (profile: BarbershopProfile): string => {
  return HEADER(profile) + TABLES + buildSeeds(profile);
};

export const downloadProfileSQL = (profile: BarbershopProfile) => {
  const sql = generateProfileSQL(profile);
  const filename = `barber-${profile.slug}-${new Date().toISOString().slice(0, 10)}.sql`;
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
