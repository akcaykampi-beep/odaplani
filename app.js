/* OdaMatik - Frontend mantığı (PHP API sürümü)
   Tüm veri işlemleri api.php üzerinden yürür; her işlemden sonra
   sunucu güncel durumu döndürür ve ekran yeniden çizilir. */

let rooms = [];
let waitingList = [];
let selectedRoomId = null;

const API = 'api.php';

/* Otobüs kodu seçenekleri — sadece A-1, A-2, A-3 */
const BUS_CODES = ['A-1', 'A-2', 'A-3'];

/* Misafir kaydı hem düz metin ("Ad Soyad") hem de {name,tc,busCode} olabilir.
   Aşağıdaki yardımcılar her iki biçimi de güvenle okur. */
function guestName(g) { return (g && typeof g === 'object') ? (g.name || '') : (g || ''); }
function guestTc(g)   { return (g && typeof g === 'object') ? (g.tc || '') : ''; }
function guestBus(g)  { return (g && typeof g === 'object') ? (g.busCode || '') : ''; }

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
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
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
          (guestBus(g)).toLowerCase().includes(searchQuery)
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
    blockSection.className = `print-page-break bg-white rounded-2xl border ${theme.border} shadow-sm overflow-hidden transition`;

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
  const card = document.createElement('div');
  card.className = "room-card relative bg-white rounded-xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between overflow-hidden ";

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
    guestListHtml = `<div class="divide-y divide-amber-200/70 border border-amber-300/80 rounded-lg overflow-hidden bg-white/90 shadow-2xs my-1">
      ${guests.map(g => {
        const nm = escapeHtml(guestName(g));
        const tc = escapeHtml(guestTc(g));
        const bus = escapeHtml(guestBus(g));
        return `<div class="px-2.5 py-1 hover:bg-amber-50/80">
          <div class="text-xs font-semibold text-slate-800 truncate tracking-tight">${nm}</div>
          <div class="flex items-center justify-between gap-1 mt-0.5">
            <span class="text-[10px] text-slate-500 font-mono">${tc ? '<i class="fa-solid fa-id-card text-[9px] mr-0.5"></i>' + tc : '<span class="italic text-slate-300">TC yok</span>'}</span>
            ${bus ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 whitespace-nowrap"><i class="fa-solid fa-bus text-[8px] mr-0.5"></i>${bus}</span>` : ''}
          </div>
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
          <div class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xs">${room.no}</div>
          <div><span class="text-[11px] font-bold text-slate-700 block leading-tight">Oda ${room.no}</span><span class="text-[10px] text-slate-500 font-medium">${room.capacity} Kişilik</span></div>
        </div>
        <div class="flex flex-col items-end gap-1">
          <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor}">${statusText}</span>
          ${room.hasRamp ? `<span class="text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title="Engelli Rampası Mevcut"><i class="fa-solid fa-wheelchair text-[10px] mr-0.5"></i> Rampalı</span>` : ''}
        </div>
      </div>
      <div class="mt-2 min-h-[68px] flex flex-col justify-center">
        ${isOccupied ? `<div class="flex items-center justify-between mb-1">
          <span class="text-[11px] font-bold text-amber-950 truncate max-w-[130px]" title="${escapeHtml(room.guestGroup)}"><i class="fa-solid fa-users text-[10px] text-amber-600 mr-1"></i>${escapeHtml(room.guestGroup)}</span>
          <span class="text-[10px] text-slate-500 font-semibold">${room.guests ? room.guests.length : 0}/${room.capacity}</span>
        </div>` : ''}
        ${guestListHtml}
      </div>
    </div>
    <div class="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
      <span class="truncate max-w-[130px]">${room.notes ? escapeHtml(room.notes) : 'Detaylar için tıkla'}</span>
      <i class="fa-solid fa-arrow-up-right-from-square opacity-60"></i>
    </div>`;

  card.onclick = () => openRoomDetail(room.id);
  return card;
}

/* ---------- Oda Detay & İşlemler ---------- */
function openRoomDetail(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;
  selectedRoomId = roomId;

  const header = document.getElementById('roomDetailHeader');
  const occupancySection = document.getElementById('roomDetailOccupancySection');
  const actions = document.getElementById('roomDetailActions');
  const isOccupied = !room.isStaff && room.guestGroup && room.guestGroup.trim() !== '';

  header.className = `px-6 py-4 border-b flex items-center justify-between ${room.isStaff ? 'bg-purple-700' : isOccupied ? 'bg-amber-600' : 'bg-emerald-600'} text-white`;
  header.innerHTML = `
    <div>
      <div class="flex items-center gap-2">
        <span class="text-xl font-extrabold">Oda ${room.no}</span>
        <span class="text-xs px-2 py-0.5 rounded-full bg-white/20 uppercase font-semibold">${room.isStaff ? 'Personel' : isOccupied ? 'Dolu' : 'Boş'}</span>
      </div>
      <p class="text-xs text-white/80 mt-0.5">${escapeHtml(room.block)}</p>
    </div>
    <button onclick="closeModal('roomDetailModal')" class="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"><i class="fa-solid fa-xmark text-lg"></i></button>`;

  document.getElementById('roomDetailBlockName').innerText = room.block;
  document.getElementById('roomDetailCapacity').innerText = `${room.capacity} Kişilik`;
  document.getElementById('roomDetailFeatures').innerText = (room.hasRamp ? '♿ Engelli Rampalı' : 'Standart') + (room.isStaff ? ' • Personel' : '');

  // Her durumda görünen "Düzenle" ve "Sil" düğmeleri
  const manageButtons = `
    <div class="flex items-center gap-2">
      <button onclick="openEditRoom(${room.id})" class="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5"><i class="fa-solid fa-pen-to-square"></i> Düzenle</button>
      <button onclick="deleteRoom(${room.id})" class="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5"><i class="fa-solid fa-trash"></i> Odayı Sil</button>
    </div>`;

  if (isOccupied) {
    occupancySection.innerHTML = `
      <div class="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold uppercase text-amber-900">Aile / Misafir Grubu</span>
          <span class="text-xs px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-semibold">${room.guests.length} Kişi Kalıyor</span>
        </div>
        <p class="text-base font-bold text-slate-800 mb-3">${escapeHtml(room.guestGroup)}</p>
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-slate-600 uppercase">Kalan Misafir Listesi (Ad / TC / Otobüs):</label>
          <div class="bg-white rounded-lg border border-amber-200 divide-y divide-slate-100 overflow-hidden text-sm">
            ${room.guests.map((g, i) => {
              const nm = escapeHtml(guestName(g));
              const tc = escapeHtml(guestTc(g));
              const bus = escapeHtml(guestBus(g));
              return `<div class="px-3 py-2 text-slate-700">
                <div class="flex items-center justify-between">
                  <span class="font-medium">${i + 1}. ${nm}</span>
                  ${bus ? `<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800"><i class="fa-solid fa-bus mr-0.5"></i>${bus}</span>` : '<span class="text-[10px] text-slate-300 italic">otobüs yok</span>'}
                </div>
                <div class="text-[11px] text-slate-500 font-mono mt-0.5">${tc ? '<i class="fa-solid fa-id-card mr-1"></i>' + tc : '<span class="italic text-slate-300">TC girilmedi</span>'}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        ${room.notes ? `<div class="mt-3 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-amber-200"><strong>Not:</strong> ${escapeHtml(room.notes)}</div>` : ''}
      </div>`;
    actions.innerHTML = `
      <button onclick="openEditGuests(${room.id})" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"><i class="fa-solid fa-id-card"></i> Misafir / TC / Otobüs Düzenle</button>
      <button onclick="evictRoom(${room.id})" class="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"><i class="fa-solid fa-door-closed"></i> Odadan Çıkış (Boşalt)</button>
      ${manageButtons}`;
  } else if (room.isStaff) {
    occupancySection.innerHTML = `
      <div class="p-5 text-center bg-purple-50 rounded-xl border border-purple-200">
        <i class="fa-solid fa-id-badge text-3xl text-purple-600 mb-2"></i>
        <h4 class="font-bold text-purple-950">Bu Oda Personel İçin Ayrılmıştır</h4>
        <p class="text-xs text-purple-700 mt-1">Nöbetçi ekip veya görevliler kalmaktadır.</p>
      </div>`;
    actions.innerHTML = `
      <button onclick="toggleStaffStatus(${room.id})" class="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium">Standart Odaya Çevir</button>
      ${manageButtons}`;
  } else {
    const waitingOptionsHtml = waitingList.length > 0
      ? waitingList.map(w => `<option value="${w.id}">${escapeHtml(w.title)} (${w.count} kişi${w.needsRamp ? ' - Rampalı' : ''})</option>`).join('')
      : '<option disabled>Bekleme listesinde misafir yok</option>';
    occupancySection.innerHTML = `
      <div class="space-y-4">
        <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
          <i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i> Bu oda şu anda boş ve ${room.capacity} kişiye kadar misafir ağırlayabilir.
        </div>
        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label class="block text-xs font-bold text-slate-700 uppercase">Bekleme Listesinden Bir Aile Ata:</label>
          <div class="flex gap-2">
            <select id="quickAssignSelect" class="flex-1 text-xs sm:text-sm py-2 px-3 border rounded-lg bg-white">${waitingOptionsHtml}</select>
            <button onclick="assignFromWaitingList(${room.id})" ${waitingList.length === 0 ? 'disabled' : ''} class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition">Odaya Ver</button>
          </div>
        </div>
      </div>`;
    actions.innerHTML = `
      <button onclick="toggleStaffStatus(${room.id})" class="px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-lg">Personel odası yap</button>
      ${manageButtons}`;
  }

  openModal('roomDetailModal');
}

/* ---------- CRUD İşlemleri (API) ---------- */

async function evictRoom(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;
  if (!confirm(`Oda ${room.no} (${room.guestGroup}) boşaltılsın mı?`)) return;
  const d = await apiCall('evict_room', { id: roomId });
  if (d) { closeModal('roomDetailModal'); populateBlockDropdown(); renderAll(); showToast(d.message, 'info'); }
}

async function toggleStaffStatus(roomId) {
  const d = await apiCall('toggle_staff', { id: roomId });
  if (d) { closeModal('roomDetailModal'); renderAll(); showToast(d.message, 'success'); }
}

async function assignFromWaitingList(roomId) {
  const select = document.getElementById('quickAssignSelect');
  const waitId = parseInt(select.value, 10);
  const family = waitingList.find(w => w.id === waitId);
  const room = rooms.find(r => r.id === roomId);
  if (!family || !room) return;
  if (family.count > room.capacity &&
      !confirm(`Dikkat: Aile ${family.count} kişi ancak odanın kapasitesi ${room.capacity} kişilik. Yine de yerleştirilsin mi?`)) return;
  const d = await apiCall('assign_waiting', { roomId, waitingId: waitId });
  if (d) { closeModal('roomDetailModal'); renderAll(); showToast(d.message, 'success'); }
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

/* GÜNCELLE: düzenleme modalını aç */
function openEditRoom(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;
  const apply = () => {
    document.getElementById('editRoomId').value = room.id;
    document.getElementById('editRoomNo').value = room.no;
    document.getElementById('editRoomCap').value = room.capacity;
    document.getElementById('editRoomBlock').value = room.block;
    document.getElementById('editRoomRamp').checked = !!room.hasRamp;
    document.getElementById('editRoomStaff').checked = !!room.isStaff;
    closeModal('roomDetailModal');
    openModal('editRoomModal');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
}

/* ---------- Misafir (Ad / TC / Otobüs Kodu) Düzenleme ---------- */

/* Otobüs kodu <select> seçeneklerini üretir; mevcut kod listede yoksa da eklenir */
function busCodeOptions(selected) {
  const sel = selected || '';
  let opts = '<option value="">— Otobüs seç —</option>';
  const list = BUS_CODES.slice();
  if (sel && !list.includes(sel)) list.push(sel);
  opts += list.map(c => `<option value="${escapeHtml(c)}" ${c === sel ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
  return opts;
}

/* Tek bir misafir satırı (input alanları) üretir */
function guestRowHtml(name, tc, bus) {
  return `<div class="guest-row grid grid-cols-12 gap-2 items-center">
    <input type="text" value="${escapeHtml(name || '')}" placeholder="Ad Soyad" class="guest-name col-span-5 px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
    <input type="text" value="${escapeHtml(tc || '')}" placeholder="TC Kimlik No" inputmode="numeric" maxlength="11" class="guest-tc col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-mono" />
    <select class="guest-bus col-span-3 px-2 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs">${busCodeOptions(bus)}</select>
    <button type="button" onclick="this.closest('.guest-row').remove()" class="col-span-1 text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition" title="Bu kişiyi sil"><i class="fa-solid fa-trash text-xs"></i></button>
  </div>`;
}

function addGuestRow(name = '', tc = '', bus = '') {
  const container = document.getElementById('editGuestsContainer');
  if (!container) return;
  container.insertAdjacentHTML('beforeend', guestRowHtml(name, tc, bus));
}

/* Misafir düzenleme modalını aç */
function openEditGuests(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;
  document.getElementById('editGuestsRoomId').value = room.id;
  document.getElementById('editGuestsRoomTitle').innerText = `Oda ${room.no} — ${room.guestGroup || ''}`;

  const container = document.getElementById('editGuestsContainer');
  container.innerHTML = '';
  const guests = (room.guests && room.guests.length > 0) ? room.guests : [''];
  guests.forEach(g => addGuestRow(guestName(g), guestTc(g), guestBus(g)));

  closeModal('roomDetailModal');
  openModal('editGuestsModal');
}

async function handleUpdateGuests(event) {
  event.preventDefault();
  const roomId = parseInt(document.getElementById('editGuestsRoomId').value, 10);
  const rowsEl = document.querySelectorAll('#editGuestsContainer .guest-row');
  const guests = [];
  rowsEl.forEach(row => {
    const name = row.querySelector('.guest-name').value.trim();
    const tc = row.querySelector('.guest-tc').value.trim();
    const busCode = row.querySelector('.guest-bus').value;
    if (name) guests.push({ name, tc, busCode });
  });
  if (guests.length === 0) { showToast('En az bir misafir ismi girmelisiniz.', 'error'); return; }

  const d = await apiCall('update_guests', { id: roomId, guests });
  if (d) {
    closeModal('editGuestsModal');
    renderAll();
    showToast(d.message, 'success');
  }
}

async function handleUpdateRoom(event) {
  event.preventDefault();
  const payload = {
    id: parseInt(document.getElementById('editRoomId').value, 10),
    no: parseInt(document.getElementById('editRoomNo').value, 10),
    capacity: parseInt(document.getElementById('editRoomCap').value, 10),
    block: document.getElementById('editRoomBlock').value.trim(),
    hasRamp: document.getElementById('editRoomRamp').checked,
    isStaff: document.getElementById('editRoomStaff').checked
  };
  const d = await apiCall('update_room', payload);
  if (d) {
    closeModal('editRoomModal');
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
  if (d) { closeModal('roomDetailModal'); populateBlockDropdown(); renderAll(); showToast(d.message, 'info'); }
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
