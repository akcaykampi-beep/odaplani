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
    @media print {
      .no-print { display:none !important; }
      body { background:white !important; font-size:11px; }
      .print-page-break { page-break-inside:avoid; }
      .room-card { box-shadow:none !important; border:1px solid #94a3b8 !important; }
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
        <button onclick="window.print()" class="p-2 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition" title="Yazdır veya PDF Kaydet">
          <i class="fa-solid fa-print"></i>
          <span class="hidden lg:inline ml-1.5">Rapor Yazdır</span>
        </button>
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

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
      <div class="flex flex-wrap items-center gap-2.5 flex-1">
        <div class="relative min-w-[200px] flex-1 max-w-sm">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input id="searchInput" oninput="applyFilters()" type="text" placeholder="Misafir adı, aile veya oda no ara..." class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select id="filterBlock" onchange="applyFilters()" class="text-sm py-2 px-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="ALL">Tüm Bloklar</option>
        </select>
        <select id="filterStatus" onchange="applyFilters()" class="text-sm py-2 px-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="ALL">Tüm Durumlar</option>
          <option value="EMPTY">Yalnızca Boş Odalar</option>
          <option value="OCCUPIED">Yalnızca Dolu Odalar</option>
          <option value="STAFF">Personel Odaları</option>
          <option value="ACCESSIBLE">Engelli Rampalı Odalar</option>
        </select>
        <select id="filterCapacity" onchange="applyFilters()" class="text-sm py-2 px-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
          <option value="ALL">Tüm Kapasiteler</option>
          <option value="2">2 Kişilik</option>
          <option value="3">3 Kişilik</option>
          <option value="4">4 Kişilik</option>
          <option value="5">5 Kişilik</option>
          <option value="6">6+ Kişilik</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <button onclick="openModal('waitingListModal')" class="relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition">
          <i class="fa-solid fa-clock-rotate-left text-amber-500"></i>
          <span>Bekleme Listesi</span>
          <span id="waitingCountBadge" class="bg-amber-500 text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">0</span>
        </button>
        <button onclick="openModal('addRoomModal')" class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-dashed border-slate-400 hover:border-slate-600 text-slate-700 hover:bg-slate-50 transition">
          <i class="fa-solid fa-plus text-xs"></i><span>Oda Ekle</span>
        </button>
      </div>
    </div>

    <div id="toastContainer" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"></div>

    <div class="hidden print:block mb-4 pb-2 border-b border-slate-400">
      <h1 class="text-2xl font-black tracking-tight text-slate-900">ODA YERLEŞİM PLANI RAPORU</h1>
      <p class="text-xs text-slate-600">Oluşturulma Tarihi: <span id="printDate"></span> | Toplam Misafir: <span id="printGuestCount"></span></p>
    </div>

    <div id="blocksContainer" class="space-y-8"></div>
  </main>

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

  <!-- Oda Detay Modal -->
  <div id="roomDetailModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 hidden">
    <div class="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
      <div id="roomDetailHeader" class="px-6 py-4 border-b flex items-center justify-between text-white"></div>
      <div class="p-6 space-y-5">
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div class="text-xs space-y-0.5"><span class="text-slate-500">Blok Bilgisi</span><p id="roomDetailBlockName" class="font-bold text-slate-800 text-sm">-</p></div>
          <div class="text-xs space-y-0.5 text-center"><span class="text-slate-500">Kapasite</span><p id="roomDetailCapacity" class="font-bold text-slate-800 text-sm">-</p></div>
          <div class="text-xs space-y-0.5 text-right"><span class="text-slate-500">Özellik</span><p id="roomDetailFeatures" class="font-bold text-slate-800 text-sm">-</p></div>
        </div>
        <div id="roomDetailOccupancySection"></div>
        <div id="roomDetailActions" class="flex items-center justify-between pt-4 border-t border-slate-200 flex-wrap gap-2"></div>
      </div>
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
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Oda Numarası *</label>
            <input type="number" id="newRoomNo" required min="1" max="999" placeholder="Örn: 51" class="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" />
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

  <!-- Oda Düzenle (GÜNCELLE) Modal -->
  <div id="editRoomModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 hidden">
    <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <h3 class="font-bold text-slate-800 flex items-center gap-2"><i class="fa-solid fa-pen-to-square text-amber-600"></i> Oda Bilgilerini Güncelle</h3>
        <button onclick="closeModal('editRoomModal')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>
      <form onsubmit="handleUpdateRoom(event)" class="p-6 space-y-4 text-sm">
        <input type="hidden" id="editRoomId" />
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Oda Numarası *</label>
            <input type="number" id="editRoomNo" required min="1" max="999" class="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Yatak Kapasitesi *</label>
            <input type="number" id="editRoomCap" required min="1" max="10" class="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-semibold" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase text-slate-600 mb-1">Bulunduğu Blok / Kat *</label>
          <input type="text" id="editRoomBlock" list="blockList" required class="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="space-y-2 pt-2">
          <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700"><input type="checkbox" id="editRoomRamp" class="rounded text-blue-600" /><span>♿ Engelliler İçin Rampalı / Uygun Giriş</span></label>
          <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700"><input type="checkbox" id="editRoomStaff" class="rounded text-indigo-600" /><span>🛠️ Personel Odası Olarak Ayır</span></label>
        </div>
        <div class="pt-4 border-t flex justify-end gap-2">
          <button type="button" onclick="closeModal('editRoomModal')" class="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100">Vazgeç</button>
          <button type="submit" class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-sm">Değişiklikleri Kaydet</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Misafir (Ad / TC / Otobüs Kodu) Düzenle Modal -->
  <div id="editGuestsModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 hidden">
    <div class="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[88vh] flex flex-col">
      <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center"><i class="fa-solid fa-id-card"></i></div>
          <div>
            <h3 class="font-bold text-slate-800">Misafir Bilgilerini Düzenle</h3>
            <p id="editGuestsRoomTitle" class="text-xs text-slate-500">-</p>
          </div>
        </div>
        <button onclick="closeModal('editGuestsModal')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>
      <form onsubmit="handleUpdateGuests(event)" class="flex flex-col flex-1 overflow-hidden">
        <input type="hidden" id="editGuestsRoomId" />
        <div class="px-6 pt-4">
          <div class="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span class="col-span-5">Ad Soyad</span>
            <span class="col-span-3">TC Kimlik No</span>
            <span class="col-span-3">Otobüs Kodu</span>
            <span class="col-span-1"></span>
          </div>
        </div>
        <div id="editGuestsContainer" class="px-6 space-y-2 overflow-y-auto flex-1"></div>
        <div class="px-6 py-3">
          <button type="button" onclick="addGuestRow()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-indigo-400 text-indigo-700 hover:bg-indigo-50 transition"><i class="fa-solid fa-plus text-xs"></i> Kişi Ekle</button>
        </div>
        <div class="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onclick="closeModal('editGuestsModal')" class="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition font-medium">İptal</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition shadow-sm">Kaydet</button>
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
