#!/bin/bash
# Weekly market data update script for cron
# Add this to your crontab to run weekly: 0 6 * * 1 /path/to/update-market-cron.sh

# Set the project directory
PROJECT_DIR="/Users/stepocampbell/Documents/GitHub/prerevenue"

# Navigate to project
cd "$PROJECT_DIR" || exit 1

# Load environment if needed
source .env.local 2>/dev/null || true

# Run the market data update
echo "$(date): Starting weekly market data update..." >> logs/market-update.log

# Run the update script
node scripts/update-market-data.js >> logs/market-update.log 2>&1

# Check if successful
if [ $? -eq 0 ]; then
    echo "$(date): Market data update completed successfully" >> logs/market-update.log
else
    echo "$(date): Market data update failed" >> logs/market-update.log
fi

# Optionally, you could also call the API endpoint if the server is running
# curl -X POST "http://localhost:3000/api/market-analysis" \
#      -H "Authorization: Bearer $CRON_SECRET" \
#      -H "Content-Type: application/json" >> logs/market-update.log 2>&1
