#!/bin/bash

# Ensure the script is run as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# Variables to hold summary data
SUMMARY_SCHED=""
SUMMARY_NUMA="Disabled"
SUMMARY_THP="Unknown"
SUMMARY_SWAP="Not Available"
SUMMARY_READAHEAD=""

# 1. Disk Scheduler Logic
for dev in /sys/block/sd* /sys/block/nvme*; do
    if [ -e "$dev/queue/scheduler" ]; then
        disk_name=$(basename $dev)
        sched_val=$(cat $dev/queue/scheduler | sed -n 's/.*\[\(.*\)\].*/\1/p')
        SUMMARY_SCHED+="$disk_name: $sched_val; "
    fi
done

# 2. NUMA Logic
node_count=$(ls -d /sys/devices/system/node/node* 2>/dev/null | wc -l)
if [ "$node_count" -gt 1 ]; then
    SUMMARY_NUMA="Enabled ($node_count nodes)"
fi

# 3. THP Logic
if [ -f /sys/kernel/mm/transparent_hugepage/enabled ]; then
    if grep -q "\[never\]" /sys/kernel/mm/transparent_hugepage/enabled; then
        SUMMARY_THP="Disabled"
    else
        SUMMARY_THP="Enabled"
    fi
fi

# 4. Swappiness
SUMMARY_SWAPPINESS=$(sysctl -n vm.swappiness)

# 5. Swap File Logic
if [ -n "$(swapon --show --noheadings)" ]; then
    SUMMARY_SWAP="Available"
fi

# 6. Readahead Logic (Converting sectors to KB)
# blockdev --getra returns sectors. 1 sector = 512 bytes.
# So, KB = (Sectors * 512) / 1024
for dev in /dev/sd* /dev/nvme*n1; do
    if [[ $dev =~ ^/dev/[a-z]+$ ]] || [[ $dev =~ ^/dev/nvme[0-9]n[0-9]$ ]]; then
        if [ -e "$dev" ]; then
            ra_sectors=$(blockdev --getra $dev)
            ra_kb=$((ra_sectors * 512 / 1024))
            SUMMARY_READAHEAD+="$(basename $dev): ${ra_kb}KB; "
        fi
    fi
done

# --- FINAL SUMMARY OUTPUT ---
echo "==================================================="
echo "           SYSTEM CONFIGURATION SUMMARY            "
echo "==================================================="
echo "Disk Scheduler: ${SUMMARY_SCHED:-None found}"
echo "NUMA:           $SUMMARY_NUMA"
echo "THP:            $SUMMARY_THP"
echo "Swappiness:     $SUMMARY_SWAPPINESS"
echo "Swap File:      $SUMMARY_SWAP"
echo "Readahead:      $SUMMARY_READAHEAD"
echo "==================================================="
