#!/bin/bash

# Deployment script for Stoma Pack Finder to Azure Static Web Apps
# Using existing resource group and Cosmos DB

set -e

echo "🚀 Stoma Pack Finder - Azure Static Web App Deployment"
echo "========================================================"
echo ""

# Configuration
RESOURCE_GROUP="rs-soccer-rg-uks"
LOCATION="westeurope"  # Static Web Apps not available in uksouth
COSMOS_ACCOUNT="soccer-uks"
WEBAPP_NAME="stoma-pack-finder"
COSMOS_DATABASE_ID="stomapacks"
COSMOS_CONTAINER_ID="locations"

# Get Cosmos DB credentials from Azure (requires Azure CLI login)
echo "🔑 Retrieving Cosmos DB credentials..."
COSMOS_ENDPOINT=$(az cosmosdb show --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query documentEndpoint -o tsv)
COSMOS_KEY=$(az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query primaryMasterKey -o tsv)

echo "Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Cosmos DB: $COSMOS_ACCOUNT"
echo "  Web App: $WEBAPP_NAME"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install: https://nodejs.org/"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Login check
echo "Checking Azure login status..."
az account show &> /dev/null || {
    echo "Please login to Azure:"
    az login
}

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "✅ Logged in to subscription: $SUBSCRIPTION"
echo ""

# Install API dependencies
echo "📦 Installing API dependencies..."
cd api
npm install --production
cd ..
echo "✅ Dependencies installed"
echo ""

# Check if Static Web App exists
echo "🔍 Checking if Static Web App exists..."
WEBAPP_EXISTS=$(az staticwebapp show --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP --query name -o tsv 2>/dev/null || echo "")

if [ -z "$WEBAPP_EXISTS" ]; then
    echo "📦 Creating Static Web App..."
    az staticwebapp create \
        --name $WEBAPP_NAME \
        --resource-group $RESOURCE_GROUP \
        --location $LOCATION \
        --sku Free
    
    echo "✅ Static Web App created"
else
    echo "✅ Static Web App already exists"
fi

# Configure application settings
echo "⚙️  Configuring application settings..."
az staticwebapp appsettings set \
    --name $WEBAPP_NAME \
    --resource-group $RESOURCE_GROUP \
    --setting-names \
        COSMOS_DB_ENDPOINT=$COSMOS_ENDPOINT \
        COSMOS_DB_KEY=$COSMOS_KEY \
        COSMOS_DB_DATABASE_ID=$COSMOS_DATABASE_ID \
        COSMOS_DB_CONTAINER_ID=$COSMOS_CONTAINER_ID

echo "✅ Settings configured"
echo ""

# Get Static Web App URL
WEBAPP_URL=$(az staticwebapp show \
    --name $WEBAPP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query defaultHostname -o tsv)

echo ""
echo "========================================================"
echo "✅ Deployment completed successfully!"
echo "========================================================"
echo ""
echo "📝 Deployment Details:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Cosmos DB: $COSMOS_ACCOUNT"
echo "  Database: $COSMOS_DATABASE_ID"
echo "  Container: $COSMOS_CONTAINER_ID"
echo "  Web App URL: https://$WEBAPP_URL"
echo ""
echo "🔧 Next Steps:"
echo "  1. Ensure data is in Cosmos DB (run: node api/import-sample-data.js)"
echo "  2. Visit your app at: https://$WEBAPP_URL"
echo "  3. Set up CI/CD via GitHub (optional)"
echo ""
echo "💡 To get deployment token for GitHub Actions:"
echo "  az staticwebapp secrets list --name $WEBAPP_NAME --resource-group $RESOURCE_GROUP --query properties.apiKey -o tsv"
echo ""
