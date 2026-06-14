# 🌍 CO2nserve | Personal Carbon Footprint Tracker & Action Planner

CO2nserve is a premium, client-side static web application designed to help individuals calculate, simulate, and reduce their carbon footprint through gamified interaction, smart insights, and micro-offsetting budgets.

Built for maximum accessibility and visual excellence, the application features an organic dark glassmorphism theme, dynamic SVG ecological visualizations, and automated high-resolution certificate generation—all with **zero framework dependencies**.

---

## ✨ Key Features

*   **🌱 Interactive SVG Carbon Garden**: A responsive digital ecosystem widget on the dashboard. The weather, sky hue, bird count, and branch health react in real time. Committing to reduction strategies grows lush green foliage and sprouts pink flower blossoms!
*   **📊 Category Breakdown & Donut Chart**: Hover-enabled vector donut charts showcasing exact emission weights in Home Energy, Transportation, Diet, and Waste/Goods.
*   **⚡ What-If Habit Simulator**: Select green lifestyle adjustments (EV switches, vegan diets, solar panels, secondhand shopping) to simulate projected emission reductions against the UN's 2030 target of `< 2.0 tonnes`.
*   **🌍 Net-Zero Offset Calculator**: A slider-driven financial simulator showing pricing for afforestation, solar grids, or direct air capture, letting users simulate purchasing offsets to achieve certified net-zero status.
*   **🎓 Climate Myth-Buster Quiz**: A 5-question multiple-choice trivia game designed to educate users on climate science and carbon weights.
*   **🏆 Downloadable Pledge Certificate**: Generates a high-resolution canvas certificate dynamically displaying the user's name, carbon commitments, and unlocked achievement badges (Scholar, Net-Zero, and Reducer levels).

---

## 🛠️ Technology Stack

*   **HTML5 & CSS3**: Custom design systems using HSL palette tokens, dark glassmorphic panels, and pure CSS layout elements.
*   **ES6 JavaScript**: Object-oriented modular state and calculations engine.
*   **SVG Visuals**: Native vector math rendering donuts, benchmarks, and weather/ecosystem shifts.
*   **HTML5 Canvas**: Dynamic 2D raster drawing context compiling certification files on the fly.
*   **LocalStorage**: Built-in persistence caching user inputs, committed habits, offsets, and quiz achievements across restarts.

---

## 🚀 Local Installation & Quick Start

CO2nserve runs completely client-side in the browser and requires no compilation, server setups, or Node dependencies.

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/co2nserve.git
   ```
2. Open the directory:
   ```bash
   cd co2nserve
   ```
3. Open `index.html` in your favorite web browser (Chrome, Safari, Firefox, Edge, etc.):
   * Double-click the file in your Explorer/Finder, or
   * Run a local server:
     ```bash
     # Python 3
     python -m http.server 8000
     ```
     Then navigate to `http://localhost:8000`.

---

## ☁️ Deployment Guide

Since CO2nserve is a static package, deployment is completely free and takes less than a minute. Here are the three best methods:

### 1. GitHub Pages (Highly Recommended)
GitHub Pages hosts static files directly from your repository.
1. Push your code to a GitHub repository.
2. In the repository settings page, go to **Settings** > **Pages** (under the Code and automation section).
3. Set the source to **Deploy from a branch**.
4. Select the branch (usually `main`) and root folder (`/`), then click **Save**.
5. Your app will go live within seconds at `https://<your-username>.github.io/<repo-name>/`.

### 2. Vercel (Instant Deployment)
Vercel hosts frontend assets instantly with a global CDN.
1. Sign in to [Vercel](https://vercel.com) using your GitHub account.
2. Click **Add New** > **Project**.
3. Import your CO2nserve repository.
4. Click **Deploy** (no build settings are required since it is a static directory).
5. Vercel will assign a production URL (e.g., `co2nserve.vercel.app`).

### 3. Netlify
1. Log in to [Netlify](https://netlify.com).
2. Choose **Import from Git** or drag-and-drop the local folder directly into the Netlify Dashboard.
3. Click **Deploy site**.

---

## 🧪 Scientific Methodology

The emissions math model inside `js/calculator.js` uses standardized emission factors calibrated from:
*   **EPA (US Environmental Protection Agency)**: Average grid electrical intensity, transport fuel factors, waste baselines.
*   **IPCC (Intergovernmental Panel on Climate Change)**: Household heating sources and dietary footprint baselines.
*   **UN Environmental Programme**: Core target recommendations.
