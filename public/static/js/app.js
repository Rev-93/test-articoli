const CATEGORIES = [
    'Tondo liscio',
    'Tondo lavorato',
    'Sagomato liscio',
    'Sagomato lavorato',
    'Speciale'
];

const IMAGES_FOLDER = 'images';

const GIST_CONFIG = {
    gistId: '2d76711a2262f41626cde91aec39d733',
    token: ''
};

const API_BASE = '/api';

let currentTest = {
    operatorName: '',
    images: [],
    classifications: {},
    currentIndex: 0
};

let currentView = 'start';
let detailTestId = null;

async function saveTest(testData) {
    if (GIST_CONFIG.gistId && GIST_CONFIG.token) {
        return saveToGist(testData);
    }
    const response = await fetch(`${API_BASE}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            operatorName: testData.operatorName,
            testDate: testData.testDate,
            totalPdfs: testData.totalPdfs,
            classifications: testData.classifications
        })
    });
    return response.json();
}

async function getAllTests() {
    if (GIST_CONFIG.gistId && GIST_CONFIG.token) {
        return loadFromGist();
    }
    const response = await fetch(`${API_BASE}/tests`);
    return response.json();
}

async function getTestById(id) {
    if (GIST_CONFIG.gistId && GIST_CONFIG.token) {
        const tests = await loadFromGist();
        return tests.find(t => t.id === parseInt(id));
    }
    const response = await fetch(`${API_BASE}/tests/${id}`);
    return response.json();
}

async function deleteTest(id) {
    if (GIST_CONFIG.gistId && GIST_CONFIG.token) {
        const tests = await loadFromGist();
        const filtered = tests.filter(t => t.id !== parseInt(id));
        await saveGist(filtered);
        return;
    }
    await fetch(`${API_BASE}/tests/${id}`, { method: 'DELETE' });
}

async function emptyDatabase() {
    if (GIST_CONFIG.gistId && GIST_CONFIG.token) {
        await saveGist([]);
        return;
    }
    await fetch(`${API_BASE}/tests`, { method: 'DELETE' });
}

async function loadFromGist() {
    const gistId = (GIST_CONFIG.gistId || '').trim();
    const token = (GIST_CONFIG.token || '').trim();
    
    if (!gistId || !token) {
        console.log('Gist not configured');
        return [];
    }
    
    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (response.ok) {
            const data = await response.json();
            const content = data.files['data.json'].content;
            return JSON.parse(content);
        } else {
            console.error('Gist API error:', response.status);
        }
    } catch (e) {
        console.error('Gist load error:', e);
    }
    return [];
}

async function saveGist(tests) {
    const gistId = (GIST_CONFIG.gistId || '').trim();
    const token = (GIST_CONFIG.token || '').trim();
    
    if (!gistId || !token) return;
    
    try {
        await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'data.json': {
                        content: JSON.stringify(tests)
                    }
                }
            })
        });
    } catch (e) {
        console.error('Gist save error:', e);
    }
}

async function saveToGist(testData) {
    const tests = await loadFromGist();
    const newTest = {
        id: Date.now(),
        operator_name: testData.operatorName,
        test_date: testData.testDate,
        total_pdfs: testData.totalPdfs,
        classifications: JSON.stringify(testData.classifications),
        created_at: new Date().toISOString()
    };
    tests.push(newTest);
    await saveGist(tests);
    return newTest;
}

function initDB() {
    return Promise.resolve();
}

async function loadImages() {
    if (typeof IMAGES_LIST !== 'undefined') {
        return IMAGES_LIST;
    }
    const response = await fetch(IMAGES_FOLDER + '/images.json');
    const images = await response.json();
    return images;
}

function showView(viewName) {
    document.querySelectorAll('.container, .test-container, .summary-container, .database-container').forEach(el => {
        el.classList.add('hidden');
    });
    
    currentView = viewName;
    
    switch(viewName) {
        case 'start':
            document.getElementById('startView').classList.remove('hidden');
            break;
        case 'test':
            document.getElementById('testView').classList.remove('hidden');
            break;
        case 'summary':
            document.getElementById('summaryView').classList.remove('hidden');
            break;
        case 'database':
            document.getElementById('databaseView').classList.remove('hidden');
            loadDatabase();
            break;
        case 'details':
            document.getElementById('testDetailsView').classList.remove('hidden');
            break;
    }
}

function showStartView() {
    document.getElementById('operatorSection').style.display = 'none';
    showView('start');
}

function showOperatorSection() {
    document.getElementById('startView').querySelector('.card-start').classList.add('hidden');
    document.getElementById('operatorSection').classList.remove('hidden');
}

function showStartView() {
    document.getElementById('operatorSection').classList.add('hidden');
    document.getElementById('startView').querySelector('.card-start').classList.remove('hidden');
    showView('start');
}

async function startNewTest() {
    const operatorName = document.getElementById('operatorName').value.trim();
    
    if (!operatorName) {
        document.getElementById('errorMsg').textContent = 'Inserire il nome dell\'operatore';
        return;
    }
    
    try {
        const images = await loadImages();
        
        if (images.length === 0) {
            alert('Nessuna immagine trovata nella cartella images/');
            return;
        }
        
        currentTest = {
            operatorName: operatorName,
            images: images,
            classifications: {},
            currentIndex: 0
        };
        
        showView('test');
        loadCurrentImage();
        updateProgress();
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore nel caricamento delle immagini: ' + error.message);
    }
}

function loadCurrentImage() {
    const img = currentTest.images[currentTest.currentIndex];
    const imagePath = IMAGES_FOLDER + '/' + img.filename;
    
    const viewer = document.getElementById('pdfViewer');
    viewer.innerHTML = `<img id="pdfImage" src="${imagePath}" style="max-width:100%;height:auto;cursor:grab;">`;
    
    panX = 0;
    panY = 0;
    displayScale = 1;
    
    const pdfImage = document.getElementById('pdfImage');
    pdfImage.onload = function() {
        fitImageToContainer();
    };
    
    if (pdfImage.complete) {
        fitImageToContainer();
    }
    
    const seriesCode = img.seriesCode;
    const category = currentTest.classifications[seriesCode];
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (category && btn.dataset.category === category) {
            btn.classList.add('selected');
        }
    });
}

function fitImageToContainer() {
    const viewer = document.getElementById('pdfViewer');
    const img = document.getElementById('pdfImage');
    if (!viewer || !img) return;
    
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    
    baseScale = 0.5;
    img.style.maxWidth = 'none';
    
    updateZoomLevel();
}

function updateProgress() {
    const current = currentTest.currentIndex + 1;
    const total = currentTest.images.length;
    document.getElementById('progressIndicator').textContent = `(${current}/${total})`;
    
    document.getElementById('prevBtn').disabled = currentTest.currentIndex === 0;
    document.getElementById('nextBtn').disabled = currentTest.currentIndex === total - 1;
    
    const classifiedCount = Object.keys(currentTest.classifications).length;
    const allClassified = classifiedCount === total;
    const confirmBtn = document.getElementById('confirmTestBtn');
    
    if (allClassified) {
        confirmBtn.classList.add('enabled');
    } else {
        confirmBtn.classList.remove('enabled');
    }
}

function selectCategory(category) {
    const img = currentTest.images[currentTest.currentIndex];
    currentTest.classifications[img.seriesCode] = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.category === category) {
            btn.classList.add('selected');
        }
    });
    
    updateProgress();
}

function navigate(direction) {
    if (direction === 'next' && currentTest.currentIndex < currentTest.images.length - 1) {
        currentTest.currentIndex++;
    } else if (direction === 'prev' && currentTest.currentIndex > 0) {
        currentTest.currentIndex--;
    }
    
    loadCurrentImage();
    updateProgress();
}

let displayScale = 1;
let baseScale = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

function updateZoomLevel() {
    document.getElementById('zoomLevel').textContent = Math.round(displayScale * 100) + '%';
    const img = document.getElementById('pdfImage');
    const viewer = document.getElementById('pdfViewer');
    if (img && viewer) {
        const baseWidth = img.naturalWidth * baseScale;
        const baseHeight = img.naturalHeight * baseScale;
        const scaledWidth = baseWidth * displayScale;
        const scaledHeight = baseHeight * displayScale;
        img.style.width = scaledWidth + 'px';
        img.style.height = scaledHeight + 'px';
        
        const viewerRect = viewer.getBoundingClientRect();
        const offsetX = (viewerRect.width / 2) + panX - (scaledWidth / 2);
        const offsetY = (viewerRect.height / 2) + panY - (scaledHeight / 2);
        
        img.style.position = 'absolute';
        img.style.left = offsetX + 'px';
        img.style.top = offsetY + 'px';
        img.style.transform = 'none';
    }
}

function zoomIn() {
    displayScale = Math.min(3, displayScale + 0.25);
    updateZoomLevel();
}

function zoomOut() {
    displayScale = Math.max(0.25, displayScale - 0.25);
    updateZoomLevel();
}

async function confirmTest() {
    if (Object.keys(currentTest.classifications).length !== currentTest.images.length) {
        alert('Per favore classificare tutti gli articoli prima di confermare.');
        return;
    }
    
    const testData = {
        operatorName: currentTest.operatorName,
        testDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        totalPdfs: currentTest.images.length,
        classifications: currentTest.classifications
    };
    
    await saveTest(testData);
    
    exportToPdf(testData, true);
    
    document.getElementById('summaryOperator').textContent = 'Operatore: ' + testData.operatorName;
    
    const tbody = document.getElementById('summaryTableBody');
    tbody.innerHTML = '';
    
    for (const img of currentTest.images) {
        const category = currentTest.classifications[img.seriesCode];
        const row = tbody.insertRow();
        row.insertCell(0).textContent = img.seriesCode;
        row.insertCell(1).textContent = category;
    }
    
    showView('summary');
}

function cancelTest() {
    if (confirm('Sei sicuro di voler annullare il test?')) {
        currentTest = {
            operatorName: '',
            images: [],
            classifications: {},
            currentIndex: 0
        };
        showStartView();
    }
}

async function loadDatabase() {
    const tests = await getAllTests();
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    const filteredTests = searchTerm 
        ? tests.filter(t => t.operator_name.toLowerCase().includes(searchTerm))
        : tests;
    
    const tbody = document.getElementById('databaseTableBody');
    tbody.innerHTML = '';
    
    if (filteredTests.length === 0) {
        document.getElementById('databaseTableContainer').classList.add('hidden');
        document.getElementById('emptyState').classList.remove('hidden');
    } else {
        document.getElementById('databaseTableContainer').classList.remove('hidden');
        document.getElementById('emptyState').classList.add('hidden');
        
        filteredTests.sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
        
        for (const test of filteredTests) {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = test.id;
            row.insertCell(1).textContent = test.operator_name;
            row.insertCell(2).textContent = test.test_date;
            row.insertCell(3).textContent = test.total_pdfs;
            
            const actionsCell = row.insertCell(4);
            actionsCell.innerHTML = `
                <button class="btn-view" data-id="${test.id}">Visualizza</button>
                <button class="btn-delete" data-id="${test.id}">Elimina</button>
            `;
        }
    }
}

async function viewTestDetails(id) {
    const test = await getTestById(id);
    if (!test) return;
    
    detailTestId = id;
    
    document.getElementById('detailOperator').textContent = test.operator_name;
    document.getElementById('detailDate').textContent = test.test_date;
    document.getElementById('detailTotal').textContent = test.total_pdfs;
    
    const classifications = JSON.parse(test.classifications);
    const tbody = document.getElementById('detailTableBody');
    tbody.innerHTML = '';
    
    for (const [seriesCode, category] of Object.entries(classifications)) {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = seriesCode;
        row.insertCell(1).textContent = category;
    }
    
    showView('details');
}

async function deleteTestById(id) {
    if (confirm('Sei sicuro di voler eliminare questo test?')) {
        await deleteTest(id);
        loadDatabase();
    }
}

function exportToExcel(testData) {
    let csv = 'Operatore,Numero Serie,Categoria assegnata\n';
    
    for (const [seriesCode, category] of Object.entries(testData.classifications)) {
        csv += `${testData.operatorName},${seriesCode},${category}\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `test_${testData.operatorName}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

function exportToPdf(testData, autoDownload = false) {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Test Classificazione</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background: #f5f5f7; }
        </style>
    </head>
    <body>
        <h1>Test Classificazione Articoli</h1>
        <p><strong>Operatore:</strong> ${testData.operatorName}</p>
        <p><strong>Data:</strong> ${testData.testDate}</p>
        <table>
            <tr><th>Numero Serie</th><th>Categoria</th></tr>
    `;
    
    for (const [seriesCode, category] of Object.entries(testData.classifications)) {
        html += `<tr><td>${seriesCode}</td><td>${category}</td></tr>`;
    }
    
    html += '</table></body></html>';
    
    if (autoDownload) {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `${testData.operatorName}_${testData.testDate.replace(/[: ]/g, '-')}.html`;
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    } else {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    
    document.getElementById('loadingOverlay').classList.add('hidden');
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
    }
    
    document.getElementById('themeToggle').addEventListener('click', function() {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        }
    });
    
    document.getElementById('newTestBtn').addEventListener('click', showOperatorSection);
    document.getElementById('backBtn').addEventListener('click', showStartView);
    document.getElementById('startBtn').addEventListener('click', startNewTest);
    document.getElementById('databaseBtn').addEventListener('click', () => showView('database'));
    document.getElementById('backToStartBtn').addEventListener('click', showStartView);
    document.getElementById('backToDbBtn').addEventListener('click', () => showView('database'));
    
    document.getElementById('prevBtn').addEventListener('click', () => navigate('prev'));
    document.getElementById('nextBtn').addEventListener('click', () => navigate('next'));
    
    document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
    
    const viewer = document.getElementById('pdfViewer');
    
    viewer.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        const img = document.getElementById('pdfImage');
        if (!img) return;
        
        const rect = img.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const oldScale = displayScale;
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        
        if (e.deltaY < 0) {
            displayScale = Math.min(3, displayScale * 1.1);
        } else {
            displayScale = Math.max(0.25, displayScale * 0.9);
        }
        
        const scaleChange = displayScale / oldScale;
        
        const newWidth = img.naturalWidth * baseScale * displayScale;
        const newHeight = img.naturalHeight * baseScale * displayScale;
        
        const viewerRect = viewer.getBoundingClientRect();
        
        panX = (mouseX - (rect.width / 2)) - ((mouseX - (rect.width / 2)) * scaleChange);
        panY = (mouseY - (rect.height / 2)) - ((mouseY - (rect.height / 2)) * scaleChange);
        
        updateZoomLevel();
    });
    
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragPanX = 0;
    let dragPanY = 0;
    
    viewer.addEventListener('mousedown', function(e) {
        if (e.target.id === 'pdfImage') {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragPanX = panX;
            dragPanY = panY;
            viewer.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            panX = dragPanX + dx;
            panY = dragPanY + dy;
            updateZoomLevel();
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            viewer.style.cursor = 'grab';
        }
    });
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => selectCategory(btn.dataset.category));
        
        btn.addEventListener('mouseenter', function() {
            const category = this.dataset.category;
            const categoryDesc = document.getElementById('categoryDesc');
            let desc = '';
            let title = category;
            
            if (category === 'Tondo liscio') {
                desc = this.dataset.descTondoLiscio;
            } else if (category === 'Tondo lavorato') {
                desc = this.dataset.descTondoLavorato;
            } else if (category === 'Sagomato liscio') {
                desc = this.dataset.descSagomatoLiscio;
            } else if (category === 'Sagomato lavorato') {
                desc = this.dataset.descSagomatoLavorato;
            } else if (category === 'Speciale') {
                desc = this.dataset.descSpeciale;
            }
            
            if (desc && categoryDesc) {
                categoryDesc.innerHTML = '<div class="category-desc-title">' + title + '</div><div class="category-desc-text">' + desc + '</div>';
                categoryDesc.classList.add('visible');
            }
        });
        
        btn.addEventListener('mouseleave', function() {
            const categoryDesc = document.getElementById('categoryDesc');
            if (categoryDesc) {
                categoryDesc.classList.remove('visible');
            }
        });
    });
    
    const categoryDesc = document.getElementById('categoryDesc');
    if (categoryDesc) {
        categoryDesc.addEventListener('mouseenter', function() {
            this.classList.add('visible');
        });
        categoryDesc.addEventListener('mouseleave', function() {
            this.classList.remove('visible');
        });
    }
    
    document.getElementById('cancelTestBtn').addEventListener('click', cancelTest);
    
    document.getElementById('confirmTestBtn').addEventListener('click', function() {
        if (this.classList.contains('enabled')) {
            document.getElementById('confirmModal').style.display = 'flex';
        }
    });
    
    document.getElementById('confirmCancel').addEventListener('click', () => {
        document.getElementById('confirmModal').style.display = 'none';
    });
    
    document.getElementById('confirmOk').addEventListener('click', async () => {
        document.getElementById('confirmModal').style.display = 'none';
        await confirmTest();
    });
    
    document.getElementById('helpBtn').addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'flex';
    });
    
    document.getElementById('helpModalClose').addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'none';
    });
    
    document.getElementById('exportExcelBtn').addEventListener('click', () => {
        const testData = {
            operatorName: currentTest.operatorName,
            testDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
            classifications: currentTest.classifications
        };
        exportToExcel(testData);
    });
    
    document.getElementById('exportPdfBtn').addEventListener('click', () => {
        const testData = {
            operatorName: currentTest.operatorName,
            testDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
            classifications: currentTest.classifications
        };
        exportToPdf(testData);
    });
    
    document.getElementById('restartBtn').addEventListener('click', () => {
        currentTest = {
            operatorName: '',
            images: [],
            classifications: {},
            currentIndex: 0
        };
        document.getElementById('operatorName').value = '';
        showStartView();
    });
    
    document.getElementById('searchInput').addEventListener('input', function() {
        document.getElementById('searchClear').classList.toggle('hidden', !this.value);
        loadDatabase();
    });
    
    document.getElementById('searchClear').addEventListener('click', function() {
        document.getElementById('searchInput').value = '';
        this.classList.add('hidden');
        loadDatabase();
    });
    
    document.getElementById('emptyDbBtn').addEventListener('click', () => {
        document.getElementById('emptyModal').style.display = 'flex';
    });
    
    document.getElementById('emptyCancel').addEventListener('click', () => {
        document.getElementById('emptyModal').style.display = 'none';
    });
    
    document.getElementById('emptyOk').addEventListener('click', async () => {
        document.getElementById('emptyModal').style.display = 'none';
        await emptyDatabase();
        loadDatabase();
    });
    
    document.getElementById('databaseTableBody').addEventListener('click', function(e) {
        const btn = e.target;
        if (btn.classList.contains('btn-view')) {
            viewTestDetails(btn.dataset.id);
        } else if (btn.classList.contains('btn-delete')) {
            deleteTestById(btn.dataset.id);
        }
    });
    
    document.getElementById('detailExportExcel').addEventListener('click', async () => {
        const test = await getTestById(detailTestId);
        const testData = {
            operatorName: test.operator_name,
            testDate: test.test_date,
            classifications: JSON.parse(test.classifications)
        };
        exportToExcel(testData);
    });
    
    document.getElementById('detailExportPdf').addEventListener('click', async () => {
        const test = await getTestById(detailTestId);
        const testData = {
            operatorName: test.operator_name,
            testDate: test.test_date,
            classifications: JSON.parse(test.classifications)
        };
        exportToPdf(testData);
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
});
