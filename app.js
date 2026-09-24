/* OdaMatik - Frontend mantığı (PHP API sürümü)
   Tüm veri işlemleri api.php üzerinden yürür; her işlemden sonra
   sunucu güncel durumu döndürür ve ekran yeniden çizilir. */

let rooms = [];
let waitingList = [];
let selectedRoomId = null;

const API = 'api.php';
const BUS_CODES = ['A-1', 'A-2', 'A-3'];

/* Misafir kaydı hem düz metin ("Ad Soyad") hem de {name,tc,phone,busCode,notes} olabilir.
   Aşağıdaki yardımcılar her iki biçimi de güvenle okur. */
function guestName(g) { return (g && typeof g === 'object') ? (g.name || '') : (g || ''); }
function guestTc(g)   { return (g && typeof g === 'object') ? (g.tc || '') : ''; }
function guestPhone(g){ return (g && typeof g === 'object') ? (g.phone || '') : ''; }
function guestBus(g)  { return (g && typeof g === 'object') ? (g.busCode || '') : ''; }
function guestNote(g) { return (g && typeof g === 'object') ? (g.notes || g.note || '') : ''; }

function compareRoomNames(a, b) {
  return String(a.no).localeCompare(String(b.no), 'tr', { numeric: true, sensitivity: 'base' });
}

function defaultBusCodeForRoom(roomNo) {
  const text = String(roomNo || '');
  const number = text.match(/\d+/);
  let index;
  if (number) {
    index = Math.max(0, Number(number[0]) - 1);
  } else {
    index = [...text].reduce((sum, character) => sum + character.codePointAt(0), 0);
  }
  return BUS_CODES[index % BUS_CODES.length];
}

/* Satır içi düzenleme durumunda olan odanın kimliği (null = hiçbiri) */
let editingRoomId = null;

/* Sunucuya istek atan yardımcı. Yanıttaki güncel durumu belleğe alır. */
async function apiCall(action, payload = {}) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload })
    });
    const data = await res.json();
    if (!data.ok) {
      showToast(data.error || 'İşlem başarısız.', 'error');
      return null;
    }
    if (data.state) {
      rooms = data.state.rooms;
      waitingList = data.state.waitingList;
    }
    return data;
  } catch (e) {
    showToast('Sunucuya ulaşılamadı: ' + e.message, 'error');
    return null;
  }
}

/* İlk yükleme */
async function initData() {
  const data = await apiCall('state');
  if (data) {
    populateBlockDropdown();
    renderAll();
  }
}

/* ---------- Modal yardımcıları ---------- */
function openModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }
function applyFilters() { renderBlocks(); }
function resetFilters() {
  const ids = { searchInput: '', filterBlock: 'ALL', filterStatus: 'ALL', filterCapacity: 'ALL' };
  Object.entries(ids).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });
  renderBlocks();
}

/* ---------- Render ---------- */
function renderAll() {
  renderBlocks();
  updateKPIs();
  renderWaitingList();
  const pd = document.getElementById('printDate');
  if (pd) pd.innerText = new Date().toLocaleString('tr-TR');
}

function populateBlockDropdown() {
  const select = document.getElementById('filterBlock');
  const current = select.value;
  const uniqueBlocks = [...new Set(rooms.map(r => r.block))];
  select.innerHTML = '<option value="ALL">Tüm Bloklar</option>';
  uniqueBlocks.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b; opt.innerText = b;
    select.appendChild(opt);
  });
  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function getBlockColorTheme(blockName) {
  const name = (blockName || '').toUpperCase();
  if (name.includes('VIP'))
    return { border:'border-yellow-300', bgHeader:'bg-yellow-100/90 text-yellow-900 border-yellow-200', accent:'bg-yellow-50 text-yellow-900' };
  if (name.includes('BEJ') || name.includes('SARI'))
    return { border:'border-amber-300', bgHeader:'bg-amber-100/80 text-amber-900 border-amber-200', accent:'bg-amber-50 text-amber-900' };
  if (name.includes('PEMBE'))
    return { border:'border-pink-300', bgHeader:'bg-pink-100/90 text-pink-900 border-pink-200', accent:'bg-pink-50 text-pink-900' };
  if (name.includes('LACİVERT'))
    return { border:'border-blue-400', bgHeader:'bg-slate-800 text-white border-slate-700', accent:'bg-slate-50 text-slate-900' };
  return { border:'border-rose-300', bgHeader:'bg-rose-100/80 text-rose-950 border-rose-200', accent:'bg-rose-50 text-rose-900' };
}

function renderBlocks() {
  const container = document.getElementById('blocksContainer');
  if (!container) return;
  const searchEl = document.getElementById('searchInput');
  const blockEl = document.getElementById('filterBlock');
  const statusEl = document.getElementById('filterStatus');
  const capEl = document.getElementById('filterCapacity');
  const searchQuery = searchEl ? searchEl.value.trim().toLocaleLowerCase('tr-TR') : '';
  const filterBlock = blockEl ? blockEl.value : 'ALL';
  const filterStatus = statusEl ? statusEl.value : 'ALL';
  const filterCapacity = capEl ? capEl.value : 'ALL';

  const grouped = {};
  rooms.forEach(r => { (grouped[r.block] = grouped[r.block] || []).push(r); });

  container.innerHTML = '';
  let totalMatchingRooms = 0;

  Object.keys(grouped).forEach(blockName => {
    if (filterBlock !== 'ALL' && filterBlock !== blockName) return;

    let blockRooms = grouped[blockName].filter(room => {
      const isOccupied = !room.isStaff && room.guestGroup && room.guestGroup.trim() !== '';
      if (filterStatus === 'EMPTY' && (isOccupied || room.isStaff)) return false;
      if (filterStatus === 'OCCUPIED' && !isOccupied) return false;
      if (filterStatus === 'STAFF' && !room.isStaff) return false;
      if (filterStatus === 'ACCESSIBLE' && !room.hasRamp) return false;

      if (filterCapacity !== 'ALL') {
        const cap = parseInt(filterCapacity);
        if (cap === 6 && room.capacity < 6) return false;
        if (cap !== 6 && room.capacity !== cap) return false;
      }
      if (searchQuery) {
        const inNo = String(room.no).toLocaleLowerCase('tr-TR').includes(searchQuery);
        const inGroup = (room.guestGroup || '').toLocaleLowerCase('tr-TR').includes(searchQuery);
        const inGuests = (room.guests || []).some(g =>
          (guestName(g)).toLocaleLowerCase('tr-TR').includes(searchQuery) ||
          (guestTc(g)).toLocaleLowerCase('tr-TR').includes(searchQuery) ||
          (guestPhone(g)).toLocaleLowerCase('tr-TR').includes(searchQuery) ||
          (guestBus(g)).toLocaleLowerCase('tr-TR').includes(searchQuery) ||
          (guestNote(g)).toLocaleLowerCase('tr-TR').includes(searchQuery)
        );
        const inNotes = (room.notes || '').toLocaleLowerCase('tr-TR').includes(searchQuery);
        if (!inNo && !inGroup && !inGuests && !inNotes) return false;
      }
      return true;
    });

    if (blockRooms.length === 0) return;
    totalMatchingRooms += blockRooms.length;

    const theme = getBlockColorTheme(blockName);
    const blockSection = document.createElement('div');
    blockSection.className = `room-block print-page-break bg-white rounded-2xl border ${theme.border} shadow-sm overflow-hidden transition`;

    const header = document.createElement('div');
    header.className = `px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${theme.bgHeader}`;
    header.innerHTML = `
      <div class="flex items-center gap-2.5">
        <i class="fa-solid fa-layer-group text-sm opacity-70"></i>
        <h2 class="text-sm font-extrabold tracking-wide uppercase">${escapeHtml(blockName)}</h2>
      </div>
      <div class="flex items-center gap-3 text-xs font-semibold">
        <span class="px-2.5 py-0.5 rounded-full bg-white/70 shadow-xs backdrop-blur-xs text-slate-800">${blockRooms.length} Oda</span>
      </div>`;
    blockSection.appendChild(header);

    const grid = document.createElement('div');
    grid.className = "p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5";
    blockRooms.sort(compareRoomNames).forEach(room => grid.appendChild(createRoomCard(room)));
    blockSection.appendChild(grid);
    container.appendChild(blockSection);
  });

  if (totalMatchingRooms === 0) {
    container.innerHTML = `
      <div class="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3"><i class="fa-solid fa-magnifying-glass text-xl"></i></div>
        <h3 class="font-bold text-slate-700">Aramanıza uygun oda bulunamadı</h3>
        <p class="text-xs text-slate-500 mt-1">Filtreleri temizleyerek veya farklı bir arama yaparak tekrar deneyin.</p>
        <button onclick="resetFilters()" class="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">Filtreleri Sıfırla</button>
      </div>`;
  }
}

function createRoomCard(room) {
  const card = document.createElement('article');
  card.className = "room-card relative bg-white rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between overflow-hidden ";
  const isVipRoom = (room.block || '').toUpperCase().includes('VIP');
  const vipName = (isVipRoom && room.notes) ? String(room.notes).trim() : '';
  const displayTitle = (isVipRoom && vipName) ? vipName : `Oda ${room.no}`;
  const isOccupied = !room.isStaff && room.guestGroup && room.guestGroup.trim() !== '';
  const isStaff = room.isStaff;
  let statusColor = "", statusText = "", topBarColor = "";

  if (isStaff) {
    card.classList.add('border-purple-300', 'bg-purple-50/20');
    statusColor = "bg-purple-100 text-purple-800 border-purple-200"; statusText = "PERSONEL"; topBarColor = "bg-purple-600";
  } else if (isOccupied) {
    card.classList.add('border-amber-400', 'bg-amber-50/40');
    statusColor = "bg-amber-100 text-amber-900 border-amber-300 font-bold"; statusText = "DOLU"; topBarColor = "bg-amber-500";
  } else {
    card.classList.add('border-emerald-300', 'hover:border-emerald-500', 'bg-white');
    statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200"; statusText = "BOŞ (MÜSAİT)"; topBarColor = "bg-emerald-500";
  }

  let guestListHtml = '';
  if (isStaff) {
    guestListHtml = `<div class="py-4 text-center"><span class="text-xs font-bold uppercase tracking-wider text-purple-800 px-3 py-1 bg-purple-100 rounded-md">PERSONEL</span><p class="text-[11px] text-slate-500 mt-2">Görevli Odası</p></div>`;
  } else if (isOccupied) {
    const guests = room.guests && room.guests.length > 0 ? room.guests : [room.guestGroup];
    guestListHtml = `<div class="guest-list divide-y divide-amber-200/70 border border-amber-300/80 rounded-lg overflow-hidden bg-white/90 shadow-2xs my-1">
      ${guests.map(g => {
        const nm = escapeHtml(guestName(g));
        const tc = escapeHtml(guestTc(g));
        const phone = escapeHtml(guestPhone(g));
        const bus = escapeHtml(guestBus(g));
        const note = escapeHtml(guestNote(g));
        return `<div class="guest-entry px-2.5 py-1 hover:bg-amber-50/80">
          <div class="text-xs font-semibold text-slate-800 truncate tracking-tight">${nm}</div>
          <div class="flex items-center justify-between gap-1 mt-0.5">
            <span class="text-[10px] text-slate-500 font-mono">${tc ? '<i class="fa-solid fa-id-card text-[9px] mr-0.5"></i>' + tc : '<span class="italic text-slate-300">TC yok</span>'}</span>
            ${bus ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 whitespace-nowrap"><i class="fa-solid fa-bus text-[8px] mr-0.5"></i>${bus}</span>` : ''}
          </div>
          ${phone ? `<div class="text-[10px] text-slate-500 mt-0.5"><i class="fa-solid fa-phone text-[8px] mr-0.5"></i>${phone}</div>` : ''}
          ${note ? `<div class="text-[10px] text-rose-700 mt-0.5 leading-snug"><i class="fa-solid fa-notes-medical text-[9px] mr-0.5"></i>${note}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  } else {
    guestListHtml = `<div class="py-5 text-center flex flex-col items-center justify-center">
      <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1"><i class="fa-solid fa-check text-xs"></i></div>
      <span class="text-xs font-medium text-emerald-700">Müsait Oda</span><span class="text-[10px] text-slate-400 mt-0.5">Yerleşime Hazır</span></div>`;
  }

  card.innerHTML = `
    <div class="h-1 w-full ${topBarColor}"></div>
    <div class="p-3">
      <div class="flex items-start justify-between gap-1 pb-2 border-b border-slate-100">
        <div class="flex items-center gap-1.5">
          <div class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shadow-xs leading-none text-center px-0.5">${isVipRoom && vipName ? escapeHtml(vipName) : escapeHtml(String(room.no))}</div>
          <div><span class="text-[11px] font-bold text-slate-700 block leading-tight">${escapeHtml(displayTitle)}</span><span class="text-[10px] text-slate-500 font-medium">${room.capacity} Kişilik</span></div>
        </div>
        <div class="flex flex-col items-end gap-1">
          <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor}">${statusText}</span>
          ${room.hasRamp ? `<span class="text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title="Engelli Rampası Mevcut"><i class="fa-solid fa-wheelchair text-[10px] mr-0.5"></i> Rampalı</span>` : ''}
        </div>
      </div>
      <div class="room-card-body mt-2 min-h-[68px] flex flex-col justify-center">
        ${isOccupied ? `<div class="flex items-center justify-between mb-1">
          <span class="text-[11px] font-bold text-amber-950 truncate max-w-[130px]" title="${escapeHtml(room.guestGroup)}"><i class="fa-solid fa-users text-[10px] text-amber-600 mr-1"></i>${escapeHtml(room.guestGroup)}</span>
          <span class="text-[10px] text-slate-500 font-semibold">${room.guests ? room.guests.length : 0}/${room.capacity}</span>
        </div>` : ''}
        ${guestListHtml}
      </div>
    </div>
    <div class="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
      <span class="truncate max-w-[130px]">${isVipRoom && vipName ? escapeHtml(vipName) : (room.notes ? escapeHtml(room.notes) : 'Düzenlemek için tıkla')}</span>
      <i class="fa-solid fa-pen opacity-60"></i>
    </div>`;

  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Oda ${room.no} bilgilerini düzenle`);
  card.onclick = () => startInlineEdit(room.id);
  card.onkeydown = event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startInlineEdit(room.id);
    }
  };
  return card;
}

/* ---------- Oda üzerinde satır içi düzenleme ---------- */
function busSelectOptions(selected) {
  const active = BUS_CODES.includes(selected) ? selected : BUS_CODES[0];
  return BUS_CODES.map(code => `<option value="${code}" ${code === active ? 'selected' : ''}>${code}</option>`).join('');
}

function inlineGuestRowHtml(guest = {}) {
  return `<div class="inline-guest-row rounded-lg border border-slate-200 bg-slate-50 p-2.5">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-2">
      <label class="md:col-span-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Ad Soyad
        <input type="text" maxlength="191" value="${escapeHtml(guestName(guest))}" placeholder="Ad Soyad" class="inline-guest-name mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm normal-case font-normal tracking-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </label>
      <label class="md:col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">TC Kimlik No
        <input type="text" inputmode="numeric" maxlength="11" value="${escapeHtml(guestTc(guest))}" placeholder="11 hane" class="inline-guest-tc mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono normal-case tracking-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </label>
      <label class="md:col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Telefon
        <input type="tel" maxlength="30" value="${escapeHtml(guestPhone(guest))}" placeholder="05xx xxx xx xx" class="inline-guest-phone mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm normal-case font-normal tracking-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </label>
      <label class="md:col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Geliş Otobüsü
        <select class="inline-guest-bus mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm normal-case font-normal tracking-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none">${busSelectOptions(guestBus(guest))}</select>
      </label>
      <label class="md:col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Sağlık / Genel Not
        <input type="text" maxlength="255" value="${escapeHtml(guestNote(guest))}" placeholder="Alerji, ilaç, özel durum…" class="inline-guest-notes mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm normal-case font-normal tracking-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </label>
      <div class="md:col-span-1 flex items-end justify-end">
        <button type="button" onclick="removeInlineGuest(this)" class="w-full md:w-9 h-9 rounded-lg text-rose-600 hover:bg-rose-100 transition" title="Misafiri kaldır" aria-label="Misafiri kaldır"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  </div>`;
}

function createInlineRoomEditor(room) {
  const card = document.createElement('article');
  card.className = 'room-card rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden';
  const isOccupied = !room.isStaff && !!(room.guestGroup && room.guestGroup.trim());
  const guests = room.guests && room.guests.length ? room.guests : [{}];
  const waitingOptions = waitingList.map(w => `<option value="${w.id}">${escapeHtml(w.title)} (${w.count} kişi${w.needsRamp ? ' - Rampalı' : ''})</option>`).join('');

  card.innerHTML = `<form class="inline-room-form" onsubmit="saveInlineRoom(event, ${room.id})" onclick="event.stopPropagation()">
    <div class="px-4 py-3 bg-indigo-700 text-white flex items-center justify-between gap-3">
      <div>
        <div class="font-extrabold">Oda ${escapeHtml(String(room.no))} — Oda ve Misafir Düzenleme</div>
        <div class="text-[11px] text-indigo-100 mt-0.5">Tüm değişiklikleri tek seferde kaydedin.</div>
      </div>
      <button type="button" onclick="cancelInlineEdit()" class="w-9 h-9 rounded-lg hover:bg-white/10" aria-label="Düzenlemeyi kapat"><i class="fa-solid fa-xmark"></i></button>
    </div>

    <div class="p-4 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Oda Adı / Numarası
          <input type="text" maxlength="40" required value="${escapeHtml(String(room.no))}" placeholder="Örn: 43, A3 veya VIP 1" class="inline-room-no mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold normal-case tracking-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </label>
        <label class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Yatak Sayısı
          <input type="number" min="1" max="10" required value="${room.capacity}" class="inline-room-capacity mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </label>
        <label class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Blok / Kat
          <input type="text" maxlength="191" required value="${escapeHtml(room.block)}" list="blockList" class="inline-room-block mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-normal normal-case tracking-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </label>
        <label class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Aile / Grup
          <input type="text" maxlength="191" value="${escapeHtml(room.guestGroup || '')}" placeholder="Misafir grubu" ${room.isStaff ? 'disabled' : ''} class="inline-room-group mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-normal normal-case tracking-normal disabled:bg-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </label>
      </div>

      <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
        <input type="checkbox" class="inline-room-ramp rounded text-indigo-600" ${room.hasRamp ? 'checked' : ''} /> Rampalı / erişilebilir oda
      </label>

      ${room.isStaff ? `
        <div class="rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
          <i class="fa-solid fa-id-badge mr-1"></i> Bu oda personel odasıdır. Standart odaya çevrildiğinde misafir bilgileri girilebilir.
        </div>` : `
        <section class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-extrabold text-slate-800">Misafir Bilgileri</h3>
              <p class="text-[11px] text-slate-500">Ad, TC, telefon, geliş otobüsü ve kısa sağlık/genel notu aynı satırda düzenleyin.</p>
            </div>
            <button type="button" onclick="addInlineGuest(this)" class="px-3 py-2 rounded-lg border border-dashed border-indigo-400 text-xs font-bold text-indigo-700 hover:bg-indigo-50"><i class="fa-solid fa-plus mr-1"></i>Misafir Ekle</button>
          </div>
          <div class="inline-guests space-y-2">${guests.map(inlineGuestRowHtml).join('')}</div>
        </section>`}

      ${!room.isStaff && !isOccupied && waitingList.length ? `
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <select class="inline-waiting-select flex-1 px-3 py-2 rounded-lg border border-emerald-300 bg-white text-xs">${waitingOptions}</select>
          <button type="button" onclick="assignInlineWaiting(${room.id})" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">Bekleme Listesinden Yerleştir</button>
        </div>` : ''}
    </div>

    <div class="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap gap-2">
        <button type="button" onclick="toggleStaffStatus(${room.id})" class="px-3 py-2 rounded-lg border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50">${room.isStaff ? 'Standart Odaya Çevir' : 'Personel Odası Yap'}</button>
        ${isOccupied ? `<button type="button" onclick="evictRoom(${room.id})" class="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100">Odayı Boşalt</button>` : ''}
        <button type="button" onclick="deleteRoom(${room.id})" class="px-3 py-2 rounded-lg border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50">Odayı Sil</button>
      </div>
      <div class="flex gap-2">
        <button type="button" onclick="cancelInlineEdit()" class="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-white">Vazgeç</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-sm"><i class="fa-solid fa-floppy-disk mr-1"></i>Kaydet</button>
      </div>
    </div>
  </form>`;
  return card;
}

function startInlineEdit(roomId) {
  const room = rooms.find(item => item.id === roomId);
  const content = document.getElementById('roomEditModalContent');
  if (!room || !content) return;
  editingRoomId = roomId;
  selectedRoomId = roomId;
  content.innerHTML = '';
  content.appendChild(createInlineRoomEditor(room));
  openModal('roomEditModal');
  document.body.classList.add('overflow-hidden');
  requestAnimationFrame(() => {
    const firstInput = content.querySelector('.inline-room-no');
    if (firstInput) firstInput.focus({ preventScroll: true });
  });
}

function cancelInlineEdit() {
  editingRoomId = null;
  selectedRoomId = null;
  closeModal('roomEditModal');
  document.body.classList.remove('overflow-hidden');
  const content = document.getElementById('roomEditModalContent');
  if (content) content.innerHTML = '';
}

function refreshRoomEditModal(roomId) {
  const modal = document.getElementById('roomEditModal');
  if (modal && !modal.classList.contains('hidden')) startInlineEdit(roomId);
}

function addInlineGuest(button) {
  const container = button.closest('form').querySelector('.inline-guests');
  if (container) container.insertAdjacentHTML('beforeend', inlineGuestRowHtml());
}

function removeInlineGuest(button) {
  const row = button.closest('.inline-guest-row');
  if (row) row.remove();
}

async function saveInlineRoom(event, roomId) {
  event.preventDefault();
  const form = event.currentTarget;
  const guests = [...form.querySelectorAll('.inline-guest-row')].map(row => ({
    name: row.querySelector('.inline-guest-name').value.trim(),
    tc: row.querySelector('.inline-guest-tc').value.trim(),
    phone: row.querySelector('.inline-guest-phone').value.trim(),
    busCode: row.querySelector('.inline-guest-bus').value.trim(),
    notes: row.querySelector('.inline-guest-notes').value.trim()
  })).filter(guest => guest.name !== '');

  const payload = {
    id: roomId,
    no: form.querySelector('.inline-room-no').value.trim(),
    capacity: parseInt(form.querySelector('.inline-room-capacity').value, 10),
    block: form.querySelector('.inline-room-block').value.trim(),
    hasRamp: form.querySelector('.inline-room-ramp').checked,
    guestGroup: form.querySelector('.inline-room-group')?.value.trim() || '',
    guests
  };
  const d = await apiCall('save_room', payload);
  if (!d) return;
  editingRoomId = null;
  selectedRoomId = null;
  closeModal('roomEditModal');
  document.body.classList.remove('overflow-hidden');
  const content = document.getElementById('roomEditModalContent');
  if (content) content.innerHTML = '';
  populateBlockDropdown();
  renderAll();
  showToast(d.message, 'success');
}

async function assignInlineWaiting(roomId) {
  const form = document.querySelector('.inline-room-form');
  const waitId = parseInt(form?.querySelector('.inline-waiting-select')?.value, 10);
  if (!waitId) return;
  await assignFromWaitingList(roomId, waitId);
}

/* ---------- CRUD İşlemleri (API) ---------- */

async function evictRoom(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;
  if (!confirm(`Oda ${room.no} (${room.guestGroup}) boşaltılsın mı?`)) return;
  const d = await apiCall('evict_room', { id: roomId });
  if (d) { populateBlockDropdown(); renderAll(); refreshRoomEditModal(roomId); showToast(d.message, 'info'); }
}

async function toggleStaffStatus(roomId) {
  const d = await apiCall('toggle_staff', { id: roomId });
  if (d) { renderAll(); refreshRoomEditModal(roomId); showToast(d.message, 'success'); }
}

async function assignFromWaitingList(roomId, suppliedWaitId = null) {
  const waitId = suppliedWaitId || parseInt(document.getElementById('quickAssignSelect')?.value, 10);
  const family = waitingList.find(w => w.id === waitId);
  const room = rooms.find(r => r.id === roomId);
  if (!family || !room) return;
  if (family.count > room.capacity &&
      !confirm(`Dikkat: Aile ${family.count} kişi ancak odanın kapasitesi ${room.capacity} kişilik. Yine de yerleştirilsin mi?`)) return;
  const d = await apiCall('assign_waiting', { roomId, waitingId: waitId });
  if (d) { renderAll(); refreshRoomEditModal(roomId); showToast(d.message, 'success'); }
}

async function handleFamilyFormSubmit(event) {
  event.preventDefault();
  const title = document.getElementById('familyGroupTitle').value.trim();
  const count = parseInt(document.getElementById('familyMemberCount').value, 10);
  const needsRamp = document.getElementById('familyNeedsRamp').checked;
  const notes = document.getElementById('familyNotes').value.trim();
  const membersRaw = document.getElementById('familyMembersText').value.trim();
  const autoAssign = document.getElementById('autoAssignImmediate').checked;

  let names = [];
  if (membersRaw) names = membersRaw.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 0);

  const d = await apiCall('add_family', { title, count, needsRamp, notes, names, autoAssign });
  if (d) {
    closeModal('addFamilyModal');
    document.getElementById('addFamilyForm').reset();
    document.getElementById('familyMemberCount').value = 3;
    populateBlockDropdown();
    renderAll();
    showToast(d.message, 'success');
  }
}

/* ---------- Excel'den misafir yükleme ---------- */

/* Gizli dosya seçme penceresini açar. */
function openGuestImportDialog() {
  window.__pendingGuestImport = [];
  const status = document.getElementById('importGuestStatus');
  const preview = document.getElementById('importGuestPreview');
  if (status) status.innerHTML = '';
  if (preview) preview.innerHTML = '';
  const submitBtn = document.getElementById('confirmGuestImportBtn');
  if (submitBtn) submitBtn.disabled = true;
  openModal('guestImportModal');
  const input = document.getElementById('guestExcelInput');
  if (input) input.click();
}

/* Seçilen Excel/CSV dosyasını SheetJS ile parse edip önizleme gösterir. */
async function handleGuestFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = ''; /* aynı dosya tekrar seçilebilsin */
  if (!file) return;

  const status = document.getElementById('importGuestStatus');
  const preview = document.getElementById('importGuestPreview');
  if (status) status.innerHTML = '<span class="text-xs text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-1"></i>Dosya okunuyor…</span>';
  if (preview) preview.innerHTML = '';

  try {
    await loadExportLibrary('xlsx');
  } catch (e) {
    if (status) status.innerHTML = `<span class="text-xs text-rose-600">${escapeHtml(e.message)}</span>`;
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new Error('Dosyada sayfa bulunamadı.');
    const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1, blankrows: false, defval: '' });
    if (!rows || rows.length === 0) throw new Error('Dosyada veri bulunamadı.');

    const guests = parseGuestRows(rows);
    window.__pendingGuestImport = guests;
    renderGuestImportPreview(guests);

    if (status) {
      status.innerHTML = guests.length
        ? `<span class="text-xs text-emerald-700 font-medium"><i class="fa-solid fa-circle-check mr-1"></i>${guests.length} misafir bulundu. Listeyi kontrol edip yükleyin.</span>`
        : '<span class="text-xs text-rose-600">Geçerli misafir satırı bulunamadı. En az "Ad Soyad" sütunu dolu olmalıdır.</span>';
    }
  } catch (e) {
    window.__pendingGuestImport = [];
    if (status) status.innerHTML = `<span class="text-xs text-rose-600">Dosya okunamadı: ${escapeHtml(e.message)}</span>`;
    if (preview) preview.innerHTML = '';
  }
}

/* Türkçe karakterleri yok sayarak metni anahtar arama için normalize eder. */
function normalizeColumnKey(text) {
  return String(text || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

/* Başlık metninden hangi bilgi türü olduğunu tahmin eder. */
function guessColumnType(header) {
  const key = normalizeColumnKey(header);
  if (!key) return null;
  if (key.includes('tc') || /(kimlik|tckn|identity)/.test(key)) return 'tc';
  if (/(telefon|tel|phone|gsm|cep|iletisim|mobile)/.test(key)) return 'phone';
  if (/(otobus|otob|bus|arac|servis|sefer|plaka)/.test(key)) return 'bus';
  if (/(adsoyad|adisim|isimsoyisim|adisoyisim|tamad|fullname|name|adsoy|ad|isim|soyad|soyisim)/.test(key)) return 'name';
  return null;
}

/* SheetJS'in dizi dizisini misafir nesnelerine dönüştürür.
   Önce başlık satırından sütunları otomatik eşleştirir; bulamazsa
   sırayla [Ad Soyad, TC, Telefon, Otobüs] kabul eder. */
function parseGuestRows(rows) {
  const headerRow = rows[0].map(cell => String(cell === null || cell === undefined ? '' : cell).trim());
  const mapping = { name: -1, tc: -1, phone: -1, bus: -1 };

  headerRow.forEach((header, index) => {
    const type = guessColumnType(header);
    if (type && mapping[type] === -1) mapping[type] = index;
  });

  /* Başlık tanınmadıysa ilk satırı da veri kabul et ve pozisyonel eşle */
  const dataRows = mapping.name === -1 ? rows : rows.slice(1);
  if (mapping.name === -1) {
    mapping.name = 0;
    mapping.tc = mapping.tc === -1 ? 1 : mapping.tc;
    mapping.phone = mapping.phone === -1 ? 2 : mapping.phone;
    mapping.bus = mapping.bus === -1 ? 3 : mapping.bus;
  }

  /* "Ad" ve "Soyad" ayrı sütunlarsa soyad sütununun indeksini bul */
  let surnameIndex = -1;
  headerRow.forEach((header, index) => {
    const key = normalizeColumnKey(header).replace(/[^a-z]/g, '');
    if (['soyad', 'soyisim'].includes(key)) surnameIndex = index;
  });

  const guests = [];
  dataRows.forEach(row => {
    const pick = idx => (idx >= 0 && row[idx] !== null && row[idx] !== undefined)
      ? String(row[idx]).trim()
      : '';

    let name = pick(mapping.name);
    if (!name) return; /* isimsiz satırları atla */
    if (surnameIndex !== -1) name = [name, pick(surnameIndex)].filter(Boolean).join(' ');

    guests.push({ name, tc: pick(mapping.tc), phone: pick(mapping.phone), busCode: pick(mapping.bus) });
  });

  return guests;
}

/* Yükleme öncesi önizleme tablosunu çizer. */
function renderGuestImportPreview(guests) {
  const container = document.getElementById('importGuestPreview');
  const submitBtn = document.getElementById('confirmGuestImportBtn');
  if (!container) return;

  if (!guests.length) {
    container.innerHTML = '';
    if (submitBtn) submitBtn.disabled = true;
    return;
  }
  if (submitBtn) submitBtn.disabled = false;

  const limit = 12;
  const visible = guests.slice(0, limit);
  container.innerHTML = `
    <div class="border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-xs">
        <thead class="bg-slate-100 text-slate-600">
          <tr>
            <th class="px-3 py-2 text-left font-semibold w-10">#</th>
            <th class="px-3 py-2 text-left font-semibold">Ad Soyad</th>
            <th class="px-3 py-2 text-left font-semibold">TC Kimlik</th>
            <th class="px-3 py-2 text-left font-semibold">Telefon</th>
            <th class="px-3 py-2 text-left font-semibold">Otobüs</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${visible.map((g, i) => `
            <tr class="${i % 2 ? 'bg-slate-50/60' : 'bg-white'}">
              <td class="px-3 py-2 text-slate-400">${i + 1}</td>
              <td class="px-3 py-2 font-medium text-slate-800">${escapeHtml(g.name)}</td>
              <td class="px-3 py-2 text-slate-600 tabular-nums">${escapeHtml(g.tc)}</td>
              <td class="px-3 py-2 text-slate-600 tabular-nums">${escapeHtml(g.phone)}</td>
              <td class="px-3 py-2 text-slate-600">${escapeHtml(g.busCode)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${guests.length > limit ? `<p class="text-[11px] text-slate-400 mt-1.5">…ve ${guests.length - limit} misafir daha. Tümü yüklenecek.</p>` : ''}`;
}

/* Onaylanan misafirleri API'ye gönderip bekleme listesine ekler. */
async function confirmGuestImport() {
  const guests = Array.isArray(window.__pendingGuestImport) ? window.__pendingGuestImport : [];
  if (!guests.length) { showToast('Yüklenecek misafir yok. Önce bir Excel dosyası seçin.', 'error'); return; }

  const autoAssign = !!(document.getElementById('importAutoAssign') && document.getElementById('importAutoAssign').checked);
  const btn = document.getElementById('confirmGuestImportBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Yükleniyor…'; }

  const d = await apiCall('import_guests', { guests, autoAssign });
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Bekleyenler Listesine Ekle'; }

  if (d) {
    closeModal('guestImportModal');
    window.__pendingGuestImport = [];
    const status = document.getElementById('importGuestStatus');
    const preview = document.getElementById('importGuestPreview');
    if (status) status.innerHTML = '';
    if (preview) preview.innerHTML = '';
    renderAll();
    showToast(d.message, 'success');
    if (waitingList.length > 0) openModal('waitingListModal');
  }
}

async function handleCreateRoom(event) {
  event.preventDefault();
  const payload = {
    no: document.getElementById('newRoomNo').value.trim(),
    capacity: parseInt(document.getElementById('newRoomCap').value, 10),
    block: document.getElementById('newRoomBlock').value.trim(),
    hasRamp: document.getElementById('newRoomRamp').checked,
    isStaff: document.getElementById('newRoomStaff').checked
  };
  const d = await apiCall('add_room', payload);
  if (d) {
    closeModal('addRoomModal');
    event.target.reset();
    document.getElementById('newRoomCap').value = 3;
    populateBlockDropdown();
    renderAll();
    showToast(d.message, 'success');
  }
}

/* SİL: odayı kalıcı olarak sil */
async function deleteRoom(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;
  if (!confirm(`Oda ${room.no} kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return;
  const d = await apiCall('delete_room', { id: roomId });
  if (d) { cancelInlineEdit(); populateBlockDropdown(); renderAll(); showToast(d.message, 'info'); }
}

/* Bekleme listesi */
function renderWaitingList() {
  const container = document.getElementById('waitingListContainer');
  document.getElementById('waitingCountBadge').innerText = waitingList.length;

  if (waitingList.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 text-sm">
        <i class="fa-solid fa-clipboard-check text-4xl mb-3 text-emerald-400"></i>
        <p class="font-bold text-slate-700">Bekleyen kimse yok!</p>
        <p class="text-xs text-slate-500 mt-0.5">Tüm aileler ve misafirler odalarına yerleştirildi.</p>
      </div>`;
    return;
  }

  container.innerHTML = waitingList.map(f => `
    <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-bold text-slate-800 text-sm">${escapeHtml(f.title)}</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">${f.count} Kişi</span>
          ${f.needsRamp ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">♿ Rampalı İstiyor</span>' : ''}
        </div>
        ${renderWaitingMemberDetails(f)}
        ${f.notes ? `<p class="text-[11px] text-slate-400 mt-0.5 italic"><i class="fa-solid fa-note-sticky mr-1"></i>${escapeHtml(f.notes)}</p>` : ''}
      </div>
      <button onclick="deleteFromWaitingList(${f.id})" class="shrink-0 text-rose-500 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 text-xs transition" title="Bekleme Listesinden Sil"><i class="fa-solid fa-trash"></i></button>
    </div>`).join('');
}

/* Bekleyen grubun üyelerini (varsa TC/telefon ile) listeler. */
function renderWaitingMemberDetails(f) {
  const members = (f.members && f.members.length) ? f.members : [];
  if (members.length === 0) {
    const names = (f.names && f.names.length) ? f.names : [];
    if (names.length === 0) return '<p class="text-xs text-slate-400 mt-1 truncate max-w-md">İsim girilmedi</p>';
    return `<p class="text-xs text-slate-500 mt-1 truncate max-w-md">${escapeHtml(names.join(', '))}</p>`;
  }
  return `<div class="mt-1.5 space-y-1">${members.map(m => `
    <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
      <span class="font-medium text-slate-700">${escapeHtml(m.name)}</span>
      ${m.tc ? `<span class="inline-flex items-center gap-1 text-slate-500"><i class="fa-solid fa-id-card text-[10px] text-slate-400"></i>${escapeHtml(m.tc)}</span>` : ''}
      ${m.phone ? `<span class="inline-flex items-center gap-1 text-slate-500"><i class="fa-solid fa-phone text-[10px] text-slate-400"></i>${escapeHtml(m.phone)}</span>` : ''}
      ${m.busCode ? `<span class="inline-flex items-center gap-1 text-slate-500"><i class="fa-solid fa-bus text-[10px] text-slate-400"></i>${escapeHtml(m.busCode)}</span>` : ''}
    </div>`).join('')}</div>`;
}

async function deleteFromWaitingList(waitId) {
  if (!confirm("Bu aileyi listeden kaldırmak istediğinize emin misiniz?")) return;
  const d = await apiCall('delete_waiting', { id: waitId });
  if (d) { renderAll(); showToast(d.message, 'info'); }
}

async function runAutoAllocation() {
  const d = await apiCall('auto_allocate');
  if (d) { renderAll(); showToast(d.message, waitingList.length > 0 ? 'warning' : 'success'); }
}

async function clearAllAllocations() {
  if (!confirm("Tüm misafirler odalardan çıkarılıp bekleme listesine alınacak. Emin misiniz?")) return;
  const d = await apiCall('clear_allocations');
  if (d) { closeModal('settingsModal'); renderAll(); showToast(d.message, 'info'); }
}

async function resetToInitialImageState() {
  if (!confirm("Tüm değişiklikler sıfırlanıp orijinal şablon yüklenecek. Emin misiniz?")) return;
  const d = await apiCall('reset');
  if (d) { closeModal('settingsModal'); populateBlockDropdown(); renderAll(); showToast(d.message, 'success'); }
}

/* ---------- Çok biçimli rapor dışa aktarma ---------- */
const EXPORT_LIBRARIES = {
  xlsx: 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  docx: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
  html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
};
const exportLibraryPromises = {};

function exportLibraryReady(name) {
  if (name === 'xlsx') return !!window.XLSX;
  if (name === 'docx') return !!window.docx;
  if (name === 'html2canvas') return !!window.html2canvas;
  if (name === 'jspdf') return !!(window.jspdf && window.jspdf.jsPDF);
  return false;
}

function loadExportLibrary(name) {
  if (exportLibraryReady(name)) return Promise.resolve();
  if (exportLibraryPromises[name]) return exportLibraryPromises[name];

  exportLibraryPromises[name] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = EXPORT_LIBRARIES[name];
    script.async = true;
    script.onload = () => exportLibraryReady(name)
      ? resolve()
      : reject(new Error(`${name} kitaplığı başlatılamadı.`));
    script.onerror = () => reject(new Error(`${name} kitaplığı indirilemedi.`));
    document.head.appendChild(script);
  }).catch(error => {
    delete exportLibraryPromises[name];
    throw error;
  });
  return exportLibraryPromises[name];
}

function setExportMenu(open) {
  const menu = document.getElementById('exportMenu');
  const button = document.getElementById('exportMenuButton');
  if (!menu || !button) return;
  menu.classList.toggle('hidden', !open);
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function toggleExportMenu(event) {
  event.stopPropagation();
  const menu = document.getElementById('exportMenu');
  setExportMenu(menu ? menu.classList.contains('hidden') : false);
}

document.addEventListener('click', event => {
  const wrapper = document.getElementById('exportMenuWrapper');
  if (wrapper && !wrapper.contains(event.target)) setExportMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setExportMenu(false);
    const roomModal = document.getElementById('roomEditModal');
    if (roomModal && !roomModal.classList.contains('hidden')) cancelInlineEdit();
  }
});

function reportFileName(extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `odamatik_oda_raporu_${date}.${extension}`;
}

function getReportRows() {
  const sortedRooms = [...rooms].sort(compareRoomNames);
  const rows = [];
  sortedRooms.forEach(room => {
    const listedGuests = room.guests && room.guests.length
      ? room.guests
      : (room.guestGroup ? [{ name: room.guestGroup }] : []);
    const bedCount = Math.max(Number(room.capacity) || 0, listedGuests.length, 1);
    const isVipRoom = (room.block || '').toLocaleUpperCase('tr-TR').includes('VIP');
    const roomGeneralNote = isVipRoom ? '' : (room.notes || '');

    for (let bedIndex = 0; bedIndex < bedCount; bedIndex++) {
      const guest = listedGuests[bedIndex] || null;
      rows.push({
        block: room.block || '',
        roomNo: room.no,
        bedNo: bedIndex + 1,
        guestName: guest ? guestName(guest) : '',
        nationalId: guest ? guestTc(guest) : '',
        phone: guest ? guestPhone(guest) : '',
        busInfo: guest
          ? (BUS_CODES.includes(guestBus(guest)) ? guestBus(guest) : defaultBusCodeForRoom(room.no))
          : '',
        notes: guest ? (guestNote(guest) || (bedIndex === 0 ? roomGeneralNote : '')) : '',
        status: room.isStaff ? 'Personel' : (guest ? 'Dolu' : 'Boş')
      });
    }
  });
  return rows;
}

function getReportSummary(rows) {
  return {
    roomCount: rooms.length,
    bedCount: rows.length,
    guestCount: rows.filter(row => row.guestName && row.status !== 'Personel').length,
    emptyBedCount: rows.filter(row => row.status === 'Boş').length,
    staffBedCount: rows.filter(row => row.status === 'Personel').length
  };
}

function reportHeaders() {
  return ['Sıra No', 'TC', 'Ad Soyad', 'Telefon No', 'Geldiği Otobüs'];
}

function reportRowValues(row, sequence = 1) {
  const order = Number.isInteger(row.rowIndex) ? row.rowIndex + 1 : sequence;
  return [order, row.nationalId, row.guestName, row.phone, row.busInfo];
}

function excelReportHeaders() {
  return ['Sıra No', 'TC', 'Ad Soyad', 'Telefon No', 'Geldiği Otobüs'];
}

function excelReportRowValues(row, sequence = 1) {
  return [sequence, row.nationalId, row.guestName, row.phone, row.busInfo];
}

function getBusReportGroups(rows) {
  return BUS_CODES.map(code => ({
    code,
    rows: rows.filter(row => row.busInfo === code)
  }));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadReport(format, button) {
  setExportMenu(false);
  const formatNames = { pdf: 'PDF', xlsx: 'Excel', docx: 'Word', jpg: 'JPG' };
  const rows = getReportRows().filter(row => row.guestName && row.status !== 'Personel');
  rows.forEach((row, index) => { row.rowIndex = index; });
  if (!rows.length) {
    showToast('Dışa aktarılacak misafir kaydı bulunamadı.', 'warning');
    return;
  }

  const originalHtml = button ? button.innerHTML : '';
  document.querySelectorAll('.export-format-button').forEach(item => { item.disabled = true; });
  if (button) button.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-indigo-600"></i><span class="text-xs font-bold text-slate-700">Rapor hazırlanıyor…</span>';
  showToast(`${formatNames[format]} raporu hazırlanıyor…`, 'info');

  try {
    if (format === 'xlsx') {
      await loadExportLibrary('xlsx');
      exportReportExcel(rows);
    } else if (format === 'docx') {
      await loadExportLibrary('docx');
      await exportReportWord(rows);
    } else if (format === 'jpg') {
      await loadExportLibrary('html2canvas');
      await exportReportJpg(rows);
    } else if (format === 'pdf') {
      await Promise.all([loadExportLibrary('html2canvas'), loadExportLibrary('jspdf')]);
      await exportReportPdf(rows);
    } else {
      throw new Error('Desteklenmeyen rapor biçimi.');
    }
    showToast(`${formatNames[format]} raporu indirildi.`, 'success');
  } catch (error) {
    console.error('Rapor dışa aktarma hatası:', error);
    showToast(`Rapor oluşturulamadı: ${error.message}`, 'error');
  } finally {
    document.querySelectorAll('.export-format-button').forEach(item => { item.disabled = false; });
    if (button) button.innerHTML = originalHtml;
  }
}

function exportReportExcel(rows) {
  const XLSX = window.XLSX;
  const generatedAt = new Date().toLocaleString('tr-TR');
  const workbook = XLSX.utils.book_new();
  const tableData = [
    ['ODAMATİK MİSAFİR LİSTESİ'],
    [`Oluşturulma: ${generatedAt} | ${rows.length} misafir`],
    [],
    excelReportHeaders(),
    ...rows.map((row, index) => excelReportRowValues(row, index + 1))
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(tableData);
  worksheet['!merges'] = [
    XLSX.utils.decode_range('A1:E1'),
    XLSX.utils.decode_range('A2:E2')
  ];
  worksheet['!cols'] = [
    { wch: 10 }, { wch: 17 }, { wch: 32 },
    { wch: 20 }, { wch: 22 }
  ];
  worksheet['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 8 }, { hpt: 25 }];
  worksheet['!autofilter'] = { ref: `A4:E${Math.max(4, rows.length + 4)}` };

  // TC ve telefon değerlerinin başındaki sıfırların korunması için hücreleri metin biçiminde tut.
  rows.forEach((row, index) => {
    const excelRow = index + 5;
    ['B', 'D'].forEach(column => {
      const cell = worksheet[`${column}${excelRow}`];
      if (cell) {
        cell.t = 's';
        cell.z = '@';
        cell.v = String(cell.v ?? '');
      }
    });
  });
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Misafir Listesi');
  workbook.Props = {
    Title: 'OdaMatik Misafir Listesi',
    Subject: 'Misafir iletişim ve geliş otobüsü bilgileri',
    Author: 'OdaMatik',
    CreatedDate: new Date()
  };
  XLSX.writeFile(workbook, reportFileName('xlsx'), { compression: true });
}

async function exportReportWord(rows) {
  const d = window.docx;
  const summary = getReportSummary(getReportRows());
  const groups = getBusReportGroups(rows);
  const borders = {
    top: { style: d.BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    bottom: { style: d.BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    left: { style: d.BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    right: { style: d.BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
  };
  const widths = [9, 17, 32, 20, 22];
  const wordCell = (text, index, header = false, alternate = false) => new d.TableCell({
    width: { size: widths[index], type: d.WidthType.PERCENTAGE },
    borders,
    shading: header
      ? { fill: '1E3A8A', type: d.ShadingType.CLEAR, color: 'auto' }
      : (alternate ? { fill: 'F8FAFC', type: d.ShadingType.CLEAR, color: 'auto' } : undefined),
    margins: { top: 70, bottom: 70, left: 80, right: 80 },
    verticalAlign: d.VerticalAlign.CENTER,
    children: [new d.Paragraph({
      spacing: { before: 0, after: 0 },
      children: [new d.TextRun({ text: String(text ?? ''), bold: header, color: header ? 'FFFFFF' : '1F2937', size: header ? 16 : 15, font: 'Arial' })]
    })]
  });
  const wordTable = group => {
    const headerRow = new d.TableRow({
      tableHeader: true,
      children: reportHeaders().map((header, index) => wordCell(header, index, true))
    });
    const dataRows = group.rows.length
      ? group.rows.map((row, rowIndex) => new d.TableRow({
          cantSplit: true,
          children: reportRowValues(row, rowIndex + 1).map((value, index) => wordCell(value, index, false, rowIndex % 2 === 1))
        }))
      : [new d.TableRow({
          children: [new d.TableCell({
            columnSpan: 5,
            borders,
            children: [new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: 'Bu otobüs için kayıtlı misafir yok.', italics: true, color: '64748B', font: 'Arial' })] })]
          })]
        })];
    return new d.Table({
      width: { size: 100, type: d.WidthType.PERCENTAGE },
      layout: d.TableLayoutType.FIXED,
      rows: [headerRow, ...dataRows]
    });
  };

  const documentChildren = [
    new d.Paragraph({
      alignment: d.AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new d.TextRun({ text: 'ODAMATİK OTOBÜS MİSAFİR LİSTELERİ', bold: true, size: 26, color: '1E3A8A', font: 'Arial' })]
    }),
    new d.Paragraph({
      alignment: d.AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new d.TextRun({
        text: `Oluşturulma: ${new Date().toLocaleString('tr-TR')}  •  ${summary.roomCount} oda  •  ${summary.guestCount} misafir`,
        size: 16, color: '475569', font: 'Arial'
      })]
    })
  ];
  groups.forEach((group, groupIndex) => {
    documentChildren.push(new d.Paragraph({
      pageBreakBefore: groupIndex > 0,
      alignment: d.AlignmentType.CENTER,
      spacing: { before: 80, after: 100 },
      children: [new d.TextRun({ text: group.code, bold: true, size: 30, color: '111827', font: 'Arial' })]
    }));
    documentChildren.push(wordTable(group));
  });

  const documentFile = new d.Document({
    creator: 'OdaMatik',
    title: 'OdaMatik Misafir Raporu',
    description: 'Misafir iletişim ve geliş otobüsü bilgileri raporu',
    sections: [{
      properties: {
        page: {
          size: { orientation: d.PageOrientation.LANDSCAPE },
          margin: { top: 540, right: 540, bottom: 540, left: 540 }
        }
      },
      children: documentChildren
    }]
  });
  const blob = await d.Packer.toBlob(documentFile);
  downloadBlob(blob, reportFileName('docx'));
}

function createVisualReportElement(groups, pageLabel = '') {
  const summary = getReportSummary(getReportRows());
  const container = document.createElement('div');
  container.id = 'visualReportCapture';
  container.style.cssText = 'position:absolute;left:-10000px;top:0;width:1200px;height:auto;min-height:0;margin:0;padding:22px;overflow:visible;background:#fff;color:#111827;font-family:Arial,sans-serif;box-sizing:border-box;pointer-events:none;';
  const groupSections = groups.map((group, groupIndex) => {
    const sequenceOffset = group.sequenceOffset || 0;
    const bodyRows = group.rows.map((row, index) => {
      const background = index % 2 ? '#f8fafc' : '#ffffff';
      return `<tr style="background:${background};break-inside:avoid;page-break-inside:avoid;">
        ${reportRowValues(row, sequenceOffset + index + 1).map(value => `<td style="border:1px solid #334155;padding:5px 7px;font-size:13px;line-height:1.15;vertical-align:middle;word-break:break-word;overflow:visible;">${escapeHtml(value)}</td>`).join('')}
      </tr>`;
    }).join('');
    const emptyRow = `<tr><td colspan="5" style="border:1px solid #334155;padding:12px;text-align:center;color:#64748b;font-size:13px;font-style:italic;">Bu otobüs için kayıtlı misafir yok.</td></tr>`;
    return `<section style="margin:${groupIndex ? '24px' : '0'} 0 0;break-inside:avoid-page;page-break-inside:avoid;">
      <div style="font-family:Georgia,serif;font-size:31px;font-weight:700;text-align:center;color:#111827;margin:0 0 8px;">${escapeHtml(group.code)}</div>
      <table style="width:100%;height:auto;min-height:0;margin:0;border-collapse:collapse;table-layout:fixed;overflow:visible;break-after:auto;page-break-after:auto;">
        <colgroup><col style="width:9%"><col style="width:17%"><col style="width:32%"><col style="width:20%"><col style="width:22%"></colgroup>
        <thead style="break-after:avoid;page-break-after:avoid;"><tr style="background:#dbeafe;color:#111827;break-inside:avoid;page-break-inside:avoid;">${reportHeaders().map(header => `<th style="border:1px solid #334155;padding:6px 7px;font-family:Georgia,serif;font-size:13px;text-align:center;line-height:1.1;">${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>${bodyRows || emptyRow}</tbody>
      </table>
    </section>`;
  }).join('');
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #94a3b8;padding-bottom:7px;margin:0 0 10px;break-after:avoid;page-break-after:avoid;">
      <div><div style="font-size:17px;font-weight:800;color:#1e3a8a;">ODAMATİK MİSAFİR LİSTESİ</div><div style="font-size:10px;color:#64748b;margin-top:3px;">Oluşturulma: ${escapeHtml(new Date().toLocaleString('tr-TR'))}</div></div>
      <div style="text-align:right;font-size:11px;color:#475569;line-height:1.45;"><strong>${summary.roomCount}</strong> oda &nbsp;•&nbsp; <strong>${summary.guestCount}</strong> misafir${pageLabel ? `<br>${escapeHtml(pageLabel)}` : ''}</div>
    </div>
    ${groupSections}
    <div style="margin:7px 0 0;text-align:right;color:#94a3b8;font-size:9px;break-before:avoid;page-break-before:avoid;">OdaMatik • Oda Yerleşim ve Misafir Yönetim Sistemi</div>`;
  document.body.appendChild(container);
  return container;
}

async function visualReportCanvas(groups, pageLabel = '', scale = 1.5) {
  const element = createVisualReportElement(groups, pageLabel);
  try {
    const width = Math.ceil(element.scrollWidth || 1200);
    const height = Math.ceil(element.scrollHeight);
    if (height < 1) throw new Error('Rapor görünümü ölçülemedi.');
    return await window.html2canvas(element, {
      scale,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      onclone: clonedDocument => {
        const clone = clonedDocument.getElementById('visualReportCapture');
        if (clone) {
          clone.style.position = 'absolute';
          clone.style.left = '0';
          clone.style.top = '0';
          clone.style.margin = '0';
          clone.style.height = 'auto';
          clone.style.minHeight = '0';
          clone.style.overflow = 'visible';
        }
      }
    });
  } finally {
    element.remove();
  }
}

function paginateReportRows(rows) {
  const pages = [];
  let currentPage = [];
  let usedUnits = 0;
  const maxUnits = 44;

  rows.forEach(row => {
    const longestText = Math.max(
      String(row.guestName || '').length / 34,
      String(row.nationalId || '').length / 30,
      String(row.phone || '').length / 30
    );
    const rowUnits = 1 + Math.min(2, Math.floor(longestText));
    if (currentPage.length && usedUnits + rowUnits > maxUnits) {
      pages.push(currentPage);
      currentPage = [];
      usedUnits = 0;
    }
    currentPage.push(row);
    usedUnits += rowUnits;
  });
  if (currentPage.length) pages.push(currentPage);
  return pages;
}

async function exportReportJpg(rows) {
  const canvas = await visualReportCanvas(getBusReportGroups(rows), '', 1.5);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.94));
  if (!blob) throw new Error('JPG dosyası oluşturulamadı.');
  downloadBlob(blob, reportFileName('jpg'));
}

async function exportReportPdf(rows) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const groups = getBusReportGroups(rows);
  let sequenceOffset = 0;
  let addedPage = false;

  for (const group of groups) {
    const pages = paginateReportRows(group.rows);
    if (!pages.length) pages.push([]);
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const pageLabel = `${group.code} — Sayfa ${pageIndex + 1}/${pages.length}`;
      const canvas = await visualReportCanvas(
        [{ code: group.code, rows: pages[pageIndex], sequenceOffset }],
        addedPage ? pageLabel : '',
        1.5
      );
      if (addedPage) pdf.addPage();
      addedPage = true;

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 4;
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2);
      const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, 'FAST');
    }
    sequenceOffset += group.rows.length;
  }

  pdf.save(reportFileName('pdf'));
}

/* JSON yedek indir (veritabanı anlık görüntüsü) */
function exportDataJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ rooms, waitingList }, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", `odamatik_yedek_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(a); a.click(); a.remove();
  showToast('Yedek JSON dosyası indirildi.', 'success');
}

/* ---------- KPI & Toast ---------- */
function updateKPIs() {
  const totalRooms = rooms.length;
  const totalCapacity = rooms.reduce((a, r) => a + (r.capacity || 0), 0);
  const occupiedRooms = rooms.filter(r => !r.isStaff && r.guestGroup && r.guestGroup.trim() !== '').length;
  const staffRooms = rooms.filter(r => r.isStaff).length;
  const emptyRooms = totalRooms - occupiedRooms - staffRooms;
  const totalGuests = rooms.reduce((a, r) => (!r.isStaff && r.guestGroup) ? a + (r.guests && r.guests.length ? r.guests.length : r.capacity) : a, 0);
  const occupancyRate = totalRooms > 0 ? Math.round(((occupiedRooms + staffRooms) / totalRooms) * 100) : 0;

  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.innerText = v; };
  setText('stat-total-rooms', totalRooms);
  setText('stat-total-capacity', totalCapacity);
  setText('stat-occupied-rooms', occupiedRooms);
  setText('stat-occupied-beds', `/ ${totalCapacity} yatak`);
  setText('stat-empty-rooms', emptyRooms);
  setText('stat-total-guests', totalGuests);
  setText('stat-occupancy-rate', `${occupancyRate}%`);
  const bar = document.getElementById('stat-occupancy-bar'); if (bar) bar.style.width = `${occupancyRate}%`;
  const pg = document.getElementById('printGuestCount');
  if (pg) pg.innerText = totalGuests;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) { if (type === 'error') alert(message); return; }
  const toast = document.createElement('div');
  let bg = "bg-slate-900 text-white", icon = "fa-info-circle text-blue-400";
  if (type === 'success') { bg = "bg-emerald-900 text-emerald-50 border border-emerald-700"; icon = "fa-circle-check text-emerald-400"; }
  else if (type === 'warning') { bg = "bg-amber-900 text-amber-50 border border-amber-700"; icon = "fa-triangle-exclamation text-amber-400"; }
  else if (type === 'error') { bg = "bg-rose-900 text-rose-50 border border-rose-700"; icon = "fa-circle-xmark text-rose-400"; }

  toast.className = `${bg} pointer-events-auto px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-medium transition-all duration-300 transform translate-y-3 opacity-0`;
  toast.innerHTML = `<i class="fa-solid ${icon} text-base"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.remove('translate-y-3', 'opacity-0'));
  setTimeout(() => { toast.classList.add('opacity-0', 'translate-y-2'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

/* Başlat */
window.addEventListener('DOMContentLoaded', initData);
