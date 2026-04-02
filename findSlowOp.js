db.currentOp({"secs_running": {$gte: 0}}).inprog.forEach(function(op) {
    if (op.secs_running > 0 &&
        (!op.effectiveUsers || !op.effectiveUsers.some(user => user.user === "__system")) &&
        (!op.command || op.command.hello === undefined) // Exclude 'hello' ops
    ) {
        print(
            "secs_running: " + op.secs_running +
            ", opid: " + op.opid +
            ", user: " + JSON.stringify(op.effectiveUsers) +
            ", clientip: " + op.client +
            ", plan: " + op.planSummary +
            ", ns: " + op.ns +
            ", cmd: " + JSON.stringify(op.op) +
            ", command: " + JSON.stringify(op.command) +
            ", Driver: " + (op.clientMetadata ? op.clientMetadata.driver.name : "N/A")
        );
    }
});
