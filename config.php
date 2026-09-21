<?php
/**
 * OdaMatik - Veritabanı Yapılandırması
 * ------------------------------------
 * Kendi sunucunuza / XAMPP / hosting bilgilerinize göre düzenleyin.
 */

// Veritabanı bağlantı ayarları
define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'odamatik');
define('DB_USER', 'root');      // <-- kendi MySQL kullanıcı adınız
define('DB_PASS', '');          // <-- kendi MySQL şifreniz
define('DB_CHARSET', 'utf8mb4');

// Uygulama zaman dilimi
date_default_timezone_set('Europe/Istanbul');

// Hata gösterimi (canlıda 0 yapın)
ini_set('display_errors', '1');
error_reporting(E_ALL);
