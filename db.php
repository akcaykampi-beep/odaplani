<?php
/**
 * OdaMatik - Veritabanı Bağlantı & Kurulum Katmanı
 */

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $opts = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    // Bulut MySQL için doğrudan hedef veritabanına bağlanıyoruz
    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
    } catch (PDOException $e) {
        die("Veritabanı bağlantı hatası: " . $e->getMessage());
    }

    // Tabloları oluştur & gerekiyorsa örnek verileri yükle
    createSchema($pdo);
    seedIfEmpty($pdo);

    return $pdo;
}

function createSchema(PDO $pdo): void
{
    // Odalar
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS rooms (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            no          INT NOT NULL,
            block       VARCHAR(191) NOT NULL,
            capacity    INT NOT NULL DEFAULT 2,
            has_ramp    TINYINT(1) NOT NULL DEFAULT 0,
            is_staff    TINYINT(1) NOT NULL DEFAULT 0,
            guest_group VARCHAR(191) DEFAULT NULL,
            notes       VARCHAR(255) DEFAULT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_no (no)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci
    ");

    // Bir odada kalan misafirler
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS room_guests (
            id       INT AUTO_INCREMENT PRIMARY KEY,
            room_id  INT NOT NULL,
            name     VARCHAR(191) NOT NULL,
            sort     INT NOT NULL DEFAULT 0,
            CONSTRAINT fk_guest_room FOREIGN KEY (room_id)
                REFERENCES rooms(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci
    ");

    // Bekleme listesi (aileler / gruplar)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS waiting_list (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            title        VARCHAR(191) NOT NULL,
            member_count INT NOT NULL DEFAULT 1,
            needs_ramp   TINYINT(1) NOT NULL DEFAULT 0,
            notes        VARCHAR(255) DEFAULT NULL,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci
    ");

    // Bekleme listesindeki kişiler
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS waiting_members (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            waiting_id INT NOT NULL,
            name       VARCHAR(191) NOT NULL,
            sort       INT NOT NULL DEFAULT 0,
            CONSTRAINT fk_wm_waiting FOREIGN KEY (waiting_id)
                REFERENCES waiting_list(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci
    ");
}

function seedIfEmpty(PDO $pdo): void
{
    $count = (int) $pdo->query('SELECT COUNT(*) FROM rooms')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $seedFile = __DIR__ . '/seed_data.php';
    if (!file_exists($seedFile)) {
        return;
    }

    $seed = require $seedFile;

    $insRoom = $pdo->prepare(
        'INSERT INTO rooms (no, block, capacity, has_ramp, is_staff, guest_group, notes)
         VALUES (:no, :block, :capacity, :has_ramp, :is_staff, :guest_group, :notes)'
    );
    $insGuest = $pdo->prepare(
        'INSERT INTO room_guests (room_id, name, sort) VALUES (:room_id, :name, :sort)'
    );

    $pdo->beginTransaction();
    if (!empty($seed['rooms'])) {
        foreach ($seed['rooms'] as $r) {
            $insRoom->execute([
                ':no'          => $r['no'],
                ':block'       => $r['block'],
                ':capacity'    => $r['capacity'],
                ':has_ramp'    => !empty($r['hasRamp']) ? 1 : 0,
                ':is_staff'    => !empty($r['isStaff']) ? 1 : 0,
                ':guest_group' => $r['guestGroup'] ?? null,
                ':notes'       => $r['notes'] ?? '',
            ]);
            $roomId = (int) $pdo->lastInsertId();
            $sort = 0;
            if (!empty($r['guests'])) {
                foreach ($r['guests'] as $g) {
                    $insGuest->execute([':room_id' => $roomId, ':name' => $g, ':sort' => $sort++]);
                }
            }
        }
    }

    if (!empty($seed['waiting'])) {
        $insWait = $pdo->prepare(
            'INSERT INTO waiting_list (title, member_count, needs_ramp, notes)
             VALUES (:title, :member_count, :needs_ramp, :notes)'
        );
        $insWaitM = $pdo->prepare(
            'INSERT INTO waiting_members (waiting_id, name, sort) VALUES (:waiting_id, :name, :sort)'
        );

        foreach ($seed['waiting'] as $w) {
            $insWait->execute([
                ':title'        => $w['title'],
                ':member_count' => $w['count'] ?? 1,
                ':needs_ramp'   => !empty($w['needsRamp']) ? 1 : 0,
                ':notes'        => $w['notes'] ?? '',
            ]);
            $wid = (int) $pdo->lastInsertId();
            $sort = 0;
            if (!empty($w['names'])) {
                foreach ($w['names'] as $n) {
                    $insWaitM->execute([':waiting_id' => $wid, ':name' => $n, ':sort' => $sort++]);
                }
            }
        }
    }
    $pdo->commit();
}
