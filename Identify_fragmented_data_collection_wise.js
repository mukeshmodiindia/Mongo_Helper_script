const EXCLUDED_DBS = new Set(["admin", "local", "config"]);

let totalReuseBytes = 0;
let totalStorageBytes = 0;
let totalDataBytes = 0;

let results = [];

const THRESHOLD = 500 * 1024 * 1024; // 500 MB

function toNumber(x) {
  if (x === undefined || x === null) return 0;
  if (typeof x === 'number') return x;
  if (typeof x === 'object' && typeof x.toNumber === 'function') {
    return x.toNumber();
  }
  if (typeof x.valueOf === 'function') {
    return x.valueOf();
  }
  return 0;
}

// Iterate over all databases
db.adminCommand({ listDatabases: 1 }).databases.forEach(dbInfo => {
  const dbName = dbInfo.name;
  if (EXCLUDED_DBS.has(dbName)) return;

  const database = db.getSiblingDB(dbName);

  database.getCollectionNames().forEach(collName => {
    if (collName.startsWith("system.")) return;

    try {
      const stats = database.runCommand({ collStats: collName, scale: 1 });
      if (!stats.ok) return;

      let reuse = 0;
      if (
        stats.wiredTiger &&
        stats.wiredTiger["block-manager"] &&
        stats.wiredTiger["block-manager"]["file bytes available for reuse"] !== undefined
      ) {
        reuse = toNumber(
          stats.wiredTiger["block-manager"]["file bytes available for reuse"]
        );
      }

      const storage = toNumber(stats.storageSize);
      const data = toNumber(stats.size);

      totalReuseBytes += reuse;
      totalStorageBytes += storage;
      totalDataBytes += data;

      // Apply threshold filter
      if (reuse > THRESHOLD) {
        results.push({
          ns: `${dbName}.${collName}`,
          reuse: reuse,
          storage: storage,
          data: data
        });
      }

    } catch (e) {
      print(`Error processing ${dbName}.${collName}: ${e}`);
    }
  });
});

// Sort ascending by reuse
results.sort((a, b) => a.reuse - b.reuse);

// Print filtered collections
print("\n=== Collections with Reuse > 500 MB ===");
results.forEach(r => {
  const reuseMB = r.reuse / 1024 / 1024;
  const storageMB = r.storage / 1024 / 1024;
  const dataMB = r.data / 1024 / 1024;

  const fragPct = r.storage > 0 ? (r.reuse / r.storage) * 100 : 0;

  print(
    `${r.ns} | Reuse: ${reuseMB.toFixed(2)} MB | ` +
    `Storage: ${storageMB.toFixed(2)} MB | ` +
    `Data: ${dataMB.toFixed(2)} MB | ` +
    `Frag%: ${fragPct.toFixed(2)}`
  );
});

// Totals
print("\n=== Total WiredTiger Fragmentation (All Databases) ===");
print(`Total Reusable: ${(totalReuseBytes / 1024 / 1024).toFixed(2)} MB`);
print(`Total DataSize: ${(totalDataBytes / 1024 / 1024).toFixed(2)} MB`);
print(`Total StorageSize: ${(totalStorageBytes / 1024 / 1024).toFixed(2)} MB`);

if (totalStorageBytes > 0) {
  const fragPct = (totalReuseBytes / totalStorageBytes) * 100;
  print(`Fragmentation Ratio: ${fragPct.toFixed(2)} %`);
}
