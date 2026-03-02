#!/usr/bin/env node

const { CosmosClient } = require("@azure/cosmos");
const fs = require("fs");
const path = require("path");

// Get configuration
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE_ID || "stomapacks";
const containerId = process.env.COSMOS_DB_CONTAINER_ID || "locations";

if (!endpoint || !key) {
    console.error("❌ Error: COSMOS_DB_ENDPOINT and COSMOS_DB_KEY must be set");
    console.error("   Run 'node api/setup-database.js' first or check api/local.settings.json");
    process.exit(1);
}

// Load sample data
const sampleDataPath = path.join(__dirname, "..", "sample-data.json");
if (!fs.existsSync(sampleDataPath)) {
    console.error(`❌ Sample data file not found: ${sampleDataPath}`);
    process.exit(1);
}

const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, "utf8"));

console.log("📥 Importing sample data to Azure Cosmos DB...\n");
console.log(`📍 Endpoint: ${endpoint}`);
console.log(`📦 Database: ${databaseId}`);
console.log(`📁 Container: ${containerId}`);
console.log(`📊 Items to import: ${sampleData.length}\n`);

const client = new CosmosClient({ endpoint, key });

async function importData() {
    try {
        const database = client.database(databaseId);
        const container = database.container(containerId);

        // Verify container exists
        try {
            await container.read();
        } catch (error) {
            console.error("❌ Container does not exist. Run 'node api/setup-database.js' first.");
            process.exit(1);
        }

        console.log("Starting import...\n");

        let imported = 0;
        let skipped = 0;

        for (const item of sampleData) {
            try {
                await container.items.upsert(item);
                console.log(`✅ [${imported + 1}/${sampleData.length}] ${item.name}`);
                imported++;
            } catch (error) {
                console.log(`⚠️  [${imported + 1}/${sampleData.length}] Skipped ${item.name}: ${error.message}`);
                skipped++;
            }
        }

        console.log("\n" + "=".repeat(50));
        console.log("🎉 Import completed!");
        console.log("=".repeat(50));
        console.log(`✅ Successfully imported: ${imported}`);
        if (skipped > 0) {
            console.log(`⚠️  Skipped: ${skipped}`);
        }
        console.log("\n📝 Next steps:");
        console.log("   1. Test API: curl \"http://localhost:7071/api/locations?lat=51.5074&lon=-0.1278&radius=50\"");
        console.log("   2. Open the web app in your browser");
        console.log("   3. Try searching for postcodes like 'SW1A 1AA', 'M1 1AE', 'B1 1AA'\n");

    } catch (error) {
        console.error("\n❌ Import failed:", error.message);
        process.exit(1);
    }
}

importData();
