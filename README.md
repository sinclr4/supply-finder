# 🏥 Stoma Pack Finder

A web application that helps users find stoma pack locations near them using their postcode.

## Features

- 🔍 **Postcode Search**: Enter any UK postcode to find nearby locations
- 🗺️ **Interactive Map**: Visualize locations using Leaflet.js
- 📍 **Distance Calculation**: See how far each location is from you
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Fast & Scalable**: Built on Azure Static Web Apps with Cosmos DB

## Architecture

### Frontend
- **HTML5/CSS3/JavaScript**: Modern, responsive UI
- **Leaflet.js**: Open-source mapping library
- **OpenStreetMap Nominatim**: Free geocoding service for postcode lookup

### Backend
- **Azure Functions**: Serverless API for location queries
- **Azure Cosmos DB**: NoSQL database for storing location data
  - Optimized for geospatial queries
  - Low-latency reads
  - Globally distributed

### Deployment
- **Azure Static Web Apps**: Hosting for frontend and API

## Setup Instructions

### Prerequisites

1. **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
2. **Azure Account** - [Create free account](https://azure.microsoft.com/free/)
3. **Azure CLI** - [Install here](https://docs.microsoft.com/cli/azure/install-azure-cli)
4. **Azure Functions Core Tools** - Install via npm:
   ```bash
   npm install -g azure-functions-core-tools@4
   ```

### Local Development

1. **Clone the repository**:
   ```bash
   cd "Stoma Soccer Supporter"
   ```

2. **Install API dependencies**:
   ```bash
   cd api
   npm install
   cd ..
   ```

3. **Configure local settings**:
   ```bash
   cp api/local.settings.json.template api/local.settings.json
   ```
   
   Edit `api/local.settings.json` and add your Cosmos DB credentials:
   ```json
   {
     "Values": {
       "COSMOS_DB_ENDPOINT": "https://your-account.documents.azure.com:443/",
       "COSMOS_DB_KEY": "your-primary-key",
       "COSMOS_DB_DATABASE_ID": "stomapacks",
       "COSMOS_DB_CONTAINER_ID": "locations"
     }
   }
   ```

4. **Run locally**:
   
   In one terminal, start the Azure Functions:
   ```bash
   cd api
   npm start
   ```
   
   In another terminal, serve the frontend:
   ```bash
   npx http-server -p 8080
   ```
   
   Open http://localhost:8080 in your browser.

### Azure Cosmos DB Setup

1. **Create Cosmos DB Account**:
   ```bash
   az cosmosdb create \
     --name stoma-pack-finder-db \
     --resource-group your-resource-group \
     --default-consistency-level Session \
     --locations regionName=uksouth failoverPriority=0
   ```

2. **Create Database and Container**:
   ```bash
   # Create database
   az cosmosdb sql database create \
     --account-name stoma-pack-finder-db \
     --resource-group your-resource-group \
     --name stomapacks
   
   # Create container with partition key
   az cosmosdb sql container create \
     --account-name stoma-pack-finder-db \
     --resource-group your-resource-group \
     --database-name stomapacks \
     --name locations \
     --partition-key-path "/id" \
     --throughput 400
   ```

3. **Get Connection Details**:
   ```bash
   # Get endpoint
   az cosmosdb show \
     --name stoma-pack-finder-db \
     --resource-group your-resource-group \
     --query documentEndpoint -o tsv
   
   # Get primary key
   az cosmosdb keys list \
     --name stoma-pack-finder-db \
     --resource-group your-resource-group \
     --query primaryMasterKey -o tsv
   ```

### Sample Data Structure

Each location document in Cosmos DB should follow this structure:

```json
{
  "id": "unique-location-id-1",
  "name": "City Hospital Pharmacy",
  "address": "123 High Street, London, SW1A 1AA",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "phone": "+44 20 1234 5678",
  "hours": "Mon-Fri: 9am-5pm, Sat: 9am-1pm",
  "type": "pharmacy",
  "stockLevel": "high"
}
```

**Required fields**:
- `id`: Unique identifier (string)
- `name`: Location name (string)
- `address`: Full address (string)
- `latitude`: Latitude coordinate (number)
- `longitude`: Longitude coordinate (number)

**Optional fields**:
- `phone`: Contact phone number (string)
- `hours`: Opening hours (string)
- `type`: Location type (pharmacy, hospital, clinic, etc.)
- `stockLevel`: Current stock availability (low, medium, high)

### Deploy to Azure

1. **Create Static Web App**:
   ```bash
   az staticwebapp create \
     --name stoma-pack-finder \
     --resource-group your-resource-group \
     --location uksouth \
     --source . \
     --branch main \
     --app-location "/" \
     --api-location "api" \
     --output-location ""
   ```

2. **Configure Application Settings**:
   
   In the Azure Portal:
   - Go to your Static Web App
   - Navigate to **Configuration** → **Application settings**
   - Add the following settings:
     - `COSMOS_DB_ENDPOINT`: Your Cosmos DB endpoint
     - `COSMOS_DB_KEY`: Your Cosmos DB primary key
     - `COSMOS_DB_DATABASE_ID`: `stomapacks`
     - `COSMOS_DB_CONTAINER_ID`: `locations`

3. **Deploy via GitHub** (Optional):
   - Connect your repository to Azure Static Web Apps
   - GitHub Actions will automatically deploy on push

## Usage

1. Open the application in your web browser
2. Enter a UK postcode (e.g., "SW1A 1AA", "M1 1AE")
3. Click "Search" or press Enter
4. View results on the interactive map
5. Click on markers or location cards for more details

## API Documentation

### GET /api/locations

Query nearby stoma pack locations.

**Query Parameters**:
- `lat` (required): Latitude of search center
- `lon` (required): Longitude of search center
- `radius` (optional): Search radius in kilometers (default: 50)

**Example Request**:
```
GET /api/locations?lat=51.5074&lon=-0.1278&radius=25
```

**Example Response**:
```json
{
  "locations": [
    {
      "id": "loc-1",
      "name": "City Pharmacy",
      "address": "123 High St, London",
      "latitude": 51.5074,
      "longitude": -0.1278,
      "phone": "+44 20 1234 5678",
      "hours": "Mon-Fri: 9am-5pm"
    }
  ],
  "count": 1,
  "searchCenter": {
    "lat": 51.5074,
    "lon": -0.1278
  },
  "searchRadius": 25
}
```

## Performance Considerations

### Cosmos DB Best Practices

1. **Partition Key**: Using `/id` as partition key for even distribution
2. **Consistent Index**: All fields are indexed for fast querying
3. **Geospatial Queries**: Bounding box pre-filter + Haversine distance calculation
4. **Request Units**: Starts at 400 RU/s (scales as needed)

### Caching Strategy

For production, consider:
- Add Azure Redis Cache for frequently accessed locations
- Implement browser caching for static assets
- Use CDN for global distribution

## Cost Estimation

**Estimated Monthly Costs** (based on moderate usage):
- Azure Static Web Apps: £0-9 (Free tier available)
- Azure Cosmos DB: £20-50 (400 RU/s provisioned)
- Azure Functions: £0 (1M free requests/month)

Total: ~£20-60/month

## Security

- API keys stored in Azure Key Vault or App Settings
- CORS configured for your domain only (update in production)
- HTTPS enforced by Azure Static Web Apps
- No sensitive data exposed to frontend

## Troubleshooting

### "Could not find that postcode"
- Verify the postcode format is correct
- Ensure it's a valid UK postcode
- Check internet connectivity for Nominatim API

### "No locations found"
- Increase search radius
- Verify data exists in Cosmos DB
- Check Cosmos DB connection settings

### API Errors
- Verify Cosmos DB credentials in Application Settings
- Check Azure Functions logs in Azure Portal
- Ensure proper CORS configuration

## Contributing

To add more locations:
1. Access your Cosmos DB container in Azure Portal
2. Add new documents following the data structure above
3. Use real coordinates from Google Maps or similar service

## License

MIT License - Feel free to use and modify

## Support

For issues or questions:
- Check the troubleshooting section
- Review Azure Functions logs
- Contact your system administrator

---

Built with ❤️ for the stoma care community
