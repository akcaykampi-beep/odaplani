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
 * Mevcut kurulumu güncel VIP oda düzenine geçirir:
 * 43'ten sonra VIP ALT 1-8, ardından VIP 1-3 gelir.
 * Oda kayıtları yerinde güncellendiği için mevcut misafir atamaları korunur.
 */
function migrateRoomsToVipLayout(PDO $pdo): void
{
    try {
        $cols = $pdo->query('SHOW COLUMNS FROM rooms')->fetchAll(PDO::FETCH_COLUMN);
        if (empty($cols)) return;

        $migrationName = 'vip_layout_alt_1_8_vip_1_3';
        $migrationCheck = $pdo->prepare('SELECT COUNT(*) FROM schema_migrations WHERE name = ?');
        $migrationCheck->execute([$migrationName]);
        if ((int) $migrationCheck->fetchColumn() > 0) return;

        // Eski "vip..." otobüs kodlarını üç geçerli seçenek arasında paylaştır.
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

        $vipRooms = [
            44 => 'VIP ALT 1', 45 => 'VIP ALT 2', 46 => 'VIP ALT 3', 47 => 'VIP ALT 4',
            48 => 'VIP ALT 5', 49 => 'VIP ALT 6', 50 => 'VIP ALT 7', 51 => 'VIP ALT 8',
            52 => 'VIP 1', 53 => 'VIP 2', 54 => 'VIP 3',
        ];

        // Etiketler zaten güncelse, kullanıcı sonradan oda adını değiştirmiş olsa da dokunma.
        $currentLabels = $pdo->query("SELECT notes FROM rooms WHERE block = 'VIP ODALAR'")
            ->fetchAll(PDO::FETCH_COLUMN);
        $missingLabels = array_diff(array_values($vipRooms), array_map('strval', $currentLabels ?: []));
        if (empty($missingLabels)) {
            $pdo->prepare('INSERT IGNORE INTO schema_migrations (name) VALUES (?)')->execute([$migrationName]);
            return;
        }

        $ins = $pdo->prepare(
            "INSERT INTO rooms (no, block, capacity, has_ramp, is_staff, guest_group, notes)
             VALUES (:no, :block, 2, 0, 0, NULL, :notes)
             ON DUPLICATE KEY UPDATE block = VALUES(block), notes = VALUES(notes)"
        );
        foreach ($vipRooms as $no => $vipName) {
            $ins->execute([':no' => (string) $no, ':block' => 'VIP ODALAR', ':notes' => $vipName]);
        }
        $pdo->prepare('INSERT IGNORE INTO schema_migrations (name) VALUES (?)')->execute([$migrationName]);
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

/** Oda adına göre varsayılan otobüs kodu — sadece A-1, A-2, A-3 döner. */
function defaultBusCode(string $roomNo): string
{
    $seq = ['A-1', 'A-2', 'A-3'];
    preg_match('/\d+/', $roomNo, $match);
    $index = isset($match[0])
        ? max(0, (int) $match[0] - 1)
        : array_sum(array_map('ord', str_split($roomNo)));
    return $seq[$index % count($seq)];
}

function createSchema(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name       VARCHAR(191) PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci
    ");

    // Odalar
    $pdo->exec("
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci
    ");

    // Eski kurulumlarda oda numarası INT olabilir; harfli oda adları için metne çevir.
    try {
        $typeStmt = $pdo->prepare(
            "SELECT DATA_TYPE FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'no'"
        );
        $typeStmt->execute();
        $roomNoType = strtolower((string) $typeStmt->fetchColumn());
        if (!in_array($roomNoType, ['char', 'varchar'], true)) {
            $pdo->exec('ALTER TABLE rooms MODIFY COLUMN no VARCHAR(40) NOT NULL');
        }
    } catch (Throwable $e) {
        error_log('Oda adı metin dönüşümü başarısız: ' . $e->getMessage());
    }

    // Bir odada kalan misafirler
    $pdo->exec("
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci
    ");

    // Mevcut (eski) kurulumlar için sütunları güvenle ekle (migration)
    ensureColumn($pdo, 'room_guests', 'tc',       "ALTER TABLE room_guests ADD COLUMN tc VARCHAR(20) DEFAULT NULL AFTER name");
    ensureColumn($pdo, 'room_guests', 'phone',    "ALTER TABLE room_guests ADD COLUMN phone VARCHAR(30) DEFAULT NULL AFTER tc");
    ensureColumn($pdo, 'room_guests', 'bus_code', "ALTER TABLE room_guests ADD COLUMN bus_code VARCHAR(40) DEFAULT NULL AFTER phone");
    ensureColumn($pdo, 'room_guests', 'note',     "ALTER TABLE room_guests ADD COLUMN note VARCHAR(255) DEFAULT NULL AFTER bus_code");

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
            tc         VARCHAR(20) DEFAULT NULL,
            phone      VARCHAR(30) DEFAULT NULL,
            bus_code   VARCHAR(40) DEFAULT NULL,
            sort       INT NOT NULL DEFAULT 0,
            CONSTRAINT fk_wm_waiting FOREIGN KEY (waiting_id)
                REFERENCES waiting_list(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci
    ");

    // Mevcut (eski) kurulumlar için bekleyen misafir sütunlarını güvenle ekle (migration)
    ensureColumn($pdo, 'waiting_members', 'tc',       "ALTER TABLE waiting_members ADD COLUMN tc VARCHAR(20) DEFAULT NULL AFTER name");
    ensureColumn($pdo, 'waiting_members', 'phone',    "ALTER TABLE waiting_members ADD COLUMN phone VARCHAR(30) DEFAULT NULL AFTER tc");
    ensureColumn($pdo, 'waiting_members', 'bus_code', "ALTER TABLE waiting_members ADD COLUMN bus_code VARCHAR(40) DEFAULT NULL AFTER phone");
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
        'INSERT INTO room_guests (room_id, name, tc, phone, bus_code, note, sort) VALUES (:room_id, :name, :tc, :phone, :bus_code, :note, :sort)'
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
                    $busCode = defaultBusCode((string) $r['no']);
                    foreach ($r['guests'] as $g) {
                        // Misafir dizi (isim/tc/telefon/otobüs/not) veya düz metin (isim) olabilir
                        if (is_array($g)) {
                            $gName = trim((string) ($g['name'] ?? ''));
                            $gTc   = trim((string) ($g['tc'] ?? ''));
                            $gPhone = trim((string) ($g['phone'] ?? ''));
                            $gBus  = trim((string) ($g['bus'] ?? $g['busCode'] ?? ''));
                            $gNote = trim((string) ($g['notes'] ?? $g['note'] ?? ''));
                        } else {
                            $gName = trim((string) $g);
                            $gTc   = '';
                            $gPhone = '';
                            $gBus  = '';
                            $gNote = '';
                        }
                        if ($gName === '') continue;
                        $insGuest->execute([
                            ':room_id'  => $roomId,
                            ':name'     => $gName,
                            ':tc'       => $gTc !== '' ? $gTc : null,
                            ':phone'    => $gPhone !== '' ? $gPhone : null,
                            ':bus_code' => $gBus !== '' ? $gBus : $busCode,
                            ':note'     => $gNote !== '' ? $gNote : null,
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
