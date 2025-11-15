// ---------- Color Helpers ----------
const color = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
};

// ---------- Helper: Percentage Formatter ----------
function printPercentage(position, total, type) {
  if (!total || total === 0) return `0/0 ${type} (0%)`;
  const p = Math.round((position / total) * 100);
  return `${position}/${total} ${type} (${p}%)`;
}

// ---------- Helper: Milliseconds → HH:MM:SS ----------
function msToTime(ms) {
  const hours = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const minutes = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// ---------- Main Function ----------
function initialSyncProgress() {
  const status = db.adminCommand({ replSetGetStatus: 1, initialSync: 1 });

  if (!status.initialSyncStatus) {
    print(color.red + "Initial sync is not currently running." + color.reset);
    return;
  }

  const sync = status.initialSyncStatus;
  const dbNames = Object.keys(sync.databases || {});
  const totalDBs = dbNames.length;
  const clonedDBs = sync.databases.databasesCloned || 0;

  let elapsedMillis = 0;
  let cloningStatus = "";
  let currentDB = "";
  let currentCollection = "";

  // ---------- Loop through each database ----------
  dbNames.forEach(dbName => {
    const dbInfo = sync.databases[dbName];

    if (!dbInfo || typeof dbInfo === "number") return;

    // If this DB is currently cloning
    if (dbInfo.clonedCollections < dbInfo.collections) {
      currentDB = dbName;
      cloningStatus +=
        `\n${color.blue}${color.bold}→ Cloning database:${color.reset} ${dbName}\n`;
      cloningStatus +=
        `   ${printPercentage(dbInfo.clonedCollections, dbInfo.collections, "collections")}`;

      // Find active collection
      Object.keys(dbInfo).forEach(coll => {
        const c = dbInfo[coll];
        if (c && typeof c === "object" &&
            c.documentsToCopy &&
            c.documentsCopied < c.documentsToCopy) {

          currentCollection = coll;
          cloningStatus += `\n   ${color.cyan}Cloning collection:${color.reset} ${coll}\n`;
          cloningStatus +=
            `   ${printPercentage(c.documentsCopied, c.documentsToCopy, "documents")}`;
        }
      });
    }

    // Add elapsed time
    if (dbInfo.elapsedMillis) elapsedMillis += dbInfo.elapsedMillis;
  });

  // ---------- Header ----------
  print(color.bold + "====================" + color.reset);
  print(color.bold + " Initial Sync Status" + color.reset);
  print(color.bold + "====================" + color.reset);

  // ---------- Start time ----------
  const start = sync.initialSyncStart;
  const now = new Date();
  print(`Cloning started at: ${color.yellow}${start}${color.reset}`);
  print(`Elapsed: ${color.green}${msToTime(now - start)}${color.reset}`);

  // ---------- Compare with PRIMARY optime ----------
  const primary = status.members.find(m => m.stateStr === "PRIMARY");
  if (primary) {
    const lag = primary.optimeDate - start;
    print(
      `Lag behind PRIMARY (optime): ${color.green}${msToTime(lag)}${color.reset}`
    );
  }

  // ---------- Failures handling ----------
  if (sync.initialSyncAttempts && sync.initialSyncAttempts.length > 0) {
    const failCount = sync.initialSyncAttempts.length;
    print(
      `${color.red}Cloning has failed ${failCount} time(s) previously.${color.reset}`
    );
    print(
      `${color.red}Last failure:${color.reset} ${sync.initialSyncAttempts[failCount - 1].status}`
    );
  }

  // ---------- DB-Level Summary ----------
  print("\n" + color.bold + "Database Progress:" + color.reset);
  print(
    color.green +
    `Cloned ${printPercentage(clonedDBs, totalDBs, "databases")}` +
    color.reset
  );

  // ---------- Active Cloning Info ----------
  if (currentDB) {
    print("\n" + color.bold + "Currently Cloning:" + color.reset);
    print(cloningStatus);
  } else {
    print(color.green + "All databases appear cloned." + color.reset);
  }

  // ---------- Total elapsed time in DB cloning ----------
  print(
    `\nTotal DB clone time recorded: ${color.green}${msToTime(elapsedMillis)}${color.reset}`
  );
}

// Auto-run when file is loaded
initialSyncProgress();
