// Configuration
const API_URL = 'https://api.jsonbin.io/v3/b'; // JSONBin.io API URL
const API_KEY = '$2a$10$YOUR_API_KEY'; // Replace with your JSONBin.io API key
const BIN_ID = 'YOUR_BIN_ID'; // Replace with the bin ID from Website 1
const POLLING_INTERVAL = 5000; // Check for updates every 5 seconds

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

// Initialize
function init() {
    // Get bin ID from URL parameter or prompt
    const urlParams = new URLSearchParams(window.location.search);
    const binIdParam = urlParams.get('binId');
    
    if (binIdParam) {
        BIN_ID = binIdParam;
        startPolling();
    } else {
        const storedBinId = localStorage.getItem('dashboardBinId');
        if (storedBinId) {
            BIN_ID = storedBinId;
            startPolling();
        } else {
            promptForBinId();
        }
    }
    
    setupEventListeners();
}

// Prompt user for bin ID
function promptForBinId() {
    const binId = prompt('Please enter the JSONBin ID from Camera Monitor:');
    if (binId) {
        BIN_ID = binId;
        localStorage.setItem('dashboardBinId', binId);
        startPolling();
    } else {
        setConnectionStatus(false, 'No bin ID provided');
    }
}

// Start polling for updates
function startPolling() {
    // Initial load
    loadEvents();
    
    // Set up polling interval
    pollingInterval = setInterval(loadEvents, POLLING_INTERVAL);
    
    // Add event listener to handle when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            loadEvents(); // Immediately load when tab becomes visible
        }
    });
}

// Set connection status
function setConnectionStatus(connected, message = '') {
    if (connected) {
        connectionStatus.textContent = 'Connected';
        statusDot.classList.remove('disconnected');
    } else {
        connectionStatus.textContent = message || 'Disconnected';
        statusDot.classList.add('disconnected');
    }
}

// Load events from JSONBin
async function loadEvents() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/${BIN_ID}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        
        const data = await response.json();
        events = data.record.events || [];
        
        // Sort events by timestamp (newest first)
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

// Update statistics
function updateStats() {
    totalEventsElement.textContent = events.length;
    
    // Count today's events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEvents = events.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= today;
    });
    
    todayEventsElement.textContent = todayEvents.length;
}

// Filter and render events
function filterAndRenderEvents() {
    let filteredEvents = [...events];
    
    // Apply status filter
    if (currentFilter !== 'all') {
        filteredEvents = filteredEvents.filter(event => event.status === currentFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredEvents = filteredEvents.filter(event => 
            event.cameraName.toLowerCase().includes(query) ||
            new Date(event.timestamp).toLocaleString().toLowerCase().includes(query)
        );
    }
    
    renderEvents(filteredEvents);
}

// Render events to the grid
function renderEvents(eventsToRender) {
    eventsGrid.innerHTML = '';
    
    if (eventsToRender.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    eventsToRender.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        eventCard.dataset.id = event.id;
        
        const statusClass = event.status === 'new' ? 'status-new' : 'status-reviewed';
        const statusText = event.status === 'new' ? 'New' : 'Reviewed';
        
        eventCard.innerHTML = `
            <div style="position: relative;">
                <img src="${event.imageUrl}" alt="Event at ${formatTimestamp(event.timestamp)}" class="event-image">
                <div class="event-status ${statusClass}">${statusText}</div>
            </div>
            <div class="event-info">
                <div class="event-camera">${event.cameraName}</div>
                <div class="event-timestamp">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${formatTimestamp(event.timestamp)}
                </div>
            </div>
        `;
        
        eventCard.addEventListener('click', () => openEventModal(event));
        
        eventsGrid.appendChild(eventCard);
    });
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Show/hide loading indicator
function showLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
}

// Open event modal
function openEventModal(event) {
    currentEventId = event.id;
    
    modalImage.src = event.imageUrl;
    modalCamera.textContent = event.cameraName;
    modalTimestamp.textContent = formatTimestamp(event.timestamp);
    
    const statusClass = event.status === 'new' ? 'status-new' : 'status-reviewed';
    const statusText = event.status === 'new' ? 'New' : 'Reviewed';
    
    modalStatus.textContent = statusText;
    modalStatus.className = `detail-value ${statusClass}`;
    
    // Update button state
    if (event.status === 'new') {
        markReviewed.textContent = 'Mark as Reviewed';
        markReviewed.disabled = false;
    } else {
        markReviewed.textContent = 'Already Reviewed';
        markReviewed.disabled = true;
    }
    
    eventModal.classList.add('show');
}

// Close event modal
function closeEventModal() {
    eventModal.classList.remove('show');
    currentEventId = null;
}

// Mark event as reviewed
async function markEventAsReviewed() {
    if (!currentEventId) return;
    
    try {
        // First get the current data
        const response = await fetch(`${API_URL}/${BIN_ID}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        
        const data = await response.json();
        const currentEvents = data.record.events || [];
        
        // Update the specific event
        const updatedEvents = currentEvents.map(event => {
            if (event.id === currentEventId) {
                return { ...event, status: 'reviewed' };
            }
            return event;
        });
        
        // Update the bin
        const updateResponse = await fetch(`${API_URL}/${BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ events: updatedEvents })
        });
        
        if (!updateResponse.ok) {
            throw new Error('Failed to update data');
        }
        
        // Update local events
        events = events.map(event => {
            if (event.id === currentEventId) {
                return { ...event, status: 'reviewed' };
            }
            return event;
        });
        
        showNotification('Event marked as reviewed');
        closeEventModal();
        filterAndRenderEvents();
    } catch (error) {
        console.error('Error updating event:', error);
        showNotification('Error updating event', 'error');
    }
}

// Delete event
async function deleteEventFromDatabase() {
    if (!currentEventId) return;
    
    if (confirm('Are you sure you want to delete this event?')) {
        try {
            // First get the current data
            const response = await fetch(`${API_URL}/${BIN_ID}`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': API_KEY
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            
            const data = await response.json();
            const currentEvents = data.record.events || [];
            
            // Filter out the event to delete
            const updatedEvents = currentEvents.filter(event => event.id !== currentEventId);
            
            // Update the bin
            const updateResponse = await fetch(`${API_URL}/${BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify({ events: updatedEvents })
            });
            
            if (!updateResponse.ok) {
                throw new Error('Failed to update data');
            }
            
            // Update local events
            events = events.filter(event => event.id !== currentEventId);
            
            showNotification('Event deleted successfully');
            closeEventModal();
            filterAndRenderEvents();
            updateStats();
        } catch (error) {
            console.error('Error deleting event:', error);
            showNotification('Error deleting event', 'error');
        }
    }
}

// Show notification
function showNotification(message, type = 'success') {
    notificationText.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Setup event listeners
function setupEventListeners() {
    // Search
    searchButton.addEventListener('click', () => {
        searchQuery = searchInput.value.trim();
        filterAndRenderEvents();
    });
    
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchQuery = searchInput.value.trim();
            filterAndRenderEvents();
        }
    });
    
    // Filters
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.filter;
            filterAndRenderEvents();
        });
    });
    
    // Modal
    closeModal.addEventListener('click', closeEventModal);
    markReviewed.addEventListener('click', markEventAsReviewed);
    deleteEvent.addEventListener('click', deleteEventFromDatabase);
    
    // Close modal when clicking outside
    eventModal.addEventListener('click', (e) => {
        if (e.target === eventModal) {
            closeEventModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && eventModal.classList.contains('show')) {
            closeEventModal();
        }
    });
}

// Initialize the app
window.addEventListener('DOMContentLoaded', init);