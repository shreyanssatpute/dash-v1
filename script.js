// Configuration
const API_URL = "https://api.jsonbin.io/v3/b" // JSONBin.io API URL
const API_KEY = "$2a$10$F1fId.oFBNUrtnDImC3MNOy6o1ecqmO.nP76OF2tpg57RMGEYMULe" // Your JSONBin.io API key
const BIN_ID = "67e81ce38a456b79667f01f3" // Fixed bin ID
const POLLING_INTERVAL = 5000 // Poll every 5 seconds

// DOM Elements
const eventsGrid = document.getElementById("events-grid")
const emptyState = document.getElementById("empty-state")
const loadingIndicator = document.getElementById("loading-indicator")
const totalEventsElement = document.getElementById("total-events")
const todayEventsElement = document.getElementById("today-events")
const searchInput = document.getElementById("search-input")
const searchButton = document.getElementById("search-button")
const filterButtons = document.querySelectorAll(".filter-button")
const eventModal = document.getElementById("event-modal")
const modalImage = document.getElementById("modal-image")
const modalCamera = document.getElementById("modal-camera")
const modalTimestamp = document.getElementById("modal-timestamp")
const modalStatus = document.getElementById("modal-status")
const modalLocation = document.getElementById("modal-location")
const closeModal = document.getElementById("close-modal")
const markReviewed = document.getElementById("mark-reviewed")
const deleteEvent = document.getElementById("delete-event")
const notification = document.getElementById("notification")
const notificationText = document.getElementById("notification-text")
const connectionStatus = document.getElementById("connection-status")
const statusDot = document.querySelector(".status-dot")

// State
let events = []
let currentFilter = "all"
let searchQuery = ""
let currentEventId = null
const pollingInterval = null

// Initialize the app
async function init() {
  await validateBinId()
  addBinIdStyles()
  setupEventListeners()
}

// Validate bin ID and start polling
async function validateBinId() {
  try {
    const response = await fetch(`${API_URL}/${BIN_ID}`, {
      method: "GET",
      headers: { "X-Master-Key": API_KEY },
    })

    if (!response.ok) throw new Error("Invalid bin ID")

    startPolling()
    showNotification("Successfully connected to event data")
  } catch (error) {
    console.error("Error validating bin ID:", error)
    setConnectionStatus(false, "Invalid bin ID")
    showNotification("Invalid bin ID. Please try again.", "error")
  }
}

// Start polling for event updates
function startPolling() {
  loadEvents()
  addBinIdDisplay()
  setInterval(loadEvents, POLLING_INTERVAL)
}

// Add bin ID display to UI
function addBinIdDisplay() {
  const headerLeft = document.querySelector(".header-left")
  if (headerLeft && !document.querySelector(".bin-id-display")) {
    const binIdDisplay = document.createElement("div")
    binIdDisplay.className = "bin-id-display"
    binIdDisplay.innerHTML = `<span class="bin-id-label">Bin ID:</span> <span id="bin-id-value">${BIN_ID}</span>`
    binIdDisplay.style.marginLeft = "15px"
    binIdDisplay.style.cursor = "pointer"
    binIdDisplay.title = "Click to copy Bin ID"

    binIdDisplay.addEventListener("click", () => {
      navigator.clipboard
        .writeText(BIN_ID)
        .then(() => showNotification("Bin ID copied to clipboard"))
        .catch((err) => console.error("Could not copy text:", err))
    })

    headerLeft.appendChild(binIdDisplay)
  }
}

// Add styles for bin ID display
function addBinIdStyles() {
  const style = document.createElement("style")
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
    `
  document.head.appendChild(style)
}

// Load events from JSONBin
async function loadEvents() {
  showLoading(true)

  try {
    const response = await fetch(`${API_URL}/${BIN_ID}`, {
      method: "GET",
      headers: { "X-Master-Key": API_KEY },
    })

    if (!response.ok) throw new Error("Failed to fetch data")

    const data = await response.json()
    events = data.record.events || []
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    setConnectionStatus(true)
    updateStats()
    filterAndRenderEvents()
  } catch (error) {
    console.error("Error loading events:", error)
    setConnectionStatus(false, "Error connecting to server")
    showNotification("Error loading events. Please check your connection.", "error")
  } finally {
    showLoading(false)
  }
}

// Update event statistics
function updateStats() {
  totalEventsElement.textContent = events.length
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEvents = events.filter((event) => new Date(event.timestamp) >= today)
  todayEventsElement.textContent = todayEvents.length
}

// Filter and render events
function filterAndRenderEvents() {
  let filteredEvents = events.filter((event) => currentFilter === "all" || event.status === currentFilter)
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredEvents = filteredEvents.filter(
      (event) =>
        event.cameraName.toLowerCase().includes(query) ||
        new Date(event.timestamp).toLocaleString().toLowerCase().includes(query),
    )
  }
  renderEvents(filteredEvents)
}

// Render events
function renderEvents(eventsToRender) {
  eventsGrid.innerHTML = ""

  if (eventsToRender.length === 0) {
    emptyState.style.display = "flex"
    return
  }

  emptyState.style.display = "none"

  eventsToRender.forEach((event) => {
    // Make sure event has all required properties with fallbacks
    const eventId = event.id || Math.random().toString(36).substring(2, 9)
    const cameraName = event.cameraName || "Unknown Camera"
    const timestamp = event.timestamp ? new Date(event.timestamp).toLocaleString() : "Unknown Time"
    const imageUrl = event.imageUrl || "/placeholder.svg"
    const status = event.status || "new"

    const card = document.createElement("div")
    card.className = "event-card"
    card.dataset.id = eventId

    card.innerHTML = `
    <div class="event-image-container">
        <img src="${imageUrl}" class="event-image" alt="Event from ${cameraName}">
        ${
          event.location && event.location.coordinates
            ? '<div class="location-indicator"><span class="location-dot"></span>Location detected</div>'
            : ""
        }
        <div class="event-actions">
            <button class="event-action escalate-btn" title="Escalate Event">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m19 14-7-7-7 7"/>
                </svg>
            </button>
            <button class="event-action delete-btn" title="Delete Event">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    </div>
    <div class="event-info">
        <div class="event-camera">${cameraName}</div>
        <div class="event-timestamp">${timestamp}</div>
    </div>
`

    eventsGrid.appendChild(card)

    // Add event listeners to the newly created card
    const escalateBtn = card.querySelector(".escalate-btn")
    const deleteBtn = card.querySelector(".delete-btn")

    // Open modal when clicking on the card (except action buttons)
    card.addEventListener("click", (e) => {
      // Don't open modal if clicking on action buttons
      if (!e.target.closest(".event-action")) {
        openEventModal(event)
      }
    })

    // Escalate event
    escalateBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      escalateEvent(eventId)
    })

    // Delete event
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      deleteEventById(eventId)
    })
  })
}

// Update the openEventModal function to handle the location data better
function openEventModal(event) {
  // Set current event ID
  currentEventId = event.id

  // Populate modal with event data
  modalImage.src = event.imageUrl || "/placeholder.svg"
  modalCamera.textContent = event.cameraName || "Unknown Camera"
  modalTimestamp.textContent = event.timestamp ? new Date(event.timestamp).toLocaleString() : "Unknown Time"

  // Hide status as it's not in the screenshot
  document.querySelector(".status-container").style.display = "none"

  // Add location details if available
  if (event.location && event.location.placeName) {
    modalLocation.textContent = event.location.placeName
    document.querySelector(".location-container").style.display = ""
    document.querySelector(".divider").style.display = ""
  } else if (event.location && event.location.coordinates) {
    modalLocation.textContent = `${event.location.coordinates.lat.toFixed(4)}, ${event.location.coordinates.lng.toFixed(4)}`
    document.querySelector(".location-container").style.display = ""
    document.querySelector(".divider").style.display = ""
  } else {
    // If no location data, hide the location container and divider
    document.querySelector(".location-container").style.display = "none"
    document.querySelector(".divider").style.display = "none"
  }

  // Show modal
  eventModal.classList.add("show")
  document.body.style.overflow = "hidden"
}

// Update closeEventModal to reset visibility
function closeEventModal() {
  eventModal.classList.remove("show")
  document.body.style.overflow = "" // Restore scrolling
  currentEventId = null

  // Reset visibility of containers for next time
  document.querySelector(".status-container").style.display = "none"
  document.querySelector(".location-container").style.display = ""
  document.querySelector(".divider").style.display = ""
}

// Escalate an event (mark as reviewed)
async function escalateEvent(eventId) {
  try {
    const eventIndex = events.findIndex((e) => e.id === eventId)
    if (eventIndex === -1) return

    events[eventIndex].status = "reviewed"

    await updateEvents()
    showNotification(`Event escalated successfully`)
    filterAndRenderEvents()

    // Update modal if it's open and showing this event
    if (currentEventId === eventId) {
      modalStatus.textContent = "reviewed"
    }
  } catch (error) {
    console.error("Error escalating event:", error)
    showNotification("Error escalating event", "error")
  }
}

// Delete an event
async function deleteEventById(eventId) {
  try {
    const eventIndex = events.findIndex((e) => e.id === eventId)
    if (eventIndex === -1) return

    const eventName = events[eventIndex].cameraName || "Unknown"
    events.splice(eventIndex, 1)

    await updateEvents()
    showNotification(`Event from ${eventName} deleted`)

    // Close modal if it's open and showing this event
    if (currentEventId === eventId) {
      closeEventModal()
    }

    filterAndRenderEvents()
    updateStats()
  } catch (error) {
    console.error("Error deleting event:", error)
    showNotification("Error deleting event", "error")
  }
}

// Update events in JSONBin
async function updateEvents() {
  try {
    const response = await fetch(`${API_URL}/${BIN_ID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY,
      },
      body: JSON.stringify({ events }),
    })

    if (!response.ok) throw new Error("Failed to update data")

    return await response.json()
  } catch (error) {
    console.error("Error updating events:", error)
    throw error
  }
}

// Show notification
function showNotification(message, type = "success", duration = 3000) {
  notificationText.textContent = message
  notification.className = `notification ${type} show`
  setTimeout(() => notification.classList.remove("show"), duration)
}

// Set connection status
function setConnectionStatus(connected, message = "") {
  connectionStatus.textContent = connected ? "Connected" : message || "Disconnected"
  statusDot.classList.toggle("disconnected", !connected)
}

// Show/hide loading indicator
function showLoading(show) {
  loadingIndicator.style.display = show ? "flex" : "none"
}

// Update setupEventListeners function to include filter buttons
function setupEventListeners() {
  // Search functionality
  searchButton.addEventListener("click", () => {
    searchQuery = searchInput.value.trim()
    filterAndRenderEvents()
  })

  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      searchQuery = searchInput.value.trim()
      filterAndRenderEvents()
    }
  })

  // Filter buttons
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"))
      button.classList.add("active")
      currentFilter = button.dataset.filter
      filterAndRenderEvents()
    })
  })

  // Modal event listeners
  closeModal.addEventListener("click", closeEventModal)

  // Close modal when clicking outside of it
  eventModal.addEventListener("click", (e) => {
    if (e.target === eventModal) {
      closeEventModal()
    }
  })

  // Close modal with Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && eventModal.classList.contains("show")) {
      closeEventModal()
    }
  })

  // Mark as reviewed button in modal
  markReviewed.addEventListener("click", () => {
    if (currentEventId) {
      escalateEvent(currentEventId)
    }
  })

  // Delete event button in modal
  deleteEvent.addEventListener("click", () => {
    if (currentEventId) {
      deleteEventById(currentEventId)
    }
  })
}

// Add a function to handle window resize events for better mobile experience
function handleResize() {
  // Adjust container heights based on window size
  const windowHeight = window.innerHeight
  const headerHeight = document.querySelector(".dashboard-header").offsetHeight
  const filtersHeight = document.querySelector(".filters").offsetHeight

  // Calculate available height for events container
  const availableHeight = windowHeight - headerHeight - filtersHeight - 60 // 60px for padding

  // Set minimum height for events container
  document.querySelector(".events-container").style.minHeight = Math.max(300, availableHeight) + "px"
}

// Add resize event listener to window
window.addEventListener("resize", handleResize)

// Call handleResize on init to set initial sizes
window.addEventListener("DOMContentLoaded", () => {
  init()
  // Set timeout to ensure DOM is fully loaded
  setTimeout(handleResize, 100)
})
