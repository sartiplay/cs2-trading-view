# TraderMan - Steam Marketplace Item Tracker

A comprehensive Next.js application for tracking Steam marketplace items, monitoring price changes, and calculating investment performance for CS:GO skins, knives, cases, and other Steam items.

## Features

### 📊 **Price Tracking & Analytics**
- Real-time Steam marketplace price monitoring
- Historical price data with interactive charts
- Profit/loss calculations with detailed analytics
- Inventory value tracking over time
- Currency conversion support (USD, EUR, GBP, etc.)

### 🎨 **Customization Support**
- **Stickers, Charms & Patches tracking** - Monitor applied customizations
- **Include customization costs** - Toggle to include/exclude customization values in calculations
- **Current market values** - Automatically fetch current prices for all customizations
- **Individual customization capture** - Track each sticker/charm/patch separately

### ⚡ **Automated Capture System**
- **Scheduled price updates** - Automated cron job scheduling
- **Bulk capture** - Update all items at once
- **Individual item capture** - Update specific items on demand
- **Smart rate limiting** - Respects Steam API limits
- **Capture statistics** - Track success rates and performance

### 🔔 **Notifications & Alerts**
- Discord webhook integration
- Price change notifications
- Capture completion alerts
- Error reporting and monitoring

### 📱 **Modern UI/UX**
- Responsive design with mobile support
- Dark/light theme support
- Interactive data tables with sorting/filtering
- Real-time updates without page refresh
- Intuitive item management interface

### 💰 **Sales Tracking**
- Record item sales with profit/loss calculations
- Sales history with detailed analytics
- Performance metrics and statistics
- ROI tracking and reporting

## Prerequisites

- Node.js 18+ 
- npm or yarn package manager
- Steam API access (for price fetching)

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd traderman
```

### 2. Install Dependencies
Node.js is required.

Open a terminal, navigate into the project directory, then run:
```bash
npm install
```

If you encounter errors, try:
```bash
npm install --legacy-peer-deps
```

If npm itself has an update available, update it first:
```bash
npm install -g npm@<version>
```

⚠️ Even if errors still appear, the app should still work after installation.

### 3. **Important: Setup Data File**
Before starting the server, you need to set up the data file:

**Option A: Using Example Data**
```bash
# If example.data.json exists, rename it to data.json
mv example.data.json data.json
```

**Option B: Using Existing Data**
```bash
# If you have an existing data.json file, copy it to the root directory
cp /path/to/your/data.json ./data.json
```

**Option C: Start Fresh**  
The application will create a new `data.json` file automatically on first run if none exists.

### 4. Environment Variables (Optional)
Create a `.env.local` file for additional configuration:
```env
# Discord webhook for notifications (optional)
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# Custom Steam API settings (optional)
STEAM_API_DELAY=1000
```

### 5. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage Guide

### Adding Items
1. Click "Add Item" button
2. Enter Steam marketplace hash name (e.g., "AK-47 | Redline (Field-Tested)")
3. Set purchase price and currency
4. Add customizations (stickers, charms, patches) if applicable
5. Save the item

### Price Monitoring
- **Manual Capture**: Click "Capture" button to update prices immediately
- **Scheduled Capture**: Enable automatic updates in Settings
- **Individual Updates**: Use the capture button on specific items

### Customization Tracking
- Toggle "Include customization costs in selling price calculations" in settings
- Add stickers/charms/patches when creating items
- System automatically fetches current market values for customizations
- View total investment including customization costs

### Sales Recording
1. Click "Sell" button on any item
2. Enter sale price and platform
3. System calculates profit/loss automatically
4. View sales history in the sold items section

### Settings Configuration
- **Timeline Resolution**: Adjust chart granularity
- **Scheduler Settings**: Configure automatic price updates
- **Discord Integration**: Set up notifications
- **Customization Options**: Toggle cost inclusion

---

## File Structure

```
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── items/         # Item management
│   │   ├── jobs/capture/  # Price capture system
│   │   ├── scheduler/     # Automated scheduling
│   │   └── settings/      # Configuration
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── item-form.tsx     # Item creation/editing
│   ├── items-table.tsx   # Main items display
│   └── settings-dialog.tsx # Configuration UI
├── lib/                  # Utility libraries
│   ├── data-storage.server.ts # Data persistence
│   ├── steam-api.server.ts    # Steam API integration
│   └── scheduler.server.ts    # Job scheduling
├── data.json             # Main data storage
├── settings.json         # Application settings
└── README.md            # This file
```

---

## Data Storage

The application uses JSON files for data persistence:

- **`data.json`**: Contains all items, price history, and sales data
- **`settings.json`**: Stores application configuration and preferences

Data is automatically backed up and versioned to prevent loss.

---

## API Endpoints

- `GET/POST /api/items` - Item management
- `POST /api/jobs/capture` - Price capture
- `GET/POST /api/settings` - Configuration
- `GET/POST /api/scheduler/*` - Automated scheduling
- `GET /api/stats` - Analytics and statistics

---

## Notes on Item Data

If an item cannot fetch data, that means Steam does not currently provide market data for it.  
This can happen if no recent trades for that item exist or if it has been inactive on the marketplace for a long time.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## Troubleshooting

### Common Issues

**"Settings fetch failed"**
- Ensure `settings.json` exists or let the app create it
- Check file permissions

**"Capture failed"**
- Verify Steam marketplace is accessible
- Check rate limiting (default 1 second between requests)
- Ensure item names are correct Steam marketplace hash names

**"Data not loading"**
- Ensure `data.json` exists in root directory
- Check file format and permissions
- Review browser console for errors

### Performance Tips

- Use scheduled captures during off-peak hours
- Limit concurrent captures to avoid rate limiting
- Regular cleanup of old price history data
- Monitor Discord notifications for system health

---

## License

This project is for educational and personal use. Respect Steam's Terms of Service and API usage guidelines.

---

## Support

For issues and feature requests, please create an issue in the repository or check the application logs for detailed error information.
