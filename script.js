// Configuration
const API_URL = 'https://api.jsonbin.io/v3/b'; // JSONBin.io API URL
const API_KEY = '$2a$10$F1fId.oFBNUrtnDImC3MNOy6o1ecqmO.nP76OF2tpg57RMGEYMULe'; // Your JSONBin.io API key
const BIN_ID = '67e81ce38a456b79667f01f3'; // Fixed bin ID
const POLLING_INTERVAL = 5000; // Poll every 5 seconds

// DOM Elements
const eventsGrid = document.getElementById('events-grid');
const emptyState = document.getElementById('empty-state');
const loadingIndicator = document.getElementById('loading-indicator');
const totalEventsElement = document.getElementById('total-events');
const todayEventsElement = document.getElementById('today-events');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const filterButtons = document.querySelectorAll('.filter-button');
const eventModal = document.getElementById('event-modal');
const modalImage = document.getElementById('modal-image');
const modalCamera = document.getElementById('modal-camera');
const modalTimestamp = document.getElementById('modal-timestamp');
const modalStatus = document.getElementById('modal-status');
const closeModal = document.getElementById('close-modal');
const markReviewed = document.getElementById('mark-reviewed');
const deleteEvent = document.getElementById('delete-event');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');
const connectionStatus = document.getElementById('connection-status');
const statusDot = document.querySelector('.status-dot');

// State
let events = [];
let currentFilter = 'all';
let searchQuery = '';
let currentEventId = null;
let pollingInterval = null;

// Initialize the app
async function init() {
    await validateBinId();
    addBinIdStyles();
    setupEventListeners();
}

// Validate bin ID and start polling
async function validateBinId() {
    try {
        const response = await fetch(`${API_URL}/${BIN_ID}`, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        });

        if (!response.ok) throw new Error('Invalid bin ID');

        startPolling();
        showNotification('Successfully connected to event data');
    } catch (error) {
        console.error('Error validating bin ID:', error);
        setConnectionStatus(false, 'Invalid bin ID');
        showNotification('Invalid bin ID. Please try again.', 'error');
    }
}

// Start polling for event updates
function startPolling() {
    loadEvents();
    addBinIdDisplay();
    setInterval(loadEvents, POLLING_INTERVAL);
}

// Add bin ID display to UI
function addBinIdDisplay() {
    const headerLeft = document.querySelector('.header-left');
    if (headerLeft && !document.querySelector('.bin-id-display')) {
        const binIdDisplay = document.createElement('div');
        binIdDisplay.className = 'bin-id-display';
        binIdDisplay.innerHTML = `<span class="bin-id-label">Bin ID:</span> <span id="bin-id-value">${BIN_ID}</span>`;
        binIdDisplay.style.marginLeft = '15px';
        binIdDisplay.style.cursor = 'pointer';
        binIdDisplay.title = 'Click to copy Bin ID';

        binIdDisplay.addEventListener('click', () => {
            navigator.clipboard.writeText(BIN_ID)
                .then(() => showNotification('Bin ID copied to clipboard'))
                .catch(err => console.error('Could not copy text:', err));
        });

        headerLeft.appendChild(binIdDisplay);
    }
}

// Add styles for bin ID display
function addBinIdStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .bin-id-display {
            display: inline-flex;
            align-items: center;
            background-color: rgba(0, 0, 0, 0.2);
            padding: 4px 8px;
            border-radius: 4px;
            margin-left: 10px;
            transition: background-color 0.3s;
        }
        .bin-id-display:hover {
            background-color: rgba(0, 0, 0, 0.4);
        }
        .bin-id-label {
            margin-right: 5px;
            font-weight: 500;
        }
        #bin-id-value {
            font-family: monospace;
        }
    `;
    document.head.appendChild(style);
}

// Load events from JSONBin
async function loadEvents() {
    showLoading(true);

    try {
        const response = await fetch(`${API_URL}/${BIN_ID}`, {
            method: 'GET',
            headers: { 'X-Master-Key': API_KEY }
        });

        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();
        events = data.record.events || [];
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setConnectionStatus(true);
        updateStats();
        filterAndRenderEvents();
    } catch (error) {
        console.error('Error loading events:', error);
        setConnectionStatus(false, 'Error connecting to server');
        showNotification('Error loading events. Please check your connection.', 'error');
    } finally {
        showLoading(false);
    }
}

// Update event statistics
function updateStats() {
    totalEventsElement.textContent = events.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = events.filter(event => new Date(event.timestamp) >= today);
    todayEventsElement.textContent = todayEvents.length;
}

// Filter and render events
function filterAndRenderEvents() {
    let filteredEvents = events.filter(event => currentFilter === 'all' || event.status === currentFilter);
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredEvents = filteredEvents.filter(event => 
            event.cameraName.toLowerCase().includes(query) || 
            new Date(event.timestamp).toLocaleString().toLowerCase().includes(query)
        );
    }
    renderEvents(filteredEvents);
}

// Render events
function renderEvents(eventsToRender) {
    eventsGrid.innerHTML = eventsToRender.length
        ? eventsToRender.map(event => `
            <div class="event-card" data-id="${event.id}">
                <img src="${event.imageUrl}" class="event-image">
                <div class="event-camera">${event.cameraName}</div>
                <div class="event-timestamp">${new Date(event.timestamp).toLocaleString()}</div>
            </div>
        `).join('')
        : (emptyState.style.display = 'flex');
}

// Show/hide loading indicator
function showLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Set connection status
function setConnectionStatus(connected, message = '') {
    connectionStatus.textContent = connected ? 'Connected' : message || 'Disconnected';
    statusDot.classList.toggle('disconnected', !connected);
}

// Show notification
function showNotification(message, type = 'success', duration = 3000) {
    notificationText.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => notification.classList.remove('show'), duration);
}

// Setup event listeners
function setupEventListeners() {
    searchButton.addEventListener('click', () => { searchQuery = searchInput.value.trim(); filterAndRenderEvents(); });
    searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') { searchQuery = searchInput.value.trim(); filterAndRenderEvents(); } });
}

// Initialize app
window.addEventListener('DOMContentLoaded', init);
