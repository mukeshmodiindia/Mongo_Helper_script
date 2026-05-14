#!/bin/bash

# Ensure the script is run as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

# Detect OS for context
OS_INFO=$(grep '^PRETTY_NAME' /etc/os-release | cut -d'=' -f2 | tr -d '"')

# Variables to hold summary data
SUMMARY_SCHED=""
SUMMARY_NUMA="Disabled"
SUMMARY_THP="Unknown"
SUMMARY_SWAP="Not Available"
SUMMARY_READAHEAD=""

# 1. Disk Scheduler Logic
# Added 'xvd' to support older Xen/AWS instances found in Debian/Amazon Linux
for dev in /sys/block/sd* /sys/block/nvme* /sys/block/xvd*; do
    if [ -e "$dev/queue/scheduler" ]; then
        disk_name=$(basename $dev)
        # sed logic picks the value inside [brackets]
        sched_val=$(cat $dev/queue/scheduler | sed -n 's/.*\[\(.*\)\].*/\1/p')
        # If no brackets exist (common on some NVMe/Virtual drivers), take the whole line
        if [ -z "$sched_val" ]; then sched_val=$(cat $dev/queue/scheduler); fi
        SUMMARY_SCHED+="$disk_name: $sched_val; "
    fi
done

# 2. NUMA Logic
node_count=$(ls -d /sys/devices/system/node/node* 2>/dev/null | wc -l)
if [ "$node_count" -gt 1 ]; then
    SUMMARY_NUMA="Enabled ($node_count nodes)"
fi

# 3. THP Logic
# Ubuntu/Debian use the same path as RHEL/AL
if [ -f /sys/kernel/mm/transparent_hugepage/enabled ]; then
    if grep -q "\[never\]" /sys/kernel/mm/transparent_hugepage/enabled; then
        SUMMARY_THP="Disabled"
    else
        SUMMARY_THP="Enabled"
    fi
fi

# 4. Swappiness
SUMMARY_SWAPPINESS=$(sysctl -n vm.swappiness 2>/dev/null || echo "N/A")

# 5. Swap File Logic
# swapon is standard across all target distros
if [ -n "$(swapon --show --noheadings 2>/dev/null)" ]; then
    SUMMARY_SWAP="Available"
fi

# 6. Readahead Logic (Converting sectors to KB)
# Enhanced regex to catch /dev/sda, /dev/nvme0n1, and /dev/xvda
for dev in /dev/sd[a-z] /dev/nvme[0-9]n[0-9] /dev/xvd[a-z]; do
    if [ -e "$dev" ]; then
        ra_sectors=$(blockdev --getra $dev 2>/dev/null)
        if [ -n "$ra_sectors" ]; then
            ra_kb=$((ra_sectors * 512 / 1024))
            SUMMARY_READAHEAD+="$(basename $dev): ${ra_kb}KB; "
        fi
    fi
done

# --- FINAL SUMMARY OUTPUT ---
echo "==================================================="
echo "           SYSTEM CONFIGURATION SUMMARY            "
echo "==================================================="
echo "Operating System: $OS_INFO"
echo "Disk Scheduler:   ${SUMMARY_SCHED:-None found}"
echo "NUMA:             $SUMMARY_NUMA"
echo "THP:              $SUMMARY_THP"
echo "Swappiness:       $SUMMARY_SWAPPINESS"
echo "Swap File:        $SUMMARY_SWAP"
echo "Readahead:        $SUMMARY_READAHEAD"
echo "==================================================="
