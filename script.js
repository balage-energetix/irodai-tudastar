document.addEventListener('DOMContentLoaded', initApp);

let myMap;
let markers = [];
let myChart;

// --- DÍJSZABÁS ADATOK (Számla kalkulátorhoz) ---
const TARIFFS = [
    { name: "Alapdíj (Lakossági)", unit: "Ft/hó", vat: 27, base: 1000, key: 'base' },
    { name: "Ár (Kedvezményes)", unit: "Ft/kWh", vat: 5, base: 13.5, limit: 10000, key: 'rateLow' },
    { name: "Ár (Piaci)", unit: "Ft/kWh", vat: 5, base: 18.2, key: 'rateHigh' }
];

// --- BILLENTYŰKOMBÓ ADATOK ---
const shortcutsData = [
    { keys: "Ctrl + C", desc: "Másolás (Copy)" },
    { keys: "Ctrl + V", desc: "Beillesztés (Paste)" },
    { keys: "Ctrl + X", desc: "Kivágás (Cut)" },
    { keys: "Ctrl + Z", desc: "Visszavonás (Undo)" },
    { keys: "Ctrl + Y", desc: "Újra (Redo)" },
    { keys: "Ctrl + S", desc: "Mentés (Save)" },
    { keys: "Ctrl + A", desc: "Összes kijelölése" },
    { keys: "Ctrl + P", desc: "Nyomtatás" },
    { keys: "Alt + Tab", desc: "Programok közti váltás" },
    { keys: "Win + D", desc: "Asztal megjelenítése/elrejtése" },
    { keys: "F5", desc: "Oldal frissítése" },
    { keys: "F2", desc: "Átnevezés (fájl, mappa)" },
    { keys: "Ctrl + Shift + Esc", desc: "Feladatkezelő (Task Manager)" },
    { keys: "Win + E", desc: "Fájlkezelő megnyitása" },
    { keys: "Ctrl + F", desc: "Keresés a dokumentumban/oldalon" },
    { keys: "Ctrl + Alt + Delete", desc: "Biztonsági beállítások" },
    { keys: "Print Screen", desc: "Képernyőkép a vágólapra" },
    { keys: "Alt + F4", desc: "Aktív ablak bezárása/Program leállítása" },
    { keys: "Win + L", desc: "Gép zárolása" },
    { keys: "Win + . (pont)", desc: "Emoji billentyűzet" }
];

// --- FŐ INITIALIZÁLÓ FÜGGVÉNY ---
function initApp() {
    // 1. Óra indítása
    updateClock();
    setInterval(updateClock, 1000);

    // 2. Számla kalkulátor és Átváltó inicializálása
    loadFactors(); // Betölti a mentett fűtőértéket
    loadTariffs(); // Betölti a díjtáblát
    calculateInvoice(); // Kiszámolja a kezdeti számlát

    // 3. Billentyűparancsok betöltése
    loadShortcuts();

    // 4. Dark Mode inicializálása
    loadDarkMode();

    // 5. Adat vizualizáló inicializálása
    initializeChart();
    loadVizData();

    // 6. Lista inicializálása
    loadChecklist();

    // 7. Kezdőoldal megjelenítése
    showPage('home');
    
    // 8. Térkép inicializálása, de csak ha látható
    // Késleltetett init, hogy a DOM és a stílusok biztosan beálljanak
    document.getElementById('map-container').addEventListener('DOMNodeInserted', function(e) {
        if (e.target.id === 'map-container' && e.target.offsetParent !== null) {
             initializeMap();
        }
    }, { once: true });
}

// --- CLOCK ---
function updateClock() {
    const now = new Date();
    const clockDiv = document.getElementById('live-clock');
    if (clockDiv) {
        clockDiv.textContent = now.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}

// --- PAGE NAVIGATION ---
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.add('d-none');
    });
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.remove('d-none');
        
        // Különleges inicializálás a térképhez, ha megjelenik
        if (pageId === 'map' && !myMap) {
            // A térkép inicializálása
            initializeMap();
        } else if (pageId === 'map' && myMap) {
             // Ha a térkép már inicializálva van, csak frissíteni kell a méretet
             setTimeout(() => { myMap.invalidateSize(); }, 50);
        }
        
        // Feljegyzés dátum beállítása
        if (pageId === 'notes') {
             document.getElementById('note-date').textContent = new Date().toLocaleDateString('hu-HU');
        }
    }
}

// --- CONVERTER LOGIC (ÁTVÁLTÓ) ---
function getConversionFactors() {
    const kwhFactor = parseFloat(document.getElementById('convFactorKwh').value) || 10.55;
    const mjFactor = parseFloat(document.getElementById('convFactorMj').value) || 34.0;
    return { kwhFactor, mjFactor };
}

function saveConversionFactors() {
    const { kwhFactor, mjFactor } = getConversionFactors();
    localStorage.setItem('convFactorKwh', kwhFactor);
    localStorage.setItem('convFactorMj', mjFactor,);
    // Utána újra futtatjuk a számítást, ha a felhasználó megváltoztatja a faktort
    calcConverter(document.activeElement.id === 'inputM3' ? 'm3' : (document.activeElement.id === 'inputKwh' ? 'kwh' : 'mj'));
}

function loadConversionFactors() {
    document.getElementById('convFactorKwh').value = localStorage.getItem('convFactorKwh') || '10.55';
    document.getElementById('convFactorMj').value = localStorage.getItem('convFactorMj') || '34.0';
}

function calcConverter(sourceUnit) {
    const inputM3 = document.getElementById('inputM3');
    const inputKwh = document.getElementById('inputKwh');
    const inputMj = document.getElementById('inputMj');

    const { kwhFactor, mjFactor } = getConversionFactors();

    let value = parseFloat(document.getElementById(`input${sourceUnit.toUpperCase()}`).value) || 0;
    
    if (isNaN(value) || value < 0) {
        value = 0;
    }
    
    let m3 = 0, kwh = 0, mj = 0;

    // Fő átváltási logika
    switch (sourceUnit) {
        case 'm3':
            m3 = value;
            kwh = m3 * kwhFactor;
            mj = m3 * mjFactor;
            break;
        case 'kwh':
            kwh = value;
            m3 = kwh / kwhFactor;
            mj = m3 * mjFactor;
            break;
        case 'mj':
            mj = value;
            m3 = mj / mjFactor;
            kwh = m3 * kwhFactor;
            break;
    }

    // Eredmények kiírása 3 tizedesjegy pontossággal
    if (sourceUnit !== 'm3') inputM3.value = m3.toFixed(3);
    if (sourceUnit !== 'kwh') inputKwh.value = kwh.toFixed(3);
    if (sourceUnit !== 'mj') inputMj.value = mj.toFixed(3);
}

// --- INVOICE CALCULATOR LOGIC (SZÁMLA KALKULÁTOR) ---
function loadTariffs() {
    const tbody = document.getElementById('tariff-table-body');
    if (!tbody) return;
    tbody.innerHTML = ''; 

    TARIFFS.forEach(tariff => {
        let savedPrice = localStorage.getItem(`tariffPrice_${tariff.key}`);
        let price = savedPrice !== null ? parseFloat(savedPrice) : tariff.base;
        
        // Hozzuk létre a sort
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${tariff.name} ${tariff.limit ? `(< ${tariff.limit} kWh)` : ''}</td>
            <td>${tariff.unit.replace('Ft/', '')}</td>
            <td>${tariff.base.toFixed(2)}</td>
            <td>${tariff.vat}</td>
            <td>
                <div class="input-group input-group-sm">
                    <input type="number" class="form-control tariff-input" data-key="${tariff.key}" value="${price.toFixed(2)}" step="0.01" oninput="saveTariffs(); calculateInvoice()">
                    <span class="input-group-text">${tariff.unit.replace(price > 50 ? 'Ft/hó' : 'Ft/kWh', '')}</span>
                </div>
            </td>
        `;
    });
}

function saveTariffs() {
    document.querySelectorAll('.tariff-input').forEach(input => {
        localStorage.setItem(`tariffPrice_${input.dataset.key}`, input.value);
    });
}

function getTariffPrice(key) {
    const savedPrice = localStorage.getItem(`tariffPrice_${key}`);
    if (savedPrice !== null) {
        return parseFloat(savedPrice);
    }
    return TARIFFS.find(t => t.key === key).base;
}

function loadFactors() {
    document.getElementById('calcFactorKwh').value = localStorage.getItem('calcFactorKwh') || '10.55';
}

function saveFactors() {
    localStorage.setItem('calcFactorKwh', document.getElementById('calcFactorKwh').value);
}

function calculateInvoice() {
    const inputAmount = parseFloat(document.getElementById('calcInputAmount').value) || 0;
    const unit = document.getElementById('calcUnit').value;
    const kwhFactor = parseFloat(document.getElementById('calcFactorKwh').value) || 10.55;
    
    if (isNaN(inputAmount) || inputAmount <= 0) {
        document.getElementById('calcResult').textContent = '0 Ft';
        return;
    }

    let totalKwh = 0;
    
    // Átváltás kWh-ra (ez a számlázási egység)
    switch (unit) {
        case 'm3':
            totalKwh = inputAmount * kwhFactor;
            break;
        case 'mj':
            totalKwh = inputAmount * 0.277778; // 1 MJ = 0.277778 kWh
            break;
        case 'kwh':
        default:
            totalKwh = inputAmount;
            break;
    }
    
    // Díjszabások lekérése (módosítható egységárakkal)
    const basePrice = getTariffPrice('base');
    const rateLow = getTariffPrice('rateLow');
    const rateHigh = getTariffPrice('rateHigh');
    
    const limit = 10000; // Átlagos kedvezményes határ (kWh/év)
    let totalCost = 0;
    
    // 1. Alapdíj (Ft/hó, ÁFA 27%)
    // Bár ez Ft/hó, az egyszerűség kedvéért hozzáadjuk a teljes költséghez
    totalCost += basePrice * (1 + 0.27); 
    
    // 2. Mennyiségi díjak (ÁFA 5%)
    let lowConsumption = Math.min(totalKwh, limit);
    let highConsumption = totalKwh > limit ? totalKwh - limit : 0;
    
    // Kedvezményes ár
    totalCost += (lowConsumption * rateLow) * (1 + 0.05);
    
    // Piaci ár
    totalCost += (highConsumption * rateHigh) * (1 + 0.05);

    document.getElementById('calcResult').textContent = `${Math.round(totalCost).toLocaleString('hu-HU')} Ft`;
}

// --- SHORTCUTS LOGIC (BILLENTYŰPARANCSOK) ---
function loadShortcuts() {
    const container = document.getElementById('shortcut-container');
    if (!container) return;

    shortcutsData.forEach(item => {
        const keysHtml = item.keys.split(' + ').map(key => `<span class="shortcut-key">${key}</span>`).join(' + ');

        const cardHtml = `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="p-3 shortcut-card h-100">
                    <h6 class="text-primary">${item.desc}</h6>
                    <p class="mb-0">${keysHtml}</p>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}

// --- MAP LOGIC (TÉRKÉP) ---
function initializeMap() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer || myMap) return;

    // Központi koordináta: Nagyatád (példa)
    const defaultCoords = [46.223, 17.361];
    const defaultZoom = 13;
    
    myMap = L.map('map-container').setView(defaultCoords, defaultZoom);

    // Alap réteg hozzáadása (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(myMap);

    // Kereső vezérlő hozzáadása
    L.Control.geocoder().addTo(myMap);

    // Kontextus menü (jobb egérgomb)
    myMap.on('contextmenu', function (e) {
        document.getElementById('map-context-menu').style.left = e.containerPoint.x + 'px';
        document.getElementById('map-context-menu').style.top = e.containerPoint.y + 'px';
        document.getElementById('map-context-menu').style.display = 'block';
        document.getElementById('map-context-menu').dataset.lat = e.latlng.lat;
        document.getElementById('map-context-menu').dataset.lng = e.latlng.lng;
    });

    // Kontextus menü elrejtése kattintásra
    myMap.on('click', function () {
        document.getElementById('map-context-menu').style.display = 'none';
    });
    
    // Kezdő marker
    addMapMarker('roadwork', defaultCoords, 'Irodai pont (Kezdőpont)');
    
    // A térkép méretének érvényesítése
    setTimeout(() => { myMap.invalidateSize(); }, 200);
}

function addMapMarker(type, coords = null, popupText = null) {
    const lat = coords ? coords[0] : document.getElementById('map-context-menu').dataset.lat;
    const lng = coords ? coords[1] : document.getElementById('map-context-menu').dataset.lng;

    if (!myMap || !lat || !lng) return;

    let icon, color;
    switch (type) {
        case 'light':
            icon = 'fa-lightbulb';
            color = 'orange';
            popupText = popupText || 'Közvilágítási hiba bejelentése';
            break;
        case 'roadwork':
            icon = 'fa-digging';
            color = 'blue';
            popupText = popupText || 'Közterület felbontás';
            break;
        case 'pothole':
            icon = 'fa-exclamation-triangle';
            color = 'red';
            popupText = popupText || 'Útburkolati hiba';
            break;
        default:
            icon = 'fa-map-marker-alt';
            color = 'gray';
            popupText = popupText || 'Új pont';
    }

    const customIcon = L.divIcon({
        html: `<i class="fas ${icon}" style="font-size: 24px; color: ${color};"></i>`,
        className: 'custom-map-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -20]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(myMap)
        .bindPopup(popupText)
        .on('contextmenu', function (e) {
            e.originalEvent.preventDefault(); // Megakadályozza az alapértelmezett böngésző menüt
            removeMapMarker(marker);
        });

    markers.push(marker);
    document.getElementById('map-context-menu').style.display = 'none';
}

function removeMapMarker(marker) {
    if (confirm("Biztosan törlöd ezt a markert?")) {
        myMap.removeLayer(marker);
        markers = markers.filter(m => m !== marker);
    }
}

// Térkép mentése PDF-be (html2pdf)
function exportMapPDF() {
    const element = document.getElementById('map-capture-area');
    html2pdf(element, {
        margin: 10,
        filename: 'Terkep_export_' + new Date().toLocaleDateString('hu-HU') + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    });
}

// --- CHECKLIST LOGIC (CHECK-LISTA) ---
const checklistData = {
    daily: ['Posta kezelése', 'E-mailek áttekintése', 'Raktár ellenőrzés'],
    weekly: ['Heti riportok lefuttatása', 'Jelenléti ívek ellenőrzése', 'Beszerzési igények leadása'],
    monthly: ['Számlák könyvelése', 'Adatszolgáltatások beküldése'],
    yearly: ['Készletleltár', 'Archiválás']
};

function saveChecklist() {
    const state = {};
    document.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(checkbox => {
        state[checkbox.id] = checkbox.checked;
    });
    localStorage.setItem('checklistState', JSON.stringify(state));
}

function loadChecklist() {
    const savedState = JSON.parse(localStorage.getItem('checklistState')) || {};

    Object.keys(checklistData).forEach(key => {
        const listEl = document.getElementById(`list-${key}`);
        if (!listEl) return;
        listEl.innerHTML = ''; // Kiürítés

        checklistData[key].forEach((task, index) => {
            const taskId = `${key}-${index}`;
            const isChecked = savedState[taskId] || false;
            
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex align-items-center checklist-item';
            li.innerHTML = `
                <input class="form-check-input me-2" type="checkbox" id="${taskId}" ${isChecked ? 'checked' : ''} onchange="saveChecklist()">
                <label class="form-check-label text-wrap" for="${taskId}">${task}</label>
            `;
            listEl.appendChild(li);
        });
    });
}

function exportChecklistPDF() {
    const now = new Date().toLocaleDateString('hu-HU');
    document.querySelector('.export-date-header').textContent = `Exportálva: ${now}`;
    
    const element = document.getElementById('checklist-content');
    html2pdf(element, {
        margin: 10,
        filename: 'Checklist_' + now + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    });
    
    // Export után visszatesszük az eredeti dátumot
    setTimeout(() => { document.querySelector('.export-date-header').textContent = ''; }, 100);
}

// --- NOTES LOGIC (FELJEGYZÉS) ---
function saveNote() {
    const category = document.getElementById('noteCategory').value;
    const content = document.getElementById('noteContent').value;
    const date = new Date().toLocaleDateString('hu-HU');
    const time = new Date().toLocaleTimeString('hu-HU');

    if (!content.trim()) {
        alert("Kérlek, írj be egy leírást a feljegyzésbe!");
        return;
    }

    const filename = `Feljegyzés_${category.replace(/\s/g, '_')}_${date.replace(/\./g, '').replace(/\s/g, '-')}.txt`;
    const noteText = `
--- Irodai Feljegyzés ---
Dátum: ${date} ${time}
Ügykör: ${category}
---------------------------

${content}

---------------------------
`;

    // Fájl mentése (local file download)
    const blob = new Blob([noteText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    alert(`Sikeresen mentve: ${filename}`);
    document.getElementById('noteContent').value = ''; // Tartalom törlése mentés után
}

// --- CHART LOGIC (VIZUALIZÁLÓ) ---
function initializeChart() {
    const ctx = document.getElementById('myChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Havi Adatok Összehasonlítása' }
            }
        }
    });
}

function getVizData() {
    try {
        return JSON.parse(localStorage.getItem('vizData')) || [
            { name: 'Adatsor 1', data: [100, 120, 150, 130, 160, 180, 200, 210, 190, 170, 140, 110] }
        ];
    } catch (e) {
        return [];
    }
}

function saveVizData(data) {
    localStorage.setItem('vizData', JSON.stringify(data));
}

function loadVizData() {
    const data = getVizData();
    const tbody = document.getElementById('viz-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    data.forEach((row, rowIndex) => {
        const tr = tbody.insertRow();
        tr.id = `viz-row-${rowIndex}`;
        
        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm viz-name-input" value="${row.name}" oninput="updateVizData()"></td>
            ${row.data.map((val, colIndex) => 
                `<td><input type="number" class="form-control form-control-sm viz-data-input" data-row="${rowIndex}" data-col="${colIndex}" value="${val}" oninput="updateVizData()"></td>`
            ).join('')}
            <td><button class="btn btn-danger btn-sm" onclick="removeDataRow(${rowIndex})"><i class="fas fa-trash"></i></button></td>
        `;
    });
    updateChart();
}

function addNewDataRow() {
    const data = getVizData();
    data.push({ name: `Új Adatsor ${data.length + 1}`, data: new Array(12).fill(0) });
    saveVizData(data);
    loadVizData();
}

function removeDataRow(index) {
    let data = getVizData();
    data.splice(index, 1);
    saveVizData(data);
    loadVizData();
}

function updateVizData() {
    const data = getVizData();
    
    // Név frissítése
    document.querySelectorAll('.viz-name-input').forEach((input, rowIndex) => {
        if (data[rowIndex]) {
            data[rowIndex].name = input.value;
        }
    });

    // Értékek frissítése
    document.querySelectorAll('.viz-data-input').forEach(input => {
        const rowIndex = parseInt(input.dataset.row);
        const colIndex = parseInt(input.dataset.col);
        const value = parseInt(input.value) || 0;
        
        if (data[rowIndex] && data[rowIndex].data[colIndex] !== undefined) {
            data[rowIndex].data[colIndex] = value;
        }
    });
    
    saveVizData(data);
    updateChart();
}

function updateChart() {
    const vizData = getVizData();
    const newDatasets = vizData.map(row => ({
        label: row.name,
        data: row.data,
        backgroundColor: getRandomColor(row.name), // Szín a névből generálva
        borderColor: getRandomColor(row.name, 0.8),
        borderWidth: 1
    }));

    myChart.data.datasets = newDatasets;
    myChart.update();
}

function getRandomColor(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

// --- DARK MODE LOGIC (SÖTÉT MÓD) ---
function toggleDarkMode() {
    const isDarkMode = document.getElementById('darkModeSwitch').checked;
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    }
}

function loadDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        document.getElementById('darkModeSwitch').checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('darkModeSwitch').checked = false;
    }
    
    const savedColor = localStorage.getItem('bgColor');
    if (savedColor) {
        document.body.style.backgroundColor = savedColor;
        document.getElementById('bgColorPicker').value = savedColor;
    }
}

function changeBgColor(color) {
    document.body.style.backgroundColor = color;
    localStorage.setItem('bgColor', color);
}

// --- GALÉRIA LOGIC (képek olvasása) ---
document.getElementById('folderInput').addEventListener('change', handleFolderSelect);

function handleFolderSelect(event) {
    const files = event.target.files;
    const galleryViewer = document.getElementById('gallery-viewer');
    const carouselItems = document.getElementById('carousel-items');
    const thumbnailsDiv = document.getElementById('thumbnails');
    const loadingMessage = document.getElementById('loading-message');
    
    carouselItems.innerHTML = '';
    thumbnailsDiv.innerHTML = '';
    galleryViewer.style.display = 'none';
    
    if (files.length === 0) return;

    loadingMessage.classList.remove('d-none');

    // Csak a képeket szűrjük
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
        loadingMessage.classList.add('d-none');
        alert("A kiválasztott mappában nem találhatók képek.");
        return;
    }

    let loadedCount = 0;
    imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imageUrl = e.target.result;

            // Carousel elem létrehozása
            const carouselItem = document.createElement('div');
            carouselItem.className = 'carousel-item' + (index === 0 ? ' active' : '');
            carouselItem.innerHTML = `<img src="${imageUrl}" class="d-block w-100" alt="${file.name}">`;
            carouselItems.appendChild(carouselItem);

            // Thumbnail létrehozása
            const thumbnailCol = document.createElement('div');
            thumbnailCol.className = 'col-3 col-md-2 col-lg-1';
            thumbnailCol.innerHTML = `
                <img src="${imageUrl}" class="thumbnail-img" alt="${file.name}" onclick="goToSlide(${index})">
            `;
            thumbnailsDiv.appendChild(thumbnailCol);

            loadedCount++;
            if (loadedCount === imageFiles.length) {
                loadingMessage.classList.add('d-none');
                galleryViewer.style.display = 'block';
                // Bootstrap carousel újra inicializálása
                new bootstrap.Carousel(galleryViewer, { interval: false });
            }
        };
        
        reader.readAsDataURL(file);
    });
}

function goToSlide(index) {
    const galleryViewer = document.getElementById('gallery-viewer');
    const carousel = bootstrap.Carousel.getInstance(galleryViewer);
    if (carousel) {
        carousel.to(index);
    }
}