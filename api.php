<?php
/**
 * OdaMatik - JSON API (CRUD)
 * --------------------------
 * Tüm veri işlemleri buradan yürür. Frontend fetch() ile bu dosyayı çağırır.
 *
 * İstek biçimi:  POST api.php   Body: {"action":"...", ...}
 * Yanıt biçimi:  {"ok":true, "state":{rooms:[...], waitingList:[...]}}  veya  {"ok":false,"error":"..."}
 */

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

/* ---------- Yardımcılar ---------- */

function jsonOut($data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): void
{
    jsonOut(['ok' => false, 'error' => $msg], $code);
}

function input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw) {
        $j = json_decode($raw, true);
        if (is_array($j)) return $j;
    }
    return $_POST ?: [];
}

/** Tüm durumu (odalar + bekleme listesi) frontend'in beklediği biçimde döndürür. */
function fullState(PDO $pdo): array
{
    // Odalar + misafirler
    $rooms = $pdo->query('SELECT * FROM rooms ORDER BY no ASC')->fetchAll();
    $guestsByRoom = [];
    $gstmt = $pdo->query('SELECT room_id, name, tc, bus_code FROM room_guests ORDER BY sort ASC, id ASC');
    foreach ($gstmt as $g) {
        $guestsByRoom[$g['room_id']][] = [
            'name'    => $g['name'],
            'tc'      => $g['tc'] ?? '',
            'busCode' => $g['bus_code'] ?? '',
        ];
    }

    $roomsOut = array_map(function ($r) use ($guestsByRoom) {
        return [
            'id'         => (int) $r['id'],
            'no'         => (int) $r['no'],
            'block'      => $r['block'],
            'capacity'   => (int) $r['capacity'],
            'hasRamp'    => (bool) $r['has_ramp'],
            'isStaff'    => (bool) $r['is_staff'],
            'guestGroup' => $r['guest_group'],
            'guests'     => $guestsByRoom[$r['id']] ?? [],
            'notes'      => $r['notes'] ?? '',
        ];
    }, $rooms);

    // Bekleme listesi + kişiler
    $waits = $pdo->query('SELECT * FROM waiting_list ORDER BY id ASC')->fetchAll();
    $namesByWait = [];
    $wstmt = $pdo->query('SELECT waiting_id, name FROM waiting_members ORDER BY sort ASC, id ASC');
    foreach ($wstmt as $w) {
        $namesByWait[$w['waiting_id']][] = $w['name'];
    }

    $waitOut = array_map(function ($w) use ($namesByWait) {
        return [
            'id'        => (int) $w['id'],
            'title'     => $w['title'],
            'count'     => (int) $w['member_count'],
            'names'     => $namesByWait[$w['id']] ?? [],
            'needsRamp' => (bool) $w['needs_ramp'],
            'notes'     => $w['notes'] ?? '',
        ];
    }, $waits);

    return ['rooms' => $roomsOut, 'waitingList' => $waitOut];
}

function okState(PDO $pdo, string $message = ''): void
{
    jsonOut(['ok' => true, 'message' => $message, 'state' => fullState($pdo)]);
}

/** Oda numarasına göre varsayılan otobüs kodu üretir (db.php ile aynı mantık). */
function defaultBusCodeApi(int $roomNo): string
{
    if ($roomNo <= 43) {
        $seq = ['A-1', 'A-2', 'A-3'];
        return $seq[($roomNo - 1) % 3];
    }
    $vipAlt = ['vip alt 1', 'vip alt 2', 'vip alt 3', 'vip alt 4', 'vip alt 5', 'vip alt 7', 'vip alt 8'];
    $vip    = ['vip 1', 'vip 2', 'vip 3', 'vip 4'];
    $all    = array_merge($vipAlt, $vip);
    $idx    = $roomNo - 44;
    if ($idx < 0) $idx = 0;
    return $all[$idx % count($all)];
}

/**
 * Bir odanın misafir listesini toptan yeniden yazar.
 * $guests öğeleri düz metin (isim) veya ['name','tc','busCode'] dizisi olabilir.
 */
function setRoomGuests(PDO $pdo, int $roomId, array $guests): void
{
    // Odanın numarasını varsayılan otobüs kodu için al
    $rs = $pdo->prepare('SELECT no FROM rooms WHERE id = ?');
    $rs->execute([$roomId]);
    $roomNo = (int) ($rs->fetchColumn() ?: 0);
    $defBus = $roomNo > 0 ? defaultBusCodeApi($roomNo) : '';

    $pdo->prepare('DELETE FROM room_guests WHERE room_id = ?')->execute([$roomId]);
    $ins = $pdo->prepare('INSERT INTO room_guests (room_id, name, tc, bus_code, sort) VALUES (?,?,?,?,?)');
    $sort = 0;
    foreach ($guests as $g) {
        if (is_array($g)) {
            $name = trim((string) ($g['name'] ?? ''));
            $tc   = trim((string) ($g['tc'] ?? ''));
            $bus  = trim((string) ($g['busCode'] ?? $g['bus'] ?? ''));
        } else {
            $name = trim((string) $g);
            $tc   = '';
            $bus  = '';
        }
        if ($name === '') continue;
        $ins->execute([
            $roomId,
            $name,
            $tc !== '' ? $tc : null,
            $bus !== '' ? $bus : $defBus,
            $sort++,
        ]);
    }
}

function getRoom(PDO $pdo, int $id): ?array
{
    $s = $pdo->prepare('SELECT * FROM rooms WHERE id = ?');
    $s->execute([$id]);
    $r = $s->fetch();
    return $r ?: null;
}

/* ---------- Yönlendirme ---------- */

try {
    $pdo    = db();
    $req    = input();
    $action = $req['action'] ?? $_GET['action'] ?? 'state';

    switch ($action) {

        /* === Durumu getir === */
        case 'state':
            okState($pdo);
            break;

        /* === ODA EKLE === */
        case 'add_room': {
            $no    = (int) ($req['no'] ?? 0);
            $cap   = (int) ($req['capacity'] ?? 0);
            $block = trim((string) ($req['block'] ?? ''));
            $ramp  = !empty($req['hasRamp']) ? 1 : 0;
            $staff = !empty($req['isStaff']) ? 1 : 0;

            if ($no <= 0 || $cap <= 0 || $block === '') {
                fail('Oda numarası, kapasite ve blok zorunludur.');
            }
            $chk = $pdo->prepare('SELECT COUNT(*) FROM rooms WHERE no = ?');
            $chk->execute([$no]);
            if ((int) $chk->fetchColumn() > 0) {
                fail("Oda $no zaten mevcut! Farklı bir numara girin.");
            }

            $stmt = $pdo->prepare(
                'INSERT INTO rooms (no, block, capacity, has_ramp, is_staff, guest_group, notes)
                 VALUES (?,?,?,?,?,?,?)'
            );
            $group = $staff ? 'Nöbetçi Personel' : null;
            $stmt->execute([$no, $block, $cap, $ramp, $staff, $group, '']);
            $roomId = (int) $pdo->lastInsertId();
            if ($staff) {
                setRoomGuests($pdo, $roomId, ['Personel']);
            }
            okState($pdo, "Oda $no başarıyla eklendi.");
            break;
        }

        /* === ODA GÜNCELLE === */
        case 'update_room': {
            $id    = (int) ($req['id'] ?? 0);
            $room  = getRoom($pdo, $id);
            if (!$room) fail('Oda bulunamadı.', 404);

            $no    = (int) ($req['no'] ?? $room['no']);
            $cap   = (int) ($req['capacity'] ?? $room['capacity']);
            $block = trim((string) ($req['block'] ?? $room['block']));
            $ramp  = array_key_exists('hasRamp', $req) ? (!empty($req['hasRamp']) ? 1 : 0) : (int) $room['has_ramp'];
            $staff = array_key_exists('isStaff', $req) ? (!empty($req['isStaff']) ? 1 : 0) : (int) $room['is_staff'];

            if ($no <= 0 || $cap <= 0 || $block === '') {
                fail('Oda numarası, kapasite ve blok zorunludur.');
            }
            // Numara çakışması (kendisi hariç)
            $chk = $pdo->prepare('SELECT COUNT(*) FROM rooms WHERE no = ? AND id <> ?');
            $chk->execute([$no, $id]);
            if ((int) $chk->fetchColumn() > 0) {
                fail("Oda $no zaten başka bir kayıtta kullanılıyor.");
            }

            // Personel durumu değişimlerini yönet
            $group = $room['guest_group'];
            if ($staff && !$room['is_staff']) {
                $group = 'Nöbetçi Personel';
            } elseif (!$staff && $room['is_staff']) {
                $group = null;
            }

            $stmt = $pdo->prepare(
                'UPDATE rooms SET no=?, block=?, capacity=?, has_ramp=?, is_staff=?, guest_group=? WHERE id=?'
            );
            $stmt->execute([$no, $block, $cap, $ramp, $staff, $group, $id]);

            if ($staff && !$room['is_staff']) {
                setRoomGuests($pdo, $id, ['Personel']);
            } elseif (!$staff && $room['is_staff']) {
                setRoomGuests($pdo, $id, []);
            }
            okState($pdo, "Oda güncellendi.");
            break;
        }

        /* === ODA SİL === */
        case 'delete_room': {
            $id   = (int) ($req['id'] ?? 0);
            $room = getRoom($pdo, $id);
            if (!$room) fail('Oda bulunamadı.', 404);
            $pdo->prepare('DELETE FROM rooms WHERE id = ?')->execute([$id]); // room_guests CASCADE
            okState($pdo, "Oda {$room['no']} silindi.");
            break;
        }

        /* === ODAYI BOŞALT (misafiri çıkar) === */
        case 'evict_room': {
            $id   = (int) ($req['id'] ?? 0);
            $room = getRoom($pdo, $id);
            if (!$room) fail('Oda bulunamadı.', 404);
            $pdo->prepare('UPDATE rooms SET guest_group=NULL, notes=? WHERE id=?')->execute(['', $id]);
            setRoomGuests($pdo, $id, []);
            okState($pdo, "Oda {$room['no']} boşaltıldı.");
            break;
        }

        /* === MİSAFİR BİLGİLERİNİ GÜNCELLE (isim / TC / otobüs kodu) === */
        case 'update_guests': {
            $id   = (int) ($req['id'] ?? 0);
            $room = getRoom($pdo, $id);
            if (!$room) fail('Oda bulunamadı.', 404);

            $guests = $req['guests'] ?? [];
            if (!is_array($guests)) $guests = [];

            // En az bir geçerli isim olmalı
            $hasName = false;
            foreach ($guests as $g) {
                $nm = is_array($g) ? trim((string) ($g['name'] ?? '')) : trim((string) $g);
                if ($nm !== '') { $hasName = true; break; }
            }
            if (!$hasName) fail('En az bir misafir ismi girilmelidir.');

            setRoomGuests($pdo, $id, $guests);
            okState($pdo, "Oda {$room['no']} misafir bilgileri güncellendi.");
            break;
        }

        /* === PERSONEL DURUMUNU DEĞİŞTİR === */
        case 'toggle_staff': {
            $id   = (int) ($req['id'] ?? 0);
            $room = getRoom($pdo, $id);
            if (!$room) fail('Oda bulunamadı.', 404);
            $newStaff = $room['is_staff'] ? 0 : 1;
            if ($newStaff) {
                $pdo->prepare('UPDATE rooms SET is_staff=1, guest_group=? WHERE id=?')
                    ->execute(['Nöbetçi Personel', $id]);
                setRoomGuests($pdo, $id, ['Personel']);
            } else {
                $pdo->prepare('UPDATE rooms SET is_staff=0, guest_group=NULL WHERE id=?')->execute([$id]);
                setRoomGuests($pdo, $id, []);
            }
            okState($pdo, "Oda {$room['no']} durumu güncellendi.");
            break;
        }

        /* === AİLE / GRUP EKLE (bekleme listesine + isteğe bağlı otomatik yerleştir) === */
        case 'add_family': {
            $title = trim((string) ($req['title'] ?? ''));
            $count = max(1, (int) ($req['count'] ?? 1));
            $ramp  = !empty($req['needsRamp']) ? 1 : 0;
            $notes = trim((string) ($req['notes'] ?? ''));
            $names = $req['names'] ?? [];
            $auto  = !empty($req['autoAssign']);
            if ($title === '') fail('Aile/grup başlığı zorunludur.');

            if (!is_array($names)) $names = [];
            $names = array_values(array_filter(array_map('trim', $names), fn($s) => $s !== ''));
            while (count($names) < $count) {
                $names[] = $title . ' Üyesi ' . (count($names) + 1);
            }

            // Otomatik yerleştirme denemesi
            if ($auto) {
                $roomId = findBestRoom($pdo, $count, (bool) $ramp);
                if ($roomId !== null) {
                    $pdo->prepare('UPDATE rooms SET guest_group=?, notes=? WHERE id=?')
                        ->execute([$title, $notes, $roomId]);
                    setRoomGuests($pdo, $roomId, $names);
                    $r = getRoom($pdo, $roomId);
                    okState($pdo, "Otomatik Yerleşim: $title Oda {$r['no']} ({$r['block']}) içine yerleştirildi!");
                    break;
                }
            }

            // Bekleme listesine ekle
            $pdo->prepare('INSERT INTO waiting_list (title, member_count, needs_ramp, notes) VALUES (?,?,?,?)')
                ->execute([$title, $count, $ramp, $notes]);
            $wid = (int) $pdo->lastInsertId();
            $ins = $pdo->prepare('INSERT INTO waiting_members (waiting_id, name, sort) VALUES (?,?,?)');
            $sort = 0;
            foreach ($names as $n) $ins->execute([$wid, $n, $sort++]);

            okState($pdo, ($auto ? "Uygun boş oda bulunamadı, " : '') . "$title bekleme listesine eklendi.");
            break;
        }

        /* === BEKLEME LİSTESİNDEN SİL === */
        case 'delete_waiting': {
            $id = (int) ($req['id'] ?? 0);
            $pdo->prepare('DELETE FROM waiting_list WHERE id = ?')->execute([$id]); // members CASCADE
            okState($pdo, 'Misafir listeden kaldırıldı.');
            break;
        }

        /* === BEKLEME LİSTESİNDEN ODAYA ATA === */
        case 'assign_waiting': {
            $roomId = (int) ($req['roomId'] ?? 0);
            $waitId = (int) ($req['waitingId'] ?? 0);
            $room = getRoom($pdo, $roomId);
            if (!$room) fail('Oda bulunamadı.', 404);

            $ws = $pdo->prepare('SELECT * FROM waiting_list WHERE id = ?');
            $ws->execute([$waitId]);
            $w = $ws->fetch();
            if (!$w) fail('Bekleme kaydı bulunamadı.', 404);

            $ms = $pdo->prepare('SELECT name FROM waiting_members WHERE waiting_id = ? ORDER BY sort ASC, id ASC');
            $ms->execute([$waitId]);
            $names = array_column($ms->fetchAll(), 'name');
            if (empty($names)) $names = [$w['title']];

            $pdo->prepare('UPDATE rooms SET guest_group=?, notes=? WHERE id=?')
                ->execute([$w['title'], $w['notes'], $roomId]);
            setRoomGuests($pdo, $roomId, $names);
            $pdo->prepare('DELETE FROM waiting_list WHERE id = ?')->execute([$waitId]);

            okState($pdo, "{$w['title']} Oda {$room['no']}'ye yerleştirildi.");
            break;
        }

        /* === AKILLI (OTOMATİK) YERLEŞTİR === */
        case 'auto_allocate': {
            $waits = $pdo->query('SELECT * FROM waiting_list')->fetchAll();
            if (empty($waits)) {
                okState($pdo, 'Bekleme listesinde yerleştirilecek misafir bulunmuyor.');
                break;
            }
            // Sırala: önce rampa gerekenler, sonra en kalabalık
            usort($waits, function ($a, $b) {
                if ($a['needs_ramp'] != $b['needs_ramp']) return $b['needs_ramp'] <=> $a['needs_ramp'];
                return $b['member_count'] <=> $a['member_count'];
            });

            $placed = 0; $unassigned = 0;
            foreach ($waits as $w) {
                $roomId = findBestRoom($pdo, (int) $w['member_count'], (bool) $w['needs_ramp']);
                if ($roomId === null) { $unassigned++; continue; }

                $ms = $pdo->prepare('SELECT name FROM waiting_members WHERE waiting_id = ? ORDER BY sort ASC, id ASC');
                $ms->execute([$w['id']]);
                $names = array_column($ms->fetchAll(), 'name');
                if (empty($names)) $names = [$w['title']];

                $pdo->prepare('UPDATE rooms SET guest_group=?, notes=? WHERE id=?')
                    ->execute([$w['title'], $w['notes'], $roomId]);
                setRoomGuests($pdo, $roomId, $names);
                $pdo->prepare('DELETE FROM waiting_list WHERE id = ?')->execute([$w['id']]);
                $placed++;
            }
            $msg = "$placed aile/grup en uygun odalara yerleştirildi.";
            if ($unassigned > 0) $msg .= " $unassigned aile için uygun boş oda bulunamadı.";
            okState($pdo, $msg);
            break;
        }

        /* === TÜM ODALARI BOŞALT (misafirleri bekleme listesine aktar) === */
        case 'clear_allocations': {
            $rooms = $pdo->query("SELECT * FROM rooms WHERE is_staff = 0 AND guest_group IS NOT NULL AND guest_group <> ''")->fetchAll();
            foreach ($rooms as $r) {
                $ms = $pdo->prepare('SELECT name FROM room_guests WHERE room_id = ? ORDER BY sort ASC, id ASC');
                $ms->execute([$r['id']]);
                $names = array_column($ms->fetchAll(), 'name');
                $cnt = count($names) ?: (int) $r['capacity'];

                $pdo->prepare('INSERT INTO waiting_list (title, member_count, needs_ramp, notes) VALUES (?,?,?,?)')
                    ->execute([$r['guest_group'], $cnt, (int) $r['has_ramp'], $r['notes']]);
                $wid = (int) $pdo->lastInsertId();
                $ins = $pdo->prepare('INSERT INTO waiting_members (waiting_id, name, sort) VALUES (?,?,?)');
                $sort = 0;
                foreach ($names as $n) $ins->execute([$wid, $n, $sort++]);

                $pdo->prepare('UPDATE rooms SET guest_group=NULL, notes=? WHERE id=?')->execute(['', $r['id']]);
                setRoomGuests($pdo, (int) $r['id'], []);
            }
            okState($pdo, 'Tüm odalar boşaltıldı, misafirler bekleme listesine aktarıldı.');
            break;
        }

        /* === FABRİKA AYARLARINA DÖN === */
        case 'reset': {
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
            $pdo->exec('TRUNCATE TABLE room_guests');
            $pdo->exec('TRUNCATE TABLE waiting_members');
            $pdo->exec('TRUNCATE TABLE rooms');
            $pdo->exec('TRUNCATE TABLE waiting_list');
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
            seedIfEmpty($pdo);
            okState($pdo, 'Orijinal yerleşim planı yeniden yüklendi.');
            break;
        }

        default:
            fail('Bilinmeyen işlem: ' . $action, 404);
    }

} catch (Throwable $e) {
    fail('Sunucu hatası: ' . $e->getMessage(), 500);
}

/**
 * Best-Fit oda seçimi (erişilebilirlik önceliğiyle).
 * Boş, personel olmayan ve kapasitesi yeterli odalar arasında en az israfı seçer.
 */
function findBestRoom(PDO $pdo, int $count, bool $needsRamp): ?int
{
    $rooms = $pdo->query(
        "SELECT * FROM rooms
         WHERE is_staff = 0
           AND (guest_group IS NULL OR guest_group = '')
           AND capacity >= " . (int) $count
    )->fetchAll();

    if (empty($rooms)) return null;

    // Rampa gerekiyorsa ve rampalı oda varsa yalnızca onları değerlendir
    if ($needsRamp) {
        $ramp = array_filter($rooms, fn($r) => (int) $r['has_ramp'] === 1);
        if (!empty($ramp)) $rooms = array_values($ramp);
    }

    usort($rooms, function ($a, $b) use ($count, $needsRamp) {
        $wa = (int) $a['capacity'] - $count;
        $wb = (int) $b['capacity'] - $count;
        if ($wa !== $wb) return $wa <=> $wb;
        // Rampa gerekmeyene rampasız odayı tercih ettir (rampalı odaları koru)
        if (!$needsRamp && $a['has_ramp'] != $b['has_ramp']) {
            return $a['has_ramp'] <=> $b['has_ramp'];
        }
        return (int) $a['no'] <=> (int) $b['no'];
    });

    return (int) $rooms[0]['id'];
}
