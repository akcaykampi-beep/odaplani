<?php
/**
 * OdaMatik - Veritabanı Yapılandırması
 * ------------------------------------
 * Kendi sunucunuza / XAMPP / hosting bilgilerinize göre düzenleyin.
 */

define('DB_HOST', getenv('DB_HOST') ?: 'gondola.proxy.rlwy.net');
define('DB_PORT', getenv('DB_PORT') ?: '18785');
define('DB_NAME', getenv('DB_NAME') ?: 'railway');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: 'KdQJQbLinFlNMRpCAHZWIEqkrZLWsfnb');
define('DB_CHARSET', 'utf8mb4');

// Uygulama zaman dilimi
date_default_timezone_set('Europe/Istanbul');

// Hata gösterimi (canlıda 0 yapın)
ini_set('display_errors', '1');
error_reporting(E_ALL);
