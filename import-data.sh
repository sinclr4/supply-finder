#!/bin/bash

# Script to import sample data into Azure Cosmos DB
# Prerequisites: Azure CLI installed and logged in

# Configuration
RESOURCE_GROUP="your-resource-group"
ACCOUNT_NAME="stoma-pack-finder-db"
DATABASE_NAME="stomapacks"
CONTAINER_NAME="locations"
SAMPLE_DATA_FILE="sample-data.json"

echo "🚀 Starting data import to Azure Cosmos DB..."
echo "================================================"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    echo "Visit: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
az account show &> /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Check if sample data file exists
if [ ! -f "$SAMPLE_DATA_FILE" ]; then
    echo "❌ Sample data file not found: $SAMPLE_DATA_FILE"
    exit 1
fi

echo "📂 Reading sample data from $SAMPLE_DATA_FILE"

# Get Cosmos DB endpoint and key
echo "🔑 Retrieving Cosmos DB credentials..."
COSMOS_ENDPOINT=$(az cosmosdb show \
    --name $ACCOUNT_NAME \
    --resource-group $RESOURCE_GROUP \
    --query documentEndpoint -o tsv)

COSMOS_KEY=$(az cosmosdb keys list \
    --name $ACCOUNT_NAME \
    --resource-group $RESOURCE_GROUP \
    --query primaryMasterKey -o tsv)

if [ -z "$COSMOS_ENDPOINT" ] || [ -z "$COSMOS_KEY" ]; then
    echo "❌ Failed to retrieve Cosmos DB credentials"
    exit 1
fi

echo "✅ Cosmos DB endpoint: $COSMOS_ENDPOINT"

# Import each document
echo "📥 Importing documents..."

# Use Node.js to import (create a temporary script)
cat > /tmp/import-cosmos.js << 'EOF'
const { CosmosClient } = require("@azure/cosmos");
const fs = require("fs");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.DATABASE_NAME;
const containerId = process.env.CONTAINER_NAME;
const dataFile = process.env.SAMPLE_DATA_FILE;

const client = new CosmosClient({ endpoint, key });

async function importData() {
    try {
        const database = client.database(databaseId);
        const container = database.container(containerId);
        
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        
        console.log(`Importing ${data.length} documents...`);
        
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            await container.items.upsert(item);
            console.log(`✅ Imported: ${item.name} (${i + 1}/${data.length})`);
        }
        
        console.log("\n🎉 Import completed successfully!");
    } catch (error) {
        console.error("❌ Import failed:", error.message);
        process.exit(1);
    }
}

importData();
EOF

# Check if @azure/cosmos is installed
if [ ! -d "api/node_modules/@azure/cosmos" ]; then
    echo "📦 Installing @azure/cosmos package..."
    cd api && npm install @azure/cosmos && cd ..
fi

# Run the import
export COSMOS_ENDPOINT=$COSMOS_ENDPOINT
export COSMOS_KEY=$COSMOS_KEY
export DATABASE_NAME=$DATABASE_NAME
export CONTAINER_NAME=$CONTAINER_NAME
export SAMPLE_DATA_FILE=$SAMPLE_DATA_FILE

node /tmp/import-cosmos.js

# Cleanup
rm -f /tmp/import-cosmos.js

echo "================================================"
echo "✨ Data import process completed!"
