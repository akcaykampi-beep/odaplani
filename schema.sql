-- OdaMatik - Veritabanı Şeması (referans)
-- db.php tabloları zaten OTOMATİK oluşturur; bu dosya elle kurulum içindir.
-- phpMyAdmin veya MySQL istemcisinde çalıştırabilirsiniz.

CREATE DATABASE IF NOT EXISTS odamatik
  CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;
USE odamatik;

CREATE TABLE IF NOT EXISTS schema_migrations (
  name       VARCHAR(191) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE IF NOT EXISTS rooms (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  no          VARCHAR(40) NOT NULL,
  block       VARCHAR(191) NOT NULL,
  capacity    INT NOT NULL DEFAULT 2,
  has_ramp    TINYINT(1) NOT NULL DEFAULT 0,
  is_staff    TINYINT(1) NOT NULL DEFAULT 0,
  guest_group VARCHAR(191) DEFAULT NULL,
  notes       VARCHAR(255) DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_no (no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE IF NOT EXISTS room_guests (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  room_id  INT NOT NULL,
  name     VARCHAR(191) NOT NULL,
  tc       VARCHAR(20) DEFAULT NULL,
  phone    VARCHAR(30) DEFAULT NULL,
  bus_code VARCHAR(40) DEFAULT NULL,
  note     VARCHAR(255) DEFAULT NULL,
  sort     INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_guest_room FOREIGN KEY (room_id)
      REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE IF NOT EXISTS waiting_list (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(191) NOT NULL,
  member_count INT NOT NULL DEFAULT 1,
  needs_ramp   TINYINT(1) NOT NULL DEFAULT 0,
  notes        VARCHAR(255) DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE IF NOT EXISTS waiting_members (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  waiting_id INT NOT NULL,
  name       VARCHAR(191) NOT NULL,
  sort       INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_wm_waiting FOREIGN KEY (waiting_id)
      REFERENCES waiting_list(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
