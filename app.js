// Global variables
let map;
let markers = [];
let userMarker;
let userLocation = null;
let mapInitialized = false;

// Initialize the map
function initMap() {
    try {
        if (mapInitialized && map) {
            console.log('Map already initialized');
            return true;
        }
        
        if (typeof L === 'undefined') {
            console.error('CRITICAL: Leaflet (L) is not loaded - cannot initialize map');
            alert('Map library not loaded. Please refresh the page.');
            return false;
        }
        
        console.log('Initializing map with Leaflet version:', L.version);
        
        // Center on UK by default
        map = L.map('map').setView([54.5, -2], 6);
        
        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        
        mapInitialized = true;
        console.log('✅ Map initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Error initializing map:', error);
        mapInitialized = false;
        return false;
    }
}

// Initialize on page load
window.addEventListener('load', function() {
    console.log('🚀 Window loaded event fired');
    
    // Leaflet should already be loaded due to script order
    if (typeof L === 'undefined') {
        console.error('❌ CRITICAL: Leaflet not available after page load!');
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = 'Map library failed to load. Please check your internet connection and refresh the page.';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    console.log('✅ Leaflet is available, initializing map...');
    initMap();
    
    // Allow Enter key to trigger search
    const postcodeInput = document.getElementById('postcodeInput');
    if (postcodeInput) {
        postcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchLocations();
            }
        });
    }
});

// Main search function
async function searchLocations() {
    const postcode = document.getElementById('postcodeInput').value.trim();
    
    if (!postcode) {
        showError('Please enter a postcode');
        return;
    }
    
    // Ensure map is initialized before searching
    if (!mapInitialized) {
        console.log('Map not ready, attempting to initialize...');
        const initialized = initMap();
        if (!initialized) {
            showError('Map is not ready. Please wait a moment and try again, or refresh the page.');
            return;
        }
        // Give map a moment to fully initialize
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    hideError();
    hideResults();
    setLoading(true);
    
    try {
        // Step 1: Geocode the postcode using Nominatim
        console.log('Step 1: Geocoding postcode...');
        const coords = await geocodePostcode(postcode);
        
        if (!coords) {
            console.log('Geocoding failed - no coordinates returned');
            showError('Could not find that postcode. Please check and try again.');
            return;
        }
        
        console.log('Geocoding success:', coords);
        userLocation = coords;
        
        // Update map to show user location
        console.log('Step 2: Updating map...');
        updateUserLocation(coords);
        
        // Step 3: Query Azure Cosmos DB for nearby locations
        console.log('Step 3: Querying for nearby locations...');
        const locations = await findNearbyLocations(coords);
        console.log('Query complete. Locations found:', locations ? locations.length : 0);
        
        if (!locations || locations.length === 0) {
            console.log('No locations found in results');
            showError('No stoma pack locations found near this postcode. Try searching postcodes near London, Manchester, Birmingham, Leeds, Edinburgh, Liverpool, Bristol, Glasgow, Newcastle, or Cardiff.');
            return;
        }
        
        // Step 4: Display results
        console.log('Step 4: Displaying results...');
        displayLocations(locations, coords);
        showResults(`Found ${locations.length} location${locations.length !== 1 ? 's' : ''} near you`);
        console.log('Search complete!');
        
    } catch (error) {
        console.error('Search error:', error);
        console.error('Error details:', error.stack);
        showError(`Error: ${error.message || 'An error occurred while searching. Please try again.'}`);
    } finally {
        setLoading(false);
    }
}

// Geocode postcode using OpenStreetMap Nominatim
async function geocodePostcode(postcode) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(postcode)}&` +
            `countrycodes=gb&` +
            `limit=1`,
            {
                headers: {
                    'User-Agent': 'StomaPackFinder/1.0'
                }
            }
        );
        
        if (!response.ok) {
            throw new Error('Geocoding request failed');
        }
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
        }
        
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

// Query Azure Function API for nearby locations
async function findNearbyLocations(coords) {
    try {
        // Detect if running locally (file:// or localhost without port 7071)
        const isLocal = window.location.protocol === 'file:' || 
                       (window.location.hostname === 'localhost' && window.location.port !== '7071');
        const apiBase = isLocal ? 'http://localhost:7071' : '';
        const apiUrl = `${apiBase}/api/locations?lat=${coords.lat}&lon=${coords.lon}&radius=50`;
        
        console.log('API Request:', apiUrl);
        console.log('Running locally:', isLocal);
        
        const response = await fetch(
            apiUrl,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error('Failed to fetch locations');
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        return data.locations || [];
    } catch (error) {
        console.error('API error:', error);
        throw error;
    }
}

// Update map with user's location
function updateUserLocation(coords) {
    // Ensure map is initialized
    if (!mapInitialized || !map) {
        console.warn('Map not initialized yet, attempting to initialize...');
        if (!initMap()) {
            console.error('Could not initialize map');
            return;
        }
    }
    
    // Remove existing user marker if any
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    // Create custom icon for user location
    const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: '<div style="background-color: #667eea; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    
    // Add user marker
    userMarker = L.marker([coords.lat, coords.lon], {icon: userIcon})
        .addTo(map)
        .bindPopup('<b>Your Location</b>')
        .openPopup();
    
    // Center map on user location
    map.setView([coords.lat, coords.lon], 12);
}

// Display locations on map and in list
function displayLocations(locations, userCoords) {
    // Ensure map is initialized
    if (!mapInitialized || !map) {
        console.warn('Map not ready for displaying locations');
        return;
    }
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Calculate distances and sort
    locations.forEach(location => {
        location.distance = calculateDistance(
            userCoords.lat,
            userCoords.lon,
            location.latitude,
            location.longitude
        );
    });
    
    locations.sort((a, b) => a.distance - b.distance);
    
    // Add markers to map
    locations.forEach((location, index) => {
        const marker = L.marker([location.latitude, location.longitude])
            .addTo(map)
            .bindPopup(createPopupContent(location));
        
        markers.push(marker);
    });
    
    // Display list of locations
    displayLocationsList(locations);
    
    // Fit map bounds to show all markers
    if (locations.length > 0) {
        const bounds = L.latLngBounds(
            locations.map(loc => [loc.latitude, loc.longitude])
        );
        bounds.extend([userCoords.lat, userCoords.lon]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Create popup content for markers
function createPopupContent(location) {
    return `
        <div class="popup-content">
            <h3>${escapeHtml(location.name)}</h3>
            <p><strong>Address:</strong><br>${escapeHtml(location.address)}</p>
            ${location.phone ? `<p><strong>Phone:</strong> <a href="tel:${location.phone}">${escapeHtml(location.phone)}</a></p>` : ''}
            ${location.hours ? `<p><strong>Hours:</strong> ${escapeHtml(location.hours)}</p>` : ''}
            <p><strong>Distance:</strong> ${location.distance.toFixed(2)} km</p>
        </div>
    `;
}

// Display locations list
function displayLocationsList(locations) {
    const container = document.getElementById('locationsContainer');
    const list = document.getElementById('locationsList');
    
    container.innerHTML = '';
    
    locations.forEach((location, index) => {
        const card = document.createElement('div');
        card.className = 'location-card';
        card.onclick = () => {
            markers[index].openPopup();
            map.setView([location.latitude, location.longitude], 15);
        };
        
        card.innerHTML = `
            <h3>${escapeHtml(location.name)}</h3>
            <p><strong>📍 Address:</strong> ${escapeHtml(location.address)}</p>
            ${location.phone ? `<p><strong>📞 Phone:</strong> <a href="tel:${location.phone}" class="location-phone" onclick="event.stopPropagation()">${escapeHtml(location.phone)}</a></p>` : ''}
            ${location.hours ? `<p><strong>🕐 Hours:</strong> ${escapeHtml(location.hours)}</p>` : ''}
            <span class="location-distance">${location.distance.toFixed(2)} km away</span>
        `;
        
        container.appendChild(card);
    });
    
    list.style.display = 'block';
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees) {
    return degrees * (Math.PI / 180);
}

// UI Helper functions
function setLoading(isLoading) {
    const btn = document.getElementById('searchBtn');
    const btnText = document.getElementById('searchBtnText');
    const spinner = document.getElementById('searchSpinner');
    const input = document.getElementById('postcodeInput');
    
    btn.disabled = isLoading;
    input.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline';
    spinner.style.display = isLoading ? 'inline-block' : 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showResults(message) {
    const resultsDiv = document.getElementById('resultsInfo');
    resultsDiv.textContent = message;
    resultsDiv.style.display = 'block';
}

function hideResults() {
    document.getElementById('resultsInfo').style.display = 'none';
    document.getElementById('locationsList').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
