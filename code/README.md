# KJET Statistics Dashboard

A React-based dashboard for visualizing Kenya Youth Employment and Talent (KJET) application statistics.

## Features

- **Interactive Charts**: Bar charts and pie charts showing application distribution
- **Key Statistics**: Overview cards displaying total applications, complete applications, counties covered, and business types
- **Detailed Tables**: Comprehensive data tables with sortable county and business type information
- **Responsive Design**: Mobile-friendly interface that works on all devices

## Data Sources

The dashboard loads data from:
- `kjet_statistics_report.txt` - Text-based statistics report
- `kjet_statistics_data.csv` - Detailed CSV data with county and business type breakdowns

## Installation & Setup

1. Navigate to the React app directory:
   ```bash
   cd /Users/geoff/Downloads/Nakuru/src
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:3000` to view the dashboard

## Dependencies

- React 18.2.0
- Recharts (for data visualization)
- PapaParse (for CSV parsing)
- Lucide React (for icons)

## Data Visualization

The dashboard includes:

### Statistics Cards
- Total Applications
- Complete Applications
- Counties Covered
- Unique Business Types

### Charts
- **Top 10 Counties**: Stacked bar chart showing complete vs incomplete applications
- **Business Types Distribution**: Pie chart showing the distribution of different business types

### Data Table
- Detailed breakdown by county with application counts and business types
- Sortable by total applications (descending)

## File Structure

```
src/
├── public/
│   ├── index.html
│   ├── kjet_statistics_report.txt
│   └── kjet_statistics_data.csv
├── src/
│   ├── App.js          # Main React component
│   ├── App.css         # Styling
│   ├── index.js        # App entry point
│   └── index.css       # Global styles
└── package.json        # Dependencies and scripts
```

## Usage

The dashboard automatically loads the statistics data when it starts. If you update the source data files, refresh the browser to see the changes.

## Development

To modify the dashboard:
1. Edit `src/App.js` for component logic
2. Edit `src/App.css` for styling
3. Run `npm start` to see changes in real-time