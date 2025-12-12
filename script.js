// --- Globális változók és adatok ---
const ALL_PAGES = ['home', 'lean', 'converter', 'invoice-calc', 'map', 'chart', 'gallery', 'checklist', 'notes'];

// Gáz konverziós faktorok (az oldalon is módosítható)
let CONV_FACTOR_KWH = 10.55; 
let CONV_FACTOR_MJ = 34.0;
const KWH_PER_MJ = 1 / 3.6; 
const MJ_TO_KWH_RATIO = 3.6;

// --- Számla Kalkulátor Tarifák ---
const TARIFFS = {
    // MVM (példa lakossági tarifára, ahol az egységár a mennyiségtől függ)
    MVM: [
        { name: "Alapdíj (Fix)", unit: "HUF/hó", price: 1000, vat: 27, editablePrice: 1000, isFixed: true },
        { name: "Szállítási díj", unit: "HUF/m³", price: 1.50, vat: 27, editablePrice: 1.50, isFixed: false, applyUnit: 'm3' },
        { name: "Energia díj (Küszöb alatt)", unit: "HUF/kWh", price: 15.00, vat: 27, editablePrice: 15.00, isFixed: false, applyUnit: 'kwh', threshold: 1729, thresholdUnit: "m3" }, // Pl. rezsicsökkentett ár
        { name: "Energia díj (Küszöb felett)", unit: "HUF/kWh", price: 75.00, vat: 27, editablePrice: 75.00, isFixed: false, applyUnit: 'kwh', threshold: 1729, thresholdUnit: "m3" } // Pl. piaci ár
    ],
    // E.ON (példa versenypiaci tarifára)
    EON: [
        { name: "Alapdíj (Fix)", unit: "HUF/hó", price: 1500, vat: 27, editablePrice: 1500, isFixed: true },
        { name: "Egységes energiadíj", unit: "HUF/kWh", price: 55.00, vat: 27, editablePrice: 55.00, isFixed: false, applyUnit: 'kwh' }
    ],
    // E2 (példa üzleti tarifára)
    E2: [
        { name: "Rögzített havi díj", unit: "HUF/hó", price: 3000, vat: 27, editablePrice: 3000, isFixed: true },
        { name: "Változó energiadíj", unit: "HUF/kWh", price: 48.00, vat: 27, editablePrice: 48.00, isFixed: false, applyUnit: 'kwh' }
    ]
};

// --- Általános Navigáció és Segédprogramok ---

function showPage(pageId) {
    ALL_PAGES.forEach(id => {
        const page = document.getElementById(id);
        if (page) {
            page.classList.add('d-none');
        }
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('d-none');
        window.scrollTo(0, 0); // Görgetés az oldal tetejére

        // Térkép inicializálása/frissítése a megjelenítéskor
        if (pageId === 'map') {
            setTimeout(initMap, 50); 
        }
    }
}

function updateLiveClock() {
    const now = new Date();
    const clockElement = document.getElementById('live-clock');
    if (clockElement) {
        clockElement.textContent = now.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}

function toggleDarkMode() {
    const body = document.body;
    const isDarkMode = document.getElementById('darkModeSwitch').checked;
    
    if (isDarkMode) {
        body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
        document.getElementById('bgColorPicker').value = '#212529'; // Sötét háttérszín a választóban
    } else {
        body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
        document.getElementById('bgColorPicker').value = '#f4f6f9'; // Világos háttérszín a választóban
    }
}

function changeBgColor(color) {
    document.body.style.backgroundColor = color;
    localStorage.setItem('backgroundColor', color);
    // Kikapcsolja a sötét módot, ha manuálisan állítunk be színt
    document.getElementById('darkModeSwitch').checked = (color === '#212529');
    if (color !== '#212529') {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'disabled');
    } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
    }
}


// --- Gáz Átváltó Logika (Converter) ---

function calcConverter(sourceUnit) {
    const m3Input = document.getElementById('inputM3');
    const kwhInput = document.getElementById('inputKwh');
    const mjInput = document.getElementById('inputMj');

    const kwhFactor = parseFloat(document.getElementById('convFactorKwh').value);
    const mjFactor = parseFloat(document.getElementById('convFactorMj').value);

    let m3 = 0, kwh = 0, mj = 0;

    if (sourceUnit === 'm3') {
        m3 = parseFloat(m3Input.value) || 0;
        kwh = m3 * kwhFactor;
        mj = m3 * mjFactor;
    } else if (sourceUnit === 'kwh') {
        kwh = parseFloat(kwhInput.value) || 0;
        m3 = kwh / kwhFactor;
        mj = kwh * MJ_TO_KWH_RATIO;
    } else if (sourceUnit === 'mj') {
        mj = parseFloat(mjInput.value) || 0;
        kwh = mj * KWH_PER_MJ;
        m3 = mj / mjFactor;
    }

    if (sourceUnit !== 'm3') m3Input.value = m3.toFixed(3);
    if (sourceUnit !== 'kwh') kwhInput.value = kwh.toFixed(3);
    if (sourceUnit !== 'mj') mjInput.value = mj.toFixed(3);

    // Globális faktorok frissítése
    CONV_FACTOR_KWH = kwhFactor;
    CONV_FACTOR_MJ = mjFactor;
}

function saveConversionFactors() {
    localStorage.setItem('convFactorKwh', document.getElementById('convFactorKwh').value);
    localStorage.setItem('convFactorMj', document.getElementById('convFactorMj').value);
    // Frissíti a konverziókat, ha a faktor változik
    calcConverter('m3'); 
}

function loadConversionFactors() {
    const savedKwh = localStorage.getItem('convFactorKwh');
    const savedMj = localStorage.getItem('convFactorMj');
    
    if (savedKwh) document.getElementById('convFactorKwh').value = savedKwh;
    if (savedMj) document.getElementById('convFactorMj').value = savedMj;

    // Globális faktorok frissítése
    CONV_FACTOR_KWH = parseFloat(document.getElementById('convFactorKwh').value);
    CONV_FACTOR_MJ = parseFloat(document.getElementById('convFactorMj').value);
}


// --- Számla Kalkulátor Logika (Invoice-Calc) ---

function loadTariffs() {
    const provider = document.getElementById('calcProvider').value;
    const tariffTableBody = document.getElementById('tariff-table-body');
    // Ha van a local storage-ban mentett tarifa, azt használja (egyelőre csak az alap TARIFFS-t használjuk)
    const selectedTariffs = TARIFFS[provider] || TARIFFS.MVM; 

    let html = '';
    selectedTariffs.forEach((tariff, index) => {
        // A küszöbérték megjelenítése
        const thresholdInfo = tariff.threshold ? ` <span class="badge bg-secondary">Küszöb: ${tariff.threshold.toLocaleString('hu-HU')} ${tariff.thresholdUnit}</span>` : '';

        // Csak az utolsó oszlop (Módosítható egységár) legyen beviteli mező
        const editableCell = `<input type="number" class="form-control form-control-sm" value="${tariff.editablePrice}" step="any" oninput="saveFactors(); calculateInvoice()" data-index="${index}" data-tariff-name="${tariff.name}" style="width: 100%;">`;

        html += `
            <tr data-tariff-index="${index}" data-provider="${provider}">
                <td>${tariff.name} ${thresholdInfo}</td>
                <td>${tariff.unit}</td>
                <td>${tariff.price.toLocaleString('hu-HU', {minimumFractionDigits: 2})}</td>
                <td>${tariff.vat}%</td>
                <td>${editableCell}</td>
            </tr>
        `;
    });
    tariffTableBody.innerHTML = html;
}

function saveFactors() {
    // Mentjük a fűtőérték tényezőt is
    const kwhFactor = parseFloat(document.getElementById('calcFactorKwh').value);
    localStorage.setItem('calcFactorKwhInvoice', kwhFactor);

    // Elmenti az input mezőkből a módosított árakat a TARIFFS objektumba
    const provider = document.getElementById('calcProvider').value;
    const rows = document.getElementById('tariff-table-body').querySelectorAll('tr');

    rows.forEach(row => {
        const index = row.dataset.tariffIndex;
        const input = row.querySelector('input[data-index]');
        if (input && TARIFFS[provider] && TARIFFS[provider][index]) {
            TARIFFS[provider][index].editablePrice = parseFloat(input.value) || 0;
        }
    });
}

function calculateInvoice() {
    saveFactors(); // Elmenti az aktuális beállításokat, ha módosultak

    const inputAmount = parseFloat(document.getElementById('calcInputAmount').value) || 0;
    const calcUnit = document.getElementById('calcUnit').value;
    const kwhFactor = parseFloat(document.getElementById('calcFactorKwh').value) || 10.55;
    const provider = document.getElementById('calcProvider').value;
    const currentTariffs = TARIFFS[provider] || TARIFFS.MVM;

    let convertedKwh = 0;
    let convertedM3 = 0;

    // 1. Átváltás kWh-ra (ez a belső elszámolási egység)
    if (calcUnit === 'm3') {
        convertedM3 = inputAmount;
        convertedKwh = inputAmount * kwhFactor;
    } else if (calcUnit === 'kwh') {
        convertedKwh = inputAmount;
        convertedM3 = inputAmount / kwhFactor;
    } else if (calcUnit === 'mj') {
        // MJ -> kWh
        convertedKwh = inputAmount * KWH_PER_MJ;
        convertedM3 = convertedKwh / kwhFactor;
    }

    let totalCost = 0;

    // 2. Díjak számítása a kiválasztott tarifacsomag alapján
    currentTariffs.forEach(tariff => {
        let tariffPrice = tariff.editablePrice;
        let vatRate = 1 + (tariff.vat / 100);
        
        if (tariff.isFixed) {
            // Fix díjak (pl. Alapdíj)
            totalCost += tariffPrice * vatRate;
        } else {
            let chargeAmount = 0; // Mennyiség, amire az adott díjat számoljuk

            if (tariff.applyUnit === 'm3') {
                chargeAmount = convertedM3;
            } else if (tariff.applyUnit === 'kwh') {
                chargeAmount = convertedKwh;
            }

            // Küszöbérték kezelése (pl. MVM tarifa esetén)
            if (tariff.threshold && tariff.thresholdUnit === 'm3') {
                const thresholdKwh = tariff.threshold * kwhFactor;
                
                if (tariff.name.includes("Küszöb alatt")) {
                    // Az energia ára a felhasznált mennyiség (kWh) vagy a küszöb (kWh-ra átszámítva) közül a kisebb.
                    chargeAmount = Math.min(convertedKwh, thresholdKwh);
                } else if (tariff.name.includes("Küszöb felett")) {
                    // A küszöb feletti rész: teljes kWh - küszöb (kWh-ra átszámítva)
                    chargeAmount = Math.max(0, convertedKwh - thresholdKwh);
                }
            }

            totalCost += chargeAmount * tariffPrice * vatRate;
        }
    });

    // 3. Eredmény megjelenítése
    const calcResultElement = document.getElementById('calcResult');
    if (calcResultElement) {
        calcResultElement.textContent = totalCost.toLocaleString('hu-HU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' Ft';
    }
}


// --- Inicializálás ---
document.addEventListener('DOMContentLoaded', function() {
    // Óra indítása
    setInterval(updateLiveClock, 1000);
    updateLiveClock();
    
    // Kezdeti oldal betöltése
    showPage('home');
    
    // Beállítások betöltése
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedBgColor = localStorage.getItem('backgroundColor');
    
    if (savedDarkMode === 'enabled') {
        document.getElementById('darkModeSwitch').checked = true;
        document.body.classList.add('dark-mode');
    }

    if (savedBgColor) {
        document.getElementById('bgColorPicker').value = savedBgColor;
        document.body.style.backgroundColor = savedBgColor;
    }

    // Kalkulátorok előzetes adatainak betöltése
    loadConversionFactors();
    loadTariffs(); // Számla kalkulátor tarifák betöltése
    
    // Billentyűkombinációk betöltése (Ha a showPage('lean') nem hívódott meg)
    // Megjegyzés: A shortcut/map/chart/checklist/gallery/notes funkciókhoz szükséges további JS logika feltételezzük, hogy a kód többi részén be van illesztve.
    
    // Példa a hiányzó függvényekre (ezekhez is kellenek adatok):
    // if (document.getElementById('shortcut-container')) renderShortcuts(); 
    // if (document.getElementById('viz-tbody')) loadChartData();
    // if (document.getElementById('map-container')) initMap();
    // if (document.getElementById('list-daily')) loadChecklist();
});

// --- PÉLDA HELYŐRZŐ FÜGGVÉNYEK A TELJESSÉG ÉRDEKÉBEN (Ezekhez is kellene a kód!) ---
function renderShortcuts() { /* hiányzó logika */ }
let map; function initMap() { /* hiányzó logika */ }
function addMapMarker(type) { /* hiányzó logika */ }
function exportMapPDF() { /* hiányzó logika */ }
function addNewDataRow() { /* hiányzó logika */ }
function updateChart() { /* hiányzó logika */ }
function saveNote() { /* hiányzó logika */ }
function exportChecklistPDF() { /* hiányzó logika */ }
function loadChecklist() { /* hiányzó logika */ }