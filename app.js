/* OdaMatik - Frontend mantığı (PHP API sürümü)
   Tüm veri işlemleri api.php üzerinden yürür; her işlemden sonra
   sunucu güncel durumu döndürür ve ekran yeniden çizilir. */

let rooms = [];
let waitingList = [];
let selectedRoomId = null;

const API = 'api.php';

/* Misafir kaydı hem düz metin ("Ad Soyad") hem de {name,tc,busCode,notes} olabilir.
   Aşağıdaki yardımcılar her iki biçimi de güvenle okur. */
function guestName(g) { return (g && typeof g === 'object') ? (g.name || '') : (g || ''); }
function guestTc(g)   { return (g && typeof g === 'object') ? (g.tc || '') : ''; }
function guestBus(g)  { return (g && typeof g === 'object') ? (g.busCode || '') : ''; }
function guestNote(g) { return (g && typeof g === 'object') ? (g.notes || g.note || '') : ''; }

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
  const searchQuery = searchEl ? searchEl.value.trim().toLowerCase() : '';
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
        const inNo = room.no.toString().includes(searchQuery);
        const inGroup = (room.guestGroup || '').toLowerCase().includes(searchQuery);
        const inGuests = (room.guests || []).some(g =>
          (guestName(g)).toLowerCase().includes(searchQuery) ||
          (guestTc(g)).toLowerCase().includes(searchQuery) ||
          (guestBus(g)).toLowerCase().includes(searchQuery) ||
          (guestNote(g)).toLowerCase().includes(searchQuery)
        );
        const inNotes = (room.notes || '').toLowerCase().includes(searchQuery);
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
    blockRooms.sort((a, b) => a.no - b.no).forEach(room => grid.appendChild(createRoomCard(room)));
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
  if (editingRoomId === room.id) return createInlineRoomEditor(room);

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
        const bus = escapeHtml(guestBus(g));
        const note = escapeHtml(guestNote(g));
        return `<div class="guest-entry px-2.5 py-1 hover:bg-amber-50/80">
          <div class="text-xs font-semibold text-slate-800 truncate tracking-tight">${nm}</div>
          <div class="flex items-center justify-between gap-1 mt-0.5">
            <span class="text-[10px] text-slate-500 font-mono">${tc ? '<i class="fa-solid fa-id-card text-[9px] mr-0.5"></i>' + tc : '<span class="italic text-slate-300">TC yok</span>'}</span>
            ${bus ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 whitespace-nowrap"><i class="fa-solid fa-bus text-[8px] mr-0.5"></i>${bus}</span>` : ''}
          </div>
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
          <div class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shadow-xs leading-none text-center px-0.5">${isVipRoom && vipName ? escapeHtml(vipName) : room.no}</div>
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
function inlineGuestRowHtml(guest = {}) {
  return `<div class="inline-guest-row rounded-lg border border-slate-200 bg-slate-50 p-2.5">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-2">
      <label class="md:col-span-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Ad Soyad
        <input type="text" maxlength="191" value="${escapeHtml(guestName(guest))}" placeholder="Ad Soyad" class="inline-guest-name mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm normal-case font-normal tracking-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </label>
      <label class="md:col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">TC Kimlik No
        <input type="text" inputmode="numeric" maxlength="11" value="${escapeHtml(guestTc(guest))}" placeholder="11 hane" class="inline-guest-tc mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono normal-case tracking-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </label>
      <label class="md:col-span-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Geliş Otobüsü
        <input type="text" list="busCodeList" maxlength="40" value="${escapeHtml(guestBus(guest))}" placeholder="A-1" class="inline-guest-bus mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm normal-case font-normal tracking-normal focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </label>
      <label class="md:col-span-4 text-[10px] font-bold uppercase tracking-wide text-slate-500">Sağlık / Genel Not
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
  card.className = 'room-card sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-5 rounded-xl border-2 border-indigo-400 bg-white shadow-lg overflow-hidden';
  const isOccupied = !room.isStaff && !!(room.guestGroup && room.guestGroup.trim());
  const guests = room.guests && room.guests.length ? room.guests : [{}];
  const waitingOptions = waitingList.map(w => `<option value="${w.id}">${escapeHtml(w.title)} (${w.count} kişi${w.needsRamp ? ' - Rampalı' : ''})</option>`).join('');

  card.innerHTML = `<form class="inline-room-form" onsubmit="saveInlineRoom(event, ${room.id})" onclick="event.stopPropagation()">
    <div class="px-4 py-3 bg-indigo-700 text-white flex items-center justify-between gap-3">
      <div>
        <div class="font-extrabold">Oda ${room.no} — yerinde düzenleme</div>
        <div class="text-[11px] text-indigo-100 mt-0.5">Oda ve misafir değişikliklerini tek seferde kaydedin.</div>
      </div>
      <button type="button" onclick="cancelInlineEdit()" class="w-9 h-9 rounded-lg hover:bg-white/10" aria-label="Düzenlemeyi kapat"><i class="fa-solid fa-xmark"></i></button>
    </div>

    <div class="p-4 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Oda Numarası
          <input type="number" min="1" max="999" required value="${room.no}" class="inline-room-no mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
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
              <p class="text-[11px] text-slate-500">Ad, TC, geliş otobüsü ve kısa sağlık/genel notu aynı satırda düzenleyin.</p>
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
  editingRoomId = roomId;
  selectedRoomId = roomId;
  renderBlocks();
  requestAnimationFrame(() => {
    const form = document.querySelector('.inline-room-form');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function cancelInlineEdit() {
  editingRoomId = null;
  selectedRoomId = null;
  renderBlocks();
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
    busCode: row.querySelector('.inline-guest-bus').value.trim(),
    notes: row.querySelector('.inline-guest-notes').value.trim()
  })).filter(guest => guest.name !== '');

  const payload = {
    id: roomId,
    no: parseInt(form.querySelector('.inline-room-no').value, 10),
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
  if (d) { editingRoomId = roomId; populateBlockDropdown(); renderAll(); showToast(d.message, 'info'); }
}

async function toggleStaffStatus(roomId) {
  const d = await apiCall('toggle_staff', { id: roomId });
  if (d) { editingRoomId = roomId; renderAll(); showToast(d.message, 'success'); }
}

async function assignFromWaitingList(roomId, suppliedWaitId = null) {
  const waitId = suppliedWaitId || parseInt(document.getElementById('quickAssignSelect')?.value, 10);
  const family = waitingList.find(w => w.id === waitId);
  const room = rooms.find(r => r.id === roomId);
  if (!family || !room) return;
  if (family.count > room.capacity &&
      !confirm(`Dikkat: Aile ${family.count} kişi ancak odanın kapasitesi ${room.capacity} kişilik. Yine de yerleştirilsin mi?`)) return;
  const d = await apiCall('assign_waiting', { roomId, waitingId: waitId });
  if (d) { editingRoomId = roomId; renderAll(); showToast(d.message, 'success'); }
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

async function handleCreateRoom(event) {
  event.preventDefault();
  const payload = {
    no: parseInt(document.getElementById('newRoomNo').value, 10),
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
  if (d) { editingRoomId = null; selectedRoomId = null; populateBlockDropdown(); renderAll(); showToast(d.message, 'info'); }
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
      <div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-800 text-sm">${escapeHtml(f.title)}</span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">${f.count} Kişi</span>
          ${f.needsRamp ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">♿ Rampalı İstiyor</span>' : ''}
        </div>
        <p class="text-xs text-slate-500 mt-1 truncate max-w-md">${f.names && f.names.length > 0 ? escapeHtml(f.names.join(', ')) : 'İsim girilmedi'}</p>
        ${f.notes ? `<p class="text-[11px] text-slate-400 mt-0.5 italic"><i class="fa-solid fa-note-sticky mr-1"></i>${escapeHtml(f.notes)}</p>` : ''}
      </div>
      <button onclick="deleteFromWaitingList(${f.id})" class="text-rose-500 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 text-xs transition" title="Bekleme Listesinden Sil"><i class="fa-solid fa-trash"></i></button>
    </div>`).join('');
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
  if (event.key === 'Escape') setExportMenu(false);
});

function reportFileName(extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `odamatik_oda_raporu_${date}.${extension}`;
}

function getReportRows() {
  const sortedRooms = [...rooms].sort((a, b) => a.no - b.no);
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
        busInfo: guest ? guestBus(guest) : '',
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
  return ['Blok / Kat', 'Oda No', 'Yatak No', 'Misafir Adı Soyadı', 'TC Kimlik No', 'Geliş Otobüsü', 'Sağlık / Genel Not', 'Durum'];
}

function reportRowValues(row) {
  return [row.block, row.roomNo, row.bedNo, row.guestName, row.nationalId, row.busInfo, row.notes, row.status];
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
  const rows = getReportRows();
  if (!rows.length) {
    showToast('Dışa aktarılacak oda kaydı bulunamadı.', 'warning');
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
  const summary = getReportSummary(rows);
  const generatedAt = new Date().toLocaleString('tr-TR');
  const tableData = [
    ['ODAMATİK ODA VE MİSAFİR RAPORU'],
    [`Oluşturulma: ${generatedAt} | ${summary.roomCount} oda | ${summary.bedCount} yatak | ${summary.guestCount} misafir`],
    [],
    reportHeaders(),
    ...rows.map(reportRowValues)
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(tableData);
  worksheet['!merges'] = [
    XLSX.utils.decode_range('A1:H1'),
    XLSX.utils.decode_range('A2:H2')
  ];
  worksheet['!cols'] = [
    { wch: 34 }, { wch: 10 }, { wch: 10 }, { wch: 26 },
    { wch: 16 }, { wch: 18 }, { wch: 38 }, { wch: 12 }
  ];
  worksheet['!rows'] = [{ hpt: 26 }, { hpt: 20 }, { hpt: 8 }, { hpt: 24 }];
  worksheet['!autofilter'] = { ref: `A4:H${rows.length + 4}` };

  const roomSummary = [
    ['Blok / Kat', 'Oda No', 'Yatak Sayısı', 'Dolu Yatak', 'Boş Yatak', 'Oda Durumu'],
    ...[...rooms].sort((a, b) => a.no - b.no).map(room => {
      const occupied = room.guests && room.guests.length ? room.guests.length : (room.guestGroup ? 1 : 0);
      return [
        room.block || '', room.no, room.capacity, room.isStaff ? 0 : occupied,
        room.isStaff ? 0 : Math.max(0, room.capacity - occupied),
        room.isStaff ? 'Personel' : (occupied ? 'Dolu' : 'Boş')
      ];
    })
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(roomSummary);
  summarySheet['!cols'] = [{ wch: 34 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  summarySheet['!autofilter'] = { ref: `A1:F${roomSummary.length}` };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Yatak ve Misafirler');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Oda Özeti');
  workbook.Props = {
    Title: 'OdaMatik Oda ve Misafir Raporu',
    Subject: 'Oda, yatak ve misafir bilgileri',
    Author: 'OdaMatik',
    CreatedDate: new Date()
  };
  XLSX.writeFile(workbook, reportFileName('xlsx'), { compression: true });
}

async function exportReportWord(rows) {
  const d = window.docx;
  const summary = getReportSummary(rows);
  const borders = {
    top: { style: d.BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    bottom: { style: d.BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    left: { style: d.BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    right: { style: d.BorderStyle.SINGLE, size: 1, color: 'CBD5E1' }
  };
  const widths = [17, 7, 7, 18, 12, 12, 20, 7];
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
  const headerRow = new d.TableRow({
    tableHeader: true,
    children: reportHeaders().map((header, index) => wordCell(header, index, true))
  });
  const dataRows = rows.map((row, rowIndex) => new d.TableRow({
    cantSplit: true,
    children: reportRowValues(row).map((value, index) => wordCell(value, index, false, rowIndex % 2 === 1))
  }));

  const documentFile = new d.Document({
    creator: 'OdaMatik',
    title: 'OdaMatik Oda ve Misafir Raporu',
    description: 'Oda, yatak ve misafir bilgileri raporu',
    sections: [{
      properties: {
        page: {
          size: { orientation: d.PageOrientation.LANDSCAPE },
          margin: { top: 540, right: 540, bottom: 540, left: 540 }
        }
      },
      children: [
        new d.Paragraph({
          alignment: d.AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new d.TextRun({ text: 'ODAMATİK ODA VE MİSAFİR RAPORU', bold: true, size: 30, color: '1E3A8A', font: 'Arial' })]
        }),
        new d.Paragraph({
          alignment: d.AlignmentType.CENTER,
          spacing: { after: 220 },
          children: [new d.TextRun({
            text: `Oluşturulma: ${new Date().toLocaleString('tr-TR')}  •  ${summary.roomCount} oda  •  ${summary.bedCount} yatak  •  ${summary.guestCount} misafir`,
            size: 17, color: '475569', font: 'Arial'
          })]
        }),
        new d.Table({
          width: { size: 100, type: d.WidthType.PERCENTAGE },
          layout: d.TableLayoutType.FIXED,
          rows: [headerRow, ...dataRows]
        })
      ]
    }]
  });
  const blob = await d.Packer.toBlob(documentFile);
  downloadBlob(blob, reportFileName('docx'));
}

function createVisualReportElement(rows, pageLabel = '') {
  const summary = getReportSummary(getReportRows());
  const container = document.createElement('div');
  container.id = 'visualReportCapture';
  container.style.cssText = 'position:absolute;left:-10000px;top:0;width:1400px;height:auto;min-height:0;margin:0;padding:24px;overflow:visible;background:#fff;color:#1f2937;font-family:Arial,sans-serif;box-sizing:border-box;pointer-events:none;';
  const bodyRows = rows.map((row, index) => {
    const background = index % 2 ? '#f8fafc' : '#ffffff';
    const statusColor = row.status === 'Dolu' ? '#92400e' : (row.status === 'Boş' ? '#047857' : '#6b21a8');
    return `<tr style="background:${background};break-inside:avoid;page-break-inside:avoid;">
      ${reportRowValues(row).map((value, cellIndex) => `<td style="border:1px solid #cbd5e1;padding:6px 8px;font-size:${cellIndex === 6 ? '12px' : '13px'};line-height:1.2;vertical-align:top;word-break:break-word;overflow:visible;${cellIndex === 7 ? `font-weight:700;color:${statusColor};` : ''}">${escapeHtml(value)}</td>`).join('')}
    </tr>`;
  }).join('');
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1e3a8a;padding-bottom:10px;margin:0 0 12px;break-after:avoid;page-break-after:avoid;">
      <div><div style="font-size:26px;font-weight:800;color:#1e3a8a;">ODAMATİK ODA VE MİSAFİR RAPORU</div><div style="font-size:12px;color:#64748b;margin-top:4px;">Oluşturulma: ${escapeHtml(new Date().toLocaleString('tr-TR'))}</div></div>
      <div style="text-align:right;font-size:13px;color:#475569;line-height:1.55;"><strong>${summary.roomCount}</strong> oda &nbsp;•&nbsp; <strong>${summary.bedCount}</strong> yatak &nbsp;•&nbsp; <strong>${summary.guestCount}</strong> misafir${pageLabel ? `<br>${escapeHtml(pageLabel)}` : ''}</div>
    </div>
    <table style="width:100%;height:auto;min-height:0;margin:0;border-collapse:collapse;table-layout:fixed;overflow:visible;break-after:auto;page-break-after:auto;">
      <colgroup><col style="width:18%"><col style="width:7%"><col style="width:7%"><col style="width:18%"><col style="width:12%"><col style="width:12%"><col style="width:19%"><col style="width:7%"></colgroup>
      <thead style="break-after:avoid;page-break-after:avoid;"><tr style="background:#1e3a8a;color:white;break-inside:avoid;page-break-inside:avoid;">${reportHeaders().map(header => `<th style="border:1px solid #1e3a8a;padding:8px 7px;font-size:12px;text-align:left;line-height:1.15;">${escapeHtml(header)}</th>`).join('')}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <div style="margin:8px 0 0;text-align:right;color:#94a3b8;font-size:10px;break-before:avoid;page-break-before:avoid;">OdaMatik • Oda Yerleşim ve Misafir Yönetim Sistemi</div>`;
  document.body.appendChild(container);
  return container;
}

async function visualReportCanvas(rows, pageLabel = '', scale = 1.5) {
  const element = createVisualReportElement(rows, pageLabel);
  try {
    const width = Math.ceil(element.scrollWidth || 1400);
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
  const maxUnits = 24;

  rows.forEach(row => {
    const longestText = Math.max(
      String(row.guestName || '').length / 34,
      String(row.notes || '').length / 58,
      String(row.block || '').length / 42
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
  const canvas = await visualReportCanvas(rows, '', 1.5);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.94));
  if (!blob) throw new Error('JPG dosyası oluşturulamadı.');
  downloadBlob(blob, reportFileName('jpg'));
}

async function exportReportPdf(rows) {
  const { jsPDF } = window.jspdf;
  const pages = paginateReportRows(rows);
  if (!pages.length) throw new Error('PDF için rapor satırı bulunamadı.');
  const pageCount = pages.length;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const pageRows = pages[pageIndex];
    if (!pageRows.length) continue;
    const canvas = await visualReportCanvas(pageRows, `Sayfa ${pageIndex + 1} / ${pageCount}`, 1.35);
    if (pageIndex > 0) pdf.addPage('a4', 'landscape');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const maxWidth = pageWidth - (margin * 2);
    const maxHeight = pageHeight - (margin * 2);
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const width = canvas.width * ratio;
    const height = canvas.height * ratio;
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (pageWidth - width) / 2, margin, width, height, undefined, 'FAST');
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
