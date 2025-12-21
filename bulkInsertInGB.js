// Function to generate a document with a specific size
function generateLargeDocument() {
    // MongoDB has a HARD LIMIT of 16MB per single document.
    // We use 1MB per document to ensure stability and better distribution.
    const docSize = 1 * 1024 * 1024; 
    const filler = 'a'.repeat(docSize - 100); // Adjusting slightly for metadata overhead

    return {
        _id: new ObjectId(),
        data: filler,
        timestamp: new Date()
    };
}

// Function to insert data in batches
function generateData(targetGB, collectionName) {
    const targetBytes = targetGB * 1024 * 1024 * 1024;
    const docSize = 1 * 1024 * 1024; // 1 MB
    const numDocuments = Math.ceil(targetBytes / docSize);
    
    // Using a batch size of 500 to avoid hitting the 48MB per-message limit for insertMany
    const batchSize = 500; 
    let insertedDocs = 0;

    print(`--- Starting Data Generation ---`);
    print(`Target Collection Size: ${targetGB} GB`);
    print(`Total Documents to Insert: ${numDocuments}`);

    while (insertedDocs < numDocuments) {
        let batch = [];
        for (let j = 0; j < batchSize && insertedDocs < numDocuments; j++) {
            batch.push(generateLargeDocument());
            insertedDocs++;
        }

        try {
            db[collectionName].insertMany(batch, { ordered: false });
            
            // Log progress every 1GB
            if (insertedDocs % 1000 === 0) {
                let currentGB = (insertedDocs / 1024).toFixed(2);
                print(`Progress: ${currentGB} GB / ${targetGB} GB inserted...`);
            }
        } catch (e) {
            print(`Error during insertMany: ${e}`);
            break;
        }
    }
    print(`--- Data generation complete: ${targetGB} GB inserted into '${collectionName}' ---`);
}

// --- Execution ---
use miku; //Specify the DB NAME in which you want bulk insert

// Set target to 30 GB
generateData(30, 'largeDataCollection'); //Specify different if you want to insert other than 30G
