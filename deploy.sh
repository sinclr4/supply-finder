#!/bin/bash

# Quick deployment script for Stoma Pack Finder
# This script helps deploy the application to Azure

set -e

echo "🚀 Stoma Pack Finder - Azure Deployment Script"
echo "================================================"
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

# Get configuration
read -p "Enter resource group name (default: stoma-pack-finder-rg): " RESOURCE_GROUP
RESOURCE_GROUP=${RESOURCE_GROUP:-stoma-pack-finder-rg}

read -p "Enter location (default: uksouth): " LOCATION
LOCATION=${LOCATION:-uksouth}

read -p "Enter Cosmos DB account name (default: stoma-pack-finder-db): " COSMOS_ACCOUNT
COSMOS_ACCOUNT=${COSMOS_ACCOUNT:-stoma-pack-finder-db}

read -p "Enter Static Web App name (default: stoma-pack-finder): " WEBAPP_NAME
WEBAPP_NAME=${WEBAPP_NAME:-stoma-pack-finder}

echo ""
echo "Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Cosmos DB: $COSMOS_ACCOUNT"
echo "  Web App: $WEBAPP_NAME"
echo ""

read -p "Continue with deployment? (y/N): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "================================================"
echo "Starting deployment..."
echo "================================================"
echo ""

# Create resource group
echo "📦 Creating resource group..."
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output none

echo "✅ Resource group created"

# Create Cosmos DB account
echo "🗄️  Creating Cosmos DB account (this may take several minutes)..."
az cosmosdb create \
    --name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --default-consistency-level Session \
    --locations regionName=$LOCATION failoverPriority=0 \
    --enable-free-tier false \
    --output none

echo "✅ Cosmos DB account created"

# Create database
echo "📊 Creating database..."
az cosmosdb sql database create \
    --account-name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --name stomapacks \
    --output none

echo "✅ Database created"

# Create container
echo "📦 Creating container..."
az cosmosdb sql container create \
    --account-name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --database-name stomapacks \
    --name locations \
    --partition-key-path "/id" \
    --throughput 400 \
    --output none

echo "✅ Container created"

# Get Cosmos DB credentials
echo "🔑 Retrieving Cosmos DB credentials..."
COSMOS_ENDPOINT=$(az cosmosdb show \
    --name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --query documentEndpoint -o tsv)

COSMOS_KEY=$(az cosmosdb keys list \
    --name $COSMOS_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --query primaryMasterKey -o tsv)

echo "✅ Credentials retrieved"

# Install API dependencies
echo "📦 Installing API dependencies..."
cd api
npm install --production
cd ..

echo "✅ Dependencies installed"

# Create Static Web App
echo "🌐 Creating Static Web App..."

# Note: For GitHub integration, you'll need to set up the repository connection
# This creates a basic Static Web App that you can configure later
az staticwebapp create \
    --name $WEBAPP_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --output none

echo "✅ Static Web App created"

# Configure application settings
echo "⚙️  Configuring application settings..."
az staticwebapp appsettings set \
    --name $WEBAPP_NAME \
    --resource-group $RESOURCE_GROUP \
    --setting-names \
        COSMOS_DB_ENDPOINT=$COSMOS_ENDPOINT \
        COSMOS_DB_KEY=$COSMOS_KEY \
        COSMOS_DB_DATABASE_ID=stomapacks \
        COSMOS_DB_CONTAINER_ID=locations \
    --output none

echo "✅ Settings configured"

# Get deployment token
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
    --name $WEBAPP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query properties.apiKey -o tsv)

# Get Static Web App URL
WEBAPP_URL=$(az staticwebapp show \
    --name $WEBAPP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query defaultHostname -o tsv)

echo ""
echo "================================================"
echo "✅ Deployment completed successfully!"
echo "================================================"
echo ""
echo "📝 Deployment Details:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Cosmos DB Endpoint: $COSMOS_ENDPOINT"
echo "  Web App URL: https://$WEBAPP_URL"
echo ""
echo "🔧 Next Steps:"
echo "  1. Import sample data: ./import-data.sh"
echo "  2. Configure GitHub deployment (optional)"
echo "  3. Visit your app at: https://$WEBAPP_URL"
echo ""
echo "📚 For manual deployment via GitHub:"
echo "  - Add deployment token to GitHub secrets as AZURE_STATIC_WEB_APPS_API_TOKEN"
echo "  - Token: $DEPLOYMENT_TOKEN"
echo ""
echo "💡 To import sample data, edit import-data.sh with these values:"
echo "  RESOURCE_GROUP=\"$RESOURCE_GROUP\""
echo "  ACCOUNT_NAME=\"$COSMOS_ACCOUNT\""
echo ""
