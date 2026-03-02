#!/usr/bin/env node

const { CosmosClient } = require("@azure/cosmos");

// Get configuration from environment or local.settings.json
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE_ID || "stomapacks";
const containerId = process.env.COSMOS_DB_CONTAINER_ID || "locations";

if (!endpoint || !key) {
    console.error("❌ Error: COSMOS_DB_ENDPOINT and COSMOS_DB_KEY must be set");
    console.error("   Set these in api/local.settings.json or as environment variables");
    process.exit(1);
}

console.log("🚀 Setting up Azure Cosmos DB structure...\n");
console.log(`📍 Endpoint: ${endpoint}`);
console.log(`📦 Database: ${databaseId}`);
console.log(`📁 Container: ${containerId}\n`);

const client = new CosmosClient({ endpoint, key });

async function setup() {
    try {
        // Create database if it doesn't exist
        console.log("Creating database...");
        const { database } = await client.databases.createIfNotExists({
            id: databaseId
        });
        console.log(`✅ Database '${databaseId}' ready`);

        // Create container if it doesn't exist
        console.log("\nCreating container...");
        const { container } = await database.containers.createIfNotExists({
            id: containerId,
            partitionKey: {
                paths: ["/id"]
            }
            // Note: Throughput is not specified for serverless accounts
        });
        console.log(`✅ Container '${containerId}' ready`);

        // Check if data exists
        console.log("\nChecking for existing data...");
        const { resources } = await container.items
            .query("SELECT VALUE COUNT(1) FROM c")
            .fetchAll();
        
        const count = resources[0];
        console.log(`📊 Current item count: ${count}`);

        if (count === 0) {
            console.log("\n⚠️  Container is empty. Run './import-sample-data.js' to add sample locations.");
        } else {
            console.log("\n✅ Database setup complete! Your API should now work.");
        }

        console.log("\n" + "=".repeat(50));
        console.log("🎉 Setup completed successfully!");
        console.log("=".repeat(50));
        console.log("\n📝 Next steps:");
        console.log("   1. If container is empty, run: node api/import-sample-data.js");
        console.log("   2. Test API: curl \"http://localhost:7071/api/locations?lat=51.5074&lon=-0.1278&radius=50\"");
        console.log("   3. Open the web app: open index.html\n");

    } catch (error) {
        console.error("\n❌ Setup failed:", error.message);
        if (error.code === 401) {
            console.error("\n💡 This is likely an authentication error.");
            console.error("   Check that your COSMOS_DB_KEY is correct in api/local.settings.json");
        }
        process.exit(1);
    }
}

setup();
