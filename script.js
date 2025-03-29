// Configuration
const API_URL = 'https://api.jsonbin.io/v3/b'; // JSONBin.io API URL
const API_KEY = '$2a$10$F1fId.oFBNUrtnDImC3MNOy6o1ecqmO.nP76OF2tpg57RMGEYMULe'; // Your JSONBin.io API key
let BIN_ID = '67e81ce38a456b79667f01f3'; // Will be set during initialization
const POLLING_INTERVAL = 5000000; // Check for updates every 5 seconds

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


// Prompt user for bin ID
function promptForBinId() {
    const binId = prompt('Please enter the JSONBin ID from Camera Monitor:');
    if (binId && binId.trim()) {
        BIN_ID = binId.trim();
        localStorage.setItem('jsonBinId', BIN_ID);
        
        // Validate the bin ID
        validateBinId();
    } else {
        setConnectionStatus(false, 'No bin ID provided');
        setTimeout(promptForBinId, 1000); // Prompt again after a delay
    }
}

// Validate bin ID
async function validateBinId() {
    try {
        const response = await fetch(`${API_URL}/${BIN_ID}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid bin ID');
        }
        
        // Bin ID is valid
        startPolling();
        showNotification('Successfully connected to event data');
    } catch (error) {
        console.error('Error validating bin ID:', error);
        setConnectionStatus(false, 'Invalid bin ID');
        showNotification('Invalid bin ID. Please try again.', 'error');
        localStorage.removeItem('jsonBinId');
        setTimeout(promptForBinId, 1000); // Prompt again after a delay
    }
}

// Start polling for updates
function startPolling() {
    // Initial load
    loadEvents();
    
    // Add bin ID display
    addBinIdDisplay();
    
    // Set up polling interval
    pollingInterval = setInterval(loadEvents, POLLING_INTERVAL);
    
    // Add event listener to handle when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            loadEvents(); // Immediately load when tab becomes visible
        }
    });
}

// Add bin ID display to UI
function addBinIdDisplay() {
    // Create a small display for the bin ID
    const headerLeft = document.querySelector('.header-left');
    if (headerLeft) {
        // Check if it already exists
        if (document.querySelector('.bin-id-display')) {
            return;
        }
        
        const binIdDisplay = document.createElement('div');
        binIdDisplay.className = 'bin-id-display';
        binIdDisplay.innerHTML = `
            <span class="bin-id-label">Bin ID:</span> 
            <span id="bin-id-value">${BIN_ID}</span>
        `;
        binIdDisplay.style.marginLeft = '15px';
        binIdDisplay.style.fontSize = '0.75rem';
        binIdDisplay.style.opacity = '0.7';
        binIdDisplay.style.cursor = 'pointer';
        binIdDisplay.title = 'Click to copy Bin ID';
        
        // Add click to copy functionality
        binIdDisplay.addEventListener('click', () => {
            navigator.clipboard.writeText(BIN_ID)
                .then(() => showNotification('Bin ID copied to clipboard'))
                .catch(err => console.error('Could not copy text: ', err));
        });
        
        headerLeft.appendChild(binIdDisplay);
    }
}

// Add CSS for bin ID display
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
function showNotification(message, type = 'success', duration = 3000) {
    notificationText.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
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
