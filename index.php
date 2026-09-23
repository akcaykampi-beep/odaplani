<?php require_once __DIR__ . '/db.php'; db(); /* Bağlantı & kurulum tetiklenir */ ?>
<!DOCTYPE html>
<html lang="tr" class="h-full bg-slate-50">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OdaMatik - Akıllı Oda Yerleşim & Rezervasyon Sistemi (PHP)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <script>
    tailwind.config = {
      theme: { extend: {
        fontFamily: { sans: ['Inter', 'sans-serif'] },
        colors: { brand: { 50:'#eff6ff',100:'#dbeafe',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a' } }
      } }
    }
  </script>
  <style>
    ::-webkit-scrollbar { width:6px; height:6px; }
    ::-webkit-scrollbar-track { background:#f1f5f9; }
    ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:9999px; }
    ::-webkit-scrollbar-thumb:hover { background:#94a3b8; }
    @page { size: A4 landscape; margin: 8mm; }
    @media print {
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #fff !important;
      }
      body { display: block !important; font-size: 10px !important; }
      .no-print, #toastContainer { display: none !important; }
      main {
        display: block !important;
        width: 100% !important;
        max-width: none !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }
      #blocksContainer {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }
      .print-report-header {
        display: block !important;
        margin: 0 0 4mm !important;
        padding: 0 0 2mm !important;
        break-after: avoid-page !important;
        page-break-after: avoid !important;
      }
      .room-block {
        margin: 0 0 4mm !important;
        min-height: 0 !important;
        overflow: visible !important;
        break-inside: avoid-page !important;
        page-break-inside: avoid !important;
        break-before: auto !important;
        break-after: auto !important;
        page-break-before: auto !important;
        page-break-after: auto !important;
        box-shadow: none !important;
      }
      .room-block:last-child { margin-bottom: 0 !important; break-after: auto !important; page-break-after: auto !important; }
      .room-block > div:last-child {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 3mm !important;
        padding: 3mm !important;
        min-height: 0 !important;
        overflow: visible !important;
      }
      .room-card {
        margin: 0 !important;
        min-height: 0 !important;
        overflow: visible !important;
        break-inside: avoid-page !important;
        page-break-inside: avoid !important;
        break-after: auto !important;
        page-break-after: auto !important;
        box-shadow: none !important;
        border: 1px solid #94a3b8 !important;
        transform: none !important;
      }
      .room-card:last-child { break-after: auto !important; page-break-after: auto !important; }
      .room-card-body, .guest-list {
        min-height: 0 !important;
        height: auto !important;
        overflow: visible !important;
      }
      .guest-entry {
        min-height: 0 !important;
        overflow: visible !important;
        break-inside: avoid-page !important;
        page-break-inside: avoid !important;
      }
      .print-page-break {
        break-before: auto !important;
        break-after: auto !important;
        page-break-before: auto !important;
        page-break-after: auto !important;
      }
    }
  </style>
</head>

<body class="h-full flex flex-col text-slate-800 antialiased selection:bg-brand-500 selection:text-white">

  <header class="no-print bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 transition-all shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
          <i class="fa-solid fa-hotel text-lg"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="font-bold text-lg text-slate-900 tracking-tight leading-none">OdaMatik</h1>
            <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">PHP</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5 font-medium">Akıllı Misafir & Kat Yerleşim Sistemi</p>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <button onclick="openModal('addFamilyModal')" class="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm hover:shadow active:scale-95">
          <i class="fa-solid fa-user-plus"></i>
          <span class="hidden sm:inline">Yeni Aile / Grup Girişi</span>
          <span class="sm:hidden">Giriş Yap</span>
        </button>
        <button onclick="runAutoAllocation()" class="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm hover:shadow active:scale-95" title="Bekleyen tüm aileleri en uygun odalara otomatik yerleştir">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          <span class="hidden md:inline">Akıllı Yerleştir</span>
          <span class="md:hidden">Oto Yerleştir</span>
        </button>
        <div class="relative" id="exportMenuWrapper">
          <button onclick="toggleExportMenu(event)" class="p-2 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition inline-flex items-center" title="Raporu farklı biçimlerde indir" aria-haspopup="true" aria-expanded="false" id="exportMenuButton">
            <i class="fa-solid fa-file-arrow-down"></i>
            <span class="hidden lg:inline ml-1.5">Rapor İndir</span>
            <i class="fa-solid fa-chevron-down text-[9px] ml-1.5 text-slate-400"></i>
          </button>
          <div id="exportMenu" class="hidden absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-50" role="menu">
            <div class="px-3 py-2 border-b border-slate-100 bg-slate-50">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rapor Biçimi Seçin</p>
            </div>
            <div class="p-1.5 space-y-0.5">
              <button type="button" onclick="downloadReport('pdf', this)" class="export-format-button w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-rose-50 text-left transition" role="menuitem">
                <span class="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center"><i class="fa-solid fa-file-pdf"></i></span>
                <span><strong class="block text-xs text-slate-800">PDF Raporu</strong><span class="text-[10px] text-slate-500">Sayfalı, yazdırmaya hazır</span></span>
              </button>
              <button type="button" onclick="downloadReport('xlsx', this)" class="export-format-button w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-emerald-50 text-left transition" role="menuitem">
                <span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><i class="fa-solid fa-file-excel"></i></span>
                <span><strong class="block text-xs text-slate-800">Excel (.xlsx)</strong><span class="text-[10px] text-slate-500">Filtrelenebilir yatak tablosu</span></span>
              </button>
              <button type="button" onclick="downloadReport('docx', this)" class="export-format-button w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 text-left transition" role="menuitem">
                <span class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center"><i class="fa-solid fa-file-word"></i></span>
                <span><strong class="block text-xs text-slate-800">Word (.docx)</strong><span class="text-[10px] text-slate-500">Düzenlenebilir tablo belgesi</span></span>
              </button>
              <button type="button" onclick="downloadReport('jpg', this)" class="export-format-button w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-50 text-left transition" role="menuitem">
                <span class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center"><i class="fa-solid fa-file-image"></i></span>
                <span><strong class="block text-xs text-slate-800">JPG Görseli</strong><span class="text-[10px] text-slate-500">Tek parça yüksek çözünürlük</span></span>
              </button>
            </div>
          </div>
        </div>
        <button onclick="openModal('settingsModal')" class="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition" title="Ayarlar & Veri Yönetimi">
          <i class="fa-solid fa-gear text-base"></i>
        </button>
      </div>
    </div>
  </header>

  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <section class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 no-print">
      <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">Toplam Oda <i class="fa-solid fa-door-open text-slate-300"></i></span>
        <div class="mt-2 flex items-baseline gap-2"><span id="stat-total-rooms" class="text-2xl font-black text-slate-800 tracking-tight">0</span><span class="text-xs text-slate-500 font-medium">adet</span></div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">Kapasite <i class="fa-solid fa-bed text-slate-300"></i></span>
        <div class="mt-2 flex items-baseline gap-2"><span id="stat-total-capacity" class="text-2xl font-black text-slate-800 tracking-tight">0</span><span class="text-xs text-slate-500 font-medium">yatak</span></div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-rose-500 flex items-center justify-between">Dolu Odalar <i class="fa-solid fa-user-lock text-rose-400"></i></span>
        <div class="mt-2 flex items-baseline gap-2"><span id="stat-occupied-rooms" class="text-2xl font-black text-rose-600 tracking-tight">0</span><span id="stat-occupied-beds" class="text-xs text-slate-500 font-medium">/ 0 yatak</span></div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-emerald-600 flex items-center justify-between">Boş Odalar <i class="fa-solid fa-key text-emerald-400"></i></span>
        <div class="mt-2 flex items-baseline gap-2"><span id="stat-empty-rooms" class="text-2xl font-black text-emerald-600 tracking-tight">0</span><span class="text-xs text-slate-500 font-medium">hazır</span></div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-indigo-600 flex items-center justify-between">Misafir Sayısı <i class="fa-solid fa-users text-indigo-400"></i></span>
        <div class="mt-2 flex items-baseline gap-2"><span id="stat-total-guests" class="text-2xl font-black text-indigo-700 tracking-tight">0</span><span class="text-xs text-slate-500 font-medium">kişi</span></div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <span class="text-xs font-semibold uppercase tracking-wider text-amber-600 flex items-center justify-between">Doluluk Oranı <i class="fa-solid fa-chart-pie text-amber-400"></i></span>
        <div class="mt-2 flex items-baseline gap-2"><span id="stat-occupancy-rate" class="text-2xl font-black text-slate-800 tracking-tight">0%</span>
          <div class="w-full bg-slate-100 rounded-full h-1.5 ml-2 overflow-hidden"><div id="stat-occupancy-bar" class="bg-amber-500 h-1.5 rounded-full" style="width:0%"></div></div>
        </div>
      </div>
    </section>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 no-print">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(260px,1.5fr)_repeat(3,minmax(160px,1fr))_auto] gap-3 items-stretch">
        <div class="relative sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input id="searchInput" oninput="applyFilters()" type="text" placeholder="Misafir adı, aile veya oda ara..." class="h-10 w-full pl-9 pr-4 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select id="filterBlock" onchange="applyFilters()" class="h-10 w-full text-sm px-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="ALL">Tüm Bloklar</option>
        </select>
        <select id="filterStatus" onchange="applyFilters()" class="h-10 w-full text-sm px-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="ALL">Tüm Durumlar</option>
          <option value="EMPTY">Yalnızca Boş Odalar</option>
          <option value="OCCUPIED">Yalnızca Dolu Odalar</option>
          <option value="STAFF">Personel Odaları</option>
          <option value="ACCESSIBLE">Engelli Rampalı Odalar</option>
        </select>
        <select id="filterCapacity" onchange="applyFilters()" class="h-10 w-full text-sm px-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="ALL">Tüm Kapasiteler</option>
          <option value="2">2 Kişilik</option>
          <option value="3">3 Kişilik</option>
          <option value="4">4 Kişilik</option>
          <option value="5">5 Kişilik</option>
          <option value="6">6+ Kişilik</option>
        </select>
        <div class="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-1">
          <button onclick="openModal('waitingListModal')" class="relative h-10 inline-flex items-center justify-center gap-2 px-3 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition whitespace-nowrap">
            <i class="fa-solid fa-clock-rotate-left text-amber-500"></i>
            <span>Bekleme Listesi</span>
            <span id="waitingCountBadge" class="bg-amber-500 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">0</span>
          </button>
          <button onclick="openModal('addRoomModal')" class="h-10 inline-flex items-center justify-center gap-1.5 px-3 text-sm font-medium rounded-lg border border-dashed border-slate-400 hover:border-slate-600 text-slate-700 hover:bg-slate-50 transition whitespace-nowrap">
            <i class="fa-solid fa-plus text-xs"></i><span>Oda Ekle</span>
          </button>
        </div>
      </div>
    </div>

    <div id="toastContainer" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"></div>

    <div class="print-report-header hidden print:block mb-4 pb-2 border-b border-slate-400">
      <h1 class="text-2xl font-black tracking-tight text-slate-900">ODA YERLEŞİM PLANI RAPORU</h1>
      <p class="text-xs text-slate-600">Oluşturulma Tarihi: <span id="printDate"></span> | Toplam Misafir: <span id="printGuestCount"></span></p>
    </div>

    <div id="blocksContainer" class="space-y-8"></div>
  </main>

  <!-- Oda ve Misafir Düzenleme Modalı -->
  <div id="roomEditModal" onclick="if (event.target === this) cancelInlineEdit()" class="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 hidden">
    <div class="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl" role="dialog" aria-modal="true" aria-label="Oda ve misafir bilgilerini düzenle">
      <div id="roomEditModalContent"></div>
    </div>
  </div>

  <!-- Aile Ekle Modal -->
  <div id="addFamilyModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 hidden">
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><i class="fa-solid fa-users"></i></div>
          <div>
            <h3 class="font-bold text-slate-800">Yeni Aile / Misafir Grubu Ekle</h3>
            <p class="text-xs text-slate-500">Kayıt girildikten sonra doğrudan veya otomatik yerleştirilebilir</p>
          </div>
        </div>
        <button onclick="closeModal('addFamilyModal')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>
      <form id="addFamilyForm" onsubmit="handleFamilyFormSubmit(event)" class="p-6 space-y-4 text-sm">
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Aile / Grup Soyadı veya Başlığı *</label>
          <input type="text" id="familyGroupTitle" required placeholder="Örn: Kaya Ailesi veya Çelebi Grubu" class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Kişi Sayısı *</label>
            <input type="number" id="familyMemberCount" min="1" max="10" required value="3" class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-800" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Özel İhtiyaç</label>
            <div class="mt-2 flex items-center gap-2">
              <input type="checkbox" id="familyNeedsRamp" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer" />
              <label for="familyNeedsRamp" class="text-xs text-slate-700 select-none cursor-pointer font-medium">♿ Engelli Rampası Gerekli</label>
            </div>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-semibold uppercase text-slate-600">Kişi İsim ve Soyisimleri</label>
            <span class="text-[11px] text-slate-400">Her satıra bir kişi veya virgülle ayırın</span>
          </div>
          <textarea id="familyMembersText" rows="4" placeholder="Umut Kaya&#10;Hayriye Kaya&#10;Yalçın Kaya" class="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans text-xs sm:text-sm leading-relaxed"></textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">İletişim / Not (İsteğe Bağlı)</label>
          <input type="text" id="familyNotes" placeholder="0532 ... / Ankara Çankaya Kafilesi" class="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs" />
        </div>
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <label class="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" id="autoAssignImmediate" checked class="rounded text-blue-600" />
            <span>Hemen otomatik odaya yerleştir</span>
          </label>
          <div class="flex items-center gap-2">
            <button type="button" onclick="closeModal('addFamilyModal')" class="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition font-medium">İptal</button>
            <button type="submit" class="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-sm">Kaydet</button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- Oda Ekle Modal -->
  <div id="addRoomModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 hidden">
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 class="font-bold text-slate-800 flex items-center gap-2"><i class="fa-solid fa-door-open text-blue-600"></i> Yeni Oda Tanımla</h3>
        <button onclick="closeModal('addRoomModal')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>
      <form onsubmit="handleCreateRoom(event)" class="p-6 space-y-4 text-sm">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Oda Adı / Numarası *</label>
            <input type="text" id="newRoomNo" required maxlength="40" placeholder="Örn: 51 veya A3" class="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Yatak Kapasitesi *</label>
            <input type="number" id="newRoomCap" required min="1" max="10" value="3" class="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Bulunduğu Blok / Kat *</label>
          <input type="text" id="newRoomBlock" list="blockList" required placeholder="Örn: Ön Blok Kırmızı" class="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" />
          <datalist id="blockList">
            <option value="ÖN BLOK KIRMIZI ODA PLANI"></option>
            <option value="ÖN BLOK BEJ ODA PLANI ENGELLİLER İÇİN RAMPALI"></option>
            <option value="PEMBE BLOK ODA PLANI ENGELLİLER İÇİN"></option>
            <option value="2. SIRA LACİVERT BLOK ODA PLANI"></option>
            <option value="3. SIRA SARI BLOK ODA PLANI"></option>
            <option value="İKİ KATLI KIRMIZI ALT KAT"></option>
            <option value="İKİ KATLI KIRMIZI BLOK"></option>
          </datalist>
          <datalist id="busCodeList">
            <option value="A-1"></option>
            <option value="A-2"></option>
            <option value="A-3"></option>
          </datalist>
        </div>
        <div class="space-y-2 pt-2">
          <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700"><input type="checkbox" id="newRoomRamp" class="rounded text-blue-600" /><span>♿ Engelliler İçin Rampalı / Uygun Giriş</span></label>
          <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700"><input type="checkbox" id="newRoomStaff" class="rounded text-indigo-600" /><span>🛠️ Personel Odası Olarak Ayır</span></label>
        </div>
        <div class="pt-4 border-t flex justify-end gap-2">
          <button type="button" onclick="closeModal('addRoomModal')" class="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100">Vazgeç</button>
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm">Odayı Ekle</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Bekleme Listesi Modal -->
  <div id="waitingListModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 hidden">
    <div class="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[85vh] flex flex-col">
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div>
          <h3 class="font-bold text-slate-800 flex items-center gap-2"><i class="fa-solid fa-clock-rotate-left text-amber-500"></i> Bekleme Listesindeki Misafirler</h3>
          <p class="text-xs text-slate-500">Henüz odaya atanmamış aileler</p>
        </div>
        <button onclick="closeModal('waitingListModal')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>
      <div id="waitingListContainer" class="p-6 overflow-y-auto flex-1 space-y-3"></div>
      <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button onclick="runAutoAllocation(); closeModal('waitingListModal');" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"><i class="fa-solid fa-wand-magic-sparkles"></i> Hepsini Otomatik Yerleştir</button>
        <button onclick="closeModal('waitingListModal')" class="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-200 text-sm font-medium">Kapat</button>
      </div>
    </div>
  </div>

  <!-- Ayarlar Modal -->
  <div id="settingsModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 hidden">
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 class="font-bold text-slate-800 flex items-center gap-2"><i class="fa-solid fa-sliders text-slate-700"></i> Sistem ve Veri Yönetimi</h3>
        <button onclick="closeModal('settingsModal')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>
      <div class="p-6 space-y-4 text-sm">
        <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <h4 class="font-semibold text-blue-900 text-xs uppercase mb-1">Veri Yedekleme</h4>
          <p class="text-xs text-blue-700 mb-3">Oda ve misafir listesini JSON olarak indirebilirsiniz (veritabanı anlık görüntüsü).</p>
          <button onclick="exportDataJSON()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"><i class="fa-solid fa-download mr-1"></i> Yedeği İndir (JSON)</button>
        </div>
        <div class="space-y-3 pt-2">
          <div class="flex items-center justify-between py-2 border-b border-slate-200">
            <div><p class="font-medium text-slate-800 text-xs">Tüm Misafirleri Çıkar (Odaları Boşalt)</p><p class="text-[11px] text-slate-500">Yerleşimleri sıfırlar, oda tanımlarını korur.</p></div>
            <button onclick="clearAllAllocations()" class="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-xs rounded-lg transition">Odaları Boşalt</button>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-slate-200">
            <div><p class="font-medium text-slate-800 text-xs">Fabrika Ayarlarına Dön</p><p class="text-[11px] text-slate-500">Orijinal oda şemasını ve örnek misafirleri yeniden yükler.</p></div>
            <button onclick="resetToInitialImageState()" class="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-xs rounded-lg transition">Sıfırla & Örneği Yükle</button>
          </div>
        </div>
      </div>
      <div class="px-6 py-3 bg-slate-50 border-t flex justify-end">
        <button onclick="closeModal('settingsModal')" class="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-200 text-xs font-semibold">Kapat</button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
