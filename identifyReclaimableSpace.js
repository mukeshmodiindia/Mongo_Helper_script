freeSpace = function () {
    var totalBytes = 0;
    var bytesInGB = 1024 * 1024 * 1024;

    var adminDB = db.getSiblingDB("admin");
    var databases = adminDB.runCommand({ listDatabases: 1 }).databases;

    databases.forEach(function (dbInfo) {
        var dbName = dbInfo.name;

        if (dbName === "local" || dbName === "admin" || dbName === "config") return;

        var currentDB = db.getSiblingDB(dbName);
        var collections = currentDB.getCollectionNames();

        collections.forEach(function (colName) {
            if (colName === "system.profile") return;

            var stats = currentDB.getCollection(colName).stats();

            // Safely extract reclaimable bytes
            var reclaimable = (
                stats.wiredTiger &&
                stats.wiredTiger["block-manager"] &&
                stats.wiredTiger["block-manager"]["file bytes available for reuse"]
            ) || 0;

            // Convert to number safely
            reclaimable = Number(reclaimable);

            print("DB: " + dbName + " | Collection: " + colName);
            print("Reclaimable (GB): " + (reclaimable / bytesInGB));

            totalBytes += reclaimable;
        });
    });

    print("----------------------------------------------------");
    print("Total reclaimable space across all DBs (GB): " + (totalBytes / bytesInGB));
    print("Total reclaimable space across all DBs (Bytes): " + totalBytes);
    print("----------------------------------------------------");
};

freeSpace();
