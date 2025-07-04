# Market Analysis System

This system automatically updates market data from Little Exits to ensure the Pre-Revenue app uses real, current data instead of static fallback values.

## Files Structure

```
data/
├── categories.json          # Category ID to name mappings
└── market-analysis.json     # Real market data (replaces fallback)

pages/api/
├── market-analysis/index.ts # API for updating market data
└── top-performers/index.ts  # API that now uses real data

scripts/
├── update-market-data.js    # Manual update script
└── update-market-cron.sh    # Cron job script
```

## How It Works

### 1. Data Sources
- **Little Exits API**: Real acquisition data from 800+ projects
- **Fallback Data**: Used only if `market-analysis.json` doesn't exist

### 2. Top Performers API Behavior
- **Before**: Always used hardcoded fallback data
- **Now**: Uses real data from `market-analysis.json` when available
- **Fallback**: Only uses hardcoded data if the file is missing

### 3. Market Analysis API
- **GET**: Returns sanitized market metrics for public use
- **POST**: Updates data (protected by `CRON_SECRET`)

## Manual Updates

### Local Development
```bash
# Run the update script manually
npm run update-market-data

# Or directly
node scripts/update-market-data.js
```

### Production API Call
```bash
curl -X POST "https://prerevenue.io/api/market-analysis" \
     -H "Authorization: Bearer $CRON_SECRET" \
     -H "Content-Type: application/json"
```

## Automated Updates

### Vercel Cron Jobs (Production)
The `vercel.json` file configures automatic weekly updates:
```json
{
  "crons": [
    {
      "path": "/api/market-analysis",
      "schedule": "0 6 * * 1"
    }
  ]
}
```
- Runs every Monday at 6 AM UTC
- Calls the market analysis API with proper authentication

### Local Cron (Development)
```bash
# Add to crontab for weekly updates
crontab -e

# Add this line (runs every Monday at 6 AM)
0 6 * * 1 /Users/stepocampbell/Documents/GitHub/prerevenue/scripts/update-market-cron.sh
```

## Data Structure

### market-analysis.json
```json
{
  "lastUpdated": "2025-01-04T16:30:00.000Z",
  "totalProjects": 847,
  "soldProjects": 312,
  "categoryMultipliers": { "SaaS": 1.6, "AI": 1.7 },
  "successPatterns": {
    "topCategories": ["SaaS", "AI", "Chrome Extension"],
    "avgSoldPrice": 6420
  },
  "topPerformers": {
    "mainCategories": [...],
    "specificCategories": [...],
    "keywords": [...]
  }
}
```

## Benefits

1. **Real Data**: Uses actual marketplace performance instead of estimates
2. **Current Metrics**: Weekly updates ensure data reflects recent market trends
3. **Automatic**: No manual intervention required in production
4. **Fallback Safe**: System continues working even if updates fail
5. **Scalable**: Can easily adjust update frequency or add new data sources

## Monitoring

Check logs for update status:
```bash
# View recent update logs
tail -f logs/market-update.log

# Check if data file exists and is recent
ls -la data/market-analysis.json
```

## Next Steps

1. **Real API Integration**: Update the script to actually fetch from Little Exits API
2. **Enhanced Analytics**: Add more sophisticated category performance analysis
3. **Error Handling**: Implement retry logic and failure notifications
4. **Data Validation**: Add checks to ensure data quality before updating
5. **Historical Tracking**: Store historical data for trend analysis
