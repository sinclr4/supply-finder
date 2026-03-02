# 🚀 Quick Start Guide

Get the Stoma Pack Finder up and running in minutes!

## Option 1: Automated Deployment (Recommended)

The easiest way to deploy everything to Azure:

```bash
./deploy.sh
```

This script will:
- Create all Azure resources (Resource Group, Cosmos DB, Static Web App)
- Configure application settings automatically
- Give you a deployed website URL

After deployment, import sample data:

```bash
# Edit import-data.sh first and set your resource group name
./import-data.sh
```

## Option 2: Manual Local Development

### Step 1: Install Dependencies

```bash
cd api
npm install
cd ..
```

### Step 2: Set Up Cosmos DB

1. **Create in Azure Portal** or use Azure CLI:
   ```bash
   az cosmosdb create --name your-db-name --resource-group your-rg
   az cosmosdb sql database create --account-name your-db-name --name stomapacks --resource-group your-rg
   az cosmosdb sql container create --account-name your-db-name --database-name stomapacks --name locations --partition-key-path "/id" --throughput 400 --resource-group your-rg
   ```

2. **Get credentials**:
   - Endpoint: Portal → Cosmos DB → Keys → URI
   - Key: Portal → Cosmos DB → Keys → Primary Key

### Step 3: Configure Local Settings

```bash
cp api/local.settings.json.template api/local.settings.json
```

Edit `api/local.settings.json` with your Cosmos DB credentials.

### Step 4: Run Locally

**Terminal 1** - Start API:
```bash
cd api
npm start
```

**Terminal 2** - Serve frontend:
```bash
npx http-server -p 8080
```

**Open**: http://localhost:8080

### Step 5: Add Test Data

Import the sample data:
```bash
./import-data.sh
```

Or manually add documents in Azure Portal → Cosmos DB → Data Explorer.

## Testing the Application

1. Open the web app
2. Enter a test postcode:
   - London: `SW1A 1AA`
   - Manchester: `M1 1AE`
   - Birmingham: `B1 1AA`
   - Edinburgh: `EH1 1AA`
3. Click "Search" or press Enter
4. View results on the map!

## Troubleshooting

### Cannot find module '@azure/cosmos'
```bash
cd api
npm install
```

### Postcode not found
- Use valid UK postcodes
- Check internet connection (Nominatim API)

### No locations found
- Import sample data first
- Check Cosmos DB has documents
- Verify Cosmos DB settings in local.settings.json

### API errors (500)
- Check Azure Functions logs
- Verify Cosmos DB credentials
- Ensure database and container exist

## Adding Your Own Data

Add documents to Cosmos DB with this structure:

```json
{
  "id": "unique-id",
  "name": "Location Name",
  "address": "Full Address with Postcode",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "phone": "+44 20 1234 5678",
  "hours": "Mon-Fri: 9am-5pm"
}
```

**Getting coordinates**:
- Google Maps: Right-click → "What's here?" → Copy coordinates
- OpenStreetMap: Search location → URL shows lat/lon

## Production Checklist

Before going live:

- [ ] Add real location data to Cosmos DB
- [ ] Update CORS settings in `staticwebapp.config.json`
- [ ] Enable monitoring and Application Insights
- [ ] Set up custom domain (optional)
- [ ] Review and optimize Cosmos DB RU/s based on usage
- [ ] Add error tracking (e.g., Sentry)
- [ ] Test on mobile devices
- [ ] Add privacy policy and terms of service

## Useful Commands

**View Azure Functions logs locally**:
```bash
cd api
func start --verbose
```

**Test API endpoint**:
```bash
curl "http://localhost:7071/api/locations?lat=51.5074&lon=-0.1278&radius=50"
```

**Deploy to Azure (after setup)**:
```bash
# Static Web Apps CLI (optional)
npm install -g @azure/static-web-apps-cli
swa deploy
```

## Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure Cosmos DB Documentation](https://docs.microsoft.com/azure/cosmos-db/)
- [Leaflet.js Documentation](https://leafletjs.com/)
- [Nominatim API](https://nominatim.org/release-docs/develop/api/Search/)

## Need Help?

1. Check README.md for detailed documentation
2. Review troubleshooting section above
3. Check Azure Portal for logs and diagnostics
4. Verify all environment variables are set correctly

---

**Ready to deploy?** Run `./deploy.sh` and you'll be live in minutes! 🚀
