var printPercentage = function (position, length, type) {
  var p = Math.round((position / length) * 100, 2);
  return position + "/" + length + " " + type + " (" + p + "%)";
}

var msToTime = function (duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

var initialSyncProgress = function () {
  var status = db.adminCommand({ replSetGetStatus: 1, initialSync: 1 });
  
  // *** NEW: Variables for total collection count ***
  var total_collections = 0;
  var total_collections_cloned = 0;
  
  var dbs_cloned = status.initialSyncStatus.databases.databasesCloned;
  delete status.initialSyncStatus.databases.databasesCloned;
  var dbs = Object.keys(status.initialSyncStatus.databases);
  var dbs_total = dbs.length;

  var elapsedMillis = 0;
  var currentlyCloningStatus = "";

  for (var i = 0; i < dbs_total; i++) {
    var d = status.initialSyncStatus.databases[dbs[i]];
    
    // *** NEW: Accumulate total collection counts ***
    total_collections += d.collections;
    total_collections_cloned += d.clonedCollections;

    // if the counts aren't the same either it's the database that's in progress or
    // hasn't started cloning yet
    if (d.clonedCollections < d.collections) {
      currentlyCloningStatus = "Cloning database " + dbs[i];
      currentlyCloningStatus += " - cloned " + printPercentage(d.clonedCollections, d.collections, "collections");
      var collectionKeys = Object.keys(d);
      for (var j = 0; j < collectionKeys.length; j++) {
        var c = d[collectionKeys[j]];
        if (c && c.hasOwnProperty("documentsToCopy") && (c.documentsCopied < c.documentsToCopy)) { // Added null/undefined check for 'c'
          currentlyCloningStatus += "\nCloning collection " + collectionKeys[j] + " " + printPercentage(c.documentsCopied, c.documentsToCopy, "documents");
        }
      }
    }
    // only add time if there's time to record
    if (d.hasOwnProperty("elapsedMillis")) {
      elapsedMillis += d.elapsedMillis;
    }
  }
  print("===================")
  print("Initial Sync Status")
  print("===================")
  var now = new Date();
  var started = status.initialSyncStatus.initialSyncStart;
  print("Cloning started at " + started + " (" + msToTime(now - started) + " ago)");
  var members = status.members;
  for (var i = 0; i < members.length; i++) {
    if (members[i].stateStr == "PRIMARY") {
      var optime = members[i].optimeDate
      var me = new Date(status.initialSyncStatus.initialSyncStart.getTime());
      print("Currently " + msToTime(optime - me) + " behind the PRIMARY (based on optimes)");
    }
  }
  if (status.initialSyncStatus.hasOwnProperty("initialSyncAttempts") && status.initialSyncStatus.initialSyncAttempts.length > 0) {
    var failures = status.initialSyncStatus.initialSyncAttempts.length;
    print("Cloning has already failed " + failures + " time(s) ...");
    print("Last Failure: " + status.initialSyncStatus.initialSyncAttempts[failures - 1].status);
  }
  print("Copying databases for " + msToTime(elapsedMillis) + ". Note this updates AFTER a collection has been cloned.");
  
  // *** NEW OUTPUT LINE ***
  print("Cloned " + printPercentage(total_collections_cloned, total_collections, "collections total"));
  
  print("Cloned " + printPercentage(dbs_cloned, dbs_total, "databases"));
  print(currentlyCloningStatus);
}

initialSyncProgress();
