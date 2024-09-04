#!/bin/bash

# Change to the directory containing the script
cd /Users/apple/Desktop/Projects/Healthcare/fhir-express-backend/src/scripts

# Run the TypeScript file using ts-node
/usr/local/bin/ts-node abnormalLabMonitor.ts

# Log the execution
echo "Monitoring script executed at $(date)" >> /Users/apple/Desktop/Projects/Healthcare/monitoring_log.txt