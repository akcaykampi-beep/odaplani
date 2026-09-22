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
    migrateRoomsToVipLayout($pdo);

    return $pdo;
}

/**
 * Mevcut kurulumu VIP oda düzenine geçirir (tek seferlik migration):
 * - 43 sonrası tüm odaları siler (no > 43)
 * - vip otobüs kodlarını A-1/A-2/A-3'e çevirir
 * - 44-54 arası 11 VIP odayı (vip alt 1-5, vip alt 7-8, vip 1-4) eksikse ekler
 */
function migrateRoomsToVipLayout(PDO $pdo): void
{
    try {
        $cols = $pdo->query('SHOW COLUMNS FROM rooms')->fetchAll(PDO::FETCH_COLUMN);
        if (empty($cols)) return;

        // Zaten VIP düzende mi? (44 nolu oda VIP bloğundaysa migration yapılmış demektir)
        $chk = $pdo->prepare('SELECT block FROM rooms WHERE no = 44 LIMIT 1');
        $chk->execute();
        $row44 = $chk->fetch();
        if ($row44 && stripos((string) $row44['block'], 'vip') !== false) {
            return;
        }

        // 1) 43 sonrası odaları (eski 44-50) sil — misafirleri CASCADE ile silinir
        $pdo->exec('DELETE FROM rooms WHERE no > 43');

        // 2) Kalan odalardaki vip otobüs kodlarını A serisine çevir
        $busCols = $pdo->query('SHOW COLUMNS FROM room_guests')->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($busCols) && in_array('bus_code', (array) $busCols, true)) {
            $fix = $pdo->query("SELECT id FROM room_guests WHERE bus_code LIKE 'vip%'");
            if ($fix) {
                $upd = $pdo->prepare('UPDATE room_guests SET bus_code = ? WHERE id = ?');
                $seq = ['A-1', 'A-2', 'A-3'];
                $i = 0;
                foreach ($fix as $g) {
                    $upd->execute([$seq[$i % 3], $g['id']]);
                    $i++;
                }
            }
        }

        // 3) 11 VIP odayı ekle (yoksa)
        $vipRooms = [
            44 => 'VIP ALT 1', 45 => 'VIP ALT 2', 46 => 'VIP ALT 3', 47 => 'VIP ALT 4',
            48 => 'VIP ALT 5', 49 => 'VIP ALT 7', 50 => 'VIP ALT 8',
            51 => 'VIP 1', 52 => 'VIP 2', 53 => 'VIP 3', 54 => 'VIP 4',
        ];
        $ins = $pdo->prepare(
            'INSERT IGNORE INTO rooms (no, block, capacity, has_ramp, is_staff, guest_group, notes)
             VALUES (:no, :block, 2, 0, 0, NULL, :notes)'
        );
        foreach ($vipRooms as $no => $block) {
            $ins->execute([':no' => $no, ':block' => $block, ':notes' => 'VIP']);
        }
    } catch (Throwable $e) {
        error_log('migrateRoomsToVipLayout hata: ' . $e->getMessage());
    }
}

/** Bir tabloda sütun yoksa güvenle ekler (eski kurulumlar için migration). */
function ensureColumn(PDO $pdo, string $table, string $column, string $alterSql): void
{
    try {
        $stmt = $pdo->prepare(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?"
        );
        $stmt->execute([$table, $column]);
        if ((int) $stmt->fetchColumn() === 0) {
            $pdo->exec($alterSql);
        }
    } catch (Throwable $e) {
        // Sessizce geç: sütun zaten varsa veya yetki yoksa uygulama yine de çalışır
    }
}

/** Oda numarasına göre varsayılan otobüs kodu — sadece A-1, A-2, A-3 döner. */
function defaultBusCode(int $roomNo): string
{
    $seq = ['A-1', 'A-2', 'A-3'];
    return $seq[($roomNo - 1) % count($seq)];
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
            tc       VARCHAR(20) DEFAULT NULL,
            bus_code VARCHAR(40) DEFAULT NULL,
            sort     INT NOT NULL DEFAULT 0,
            CONSTRAINT fk_guest_room FOREIGN KEY (room_id)
                REFERENCES rooms(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci
    ");

    // Mevcut (eski) kurulumlar için sütunları güvenle ekle (migration)
    ensureColumn($pdo, 'room_guests', 'tc',       "ALTER TABLE room_guests ADD COLUMN tc VARCHAR(20) DEFAULT NULL AFTER name");
    ensureColumn($pdo, 'room_guests', 'bus_code', "ALTER TABLE room_guests ADD COLUMN bus_code VARCHAR(40) DEFAULT NULL AFTER tc");

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
    // Tabloda zaten kayıt varsa ekleme yapmadan çık
    $count = (int) $pdo->query('SELECT COUNT(*) FROM rooms')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $seedFile = __DIR__ . '/seed_data.php';
    if (!file_exists($seedFile)) {
        return;
    }

    $seed = require $seedFile;

    // INSERT IGNORE kullanarak oda numarası çakışmalarını engelliyoruz
    $insRoom = $pdo->prepare(
        'INSERT IGNORE INTO rooms (no, block, capacity, has_ramp, is_staff, guest_group, notes)
         VALUES (:no, :block, :capacity, :has_ramp, :is_staff, :guest_group, :notes)'
    );
    $insGuest = $pdo->prepare(
        'INSERT INTO room_guests (room_id, name, tc, bus_code, sort) VALUES (:room_id, :name, :tc, :bus_code, :sort)'
    );

    $pdo->beginTransaction();
    try {
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
                if ($roomId > 0 && !empty($r['guests'])) {
                    $sort = 0;
                    $busCode = defaultBusCode((int) $r['no']);
                    foreach ($r['guests'] as $g) {
                        // Misafir dizi (isim/tc/bus) veya düz metin (isim) olabilir
                        if (is_array($g)) {
                            $gName = trim((string) ($g['name'] ?? ''));
                            $gTc   = trim((string) ($g['tc'] ?? ''));
                            $gBus  = trim((string) ($g['bus'] ?? $g['busCode'] ?? ''));
                        } else {
                            $gName = trim((string) $g);
                            $gTc   = '';
                            $gBus  = '';
                        }
                        if ($gName === '') continue;
                        $insGuest->execute([
                            ':room_id'  => $roomId,
                            ':name'     => $gName,
                            ':tc'       => $gTc !== '' ? $gTc : null,
                            ':bus_code' => $gBus !== '' ? $gBus : $busCode,
                            ':sort'     => $sort++,
                        ]);
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
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        // Hata loglansın; sessizce yutulmasın (canlıda error_log)
        error_log('seedIfEmpty hata: ' . $e->getMessage());
    }
}
