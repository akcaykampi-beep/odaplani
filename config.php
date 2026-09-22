<?php
/**
 * OdaMatik - Veritabanı Yapılandırması
 * ------------------------------------
 * Kendi sunucunuza / XAMPP / hosting bilgilerinize göre düzenleyin.
 */

define('DB_HOST', getenv('DB_HOST') ? getenv('DB_HOST') : '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ? getenv('DB_PORT') : '3306');
define('DB_NAME', getenv('DB_NAME') ? getenv('DB_NAME') : 'odamatik');
define('DB_USER', getenv('DB_USER') ? getenv('DB_USER') : 'root');
define('DB_PASS', getenv('DB_PASS') ? getenv('DB_PASS') : '');
define('DB_CHARSET', 'utf8mb4');

// Uygulama zaman dilimi
date_default_timezone_set('Europe/Istanbul');

// Ortam: APP_ENV=production ise hatalar gizlenir ve loglanır
if (getenv('APP_ENV') === 'production') {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
} else {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
}
