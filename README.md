# Stocktaker 📦

A premium, responsive, and light/dark theme stock tracking web application designed specifically for small shops. It features role-based dashboards (Owner vs. Staff), inventory management (add, remove, sell, damage), transactions auditing, and staff registration.

Deployable instantly on **Vercel** with a single click.

## Features

### 👑 Owner Dashboard
- **Analytics Overview**: View total items, low stock alerts, cumulative damaged stock, and today's sales value.
- **Stock Management**: Full authority to:
  - **Add Stock**: Replenish existing products.
  - **Remove Stock**: Adjust inventory levels down.
  - **Sell Stock**: Log customer purchases.
  - **Damage Stock**: Track expired, broken, or unsellable inventory.
  - **New Product**: Create new catalog items with name, category, price, and low stock alert thresholds.
- **Staff Registration**: Create, view, and delete staff accounts (e.g. cashiers) that have restricted access.
- **Transaction Logs**: View the complete history of all stock movements with notes, timestamp, and who performed them. Ability to clear logs.

### 👥 Staff Dashboard
- **Restricted Access**: Clean, simplified UI showing only what is necessary.
- **Allowed Actions**:
  - **Add Stock**: Record deliveries of existing items.
  - **Sell Stock**: Log customer sales at the counter.
- **View-Only Inventory**: Browse items and check stock levels.
- **Filtered Transaction Logs**: Staff can view their own logged transactions, but cannot delete or clear logs.

### 🎨 Visual & Technical Details
- **Premium Aesthetics**: Curated HSL-tailored color palettes with dark/light mode toggle.
- **Glassmorphism Design**: Semi-transparent panels with backdrop-filters and subtle glow borders.
- **Responsive Layout**: Designed for mobile phones, tablets, and desktops (ideal for shop owners on the go).
- **Offline & Local-First**: Built entirely in HTML, CSS, and JS. All data persists securely in the browser's `localStorage`.
- **Export Data**: Download the entire inventory catalog as a CSV spreadsheet.

---

## Getting Started

### Run Locally
Since this is a client-side Single Page Application (SPA), you don't need to install any heavy packages.
1. Open the folder `Stocktaker`.
2. Double-click `index.html` to open it directly in any modern browser (Chrome, Edge, Safari, Firefox).
3. (Optional) Run a local development server for testing:
   ```bash
   # If you have Node.js installed, you can use:
   npx serve .
   ```

### Default Credentials
- **Owner Account**:
  - Username: `owner`
  - Password: `owner123`
- **Staff Account**:
  - Username: `staff`
  - Password: `staff123`

---

## Deploying to Vercel 🚀

Deploying this static website to Vercel is extremely simple and free:

### Option 1: Vercel CLI (Recommended for fast command-line deploy)
1. Open your terminal in the `Stocktaker` directory.
2. Run the following command:
   ```bash
   npx vercel
   ```
3. Follow the prompts (log in to your Vercel account, choose a project name, and confirm).
4. Within seconds, your site will be live!

### Option 2: Deploy from GitHub (Continuous Deployment)
1. Initialize a Git repository in this folder, commit all files, and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Stocktaker"
   # Push to your GitHub repository
   ```
2. Log in to [Vercel](https://vercel.com).
3. Click **New Project** and import your GitHub repository.
4. Click **Deploy**. Vercel will automatically detect the static HTML/CSS/JS site and deploy it. Any future pushes to GitHub will automatically trigger a redeploy!
