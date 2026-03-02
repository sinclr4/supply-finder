const { app } = require('@azure/functions');
const { CosmosClient } = require("@azure/cosmos");

// Initialize Cosmos DB client
const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY
});

const databaseId = process.env.COSMOS_DB_DATABASE_ID || "stomapacks";
const containerId = process.env.COSMOS_DB_CONTAINER_ID || "locations";

app.http('locations', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'locations',
    handler: async (request, context) => {
        context.log('Processing locations lookup request');

        // Handle OPTIONS request for CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };
        }

        try {
            // Get query parameters
            const url = new URL(request.url);
            const lat = parseFloat(url.searchParams.get('lat'));
            const lon = parseFloat(url.searchParams.get('lon'));
            const radius = parseFloat(url.searchParams.get('radius')) || 50; // Default 50km radius

            // Validate inputs
            if (isNaN(lat) || isNaN(lon)) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    jsonBody: {
                        error: 'Invalid latitude or longitude parameters'
                    }
                };
            }

            if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    jsonBody: {
                        error: 'Latitude must be between -90 and 90, longitude between -180 and 180'
                    }
                };
            }

            // Get database and container
            const database = cosmosClient.database(databaseId);
            const container = database.container(containerId);

            // Query for locations within radius
            // Using a bounding box for initial filtering, then calculating exact distance
            const latDelta = radius / 111; // Rough conversion: 1 degree latitude ≈ 111 km
            const lonDelta = radius / (111 * Math.cos(lat * Math.PI / 180));

            const query = {
                query: `SELECT * FROM c 
                        WHERE c.latitude >= @minLat 
                        AND c.latitude <= @maxLat 
                        AND c.longitude >= @minLon 
                        AND c.longitude <= @maxLon`,
                parameters: [
                    { name: "@minLat", value: lat - latDelta },
                    { name: "@maxLat", value: lat + latDelta },
                    { name: "@minLon", value: lon - lonDelta },
                    { name: "@maxLon", value: lon + lonDelta }
                ]
            };

            const { resources: results } = await container.items
                .query(query)
                .fetchAll();

            // Filter by exact distance using Haversine formula
            const nearbyLocations = results.filter(location => {
                const distance = calculateDistance(
                    lat, 
                    lon, 
                    location.latitude, 
                    location.longitude
                );
                return distance <= radius;
            });

            context.log(`Found ${nearbyLocations.length} locations within ${radius}km`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    locations: nearbyLocations,
                    count: nearbyLocations.length,
                    searchCenter: { lat, lon },
                    searchRadius: radius
                }
            };

        } catch (error) {
            context.error('Error querying Cosmos DB:', error);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    error: 'Failed to retrieve locations',
                    message: error.message
                }
            };
        }
    }
});

// Haversine formula to calculate distance between two coordinates
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
