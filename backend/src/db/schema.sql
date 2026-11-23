-- =============================================================
--  Chat App schema (MySQL 8 / MariaDB - HeidiSQL friendly)
--  Run with:  npm run db:setup
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(80)  NOT NULL,
  username      VARCHAR(40)  NOT NULL,
  email         VARCHAR(120) NOT NULL,
  phone         VARCHAR(20)  NULL,
  password_hash VARCHAR(255) NOT NULL,
  about         VARCHAR(160) NOT NULL DEFAULT 'Hey there! I am using ChatApp.',
  avatar_url    VARCHAR(255) NULL,
  is_online     TINYINT(1)   NOT NULL DEFAULT 0,
  last_seen     DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id             INT UNSIGNED NOT NULL,
  theme               ENUM('dark','light') NOT NULL DEFAULT 'dark',
  wallpaper           VARCHAR(120) NOT NULL DEFAULT 'default',
  notifications       TINYINT(1) NOT NULL DEFAULT 1,
  message_sound       TINYINT(1) NOT NULL DEFAULT 1,
  read_receipts       TINYINT(1) NOT NULL DEFAULT 1,
  last_seen_visible   TINYINT(1) NOT NULL DEFAULT 1,
  status_privacy      ENUM('everyone','contacts','nobody') NOT NULL DEFAULT 'everyone',
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversations (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type            ENUM('direct','group') NOT NULL DEFAULT 'direct',
  name            VARCHAR(120) NULL,
  avatar_url      VARCHAR(255) NULL,
  created_by      INT UNSIGNED NULL,
  last_message_at DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversations_last_message (last_message_at),
  CONSTRAINT fk_conversations_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_members (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id      INT UNSIGNED NOT NULL,
  user_id              INT UNSIGNED NOT NULL,
  role                 ENUM('member','admin') NOT NULL DEFAULT 'member',
  last_read_message_id INT UNSIGNED NOT NULL DEFAULT 0,
  joined_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_member (conversation_id, user_id),
  KEY idx_member_user (user_id),
  CONSTRAINT fk_members_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id INT UNSIGNED NOT NULL,
  sender_id       INT UNSIGNED NULL,
  type            ENUM('text','image','file','audio','system') NOT NULL DEFAULT 'text',
  body            TEXT NULL,
  attachment_url  VARCHAR(255) NULL,
  attachment_name VARCHAR(160) NULL,
  attachment_size INT UNSIGNED NULL,
  deleted_at      DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_conversation (conversation_id, id),
  KEY idx_messages_sender (sender_id),
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_reads (
  message_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  read_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  KEY idx_reads_user (user_id),
  CONSTRAINT fk_reads_message FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
  CONSTRAINT fk_reads_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS statuses (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED NOT NULL,
  type             ENUM('image','text') NOT NULL DEFAULT 'text',
  content          TEXT NULL,
  media_url        VARCHAR(255) NULL,
  background_color VARCHAR(20) NOT NULL DEFAULT '#00a884',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at       DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_statuses_user (user_id, created_at),
  CONSTRAINT fk_statuses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS status_views (
  status_id INT UNSIGNED NOT NULL,
  viewer_id INT UNSIGNED NOT NULL,
  viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (status_id, viewer_id),
  KEY idx_status_views_viewer (viewer_id),
  CONSTRAINT fk_status_views_status FOREIGN KEY (status_id) REFERENCES statuses (id) ON DELETE CASCADE,
  CONSTRAINT fk_status_views_user FOREIGN KEY (viewer_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS calls (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  caller_id        INT UNSIGNED NOT NULL,
  callee_id        INT UNSIGNED NOT NULL,
  conversation_id  INT UNSIGNED NULL,
  type             ENUM('audio','video') NOT NULL DEFAULT 'audio',
  status           ENUM('ringing','accepted','rejected','missed','ended') NOT NULL DEFAULT 'ringing',
  started_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  answered_at      DATETIME NULL,
  ended_at         DATETIME NULL,
  duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_calls_caller (caller_id, started_at),
  KEY idx_calls_callee (callee_id, started_at),
  CONSTRAINT fk_calls_caller FOREIGN KEY (caller_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_calls_callee FOREIGN KEY (callee_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_calls_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
