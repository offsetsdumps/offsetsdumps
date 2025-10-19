const GITHUB_API = 'https://api.github.com/repos/offsetsdumps/offsetsdumps/contents/games';
const GITHUB_RAW = 'https://raw.githubusercontent.com/offsetsdumps/offsetsdumps/main/games';

let currentGame = null;
let currentGameData = null;
let currentCategory = 'classes';
let searchFilters = {
    names: true,
    properties: false,
    offsets: false,
    types: false
};
let searchTimeout = null;
let allItems = [];

// Initialize app
async function init() {
    createStars();
    await loadGames();
}

// Create animated stars background
function createStars() {
    const starsContainer = document.getElementById('stars');
    for (let i = 0; i < 120; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        starsContainer.appendChild(star);
    }
}

// Load games from GitHub
async function loadGames() {
    try {
        const response = await fetch(GITHUB_API, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch games');
        
        const data = await response.json();
        const games = data.filter(item => item.type === 'dir');
        
        document.getElementById('totalGames').textContent = games.length;
        displayGames(games);
    } catch (error) {
        console.error('Error loading games:', error);
        showNotification('❌ Failed to load games from GitHub');
        document.getElementById('gamesGrid').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>Failed to load games</h3>
                <p style="color: #666; margin-top: 8px;">Check console for details</p>
            </div>
        `;
    }
}

// Display games grid
function displayGames(games) {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = '';
    
    if (games.length === 0) {
        gamesGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <h3>No games found</h3>
            </div>
        `;
        return;
    }
    
    games.forEach(game => {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        
        const gameName = decodeURIComponent(game.name);
        const icon = getGameIcon(gameName);
        
        gameCard.innerHTML = `
            <div class="game-thumbnail">${icon}</div>
            <div class="game-info">
                <div class="game-title">${gameName}</div>
                <div class="game-badge">GitHub Source</div>
            </div>
        `;
        
        gameCard.onclick = () => openGame(game);
        gamesGrid.appendChild(gameCard);
    });
}

// Get game icon based on name
function getGameIcon(gameName) {
    const name = gameName.toLowerCase();
    if (name.includes('fps') || name.includes('shooter')) return '🔫';
    if (name.includes('fortnite')) return '🎮';
    if (name.includes('valorant')) return '🎯';
    if (name.includes('apex')) return '🏆';
    if (name.includes('cod') || name.includes('warzone')) return '💣';
    if (name.includes('test') || name.includes('dev')) return '🧪';
    return '🎮';
}

// Search games
document.getElementById('gameSearch').addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    document.querySelectorAll('.game-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? 'block' : 'none';
    });
});

// Open game viewer
async function openGame(game) {
    try {
        showNotification('⏳ Loading game data...');
        
        const gameName = game.name;
        const filesUrl = `${GITHUB_API}/${gameName}`;
        
        const filesResponse = await fetch(filesUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!filesResponse.ok) throw new Error('Failed to fetch game files');
        
        const files = await filesResponse.json();
        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        
        document.getElementById('totalFiles').textContent = jsonFiles.length;
        
        const gameData = { name: decodeURIComponent(gameName), files: {} };
        
        for (const file of jsonFiles) {
            try {
                const fileResponse = await fetch(file.download_url);
                if (fileResponse.ok) {
                    const data = await fileResponse.json();
                    gameData.files[file.name] = data;
                }
            } catch (err) {
                console.error(`Failed to load ${file.name}:`, err);
            }
        }
        
        currentGame = game;
        currentGameData = gameData;
        
        const displayName = decodeURIComponent(game.name);
        document.getElementById('currentGameTitle').textContent = getGameIcon(displayName) + ' ' + displayName;
        
        document.getElementById('homePage').classList.remove('active');
        document.getElementById('viewerPage').classList.add('active');
        document.getElementById('viewerPage').style.display = 'block';
        
        switchCategory('classes');
        showNotification('✅ Game loaded successfully!');
    } catch (error) {
        console.error('Error loading game:', error);
        showNotification('❌ Failed to load game data');
    }
}

// Go back to home
function goHome() {
    document.getElementById('viewerPage').style.display = 'none';
    document.getElementById('homePage').classList.add('active');
    currentGame = null;
    currentGameData = null;
    document.getElementById('searchFilters').classList.remove('active');
    document.getElementById('itemSearch').value = '';
    allItems = [];
}

// Switch category
function switchCategory(category) {
    currentCategory = category;
    
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${category}"]`).classList.add('active');
    
    document.getElementById('itemSearch').value = '';
    document.getElementById('searchFilters').classList.remove('active');
    document.getElementById('searchResultsInfo').textContent = '';
    
    loadItems(category);
}

// Load items for category
function loadItems(category) {
    const itemsList = document.getElementById('itemsList');
    itemsList.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading...</p></div>';
    
    if (!currentGameData) return;
    
    requestAnimationFrame(() => {
        const categoryMap = {
            'classes': 'ClassesInfo.json',
            'structs': 'StructsInfo.json',
            'enums': 'EnumsInfo.json',
            'functions': 'FunctionsInfo.json',
            'offsets': 'OffsetsInfo.json'
        };
        
        const fileName = categoryMap[category];
        const fileData = currentGameData.files[fileName];
        
        if (!fileData || !fileData.data) {
            itemsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <p>No ${category} data available</p>
                </div>
            `;
            return;
        }
        
        allItems = [];
        itemsList.innerHTML = '';
        
        const fragment = document.createDocumentFragment();
        
        if (category === 'offsets') {
            fileData.data.forEach((item, index) => {
                const itemEntry = document.createElement('div');
                itemEntry.className = 'item-entry';
                
                const name = item[0];
                const value = item[1];
                const hexValue = typeof value === 'number' ? '0x' + value.toString(16).toUpperCase() : String(value);
                
                itemEntry.innerHTML = `
                    <div class="item-name">${name}</div>
                    <div class="item-type">${hexValue}</div>
                `;
                
                const itemData = { name, value, hexValue };
                itemEntry.onclick = () => showDetails(itemData, category, itemEntry);
                
                fragment.appendChild(itemEntry);
                allItems.push({ element: itemEntry, name, value, hexValue, rawData: item });
            });
        } else {
            fileData.data.forEach((item, index) => {
                const itemEntry = document.createElement('div');
                itemEntry.className = 'item-entry';
                
                const name = Object.keys(item)[0];
                const data = item[name];
                
                itemEntry.innerHTML = `
                    <div class="item-name">${name}</div>
                    <div class="item-type">${category}</div>
                `;
                
                const itemData = { name, data };
                itemEntry.onclick = () => showDetails(itemData, category, itemEntry);
                
                fragment.appendChild(itemEntry);
                allItems.push({ element: itemEntry, name, data, rawData: item });
            });
        }
        
        itemsList.appendChild(fragment);
        
        if (allItems.length > 0) {
            setTimeout(() => allItems[0].element.click(), 50);
        }
    });
}

// Toggle advanced search
function toggleAdvancedSearch() {
    const filters = document.getElementById('searchFilters');
    filters.classList.toggle('active');
}

// Update search filters
function updateSearchFilters() {
    const checkboxes = document.querySelectorAll('[data-filter]');
    checkboxes.forEach(checkbox => {
        const filter = checkbox.dataset.filter;
        searchFilters[filter] = checkbox.checked;
        const label = checkbox.parentElement;
        if (checkbox.checked) {
            label.classList.add('checked');
        } else {
            label.classList.remove('checked');
        }
    });
    
    const searchInput = document.getElementById('itemSearch');
    if (searchInput.value.trim()) {
        performSearch(searchInput.value.trim());
    }
}

// Search items
document.getElementById('itemSearch').addEventListener('input', (e) => {
    const search = e.target.value.trim().toLowerCase();
    
    clearTimeout(searchTimeout);
    
    if (search === '') {
        allItems.forEach(item => {
            item.element.style.display = 'block';
            item.element.classList.remove('search-highlight');
            const matchInfo = item.element.querySelector('.item-match-info');
            if (matchInfo) matchInfo.remove();
        });
        document.getElementById('searchResultsInfo').textContent = '';
        return;
    }
    
    searchTimeout = setTimeout(() => {
        performSearch(search);
    }, 300);
});

// Perform search
function performSearch(searchTerm) {
    if (!currentGameData || !searchTerm || searchTerm.length < 2) return;
    
    let matchCount = 0;
    let totalMatches = 0;
    
    allItems.forEach((item, itemIndex) => {
        const existingMatchInfo = item.element.querySelector('.item-match-info');
        if (existingMatchInfo) existingMatchInfo.remove();
        item.element.classList.remove('search-highlight');
        
        const matches = [];
        
        if (searchFilters.names && item.name.toLowerCase().includes(searchTerm)) {
            matches.push('name');
        }
        
        if (currentCategory === 'offsets') {
            if (searchFilters.offsets && item.hexValue && item.hexValue.toLowerCase().includes(searchTerm)) {
                matches.push('offset value');
            }
        } else if (item.data && Array.isArray(item.data) && (searchFilters.properties || searchFilters.offsets || searchFilters.types)) {
            const propertyMatches = searchInItemData(item.data, searchTerm);
            matches.push(...propertyMatches);
        }
        
        if (matches.length > 0) {
            item.element.style.display = 'block';
            item.element.classList.add('search-highlight');
            matchCount++;
            totalMatches += matches.length;
            
            const uniqueMatches = [...new Set(matches)];
            const matchInfo = document.createElement('div');
            matchInfo.className = 'item-match-info';
            matchInfo.textContent = `✓ ${uniqueMatches.slice(0, 2).join(', ')}${uniqueMatches.length > 2 ? '...' : ''}`;
            item.element.appendChild(matchInfo);
        } else {
            item.element.style.display = 'none';
        }
    });
    
    const resultsInfo = document.getElementById('searchResultsInfo');
    resultsInfo.textContent = matchCount > 0 
        ? `Found ${matchCount} items (${totalMatches} matches)` 
        : 'No matches found';
}

// Search in item data
function searchInItemData(itemData, searchTerm) {
    const matches = [];
    
    itemData.forEach(prop => {
        if (prop.__InheritInfo || prop.__MDKClassSize !== undefined) return;
        
        const propName = Object.keys(prop)[0];
        const propDetails = prop[propName];
        
        if (searchFilters.properties && propName.toLowerCase().includes(searchTerm)) {
            matches.push(`property: ${propName.substring(0, 20)}`);
        }
        
        if (Array.isArray(propDetails)) {
            if (searchFilters.types && propDetails[0] && propDetails[0][0]) {
                const type = propDetails[0][0].toLowerCase();
                if (type.includes(searchTerm)) {
                    matches.push(`type in ${propName.substring(0, 15)}`);
                }
            }
            
            if (searchFilters.offsets && propDetails[1] !== undefined) {
                const offset = '0x' + propDetails[1].toString(16).toLowerCase();
                if (offset.includes(searchTerm)) {
                    matches.push(`offset in ${propName.substring(0, 15)}`);
                }
            }
        }
    });
    
    return matches;
}

// Show item details
function showDetails(item, category, element) {
    document.querySelectorAll('.item-entry').forEach(e => e.classList.remove('active'));
    if (element) element.classList.add('active');
    
    const detailsPanel = document.getElementById('detailsPanel');
    
    if (category === 'offsets') {
        detailsPanel.innerHTML = `
            <div class="details-header">
                <h2>${item.name}</h2>
                <div class="details-meta">
                    <div class="meta-badge">Offset</div>
                    <div class="copy-value" onclick="copyToClipboard('${item.hexValue}')">${item.hexValue}</div>
                </div>
            </div>
        `;
    } else if (category === 'classes' || category === 'structs') {
        renderClassOrStruct(item, category, detailsPanel);
    } else if (category === 'enums') {
        renderEnum(item, detailsPanel);
    } else if (category === 'functions') {
        renderFunctions(item, detailsPanel);
    }
}

// Render class or struct
function renderClassOrStruct(item, category, panel) {
    let inheritInfo = [];
    let classSize = 0;
    let properties = [];
    
    if (Array.isArray(item.data)) {
        item.data.forEach(prop => {
            if (prop.__InheritInfo) {
                inheritInfo = prop.__InheritInfo;
            } else if (prop.__MDKClassSize !== undefined) {
                classSize = prop.__MDKClassSize;
            } else {
                const propName = Object.keys(prop)[0];
                properties.push({
                    name: propName,
                    details: prop[propName]
                });
            }
        });
    }
    
    let html = `
        <div class="details-header">
            <h2>${item.name}</h2>
            <div class="details-meta">
                <div class="meta-badge">${category}</div>
                <div class="meta-badge">Size: ${classSize} bytes</div>
                <div class="meta-badge">${properties.length} properties</div>
            </div>
        </div>
    `;
    
    if (inheritInfo.length > 0) {
        html += `
            <div class="details-section">
                <div class="section-title">🔗 Inheritance Chain</div>
                <div class="inherit-chain">
                    ${inheritInfo.map(parent => `
                        <div class="inherit-item">${parent}</div>
                    `).join('<span class="arrow">→</span>')}
                </div>
            </div>
        `;
    }
    
    if (properties.length > 0) {
        html += `
            <div class="details-section">
                <div class="section-title">📋 Properties (${properties.length})</div>
        `;
        
        properties.forEach(prop => {
            const details = prop.details;
            const type = Array.isArray(details) && details[0] ? details[0][0] : 'Unknown';
            const offset = Array.isArray(details) && details[1] !== undefined ? details[1] : '';
            const size = Array.isArray(details) && details[2] !== undefined ? details[2] : '';
            
            html += `
                <div class="property-item">
                    <div class="property-header">
                        <span class="property-name">${prop.name}</span>
                        <span class="property-type">${type}</span>
                    </div>
                    ${offset !== '' ? `<div class="property-details">Offset: 0x${offset.toString(16).toUpperCase()} | Size: ${size} bytes</div>` : ''}
                </div>
            `;
        });
        
        html += `</div>`;
    }
    
    panel.innerHTML = html;
}

// Render enum
function renderEnum(item, panel) {
    const enumValues = Array.isArray(item.data) && Array.isArray(item.data[0]) ? item.data[0][0] : [];
    const enumType = Array.isArray(item.data) && item.data[0] ? item.data[0][1] : 'unknown';
    
    const valuesCount = Array.isArray(enumValues) ? enumValues.length : Object.keys(enumValues).length;
    
    let html = `
        <div class="details-header">
            <h2>${item.name}</h2>
            <div class="details-meta">
                <div class="meta-badge">Enum</div>
                <div class="meta-badge">Type: ${enumType}</div>
                <div class="meta-badge">${valuesCount} values</div>
            </div>
        </div>
        <div class="details-section">
            <div class="section-title">📋 Values</div>
    `;
    
    if (Array.isArray(enumValues)) {
        enumValues.forEach(val => {
            const key = Object.keys(val)[0];
            const value = val[key];
            html += `
                <div class="property-item">
                    <div class="property-header">
                        <span class="property-name">${key}</span>
                        <span class="copy-value" onclick="copyToClipboard('${value}')">${value}</span>
                    </div>
                </div>
            `;
        });
    } else if (typeof enumValues === 'object') {
        Object.keys(enumValues).forEach(key => {
            html += `
                <div class="property-item">
                    <div class="property-header">
                        <span class="property-name">${key}</span>
                        <span class="copy-value" onclick="copyToClipboard('${enumValues[key]}')">${enumValues[key]}</span>
                    </div>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    panel.innerHTML = html;
}

// Render functions
function renderFunctions(item, panel) {
    const functions = item.data;
    let functionsCount = 0;
    
    if (Array.isArray(functions)) {
        functions.forEach(funcObj => {
            functionsCount += Object.keys(funcObj).length;
        });
    }
    
    let html = `
        <div class="details-header">
            <h2>${item.name}</h2>
            <div class="details-meta">
                <div class="meta-badge">Class Functions</div>
                <div class="meta-badge">${functionsCount} functions</div>
            </div>
        </div>
    `;
    
    if (Array.isArray(functions)) {
        functions.forEach(funcObj => {
            Object.keys(funcObj).forEach(funcName => {
                const funcData = funcObj[funcName];
                const returnType = Array.isArray(funcData) && funcData[0] ? funcData[0][0] : 'void';
                const params = Array.isArray(funcData) && funcData[1] ? funcData[1] : [];
                const address = Array.isArray(funcData) && funcData[2] ? funcData[2] : '';
                
                let paramString = params.length > 0 
                    ? params.map(param => {
                        const paramType = param[0] ? param[0][0] : 'unknown';
                        const paramName = param[2] || 'param';
                        return `${paramType} ${paramName}`;
                      }).join(', ')
                    : '';
                
                html += `
                    <div class="details-section">
                        <div class="section-title">⚙️ ${funcName}</div>
                        <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px; margin: 8px 0; font-family: 'Courier New', monospace; font-size: 0.85rem; color: #a8daff; overflow-x: auto;">
                            ${returnType} ${funcName}(${paramString})
                        </div>
                `;
                
                if (params.length > 0) {
                    html += `
                        <div class="property-item">
                            <div class="property-name">Parameters (${params.length})</div>
                            <div style="margin-top: 8px; padding-left: 15px;">
                    `;
                    params.forEach(param => {
                        const paramType = param[0] ? param[0][0] : 'unknown';
                        const paramName = param[2] || 'unnamed';
                        html += `<div style="color: #FFB6C1; font-size: 0.75rem; margin: 2px 0; font-family: 'Courier New', monospace;">• ${paramType} ${paramName}</div>`;
                    });
                    html += `</div></div>`;
                }
                
                if (address) {
                    const hexAddr = '0x' + address.toString(16).toUpperCase();
                    html += `
                        <div class="property-item">
                            <div class="property-header">
                                <span class="property-name">Address</span>
                                <span class="copy-value" onclick="copyToClipboard('${hexAddr}')">${hexAddr}</span>
                            </div>
                        </div>
                    `;
                }
                
                html += `</div>`;
            });
        });
    }
    
    panel.innerHTML = html;
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('📋 Copied: ' + text);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('❌ Failed to copy');
    });
}

// Show notification
function showNotification(message) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s';
        setTimeout(() => notif.remove(), 300);
    }, 2500);
}

// Dump request modal
function openDumpRequestModal() {
    document.getElementById('dumpRequestModal').classList.add('active');
}

function closeDumpRequestModal() {
    document.getElementById('dumpRequestModal').classList.remove('active');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);