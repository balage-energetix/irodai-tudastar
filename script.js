// Navigáció kezelése
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('d-none'));
    document.getElementById(pageId).classList.remove('d-none');
    
    // Térkép újraméretezése, ha azt nyitjuk meg (Leaflet bugfix)
    if(pageId === 'map' && map) {
        setTimeout(() => { map.invalidateSize(); }, 200);
    }
}

// 1. LEAN TRÜKKÖK GENERÁLÁSA
const shortcuts = [
    { keys: "Ctrl + P", desc: "Nyomtatás" },
    { keys: "Ctrl + C", desc: "Másolás" },
    { keys: "Ctrl + V", desc: "Beillesztés" },
    { keys: "Ctrl + Z", desc: "Visszavonás" },
    { keys: "Win + L", desc: "Képernyő zárolása" },
    { keys: "Alt + Tab", desc: "Ablakváltás" },
    { keys: "Ctrl + F", desc: "Keresés" },
    { keys: "Win + D", desc: "Asztal mutatása" },
    { keys: "Ctrl + S", desc: "Mentés" },
    { keys: "F2", desc: "Átnevezés" },
    { keys: "Ctrl + A", desc: "Összes kijelölése" },
    { keys: "Win + Shift + S", desc: "Képernyőmetszet" },
    { keys: "Ctrl + N", desc: "Új ablak" },
    { keys: "Ctrl + W", desc: "Ablak bezárása" },
    { keys: "Alt + F4", desc: "Program bezárása" },
    { keys: "Ctrl + Esc", desc: "Start menü" },
    { keys: "Win + E", desc: "Fájlkezelő" },
    { keys: "Ctrl + Shift + Esc", desc: "Feladatkezelő" },
    { keys: "Ctrl + Egér görgő", desc: "Nagyítás/Kicsinyítés" },
    { keys: "Win + Nyíl", desc: "Ablak igazítása" }
];

const shContainer = document.getElementById('shortcut-container');
shortcuts.forEach(sh => {
    let keyHtml = sh.keys.split(' + ').map(k => `<span class="key-cap">${k}</span>`).join(' + ');
    shContainer.innerHTML += `
        <div class="col-md-6 col-lg-4">
            <div class="key-box">
                <div>${keyHtml}</div>
                <div class="ms-auto text-muted">${sh.desc}</div>
            </div>
        </div>`;
});

// 2. GÁZ ÁTVÁLTÓ
function convertGas() {
    const m3 = parseFloat(document.getElementById('gasInput').value) || 0;
    // Hozzávetőleges fűtőérték: 1 m3 ~ 10.55 kWh ~ 34 MJ (szolgáltatófüggő lehet)
    document.getElementById('kwhOutput').innerText = (m3 * 10.55).toFixed(2);
    document.getElementById('mjOutput').innerText = (m3 * 34).toFixed(2);
}

// 3. TÉRKÉP (Leaflet)
let map = L.map('map-container').setView([46.229, 17.365], 14); // Nagyatád koordinátái
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

map.on('contextmenu', function(e) {
    L.circleMarker(e.latlng, {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 8
    }).addTo(map);
});

// 4. VIZUALIZÁLÓ (Chart.js)
let chartInstance = null;
const months = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'];
let datasetsData = []; // Tárolja az adatsorokat

function addNewDataRow() {
    const div = document.createElement('div');
    div.className = "input-group mb-2 data-row";
    div.innerHTML = `
        <input type="text" class="form-control" placeholder="Adatsor neve (pl. 2024)">
        ${months.map(m => `<input type="number" class="form-control month-val" placeholder="${m}">`).join('')}
    `;
    document.getElementById('data-inputs').appendChild(div);
}
// Első sor hozzáadása induláskor
addNewDataRow();

function updateChart() {
    const rows = document.querySelectorAll('.data-row');
    const datasets = [];
    
    rows.forEach((row, index) => {
        const label = row.querySelector('input[type="text"]').value || `Adatsor ${index+1}`;
        const inputs = row.querySelectorAll('.month-val');
        const data = Array.from(inputs).map(i => parseFloat(i.value) || 0);
        
        // Szín generálás
        const color = index === 0 ? 'rgba(54, 162, 235, 0.6)' : 
                      index === 1 ? 'rgba(255, 99, 132, 0.6)' : 'rgba(75, 192, 192, 0.6)';

        datasets.push({
            label: label,
            data: data,
            backgroundColor: color,
            borderColor: color.replace('0.6', '1'),
            borderWidth: 1
        });
    });

    // Ha van előző adat, címkékre %-os eltérés (ez bonyolult ChartJS-ben, itt most tooltipben jelenik meg)
    const ctx = document.getElementById('myChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: months, datasets: datasets },
        options: {
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            if(context[0].datasetIndex > 0) {
                                let current = context[0].raw;
                                let prev = context[0].chart.data.datasets[context[0].datasetIndex-1].data[context[0].dataIndex];
                                if(prev > 0) {
                                    let diff = ((current - prev) / prev) * 100;
                                    return `Vált. előzőhöz: ${diff.toFixed(1)}%`;
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

// 5. KÉPNÉZEGETŐ
document.getElementById('folderInput').addEventListener('change', function(event) {
    const files = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));
    const carouselInner = document.getElementById('carousel-items');
    const thumbsContainer = document.getElementById('thumbnails');
    
    carouselInner.innerHTML = '';
    thumbsContainer.innerHTML = '';
    
    if(files.length > 0) {
        document.getElementById('gallery-viewer').style.display = 'block';
        
        files.forEach((file, index) => {
            const url = URL.createObjectURL(file);
            
            // Nagy kép
            const item = document.createElement('div');
            item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            item.innerHTML = `<img src="${url}" class="d-block w-100" alt="...">`;
            carouselInner.appendChild(item);
            
            // Kicsi
            const col = document.createElement('div');
            col.className = 'col-2 mb-2';
            col.innerHTML = `<img src="${url}" class="img-fluid thumb-img rounded" onclick="goToSlide(${index})">`;
            thumbsContainer.appendChild(col);
        });
    }
});
function goToSlide(index) {
    const carousel = new bootstrap.Carousel(document.getElementById('gallery-viewer'));
    carousel.to(index);
}

// 6. CHECK-LISTA & PDF
const todos = {
    daily: ["Fűtésellenőrzés", "Közvil. hibák jelentése", "Közútkezelői hozzáj."],
    weekly: ["Fűtési beállítások ellenőrzése"],
    monthly: ["Bérlői elszámolások", "2 ülés közti", "Kazán karbantartás"],
    yearly: ["Tűzoltókészülékek", "Távhőleolvasás", "Fűtésindítás", "Leállítás"]
};

function renderTodos() {
    ['daily', 'weekly', 'monthly', 'yearly'].forEach(type => {
        const ul = document.getElementById(`list-${type}`);
        ul.innerHTML = todos[type].map(task => `
            <li class="list-group-item">
                <input class="form-check-input me-1" type="checkbox"> ${task}
            </li>`).join('');
        // Hozzáadás gomb
        ul.innerHTML += `<li class="list-group-item"><button class="btn btn-sm btn-outline-secondary" onclick="addTodo('${type}')">+ Új</button></li>`;
    });
}
function addTodo(type) {
    const newTask = prompt("Új feladat:");
    if(newTask) {
        todos[type].push(newTask);
        renderTodos();
    }
}
renderTodos();

function exportChecklistPDF() {
    const element = document.getElementById('checklist-content');
    const opt = {
        margin: 10,
        filename: 'Tudastar_Checklist_' + new Date().toISOString().slice(0,10) + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
    alert("A PDF letöltése elindult a Letöltések mappába.");
}

// 7. FELJEGYZÉS MENTÉSE
function saveNote() {
    const category = document.getElementById('noteCategory').value;
    const content = document.getElementById('noteContent').value;
    const date = new Date().toLocaleString();
    
    const textData = `Dátum: ${date}\nÜgykör: ${category}\n\n${content}`;
    
    const blob = new Blob([textData], { type: "text/plain" });
    const anchor = document.createElement("a");
    anchor.download = `Feljegyzes_${category.replace(/\s/g, '_')}_${Date.now()}.txt`;
    anchor.href = window.URL.createObjectURL(blob);
    anchor.target = "_blank";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    
    alert("A feljegyzés letöltve .txt formátumban.");
}