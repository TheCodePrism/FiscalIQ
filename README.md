# 🧠 FiscalIQ — Personal Finance Dashboard

> A premium, offline-first personal finance app built with React + TypeScript + IndexedDB. Track expenses, set budgets, get smart insights, and analyze your spending — all from your browser, with zero cloud dependency.

---

## ✨ Features

### 📊 Dashboard
- Monthly net balance, total income, and total expense summary cards
- Savings rate indicator with visual progress
- Budget overrun alerts (warning at 80%, critical at 100%)
- Recent transactions list with quick edit/delete

### 💳 Transactions
- Add and edit income/expense entries via a modal form
- Category suggestions switch based on transaction type (income vs. expense)
- Full transaction ledger with:
  - **Search** by description or category
  - **Filter** by type, category, and month/year
  - **Date grouping** (Today, Yesterday, or full date)
  - **Lazy-load pagination** (Load More)

### 📈 Analytics
- **Donut Chart** — interactive SVG category breakdown with hover tooltips
- **Line/Area Chart** — 6-month income vs. expense cashflow trends
- Top expense category, savings surplus, and average transaction size cards
- Month selector to navigate historical data

### 🎯 Budgets
- Set monthly spending limits per expense category
- Animated progress bars that shift color (green → orange → red) as limits are approached/exceeded
- Overall budget utilization summary bar
- Full budget delete controls

### 💡 Insights
- **Savings Target Ring** — radial progress gauge vs. your configured savings goal
- **50/30/20 Rule Benchmark** — automatic needs/wants/savings breakdown
- **Spending Velocity Meter** — compares daily average spend this month vs. last month
- **Dynamic Advice Cards** — contextual, rule-based suggestions generated on-device:
  - Budget overrun warnings
  - Savings goal achievement celebrations
  - Dining-out heavy spending alerts
  - Spending acceleration flags

### ⚙️ Settings
- Change your name, currency symbol, and monthly savings goal (%)
- **Dark / Light theme** toggle
- **Export** your full database to a timestamped JSON file
- **Import** a previously saved JSON backup to restore all data
- **Danger Zone** — wipe all local data with a type-to-confirm dialog

### 📱 PWA — Offline-First
- Custom **Service Worker** with stale-while-revalidate caching strategy
- Works fully offline — all data is stored locally in **IndexedDB**
- Installable to desktop or home screen via `beforeinstallprompt`
- Offline mode banner displays when the network is unavailable

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Bundler | Vite 8 |
| Storage | Browser IndexedDB (via native API) |
| Charts | Custom interactive SVG (no chart library) |
| Icons | Lucide React |
| Styling | Vanilla CSS with CSS Custom Properties |
| Font | Google Fonts — Outfit |
| PWA | Custom Service Worker + Web App Manifest |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── AnalyticsTab.tsx      # Donut + Trend Line charts, cashflow metrics
│   ├── BudgetTab.tsx         # Category limit forms, progress bars
│   ├── DashboardTab.tsx      # Summary stats, recent transactions
│   ├── InsightsTab.tsx       # Savings gauge, 50/30/20, advice cards
│   ├── SettingsTab.tsx       # Profile, theme, import/export, data wipe
│   ├── TransactionForm.tsx   # Add/Edit transaction modal
│   ├── TransactionList.tsx   # Filtered, searchable, paginated ledger
│   └── ui/
│       ├── CustomChart.tsx   # SVG Donut, Line/Area Chart, Progress Ring
│       └── GlassCard.tsx     # Glassmorphism card container
├── db/
│   └── IndexedDBService.ts   # Full IndexedDB CRUD, export, import layer
├── hooks/
│   └── useExpenses.ts        # React state ↔ IndexedDB sync hook
├── styles/
│   ├── index.css             # Design system, tokens, dark/light themes
│   └── tabs.css              # Tab-specific layouts and component styles
├── App.tsx                   # Navigation, PWA install prompt, offline banner
├── main.tsx                  # React entry point + SW registration
└── registerSW.ts             # Service Worker loader
public/
├── manifest.json             # PWA Web App Manifest
├── sw.js                     # Custom Service Worker
└── icons/                    # App icons (192x192, 512x512)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v20.19+ or v22.12+ (required by Vite 8)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/TheCodePrism/Monthly-Expense-Tracker.git
cd Monthly-Expense-Tracker

# Install dependencies
npm install

# Fix missing Windows native bindings (if needed)
npm install @rolldown/binding-win32-x64-msvc --save-dev

# Start the local development server
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### Build for Production

```bash
npm run build
```

The production-ready static files will be output to the `dist/` folder.

---

## 💾 Data Storage & Privacy

All your financial data is stored **entirely on your own device** using the browser's built-in **IndexedDB**. There is no server, no cloud sync, and no third-party analytics.

The IndexedDB schema includes three object stores:

| Store | Key | Purpose |
|---|---|---|
| `transactions` | `id` (auto-increment) | Income and expense entries |
| `budgets` | `category` | Per-category monthly limits |
| `settings` | `key` | Theme, currency, savings goal, name |

---

## 📤 Import / Export

Use the **Settings** tab to:
- **Export** — Downloads a full JSON backup file (`expense_tracker_backup_YYYY-M-D.json`) containing all transactions, budgets, and settings.
- **Import** — Upload a previously exported JSON file to fully restore your data. This will overwrite existing data.

The JSON schema:
```json
{
  "version": 1,
  "exportDate": "2026-08-03T00:00:00.000Z",
  "transactions": [...],
  "budgets": [...],
  "settings": { "name": "...", "currency": "$", "theme": "dark", "monthlySavingsGoal": 20 }
}
```

---

## 🎨 Design System

The app uses a fully custom CSS design system built on CSS custom properties:

- **Default theme**: Deep obsidian dark background with glowing violet/indigo accent colors
- **Light theme**: Soft slate tones with rich indigo accents
- **Glassmorphism**: Background blur, semi-transparent borders, layered shadows
- **Micro-animations**: Fade-in transitions, modal slide-up, progress bar fills
- **Color tokens**: Success (emerald), Danger (rose), Warning (amber), Primary (violet)

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ using React, TypeScript, and the browser's native IndexedDB API.</sub>
</div>
