// Charger les catégories
async function loadCategories() {
    const response = await fetch('/api/categories');
    const categories = await response.json();
    
    // Remplir le filtre
    const filterSelect = document.getElementById('categoryFilter');
    filterSelect.innerHTML = '<option value="">Toutes les catégories</option>';
    
    // Remplir le select du formulaire
    const formSelect = document.getElementById('siteCategory');
    formSelect.innerHTML = '<option value="">Sélectionner une catégorie</option>';
    
    categories.forEach(cat => {
        filterSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        formSelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

// Charger les sites
async function loadSites(categoryId = null) {
    let url = '/api/sites';
    if (categoryId) {
        url += `?category_id=${categoryId}`;
    }
    
    const response = await fetch(url);
    const sites = await response.json();
    
    const tbody = document.getElementById('sitesTableBody');
    tbody.innerHTML = '';
    
    if (sites.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Aucun site enregistré</td></tr>';
        return;
    }
    
    sites.forEach(site => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${site.name}</td>
            <td><a href="${site.url}" target="_blank">${site.url}</a></td>
            <td>
                ${site.category_name ? 
                    `<span class="badge" style="background: ${site.category_color}">${site.category_name}</span>` : 
                    '<span class="badge">Sans catégorie</span>'}
            </td>
            <td>
                <button class="btn-icon" onclick="scrapeSite(${site.id}, '${site.url}')" title="Scrapper">
                    🔍
                </button>
                <button class="btn-icon" onclick="editSite(${site.id})" title="Modifier">
                    ✏️
                </button>
                <button class="btn-icon" onclick="deleteSite(${site.id})" title="Supprimer">
                    🗑️
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Ouvrir modal ajout
function openAddSiteModal() {
    document.getElementById('modalTitle').textContent = 'Ajouter un site';
    document.getElementById('siteForm').reset();
    document.getElementById('siteId').value = '';
    document.getElementById('siteModal').style.display = 'block';
}

// Éditer un site
async function editSite(siteId) {
    const response = await fetch('/api/sites');
    const sites = await response.json();
    const site = sites.find(s => s.id === siteId);
    
    if (!site) return;
    
    document.getElementById('modalTitle').textContent = 'Modifier le site';
    document.getElementById('siteId').value = site.id;
    document.getElementById('siteName').value = site.name;
    document.getElementById('siteUrl').value = site.url;
    document.getElementById('siteCategory').value = site.category_id || '';
    document.getElementById('siteDescription').value = site.description || '';
    document.getElementById('siteModal').style.display = 'block';
}

// Fermer modal
function closeModal() {
    document.getElementById('siteModal').style.display = 'none';
}

// Soumettre formulaire
document.getElementById('siteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const siteId = document.getElementById('siteId').value;
    const data = {
        name: document.getElementById('siteName').value,
        url: document.getElementById('siteUrl').value,
        category_id: document.getElementById('siteCategory').value || null,
        description: document.getElementById('siteDescription').value
    };
    
    const method = siteId ? 'PUT' : 'POST';
    const url = siteId ? `/api/sites/${siteId}` : '/api/sites';
    
    const response = await fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    if (response.ok) {
        closeModal();
        loadSites();
    } else {
        alert('Erreur lors de l\'enregistrement');
    }
});

// Supprimer un site
async function deleteSite(siteId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce site ?')) return;
    
    const response = await fetch(`/api/sites/${siteId}`, {
        method: 'DELETE'
    });
    
    if (response.ok) {
        loadSites();
    }
}

// Scrapper un site
async function scrapeSite(siteId, url) {
    const button = event.target;
    button.disabled = true;
    button.textContent = '⏳';
    
    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url, site_id: siteId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Scraping réussi!\nTitre: ${result.title}\nNombre de titres: ${result.headings.length}\nNombre de liens: ${result.links.length}`);
            loadSites();
        } else {
            alert('Erreur lors du scraping');
        }
    } catch (error) {
        alert('Erreur: ' + error.message);
    } finally {
        button.disabled = false;
        button.textContent = '🔍';
    }
}

// Filtre par catégorie
document.getElementById('categoryFilter').addEventListener('change', (e) => {
    const categoryId = e.target.value;
    loadSites(categoryId || null);
});

// Fermer modal en cliquant en dehors
window.onclick = function(event) {
    const modal = document.getElementById('siteModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Import Excel
function openImportModal() {
    document.getElementById('importModal').style.display = 'block';
    document.getElementById('importForm').reset();
    document.getElementById('importResult').style.display = 'none';
}

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
}

document.getElementById('importForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Veuillez sélectionner un fichier');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Import en cours...';
    
    try {
        const response = await fetch('/api/import-excel', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        const resultDiv = document.getElementById('importResult');
        resultDiv.style.display = 'block';
        
        if (result.success) {
            let html = `<div style="color: green;">
                ✅ <strong>Import réussi !</strong><br>
                ${result.imported} site(s) importé(s) sur ${result.total_rows} ligne(s)
            </div>`;
            
            if (result.errors.length > 0) {
                html += `<div style="color: orange; margin-top: 10px;">
                    <strong>⚠️ Avertissements :</strong><br>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        ${result.errors.map(err => `<li>${err}</li>`).join('')}
                    </ul>
                </div>`;
            }
            
            resultDiv.innerHTML = html;
            loadSites();
            
            setTimeout(() => {
                closeImportModal();
            }, 3000);
        } else {
            resultDiv.innerHTML = `<div style="color: red;">❌ Erreur : ${result.error}</div>`;
        }
    } catch (error) {
        document.getElementById('importResult').innerHTML = 
            `<div style="color: red;">❌ Erreur : ${error.message}</div>`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Importer';
    }
});

// Initialisation
loadCategories();
loadSites();
