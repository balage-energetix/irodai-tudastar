// --- Óra és Dátum Kezelés ---
function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('hu-HU');
    const dateStr = now.toLocaleDateString('hu-HU');
    
    // Bal alsó fix óra
    const liveClockEl = document.getElementById('live-clock');
    if (liveClockEl) liveClockEl.innerText = `${dateStr} ${timeStr}`;
    
    // Feljegyzés dátum
    const noteDateEl = document.getElementById('note-date');
    if(noteDateEl) noteDateEl.innerText = `${dateStr} ${timeStr}`;
    
    // Checklist fejléc (csak exportnál látszik majd igazán)
    const exportHeaderEl = document.querySelector('.export-date-header');
    if (exportHeaderEl) exportHeaderEl.innerText = `Készült: ${dateStr} ${timeStr}`;
}
setInterval(updateClock, 1000);
updateClock();

// --- Oldal Váltás ---
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('d-none'));
    const currentPage = document.getElementById(pageId);
    if(currentPage) currentPage.classList.remove('d-none');
    
    if(pageId === 'map' && map) {
        // Frissíti a Leaflet térkép méretét, ha megjelenik
        setTimeout(() => { map.invalidateSize(); }, 200);
    }
    // Számla kalkulátor frissítése, ha megnyitjuk
    if(pageId === 'invoice-calc') {
        calculateInvoice();
    }
}

// --- Globális Beállítások ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}
function changeBgColor(color) {
    document.documentElement.style.setProperty('--bg-color', color);
    localStorage.setItem('bgColor', color); // Mentés
}

function saveConversionFactors() {
    const kwhFactor = document.getElementById('convFactorKwh').value;
    const mjFactor = document.getElementById('convFactorMj').value;
    localStorage.setItem('convFactorKwh', kwhFactor);
    localStorage.setItem('convFactorMj', mjFactor);
    
    // Számla kalkulátor faktorának frissítése
    const calcFactorEl = document.getElementById('calcFactorKwh');
    if (calcFactorEl) {
        calcFactorEl.value = kwhFactor;
    }
    // Az Átváltót nem frissítjük automatikusan, a felhasználónak kell interakcióba lépnie vele.
    calculateInvoice(); // A számlakalkulátor azonnali frissítése
}


// --- 1. LEAN TRÜKKÖK (40 db) ---
const shortcuts = [
    { k: "Win + Nyilak", d: "Ablak igazítása / dokkolása" },
    { k: "Ctrl + Z", d: "Visszavonás (Undo)" },
    { k: "Ctrl + Shift + T", d: "Legutóbb bezárt lap megnyitása" },
    { k: "Ctrl + C", d: "Másolás vágólapra" },
    { k: "Ctrl + V", d: "Beillesztés vágólapról" },
    { k: "Ctrl + X", d: "Kivágás" },
    { k: "Ctrl + A", d: "Teljes tartalom kijelölése" },
    { k: "Ctrl + P", d: "Nyomtatás" },
    { k: "Ctrl + S", d: "Mentés" },
    { k: "Win + D", d: "Asztal megjelenítése/rejtése" },
    { k: "Win + E", d: "Fájlkezelő megnyitása" },
    { k: "Win + L", d: "Számítógép zárolása" },
    { k: "Alt + Tab", d: "Váltás a futó programok közt" },
    { k: "Ctrl + F", d: "Keresés az oldalon/dokumentumban" },
    { k: "Win + Shift + S", d: "Képernyőmetszet készítése" },
    { k: "F2", d: "Fájl/Mappa átnevezése" },
    { k: "F5", d: "Oldal frissítése" },
    { k: "Alt + F4", d: "Aktív ablak bezárása" },
    { k: "Ctrl + W", d: "Aktuális böngészőfül bezárása" },
    { k: "Ctrl + T", d: "Új böngészőfül nyitása" },
    { k: "Ctrl + Tab", d: "Következő fülre ugrás" },
    { k: "Ctrl + Shift + Tab", d: "Előző fülre ugrás" },
    { k: "Ctrl + Esc", d: "Start menü megnyitása" },
    { k: "Ctrl + Shift + Esc", d: "Feladatkezelő azonnal" },
    { k: "Win + .", d: "Emoji billentyűzet" },
    { k: "Win + V", d: "Vágólap előzmények" },
    { k: "Ctrl + görgő", d: "Nagyítás / Kicsinyítés" },
    { k: "Win + Tab", d: "Feladatnézet (Idővonal)" },
    { k: "Win + I", d: "Gépház megnyitása" },
    { k: "Win + R", d: "Futtatás ablak" },
    { k: "F11", d: "Teljes képernyős mód" },
    { k: "Home", d: "Ugrás a sor/oldal elejére" },
    { k: "End", d: "Ugrás a sor/oldal végére" },
    { k: "Shift + Delete", d: "Végleges törlés (Lomtár nélkül)" },
    { k: "Ctrl + H", d: "Előzmények megnyitása" },
    { k: "Ctrl + J", d: "Letöltések megnyitása" },
    { k: "Ctrl + N", d: "Új ablak nyitása" },
    { k: "Alt + Bal nyíl", d: "Vissza az előző oldalra" },
    { k: "Alt + Jobb nyíl", d: "Előre a következő oldalra" },
    { k: "Win + X", d: "Gyors elérési menü (Start)" }
];

function createKeyHtml(keyString) {
    // A kulcskombinációkat szétvágjuk a ' + ' jel mentén
    const parts = keyString.split(' + ').map(part => {
        return `<span class="key-icon">${part}</span>`;
    });
    return parts.join('');
}

const shContainer = document.getElementById('shortcut-container');
if(shContainer) {
    shortcuts.forEach(sh => {
        shContainer.innerHTML += `
            <div class="col-md-6">
                <div class="shortcut-row">
                    <div class="shortcut-keys">${createKeyHtml(sh.k)}</div> 
                    <i class="fas fa-arrow-right arrow-icon"></i>
                    <span class="shortcut-desc">${sh.d}</span>
                </div>
            </div>`;
    });
}

// --- 2. ÁTVÁLTÓ (Oda-vissza) ---
function calcConverter(source) {
    let m3Input = document.getElementById('inputM3');
    let kwhInput = document.getElementById('inputKwh');
    let mjInput = document.getElementById('inputMj');

    // Dinamikusan olvassuk ki a faktorokat
    const factorKwh = parseFloat(document.getElementById('convFactorKwh').value) || 10.55;
    const factorMj = parseFloat(document.getElementById('convFactorMj').value) || 34.0;

    let m3 = 0;

    if (source === 'm3') {
        m3 = parseFloat(m3Input.value) || 0;
        kwhInput.value = (m3 * factorKwh).toFixed(2);
        mjInput.value = (m3 * factorMj).toFixed(2);
    } else if (source === 'kwh') {
        let kwh = parseFloat(kwhInput.value) || 0;
        m3 = kwh / factorKwh;
        m3Input.value = m3.toFixed(2);
        mjInput.value = (m3 * factorMj).toFixed(2);
    } else if (source === 'mj') {
        let mj = parseFloat(mjInput.value) || 0;
        m3 = mj / factorMj;
        m3Input.value = m3.toFixed(2);
        kwhInput.value = (m3 * factorKwh).toFixed(2);
    }
}


// --- 3. TÉRKÉP & PDF ---
let map = L.map('map-container').setView([46.229, 17.365], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenStreetMap',
    crossOrigin: true // Fontos a PDF exporthoz!
}).addTo(map);

// Context Menu Logic
const contextMenu = document.getElementById('map-context-menu');
let lastLatlng = null;

map.on('contextmenu', (e) => {
    e.originalEvent.preventDefault();
    lastLatlng = e.latlng;
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.originalEvent.pageX + 'px';
    contextMenu.style.top = e.originalEvent.pageY + 'px';
});

map.on('click', () => { contextMenu.style.display = 'none'; });

function addMapMarker(type) {
    contextMenu.style.display = 'none';
    let iconClass = '';
    let color = '';
    
    if(type === 'light') { iconClass = 'fa-lightbulb'; color = 'orange'; }
    if(type === 'roadwork') { iconClass = 'fa-digging'; color = 'blue'; }
    if(type === 'pothole') { iconClass = 'fa-exclamation-triangle'; color = 'red'; }

    const customIcon = L.divIcon({
        html: `<i class="fas ${iconClass}" style="color:${color}; font-size:24px; text-shadow: 2px 2px 2px white;"></i>`,
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 24]
    });

    L.marker(lastLatlng, {icon: customIcon}).addTo(map);
}

function exportMapPDF() {
    const element = document.getElementById('map-capture-area');
    const opt = {
        margin: 5,
        filename: '[Tudastar]_Terkep_Export.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
}

// --- 4. VIZUALIZÁLÓ (Táblázatos) ---
const months = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'];
let chartInstance = null;

function addNewDataRow() {
    const tbody = document.getElementById('viz-tbody');
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    
    let tds = `<td><input type="text" class="form-control form-control-sm" placeholder="Adatsor név"></td>`;
    months.forEach(m => {
        tds += `<td><input type="number" class="form-control form-control-sm viz-input" value="0"></td>`;
    });
    tds += `<td><button class="btn btn-outline-danger btn-sm" onclick="this.closest('tr').remove(); updateChart();"><i class="fas fa-trash"></i></button></td>`;
    
    tr.innerHTML = tds;
    tbody.appendChild(tr);
}
// Init 1 sor (csak a táblázat megjelenítéséhez)
addNewDataRow();

function updateChart() {
    const rows = document.querySelectorAll('.data-row');
    const datasets = [];
    
    rows.forEach((row, index) => {
        const name = row.querySelector('input[type="text"]').value || `Adatsor ${index+1}`;
        const inputs = row.querySelectorAll('.viz-input');
        const data = Array.from(inputs).map(i => parseFloat(i.value) || 0);
        
        // Színgenerálás
        const hue = (index * 137) % 360;
        const color = `hsla(${hue}, 70%, 50%, 0.6)`;
        const border = `hsla(${hue}, 70%, 50%, 1)`;

        datasets.push({
            label: name,
            data: data,
            backgroundColor: color,
            borderColor: border,
            borderWidth: 1
        });
    });

    const ctx = document.getElementById('myChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: months, datasets: datasets },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const currentIdx = context[0].datasetIndex;
                            if(currentIdx > 0) {
                                const currentVal = context[0].raw;
                                const prevVal = context[0].chart.data.datasets[currentIdx-1].data[context[0].dataIndex];
                                if(prevVal !== 0) {
                                    const diff = ((currentVal - prevVal) / prevVal) * 100;
                                    return `Eltérés az előző sorthoz: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
                                }
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
}

// --- 5. KÉPNÉZEGETŐ ---
document.getElementById('folderInput').addEventListener('change', function(event) {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) loadingMessage.classList.remove('d-none'); // Mutatjuk a spinnert

    const files = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));
    const carouselInner = document.getElementById('carousel-items');
    const thumbsContainer = document.getElementById('thumbnails');
    
    carouselInner.innerHTML = '';
    thumbsContainer.innerHTML = '';

    // Aszinkron betöltés kis késleltetéssel, hogy a spinner látható legyen
    setTimeout(() => {
        if(files.length > 0) {
            document.getElementById('gallery-viewer').style.display = 'block';
            
            files.forEach((file, index) => {
                const url = URL.createObjectURL(file);
                
                // Nagy kép
                const item = document.createElement('div');
                item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
                item.innerHTML = `<img src="${url}" class="d-block w-100" alt="${file.name}">`;
                carouselInner.appendChild(item);
                
                // Thumbnail
                const col = document.createElement('div');
                col.className = 'col-2 col-md-1';
                col.innerHTML = `<img src="${url}" class="thumb-img ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index}, this)">`;
                thumbsContainer.appendChild(col);
            });
        } else {
             document.getElementById('gallery-viewer').style.display = 'none';
        }
        if (loadingMessage) loadingMessage.classList.add('d-none'); // Rejtjük a spinnert
    }, 50);
});

function goToSlide(index, element) {
    const carouselEl = document.getElementById('gallery-viewer');
    if (!carouselEl) return;
    
    const carousel = new bootstrap.Carousel(carouselEl);
    carousel.to(index);
    document.querySelectorAll('.thumb-img').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
}

// --- 6. CHECK-LISTA ---
const todos = {
    daily: ["Fűtésellenőrzés", "Közvil. hibák jelentése", "Közútkezelői hozzájárulások"],
    weekly: ["Fűtési beállítások ellenőrzése"],
    monthly: ["Bérlői elszámolások", "2 ülés közti", "Kazán karbantartás"],
    yearly: ["Tűzoltókészülékek", "Távhőleolvasás", "Fűtésindítás", "Leállítás"]
};

function renderTodos() {
    ['daily', 'weekly', 'monthly', 'yearly'].forEach(type => {
        const ul = document.getElementById(`list-${type}`);
        // Csak akkor rendereljük újra, ha üres (hogy a pipák megmaradjanak)
        if(ul && ul.children.length === 0) {
            ul.innerHTML = todos[type].map(task => `
                <li class="list-group-item d-flex align-items-center">
                    <input class="form-check-input me-2" type="checkbox">
                    <span>${task}</span>
                </li>`).join('');
            ul.innerHTML += `<li class="list-group-item"><button class="btn btn-sm btn-outline-secondary w-100" onclick="addTodo('${type}')">+ Új feladat</button></li>`;
        }
    });
}
function addTodo(type) {
    const newTask = prompt("Új feladat neve:");
    if(newTask) {
        const ul = document.getElementById(`list-${type}`);
        if(!ul) return;
        
        // Beszúrás a gomb elé
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex align-items-center';
        li.innerHTML = `<input class="form-check-input me-2" type="checkbox"><span>${newTask}</span>`;
        ul.insertBefore(li, ul.lastElementChild);
    }
}
renderTodos(); // Első renderelés

function exportChecklistPDF() {
    const element = document.getElementById('checklist-content');
    const nowStr = new Date().toISOString().slice(0,10);
    const opt = {
        margin: 10,
        filename: `[Tudastar]_Checklist_${nowStr}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
}

// --- 7. FELJEGYZÉS ---
function saveNote() {
    const category = document.getElementById('noteCategory').value;
    const content = document.getElementById('noteContent').value;
    const date = new Date().toLocaleString('hu-HU');
    
    if(!content) { alert("A tartalom üres!"); return; }

    const textData = 
`=========================================
IRODAI TUDÁSTÁR - FELJEGYZÉS
=========================================
Dátum: ${date}
Ügykör: ${category}
-----------------------------------------
${content}
=========================================`;
    
    const blob = new Blob([textData], { type: "text/plain" });
    const anchor = document.createElement("a");
    // Fájlnév formátum a könnyebb rendezéshez
    anchor.download = `[Tudastar_TXT]_${category.replace(/\s/g, '_')}_${Date.now()}.txt`;
    anchor.href = window.URL.createObjectURL(blob);
    anchor.click();
}

// --- 8. SZÁMLA KALKULÁTOR ---
const gasTariffs = [
    // Kb. 2024-es MVM/Eon tarifák (kWh egységben)
    { name: "Alap (rezsicsökkentett)", unit: "kWh", vat: 27, base: 10.20, editablePrice: 10.20, limit: 6013 },
    { name: "Lakossági piaci (limit felett)", unit: "kWh", vat: 27, base: 70.10, editablePrice: 70.10, limit: null },
];
let currentTariffs = [];

function renderTariffTable() {
    const savedTariffs = JSON.parse(localStorage.getItem('gasTariffs'));
    currentTariffs = savedTariffs || gasTariffs;

    const tbody = document.getElementById('tariff-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    currentTariffs.forEach((t, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.name} ${t.limit ? `(limit: ${t.limit.toLocaleString('hu-HU')} ${t.unit}/év)` : ''}</td>
            <td>${t.unit}</td>
            <td>${t.base.toFixed(2).replace('.', ',')} Ft</td>
            <td>${t.vat}%</td>
            <td>
                <input type="number" id="tariff-${index}" class="form-control form-control-sm tariff-input" 
                       value="${t.editablePrice.toFixed(2)}" step="0.01" min="0" 
                       oninput="saveTariffs(); calculateInvoice();">
            </td>`;
        tbody.appendChild(tr);
    });
}

function saveTariffs() {
    currentTariffs.forEach((t, index) => {
        const input = document.getElementById(`tariff-${index}`);
        if (input) {
            // Frissítsük a currentTariffs tömböt az aktuális értékekkel
            t.editablePrice = parseFloat(input.value) || t.base;
        }
    });
    localStorage.setItem('gasTariffs', JSON.stringify(currentTariffs));
}

function calculateInvoice() {
    const inputAmountEl = document.getElementById('calcInputAmount');
    const inputUnitEl = document.getElementById('calcUnit');
    const factorKwhEl = document.getElementById('calcFactorKwh');
    const resultEl = document.getElementById('calcResult');
    
    if (!inputAmountEl || !inputUnitEl || !factorKwhEl || !resultEl) return;
    
    const inputAmount = parseFloat(inputAmountEl.value) || 0;
    const inputUnit = inputUnitEl.value;
    const factorKwh = parseFloat(factorKwhEl.value) || 10.55;
    const factorMj = parseFloat(localStorage.getItem('convFactorMj')) || 34.0;
    
    let amountInKwh = 0;

    // 1. Átváltás kWh-ra
    if (inputUnit === 'm3') {
        amountInKwh = inputAmount * factorKwh;
    } else if (inputUnit === 'mj') {
        // MJ -> m³ -> kWh konverzió
        amountInKwh = (inputAmount / factorMj) * factorKwh;
    } else { // kWh
        amountInKwh = inputAmount;
    }
    
    // 2. Számítás
    let totalCost = 0;
    const limitKwh = currentTariffs[0] ? currentTariffs[0].limit : 6013;
    const priceStandard = currentTariffs[0] ? currentTariffs[0].editablePrice : 10.20;
    const priceMarket = currentTariffs[1] ? currentTariffs[1].editablePrice : 70.10;
    const vatFactor = 1.27; // 27% ÁFA

    if (amountInKwh <= limitKwh) {
        // Teljesen limiten belül
        totalCost = amountInKwh * priceStandard * vatFactor;
    } else {
        // Limit feletti fogyasztás
        const standardConsumption = limitKwh;
        const marketConsumption = amountInKwh - limitKwh;
        
        // Limit alatti rész (ÁFÁ-val)
        totalCost += standardConsumption * priceStandard * vatFactor;
        
        // Limit feletti rész (ÁFÁ-val)
        totalCost += marketConsumption * priceMarket * vatFactor;
    }
    
    // 3. Eredmény megjelenítése
    resultEl.innerText = `${Math.round(totalCost).toLocaleString('hu-HU')} Ft`;
}


// --- 9. ALKALMAZÁS INDÍTÁSA (INIT) ---
function initApp() {
    // 1. Sötét mód betöltése (Alapértelmezett: Dark Mode)
    // Ha még nincs tárolt érték, vagy 'true', akkor bekapcsoljuk a dark mode-ot
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || localStorage.getItem('darkMode') === null; 
    const darkModeSwitch = document.getElementById('darkModeSwitch');
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        if (darkModeSwitch) darkModeSwitch.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        if (darkModeSwitch) darkModeSwitch.checked = false;
    }
    
    // 2. Háttérszín betöltése
    const savedColor = localStorage.getItem('bgColor');
    const bgColorPicker = document.getElementById('bgColorPicker');

    if (savedColor) {
        changeBgColor(savedColor); // Ez a függvény menti is
        if (bgColorPicker) bgColorPicker.value = savedColor;
    }
    
    // 3. Konverziós faktorok betöltése
    const convFactorKwhInput = document.getElementById('convFactorKwh');
    const convFactorMjInput = document.getElementById('convFactorMj');
    const calcFactorKwhInput = document.getElementById('calcFactorKwh');
    
    const savedKwhFactor = localStorage.getItem('convFactorKwh') || '10.55';
    const savedMjFactor = localStorage.getItem('convFactorMj') || '34.0';

    if (convFactorKwhInput) convFactorKwhInput.value = savedKwhFactor;
    if (convFactorMjInput) convFactorMjInput.value = savedMjFactor;
    if (calcFactorKwhInput) calcFactorKwhInput.value = savedKwhFactor;
    
    // 4. Számla kalkulátor tarifák betöltése és első kalkuláció
    renderTariffTable();
    
    // 5. Vizualizáló chart frissítése (hogy az 1. sor megjelenjen a táblázat alatt)
    updateChart();

    // 6. Oldal megjelenítése (Kezdőoldal)
    showPage('home');
}

// Alkalmazás indítása
document.addEventListener('DOMContentLoaded', initApp);