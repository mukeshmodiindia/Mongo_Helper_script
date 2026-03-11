1. Read Into Cache
max(rate(mongodb_ss_wt_cache_bytes_read_into_cache[1m]) / 1024 / 1024) by (rs_nm, service_name)
2️ Cache Pressure Estimate
avg by (service_name, type) (
  rate(mongodb_ss_wt_cache_unmodified_pages_evicted[1s]) 
  or 
  irate(mongodb_ss_wt_cache_unmodified_pages_evicted[1s])
)
️⃣3. Opcounters / Throughput
max(rate(mongodb_ss_opcounters[1m])) by (legacy_op_type, rs_nm, service_name)
4.️⃣ Operation Latency Average
(max(rate(mongodb_ss_opLatencies_latency[1m]))) 
/
(sum(rate(mongodb_ss_opLatencies_ops[1m])))
5️⃣ Write Conflicts
max by (service_name, rs_nm) (
  rate(mongodb_ss_metrics_operation_writeConflicts[1m])
)
6️⃣ Flow Control
avg by (service_name, rs_nm) (
  rate(mongodb_ss_flowControl_timeAcquiringMicros[1m]) / 1000
)
7️⃣ Cache Miss Ratio
avg by (service_name, rs_nm) (
  rate(mongodb_ss_wt_cache_pages_read_into_cache[5s]) 
  /
  rate(mongodb_ss_wt_cache_pages_requested_from_cache[5s])
)
8️⃣ High Heap Usage
avg by (service_name, rs_nm) (
  ((mongodb_ss_tcmalloc_tcmalloc_pageheap_free_bytes) / 1024 / 1024)
  /
  (mongodb_ss_mem_resident) * 100
)
9️⃣ High Dirty Ratio
avg by (service_name, rs_nm) (
  mongodb_ss_wt_cache_tracked_dirty_bytes_in_the_cache
  /
  mongodb_ss_wt_cache_maximum_bytes_configured
)
🔟 WiredTiger Concurrent Transactions
max by (service_name, txn_rw) (
  mongodb_ss_wt_concurrentTransactions_available{txn_rw=~"write|read"}
  /
  mongodb_ss_wt_concurrentTransactions_total
)
1️⃣1️⃣ Operation Type per Replica Set State
sum by (rs_state) (
  rate(
    mongodb_ss_opcounters{
      legacy_op_type=~"command|getmore|query",
      replication_set="boom_replication_set"
    }[1m]
  )
)
