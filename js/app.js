/**
 * CO2nserve Application Controller
 * Manages state, event listeners, view rendering, and local storage.
 */

class CO2nserveApp {
    constructor() {
        // Default lifestyle profile inputs
        this.defaultInputs = {
            carMiles: 10000,
            carType: 'petrol',
            transitHours: 2,
            flightsShort: 2,
            flightsLong: 1,
            electricityBill: 100,
            cleanEnergyShare: 20,
            heatingSource: 'gas',
            heatingBill: 80,
            dietProfile: 'medium-meat',
            localFoodPct: 40,
            shoppingHabits: 3,
            recyclePaper: true,
            recyclePlastic: true,
            recycleGlass: false,
            recycleCompost: false
        };

        this.inputs = { ...this.defaultInputs };
        this.committedActions = [];
        this.currentCalc = null;
        this.activeTab = 'dashboard';
        this.activeCalcStep = 'transport';
        this.reductionGoal = 20; // 20% by default

        // Offset simulator state
        this.offsetPct = 0;
        this.offsetPortfolio = 'forestry';
        this.netZeroCertified = false;
        
        // Trivia state
        this.triviaScore = 0;
        this.triviaIndex = 0;
        this.triviaQuestions = [
            {
                q: "Which dietary option has the highest carbon impact per serving?",
                options: ["Cheese & Dairy", "Poultry (Chicken)", "Beef & Mutton", "Farmed Salmon"],
                answer: 2,
                explain: "Beef and mutton produce the highest emissions because livestock grazing requires massive deforestation, and cows emit significant agricultural methane during digestion."
            },
            {
                q: "Does recycling a plastic bottle save more carbon than avoiding a 1-hour flight?",
                options: ["Yes, recycling is always the most impactful action", "No, avoiding a short flight saves roughly 50x more carbon", "They are equal in impact"],
                answer: 1,
                explain: "Avoiding air travel is far more impactful. Skipping a short flight saves about 150 kg CO2e, while recycling a single plastic bottle saves roughly 0.05-0.1 kg CO2e."
            },
            {
                q: "What portion of a standard home electric bill comes from fossil fuels in typical regional grids?",
                options: ["Less than 10%", "Around 30-50%", "Over 60-80% in most fossil-reliant areas", "Exactly 100%"],
                answer: 2,
                explain: "Most power grids still rely on coal and natural gas for 60% to 80% of their base load. Sourcing clean green electricity tariff completely eliminates this."
            },
            {
                q: "Which vehicle type has the lowest overall lifecycle emissions?",
                options: ["Hybrid gasoline car", "Pure Electric Vehicle (EV)", "Clean Diesel car", "Compact petrol car"],
                answer: 1,
                explain: "Even when charging from a standard electrical grid, Electric Vehicles produce less than half the lifetime carbon footprint of petrol or hybrid vehicles due to superior motor efficiency."
            },
            {
                q: "What is the UN-recommended sustainable individual carbon footprint target by 2030?",
                options: ["Under 2.0 tonnes CO₂e per year", "Exactly 5.0 tonnes CO₂e per year", "There is no target", "Under 10.0 tonnes CO₂e per year"],
                answer: 0,
                explain: "To keep global warming under the critical 1.5°C threshold, the global individual target is under 2.0 tonnes CO₂e per year by 2030."
            }
        ];
    }

    init() {
        this.loadState();
        this.setupTheme();
        this.setupNavigation();
        this.setupFormListeners();
        this.setupActionListeners();
        this.setupGoalListeners();
        
        // Setup new interactive features
        this.setupOffsetListeners();
        this.setupTriviaListeners();
        this.setupCertificateListeners();
        
        // Initial calculations & renders
        this.updateCalculations();
        this.renderActions();
        this.updateUI();
        
        // Set initial heating UI states
        const heatingSelect = document.getElementById('input-heating-source');
        if (heatingSelect) {
            this.toggleHeatingBillVisibility(heatingSelect.value);
        }
        
        // Trigger resize event to make sure custom SVG graphics are aligned
        window.addEventListener('resize', () => this.updateUI());
    }

    /* THEME MANAGEMENT */
    setupTheme() {
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (!themeBtn) return;

        // Load saved theme or match system preference safely
        let savedTheme = null;
        try {
            savedTheme = localStorage.getItem('co2nserve-theme');
        } catch (e) {
            console.warn('localStorage read blocked by browser settings:', e);
        }
        
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (systemDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', initialTheme);

        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            
            try {
                localStorage.setItem('co2nserve-theme', newTheme);
            } catch (e) {
                console.warn('localStorage write blocked by browser settings:', e);
            }
            
            // Re-render charts to accommodate potential color shifts
            this.updateUI();
        });
    }

    /* STATE SAVING & LOADING */
    loadState() {
        try {
            const savedInputs = localStorage.getItem('co2nserve-inputs');
            if (savedInputs) {
                this.inputs = { ...this.defaultInputs, ...JSON.parse(savedInputs) };
                this.restoreFormControls();
            }

            const savedActions = localStorage.getItem('co2nserve-actions');
            if (savedActions) {
                this.committedActions = JSON.parse(savedActions);
            }

            const savedGoal = localStorage.getItem('co2nserve-goal');
            if (savedGoal) {
                this.reductionGoal = parseInt(savedGoal) || 20;
                const goalSelect = document.getElementById('goal-select');
                if (goalSelect) goalSelect.value = this.reductionGoal.toString();
            }

            const savedOffset = localStorage.getItem('co2nserve-offset-pct');
            if (savedOffset) this.offsetPct = parseInt(savedOffset) || 0;
            
            const savedOffsetPortfolio = localStorage.getItem('co2nserve-offset-portfolio');
            if (savedOffsetPortfolio) this.offsetPortfolio = savedOffsetPortfolio;

            const savedNetZero = localStorage.getItem('co2nserve-netzero-certified');
            if (savedNetZero) this.netZeroCertified = savedNetZero === 'true';

            const savedTriviaScore = localStorage.getItem('co2nserve-trivia-score');
            if (savedTriviaScore) this.triviaScore = parseInt(savedTriviaScore) || 0;
        } catch (e) {
            console.error('Error loading local storage state:', e);
        }
    }

    saveState() {
        try {
            localStorage.setItem('co2nserve-inputs', JSON.stringify(this.inputs));
            localStorage.setItem('co2nserve-actions', JSON.stringify(this.committedActions));
            localStorage.setItem('co2nserve-goal', this.reductionGoal.toString());
            localStorage.setItem('co2nserve-offset-pct', this.offsetPct.toString());
            localStorage.setItem('co2nserve-offset-portfolio', this.offsetPortfolio);
            localStorage.setItem('co2nserve-netzero-certified', this.netZeroCertified.toString());
            localStorage.setItem('co2nserve-trivia-score', this.triviaScore.toString());
        } catch (e) {
            console.error('Error saving local storage state:', e);
        }
    }

    restoreFormControls() {
        // Sliders
        const sliders = [
            'carMiles', 'transitHours', 'electricityBill', 
            'cleanEnergyShare', 'heatingBill', 'localFoodPct', 'shoppingHabits'
        ];
        sliders.forEach(id => {
            const el = document.getElementById(`input-${this.camelToKebab(id)}`);
            if (el) el.value = this.inputs[id];
        });

        // Car Type Radio (protected selector query)
        try {
            const carTypeRadio = document.querySelector(`input[name="car-type"][value="${this.inputs.carType}"]`);
            if (carTypeRadio) carTypeRadio.checked = true;
        } catch (e) {
            console.warn('Error restoring vehicle radio:', e);
        }

        // Spinner numbers
        const spinners = ['flightsShort', 'flightsLong'];
        spinners.forEach(id => {
            const el = document.getElementById(`input-${this.camelToKebab(id)}`);
            if (el) el.value = this.inputs[id];
        });

        // Selects
        const heatSourceSelect = document.getElementById('input-heating-source');
        if (heatSourceSelect) heatSourceSelect.value = this.inputs.heatingSource;

        // Diet Profile Radio (protected selector query)
        try {
            const dietRadio = document.querySelector(`input[name="diet-profile"][value="${this.inputs.dietProfile}"]`);
            if (dietRadio) dietRadio.checked = true;
        } catch (e) {
            console.warn('Error restoring diet radio:', e);
        }

        // Checkboxes
        const checkboxes = ['recyclePaper', 'recyclePlastic', 'recycleGlass', 'recycleCompost'];
        checkboxes.forEach(id => {
            const el = document.getElementById(this.camelToKebab(id));
            if (el) el.checked = !!this.inputs[id];
        });
    }

    /* NAVIGATION / VIEW MANAGEMENT */
    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.getAttribute('data-target');
                this.switchTab(target);
            });
        });
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        
        // Update tabs active state
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            const isActive = btn.getAttribute('data-target') === tabId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // Show/hide views
        const views = document.querySelectorAll('.tab-view');
        views.forEach(view => {
            view.classList.toggle('active', view.id === `view-${tabId}`);
        });

        // Perform specific re-renders/animations
        this.updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setCalcStep(stepId) {
        this.activeCalcStep = stepId;
        
        // Sidebar list
        const stepItems = document.querySelectorAll('.step-item');
        stepItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-step') === stepId);
        });

        // Content areas
        const stepViews = document.querySelectorAll('.calc-step-view');
        stepViews.forEach(view => {
            view.classList.toggle('active', view.id === `calc-step-${stepId}`);
        });
    }

    /* FORM CONTROLS & LISTENERS */
    setupFormListeners() {
        // Real-time Slider updates
        const sliders = [
            { id: 'carMiles', suffix: ' miles', format: (val) => parseInt(val).toLocaleString() },
            { id: 'transitHours', suffix: ' hours', format: (val) => val === '0' ? 'None' : `${val} hrs/wk` },
            { id: 'electricityBill', prefix: '$', suffix: ' / month', format: (val) => val },
            { id: 'cleanEnergyShare', suffix: '%', format: (val) => val },
            { id: 'heatingBill', prefix: '$', suffix: ' / month', format: (val) => val },
            { id: 'localFoodPct', format: (val) => {
                if (val <= 10) return 'Rarely local (10%)';
                if (val >= 90) return 'Exclusively local (90%+)';
                return `Moderate (${val}%)`;
            }},
            { id: 'shoppingHabits', format: (val) => {
                const labels = ['', 'Minimalist', 'Frugal', 'Average Consumer', 'Frequent Shopper', 'High Spender'];
                return labels[parseInt(val)];
            }}
        ];

        sliders.forEach(cfg => {
            const kebabId = this.camelToKebab(cfg.id);
            const sliderEl = document.getElementById(`input-${kebabId}`);
            const bubbleEl = document.getElementById(`val-${kebabId}`);

            if (sliderEl) {
                // Initial bubble setting
                if (bubbleEl) {
                    this.updateValueBubble(bubbleEl, sliderEl.value, cfg);
                }

                // Input listener for real-time responsiveness
                sliderEl.addEventListener('input', (e) => {
                    const val = e.target.value;
                    this.inputs[cfg.id] = parseFloat(val);
                    if (bubbleEl) {
                        this.updateValueBubble(bubbleEl, val, cfg);
                    }
                    this.updateCalculations();
                    this.updateUI();
                });
            }
        });

        // Vehicle radio fuel type listeners
        const carRadios = document.querySelectorAll('input[name="car-type"]');
        carRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.inputs.carType = e.target.value;
                this.updateCalculations();
                this.updateUI();
            });
        });

        // Heating type selector listener
        const heatingSelect = document.getElementById('input-heating-source');
        if (heatingSelect) {
            heatingSelect.addEventListener('change', (e) => {
                const source = e.target.value;
                this.inputs.heatingSource = source;
                this.toggleHeatingBillVisibility(source);
                this.updateCalculations();
                this.updateUI();
            });
        }

        // Diet radio listeners
        const dietRadios = document.querySelectorAll('input[name="diet-profile"]');
        dietRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.inputs.dietProfile = e.target.value;
                this.updateCalculations();
                this.updateUI();
            });
        });

        // Recycling checkboxes
        const checkIds = ['recyclePaper', 'recyclePlastic', 'recycleGlass', 'recycleCompost'];
        checkIds.forEach(id => {
            const el = document.getElementById(this.camelToKebab(id));
            if (el) {
                el.addEventListener('change', (e) => {
                    this.inputs[id] = e.target.checked;
                    this.updateCalculations();
                    this.updateUI();
                });
            }
        });
    }

    toggleHeatingBillVisibility(source) {
        const billContainer = document.getElementById('heating-bill-container');
        const labelBill = document.getElementById('label-heating-bill');
        
        if (source === 'none') {
            if (billContainer) billContainer.style.display = 'none';
        } else {
            if (billContainer) billContainer.style.display = 'flex';
            if (labelBill) {
                if (source === 'gas') labelBill.innerText = 'Monthly Natural Gas Bill';
                else if (source === 'oil') labelBill.innerText = 'Monthly Heating Oil Bill';
                else if (source === 'biomass') labelBill.innerText = 'Monthly Wood Heating Bill';
                else if (source === 'electric') labelBill.innerText = 'Monthly Heating Electricity Bill';
            }
        }
    }

    updateValueBubble(el, rawValue, cfg) {
        let text = '';
        if (cfg.format) {
            text = cfg.format(rawValue);
        } else {
            text = rawValue;
        }

        const prefix = cfg.prefix || '';
        const suffix = cfg.suffix || '';
        
        // Render
        if (cfg.format && (cfg.id === 'shoppingHabits' || cfg.id === 'localFoodPct')) {
            el.innerText = text;
        } else {
            el.innerText = `${prefix}${text}${suffix}`;
        }
    }

    adjustSpinner(inputId, delta) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const val = parseInt(input.value) || 0;
        const min = parseInt(input.getAttribute('min')) || 0;
        const max = parseInt(input.getAttribute('max')) || 999;
        
        const newVal = Math.min(max, Math.max(min, val + delta));
        input.value = newVal;

        // Update state key
        const stateKey = inputId.replace('input-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        this.inputs[stateKey] = newVal;

        this.updateCalculations();
        this.updateUI();
    }

    /* REDUCTION ACTION SYSTEM */
    setupActionListeners() {
        // Filter category buttons
        const filterContainer = document.getElementById('action-category-filters');
        if (filterContainer) {
            filterContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.filter-btn');
                if (!btn) return;

                // Update filter UI tabs
                filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter');
                this.filterActionCards(filter);
            });
        }
    }

    renderActions() {
        const container = document.getElementById('actions-catalog-container');
        if (!container) return;

        let html = '';
        window.ActionsCatalog.actions.forEach(action => {
            const difficultyStars = '★'.repeat(action.difficulty) + '☆'.repeat(5 - action.difficulty);
            
            // Format categories icons
            let catIcon = '';
            if (action.category === 'transport') catIcon = '<i class="fa-solid fa-car"></i>';
            else if (action.category === 'energy') catIcon = '<i class="fa-solid fa-bolt"></i>';
            else if (action.category === 'food') catIcon = '<i class="fa-solid fa-utensils"></i>';
            else if (action.category === 'waste') catIcon = '<i class="fa-solid fa-trash-can"></i>';

            html += `
                <div class="card action-card glass-card" id="action-card-${action.id}" data-category="${action.category}">
                    <div class="action-header">
                        <span class="action-category-badge ${action.category}">${catIcon} ${action.category}</span>
                        ${action.badge ? `<span class="value-bubble">${action.badge}</span>` : ''}
                    </div>
                    
                    <h3 class="action-title">${action.title}</h3>
                    <p class="action-card-desc">${action.description}</p>
                    
                    <div class="action-meta-stats">
                        <div class="meta-stat-item">
                            <span class="meta-stat-lbl">Diff</span>
                            <span class="meta-stat-val text-yellow" style="letter-spacing:1px">${difficultyStars}</span>
                        </div>
                        <div class="meta-stat-item">
                            <span class="meta-stat-lbl">Cost</span>
                            <span class="meta-stat-val">${action.cost}</span>
                        </div>
                        <div class="meta-stat-item">
                            <span class="meta-stat-lbl">Est. Savings</span>
                            <span class="meta-stat-val text-green" id="action-savings-val-${action.id}">-0.0t</span>
                        </div>
                    </div>
                    
                    <div class="action-footer">
                        <span class="adopt-lbl">Commit to Action</span>
                        <label class="adopt-switch">
                            <input type="checkbox" id="action-checkbox-${action.id}" onchange="app.toggleActionCommit('${action.id}')">
                            <span class="slider-switch"></span>
                        </label>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.syncActionUIWithState();
    }

    filterActionCards(category) {
        const cards = document.querySelectorAll('.action-card');
        cards.forEach(card => {
            const cardCat = card.getAttribute('data-category');
            if (category === 'all' || cardCat === category) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    toggleActionCommit(actionId) {
        const checkbox = document.getElementById(`action-checkbox-${actionId}`);
        const card = document.getElementById(`action-card-${actionId}`);
        if (!checkbox) return;

        const isChecked = checkbox.checked;
        if (isChecked) {
            if (!this.committedActions.includes(actionId)) {
                this.committedActions.push(actionId);
            }
            if (card) card.classList.add('adopted');
        } else {
            this.committedActions = this.committedActions.filter(id => id !== actionId);
            if (card) card.classList.remove('adopted');
        }

        this.updateUI();
        this.saveState();
    }

    syncActionUIWithState() {
        window.ActionsCatalog.actions.forEach(action => {
            const checkbox = document.getElementById(`action-checkbox-${action.id}`);
            const card = document.getElementById(`action-card-${action.id}`);
            const isCommitted = this.committedActions.includes(action.id);
            
            if (checkbox) checkbox.checked = isCommitted;
            if (card) card.classList.toggle('adopted', isCommitted);
        });
    }

    /* CO₂ CALCULATIONS */
    updateCalculations() {
        this.currentCalc = window.CarbonCalculator.calculate(this.inputs);
        this.saveState();
    }

    /* GENERAL UI UPDATER */
    updateUI() {
        // Redraw live numbers in elements
        const totalFootprint = this.currentCalc.total;
        
        // 1. Dashboard values
        const dashTotalVal = document.getElementById('dash-total-footprint');
        if (dashTotalVal) dashTotalVal.innerText = totalFootprint.toFixed(1);

        const calcLiveTotalVal = document.getElementById('calc-live-total');
        if (calcLiveTotalVal) calcLiveTotalVal.innerText = totalFootprint.toFixed(1);

        // 2. Action Savings updates
        let totalCommittedSavings = 0;
        window.ActionsCatalog.actions.forEach(action => {
            const savings = action.calculateSavings(this.inputs, this.currentCalc);
            
            // Render specific action card's savings estimation dynamically
            const labelEl = document.getElementById(`action-savings-val-${action.id}`);
            if (labelEl) labelEl.innerText = `-${savings.toFixed(2)}t`;
            
            if (this.committedActions.includes(action.id)) {
                totalCommittedSavings += savings;
            }
        });

        // Clamp savings if they mathematically exceed total (impossible in our calculations but safe design)
        totalCommittedSavings = Math.min(totalCommittedSavings, totalFootprint);
        const projectedFootprint = Math.max(0, totalFootprint - totalCommittedSavings);

        // Update Dashboard headers for savings
        const savingsBadgeWrapper = document.getElementById('dash-savings-badge-wrapper');
        const dashSavedVal = document.getElementById('dash-saved-co2-val');
        if (savingsBadgeWrapper && dashSavedVal) {
            if (totalCommittedSavings > 0) {
                savingsBadgeWrapper.style.display = 'block';
                dashSavedVal.innerText = totalCommittedSavings.toFixed(1);
            } else {
                savingsBadgeWrapper.style.display = 'none';
            }
        }

        // Comparison labels
        const compBarTextEl = document.getElementById('dash-comparison-bar-text');
        if (compBarTextEl) {
            const usAvg = 16.0;
            const globalAvg = 4.8;
            const diffPct = Math.round(((totalFootprint - globalAvg) / globalAvg) * 100);
            
            if (diffPct > 0) {
                compBarTextEl.innerHTML = `
                    <span class="comparison-pill warning-pill"><i class="fa-solid fa-arrow-trend-up"></i> ${diffPct}% above average</span>
                    <span>compared to the global individual average (${globalAvg} tonnes).</span>
                `;
            } else {
                const absPct = Math.abs(diffPct);
                compBarTextEl.innerHTML = `
                    <span class="comparison-pill success-pill"><i class="fa-solid fa-arrow-trend-down"></i> ${absPct}% below average</span>
                    <span>compared to the global individual average (${globalAvg} tonnes).</span>
                `;
            }
        }

        // 3. Simulator UI elements
        const simBaseEl = document.getElementById('sim-base-footprint');
        const simSavingsEl = document.getElementById('sim-total-savings');
        const simProjectedEl = document.getElementById('sim-projected-footprint');
        const simReductionPctEl = document.getElementById('sim-percent-reduction');
        const simBarEl = document.getElementById('sim-reduction-bar');

        if (simBaseEl) simBaseEl.innerText = `${totalFootprint.toFixed(1)}t`;
        if (simSavingsEl) {
            simSavingsEl.innerText = `-${totalCommittedSavings.toFixed(1)}t`;
            simSavingsEl.className = totalCommittedSavings > 0 ? 'sim-val val-savings text-emerald' : 'sim-val';
        }
        if (simProjectedEl) simProjectedEl.innerText = `${projectedFootprint.toFixed(1)}t`;

        const savingsPct = totalFootprint > 0 ? Math.round((totalCommittedSavings / totalFootprint) * 100) : 0;
        if (simReductionPctEl) simReductionPctEl.innerText = `${savingsPct}%`;
        if (simBarEl) simBarEl.style.width = `${Math.min(100, savingsPct)}%`;

        // 4. Update Equivalents (dashboard widget)
        const eqTreesEl = document.getElementById('eq-trees');
        const eqPhonesEl = document.getElementById('eq-phones');
        const eqFlightsEl = document.getElementById('eq-flights');
        const eqMilesEl = document.getElementById('eq-miles');

        if (eqTreesEl) eqTreesEl.innerText = Math.round(totalFootprint / 0.02).toLocaleString();
        if (eqPhonesEl) {
            const chargeCount = totalFootprint * 121643;
            eqPhonesEl.innerText = chargeCount > 1000000 
                ? `${(chargeCount / 1000000).toFixed(1)}M` 
                : Math.round(chargeCount).toLocaleString();
        }
        if (eqFlightsEl) eqFlightsEl.innerText = (totalFootprint / 0.9).toFixed(1);
        if (eqMilesEl) {
            const milesCount = totalFootprint / 0.00038;
            eqMilesEl.innerText = milesCount > 1000 
                ? `${(milesCount / 1000).toFixed(1)}k` 
                : Math.round(milesCount).toLocaleString();
        }

        // 5. CHARTS RENDERING
        const categoriesData = [
            { id: 'transport', label: 'Transport', value: this.currentCalc.categories.transport.total, color: 'var(--color-green)' },
            { id: 'energy', label: 'Energy', value: this.currentCalc.categories.energy.total, color: 'var(--color-yellow)' },
            { id: 'food', label: 'Diet', value: this.currentCalc.categories.food.total, color: 'var(--color-purple)' },
            { id: 'waste', label: 'Waste & Goods', value: this.currentCalc.categories.waste.total, color: 'var(--color-orange)' }
        ];
        
        window.CO2nserveCharts.renderDonut('donut-chart-container', categoriesData);
        this.renderChartLegend(categoriesData);
        window.CO2nserveCharts.renderBenchmarks('benchmark-bars-container', totalFootprint, projectedFootprint);

        // Render SVG garden representation
        window.CO2nserveCharts.renderGarden('carbon-garden-container', totalFootprint, savingsPct);

        // 6. GOALS RADIAL PROGRESS
        this.updateGoalsTracker(savingsPct);

        // 7. PERSONALIZED INSIGHTS
        this.renderInsights();

        // 8. UPDATE OFFSET CALCULATOR
        this.updateOffsetCalculator();
    }

    renderChartLegend(data) {
        const container = document.getElementById('donut-chart-legend');
        if (!container) return;

        const total = data.reduce((sum, d) => sum + d.value, 0);
        let html = '';

        data.forEach(item => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            html += `
                <div class="legend-item" onclick="app.highlightChartCategory('${item.id}')">
                    <div class="legend-left">
                        <div class="legend-color-dot" style="background-color: ${item.color}"></div>
                        <span class="legend-label">${item.label}</span>
                    </div>
                    <div class="legend-value-group">
                        <span class="legend-val">${item.value.toFixed(1)} t</span>
                        <span class="legend-pct">${pct}%</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    highlightChartCategory(categoryId) {
        const container = document.getElementById('donut-chart-container');
        if (!container) return;

        const segments = container.querySelectorAll('.donut-segment');
        const overlayVal = container.querySelector('.donut-center-val');
        const overlayLabel = container.querySelector('.donut-center-label');

        segments.forEach(seg => {
            const segCat = seg.getAttribute('data-category');
            if (segCat === categoryId) {
                // Emphasize this slice
                seg.setAttribute('stroke-width', 12);
                
                const label = seg.getAttribute('data-label');
                const val = parseFloat(seg.getAttribute('data-value'));
                const pct = seg.getAttribute('data-percent');

                if (overlayVal && overlayLabel) {
                    overlayVal.innerText = `${val.toFixed(1)}t`;
                    overlayLabel.innerText = `${label} (${pct})`;
                }
            } else {
                seg.setAttribute('stroke-width', 10);
            }
        });
    }

    /* GOAL TRACKER STUFF */
    setupGoalListeners() {
        const goalSelect = document.getElementById('goal-select');
        if (goalSelect) {
            goalSelect.addEventListener('change', (e) => {
                this.reductionGoal = parseInt(e.target.value) || 20;
                this.saveState();
                this.updateUI();
            });
        }
    }

    updateGoalsTracker(savingsPct) {
        const circle = document.getElementById('goal-progress-circle');
        const displayPct = document.getElementById('goal-percent-display');
        const statusBox = document.getElementById('goal-status-message');

        if (!circle) return;

        // Circular dash array is 251.2 (for r=40: 2 * Math.PI * 40 = 251.3)
        const radius = 40;
        const circ = 2 * Math.PI * radius; // 251.3
        
        // Progress caps at 100%
        const score = Math.min(100, savingsPct);
        const offset = circ - (score / 100) * circ;
        circle.style.strokeDashoffset = offset;

        if (displayPct) displayPct.innerText = `${savingsPct}%`;

        // Update status text
        if (statusBox) {
            const isTargetMet = savingsPct >= this.reductionGoal;
            
            if (savingsPct === 0) {
                statusBox.innerHTML = `
                    <span class="goal-status-badge inactive"><i class="fa-solid fa-circle-notch"></i> Ready to reduce</span>
                    <p class="goal-status-text">Select carbon-shaving strategies in the <strong>Reduce</strong> tab to start chipping away at your ${this.reductionGoal}% goal!</p>
                `;
            } else if (isTargetMet) {
                statusBox.innerHTML = `
                    <span class="goal-status-badge success"><i class="fa-solid fa-trophy"></i> Goal Achieved!</span>
                    <p class="goal-status-text">Amazing! You committed to reducing <strong>${savingsPct}%</strong>, exceeding your target of ${this.reductionGoal}% carbon savings!</p>
                `;
            } else {
                const deficit = this.reductionGoal - savingsPct;
                statusBox.innerHTML = `
                    <span class="goal-status-badge fail"><i class="fa-solid fa-circle-dot"></i> In Progress</span>
                    <p class="goal-status-text">You are at ${savingsPct}% reduction. Commit to actions saving <strong>${deficit}%</strong> more to hit your goal.</p>
                `;
            }
        }
    }

    /* SMART INSIGHT ENGINE */
    renderInsights() {
        const container = document.getElementById('personalized-insights-list');
        if (!container) return;

        const transport = this.currentCalc.categories.transport;
        const energy = this.currentCalc.categories.energy;
        const food = this.currentCalc.categories.food;
        const waste = this.currentCalc.categories.waste;
        const total = this.currentCalc.total;

        // Compile insight list
        const insights = [];

        // 1. Driving Insight
        if (transport.car > 3.0) {
            insights.push({
                category: 'transport',
                severity: 'high',
                title: 'High Driving Emissions',
                text: `Your vehicle travel emissions represent ${Math.round((transport.car / total) * 100)}% of your footprint (${transport.car.toFixed(1)} tonnes CO₂e).`,
                rec: '<i class="fa-solid fa-bolt"></i> Action plan: Commit to <strong>Switch to Electric Vehicle</strong> or cut commuting miles using <strong>Transit Commuting</strong> in the Reduce tab.',
                score: transport.car
            });
        } else if (transport.car > 1.2) {
            insights.push({
                category: 'transport',
                severity: 'medium',
                title: 'Vehicle Fuel Optimization',
                text: `Personal driving accounts for a moderate ${transport.car.toFixed(1)} tonnes.`,
                rec: '<i class="fa-solid fa-circle-info"></i> Tip: Consider hybridizing your vehicle or setting up carpools twice a week to save up to 400 kg CO₂e.',
                score: transport.car
            });
        }

        // 2. Flight Insight
        if (transport.flights > 2.0) {
            insights.push({
                category: 'transport',
                severity: 'high',
                title: 'Elevated Flight Impact',
                text: `Air travel contributes ${transport.flights.toFixed(1)} tonnes to your profile. Flying creates intense high-altitude particulate impact.`,
                rec: '<i class="fa-solid fa-plane-slash"></i> Action plan: Commit to <strong>Skip One Long-Haul Flight</strong> and substitute with regional trains/staycations.',
                score: transport.flights
            });
        }

        // 3. Grid Electricity
        if (energy.electricity > 2.0) {
            insights.push({
                category: 'energy',
                severity: 'high',
                title: 'Fossil-Fuel Electric Grid',
                text: `Your household electricity uses standard grid electricity. Energy production generates substantial greenhouse gases.`,
                rec: '<i class="fa-solid fa-solar-panel"></i> Action plan: Transition to clean tariffs with the <strong>Go 100% Renewable Electricity</strong> action.',
                score: energy.electricity
            });
        } else if (energy.electricity > 0.8 && this.inputs.cleanEnergyShare < 50) {
            insights.push({
                category: 'energy',
                severity: 'medium',
                title: 'Boost Renewable energy',
                text: `Your utility plan is only ${this.inputs.cleanEnergyShare}% renewable, generating ${energy.electricity.toFixed(1)} tonnes CO₂e.`,
                rec: '<i class="fa-solid fa-solar-panel"></i> Tip: Transitioning grid sourcing from 20% to 100% renewable energy saves you carbon immediately.',
                score: energy.electricity
            });
        }

        // 4. Heating
        if (this.inputs.heatingSource === 'oil' && energy.heating > 1.5) {
            insights.push({
                category: 'energy',
                severity: 'high',
                title: 'Carbon-Intensive Heating Oil',
                text: 'Heating Oil is a highly concentrated fossil fuel producing heavy soot and carbon particles.',
                rec: '<i class="fa-solid fa-temperature-arrow-down"></i> Action plan: Retrofit to high-efficiency electric heat pumps. Or install a <strong>Smart Thermostat</strong> for a quick 15% reduction.',
                score: energy.heating
            });
        } else if (this.inputs.heatingSource === 'gas' && energy.heating > 1.8) {
            insights.push({
                category: 'energy',
                severity: 'medium',
                title: 'Gas Heating Footprint',
                text: `Natural gas combustion accounts for ${energy.heating.toFixed(1)} tonnes of CO₂e annually.`,
                rec: '<i class="fa-solid fa-house-chimney"></i> Tip: Sealing windows, improving wall insulation, and lowering winter temps by 1.5°C saves up to 450 kg CO₂e.',
                score: energy.heating
            });
        }

        // 5. Diet
        if (this.inputs.dietProfile === 'heavy-meat') {
            insights.push({
                category: 'food',
                severity: 'high',
                title: 'High Meat Consumption Impact',
                text: 'Beef and mutton require extensive land use and generate agricultural methane. Livestock represents the largest source of non-fossil carbon.',
                rec: '<i class="fa-solid fa-utensils"></i> Action plan: Transition to <strong>Go Vegan</strong> or ease into reductions via <strong>Meatless Mondays</strong>.',
                score: food.total
            });
        } else if (this.inputs.dietProfile === 'medium-meat') {
            insights.push({
                category: 'food',
                severity: 'medium',
                title: 'Dietary Adjustments',
                text: 'Your dietary profile leads to moderate livestock emissions.',
                rec: '<i class="fa-solid fa-carrot"></i> Tip: Swapping red meat for plant proteins or poultry/fish cut emissions significantly.',
                score: food.total
            });
        }

        // 6. Waste & Goods
        if (this.inputs.shoppingHabits >= 4) {
            insights.push({
                category: 'waste',
                severity: 'high',
                title: 'High Consumptive Lifestyle',
                text: `Manufactured goods and electronic items carry heavy extraction, processing, and shipping footprints.`,
                rec: '<i class="fa-solid fa-bag-shopping"></i> Action plan: Reduce supply chain strain by selecting <strong>Buy Secondhand First</strong> in the Reduce tab.',
                score: waste.total
            });
        }

        // 7. General recycling tip if they recycle very little
        let recycleCount = 0;
        if (this.inputs.recyclePaper) recycleCount++;
        if (this.inputs.recyclePlastic) recycleCount++;
        if (this.inputs.recycleGlass) recycleCount++;
        if (this.inputs.recycleCompost) recycleCount++;
        
        if (recycleCount <= 1) {
            insights.push({
                category: 'waste',
                severity: 'medium',
                title: 'Underdeveloped Recycling Habits',
                text: 'Sending paper, metal, and food scraps directly to landfills generates toxic landfill methane.',
                rec: '<i class="fa-solid fa-recycle"></i> Action plan: Adopt <strong>Compost & Recycle Everything</strong> to reclaim carbon and compost organic waste.',
                score: 1.0
            });
        }

        // Sort insights by score (highest impact first)
        insights.sort((a, b) => b.score - a.score);

        // If no high/medium insights, push a default "Congrats" insight
        if (insights.length === 0) {
            insights.push({
                category: 'general',
                severity: 'low',
                title: 'Low Carbon Champion!',
                text: 'Outstanding job! Your inputs show minimal footprint across transport, household utilities, consumption, and plant-focused diets.',
                rec: '<i class="fa-solid fa-thumbs-up"></i> Tip: Keep it up! Share CO2nserve with others to expand your eco-impact community.',
                score: 0
            });
        }

        // Render HTML
        let html = '';
        insights.forEach(ins => {
            let badgeText = ins.severity === 'high' ? 'Critical Area' : ins.severity === 'medium' ? 'Opportunity' : 'Healthy';
            let iconHtml = '';
            
            if (ins.category === 'transport') iconHtml = '<i class="fa-solid fa-car-side"></i>';
            else if (ins.category === 'energy') iconHtml = '<i class="fa-solid fa-house-fire"></i>';
            else if (ins.category === 'food') iconHtml = '<i class="fa-solid fa-wheat-awn"></i>';
            else if (ins.category === 'waste') iconHtml = '<i class="fa-solid fa-box-open"></i>';
            else iconHtml = '<i class="fa-solid fa-heart"></i>';

            html += `
                <div class="card insight-card glass-card severity-${ins.severity} fade-in">
                    <div class="insight-icon-box">
                        ${iconHtml}
                    </div>
                    <div class="insight-details">
                        <span class="insight-badge">${badgeText}</span>
                        <h3 class="insight-card-title">${ins.title}</h3>
                        <p class="insight-card-text">${ins.text}</p>
                        <div class="insight-recommendation">
                            ${ins.rec}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /* UTILITIES */
    camelToKebab(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }

    /* OFFSET SIMULATOR LOGIC */
    setupOffsetListeners() {
        const offsetSlider = document.getElementById('input-offset-pct');
        const offsetBubble = document.getElementById('val-offset-pct');
        
        if (offsetSlider) {
            offsetSlider.addEventListener('input', (e) => {
                this.offsetPct = parseInt(e.target.value) || 0;
                if (offsetBubble) offsetBubble.innerText = `${this.offsetPct}%`;
                
                if (this.offsetPct < 100) {
                    this.netZeroCertified = false;
                }
                this.updateUI();
                this.saveState();
            });
        }

        const portfolioCards = document.querySelectorAll('.portfolio-option-card');
        portfolioCards.forEach(card => {
            card.addEventListener('click', () => {
                portfolioCards.forEach(c => {
                    c.classList.remove('active');
                    c.style.background = 'rgba(0,0,0,0.1)';
                    c.style.borderColor = 'var(--border-card)';
                });
                card.classList.add('active');
                card.style.background = 'var(--color-green-glow)';
                card.style.borderColor = 'var(--border-card-hover)';
                
                const radio = card.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    this.offsetPortfolio = radio.value;
                }
                this.updateUI();
                this.saveState();
            });
        });

        const btnNetZero = document.getElementById('btn-achieve-netzero');
        if (btnNetZero) {
            btnNetZero.addEventListener('click', () => {
                this.offsetPct = 100;
                if (offsetSlider) offsetSlider.value = 100;
                if (offsetBubble) offsetBubble.innerText = '100%';
                
                this.netZeroCertified = true;
                this.triggerConfetti();
                this.updateUI();
                this.saveState();
            });
        }

        // Initialize state indicators
        if (offsetSlider) offsetSlider.value = this.offsetPct;
        if (offsetBubble) offsetBubble.innerText = `${this.offsetPct}%`;

        portfolioCards.forEach(card => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio && radio.value === this.offsetPortfolio) {
                portfolioCards.forEach(c => {
                    c.classList.remove('active');
                    c.style.background = 'rgba(0,0,0,0.1)';
                    c.style.borderColor = 'var(--border-card)';
                });
                card.classList.add('active');
                card.style.background = 'var(--color-green-glow)';
                card.style.borderColor = 'var(--border-card-hover)';
                radio.checked = true;
            }
        });
    }

    updateOffsetCalculator() {
        const total = this.currentCalc.total;
        let totalCommittedSavings = 0;
        window.ActionsCatalog.actions.forEach(action => {
            if (this.committedActions.includes(action.id)) {
                totalCommittedSavings += action.calculateSavings(this.inputs, this.currentCalc);
            }
        });
        totalCommittedSavings = Math.min(totalCommittedSavings, total);
        const projected = Math.max(0, total - totalCommittedSavings);

        const remainingEl = document.getElementById('offset-remaining-emissions');
        if (remainingEl) remainingEl.innerText = `${projected.toFixed(2)} tonnes`;

        const amountOffset = projected * (this.offsetPct / 100);
        const offsetAmountValEl = document.getElementById('offset-amount-val');
        if (offsetAmountValEl) offsetAmountValEl.innerText = `${amountOffset.toFixed(2)} tonnes`;

        let pricePerTonne = 15;
        if (this.offsetPortfolio === 'wind-solar') pricePerTonne = 25;
        else if (this.offsetPortfolio === 'direct-air') pricePerTonne = 120;
        else if (this.offsetPortfolio === 'balanced') pricePerTonne = 35;

        const annualCost = amountOffset * pricePerTonne;
        const monthlyCost = annualCost / 12;

        const annualCostEl = document.getElementById('offset-cost-annual');
        const monthlyCostEl = document.getElementById('offset-cost-monthly');
        
        if (annualCostEl) annualCostEl.innerText = `$${Math.round(annualCost).toLocaleString()} / yr`;
        if (monthlyCostEl) monthlyCostEl.innerText = `($${monthlyCost.toFixed(2)} / mo)`;

        const btnNetZero = document.getElementById('btn-achieve-netzero');
        if (btnNetZero) {
            if (this.netZeroCertified) {
                btnNetZero.innerHTML = '<i class="fa-solid fa-circle-check"></i> Net-Zero Certified!';
                btnNetZero.style.background = 'linear-gradient(135deg, var(--color-green), var(--color-blue))';
                btnNetZero.style.color = '#ffffff';
                btnNetZero.style.border = 'none';
            } else {
                btnNetZero.innerHTML = '<i class="fa-solid fa-award"></i> Achieve Certified Net-Zero';
                btnNetZero.style.background = 'none';
                btnNetZero.style.border = '1px solid var(--border-card-hover)';
                btnNetZero.style.color = 'var(--text-primary)';
            }
        }
    }

    /* CLIMATE TRIVIA QUIZ ENGINE */
    setupTriviaListeners() {
        const btnStart = document.getElementById('btn-start-trivia');
        if (btnStart) {
            btnStart.addEventListener('click', () => {
                document.getElementById('trivia-start-screen').style.display = 'none';
                document.getElementById('trivia-question-screen').style.display = 'flex';
                this.triviaIndex = 0;
                this.triviaScore = 0;
                this.renderTriviaQuestion();
            });
        }

        const btnNext = document.getElementById('btn-next-trivia');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                this.triviaIndex++;
                if (this.triviaIndex < this.triviaQuestions.length) {
                    this.renderTriviaQuestion();
                } else {
                    this.showTriviaResults();
                }
            });
        }

        const btnRetry = document.getElementById('btn-retry-trivia');
        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                document.getElementById('trivia-result-screen').style.display = 'none';
                document.getElementById('trivia-question-screen').style.display = 'flex';
                this.triviaIndex = 0;
                this.triviaScore = 0;
                this.renderTriviaQuestion();
            });
        }
    }

    renderTriviaQuestion() {
        const qData = this.triviaQuestions[this.triviaIndex];
        
        document.getElementById('trivia-q-num').innerText = this.triviaIndex + 1;
        const progressPct = ((this.triviaIndex + 1) / this.triviaQuestions.length) * 100;
        document.getElementById('trivia-q-progress').style.width = `${progressPct}%`;
        
        document.getElementById('trivia-question-text').innerText = qData.q;
        document.getElementById('trivia-feedback-box').style.display = 'none';

        const optionsContainer = document.getElementById('trivia-options-container');
        optionsContainer.innerHTML = '';

        qData.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'trivia-option-btn';
            btn.innerHTML = `<span>${opt}</span> <i class="fa-solid fa-chevron-right option-chevron" style="opacity:0.3; font-size:0.8rem;"></i>`;
            btn.addEventListener('click', () => this.submitTriviaAnswer(idx, btn));
            optionsContainer.appendChild(btn);
        });
    }

    submitTriviaAnswer(optionIdx, clickedBtn) {
        const qData = this.triviaQuestions[this.triviaIndex];
        const isCorrect = optionIdx === qData.answer;

        const optionsContainer = document.getElementById('trivia-options-container');
        const buttons = optionsContainer.querySelectorAll('.trivia-option-btn');
        
        buttons.forEach(btn => btn.disabled = true);

        const feedbackBox = document.getElementById('trivia-feedback-box');
        const feedbackIcon = document.getElementById('trivia-feedback-icon');
        const feedbackTitle = document.getElementById('trivia-feedback-title');
        const feedbackText = document.getElementById('trivia-feedback-text');

        if (isCorrect) {
            this.triviaScore++;
            clickedBtn.classList.add('correct-option');
            clickedBtn.querySelector('.option-chevron').className = 'fa-solid fa-circle-check';
            feedbackIcon.className = 'fa-solid fa-circle-check text-green';
            feedbackTitle.innerText = 'Correct!';
            feedbackTitle.style.color = 'var(--color-green)';
        } else {
            clickedBtn.classList.add('incorrect-option');
            clickedBtn.querySelector('.option-chevron').className = 'fa-solid fa-circle-xmark';
            feedbackIcon.className = 'fa-solid fa-circle-xmark text-danger';
            feedbackTitle.innerText = 'Incorrect';
            feedbackTitle.style.color = 'var(--color-danger)';
            
            buttons[qData.answer].classList.add('correct-option');
            buttons[qData.answer].querySelector('.option-chevron').className = 'fa-solid fa-circle-check';
        }

        feedbackText.innerText = qData.explain;
        feedbackBox.style.display = 'flex';
    }

    showTriviaResults() {
        document.getElementById('trivia-question-screen').style.display = 'none';
        document.getElementById('trivia-result-screen').style.display = 'flex';

        const scoreDisp = document.getElementById('trivia-score-display');
        const resultTitle = document.getElementById('trivia-result-title');
        const resultText = document.getElementById('trivia-result-text');

        scoreDisp.innerText = `${this.triviaScore}/${this.triviaQuestions.length}`;

        if (this.triviaScore >= 4) {
            resultTitle.innerText = 'Climate Scholar Certified!';
            resultTitle.style.color = 'var(--color-green)';
            resultText.innerHTML = `Excellent work! You answered ${this.triviaScore} of 5 correctly. You have unlocked the <strong>Climate Scholar</strong> badge on your pledge certificate!`;
            this.triggerConfetti();
        } else {
            resultTitle.innerText = 'Keep Learning!';
            resultTitle.style.color = 'var(--color-yellow)';
            resultText.innerText = `You scored ${this.triviaScore} out of 5. Review the explanations, retry the quiz, and score 4/5 or better to earn your certificate badge.`;
        }
        this.saveState();
    }

    /* PLEDGE CERTIFICATE DRAWING & TRIGGERS */
    setupCertificateListeners() {
        const btnGen = document.getElementById('btn-generate-certificate');
        const nameInput = document.getElementById('input-pledge-name');
        const nameError = document.getElementById('pledge-name-error');

        if (btnGen && nameInput) {
            btnGen.addEventListener('click', () => {
                const name = nameInput.value.trim();
                if (!name) {
                    if (nameError) nameError.style.display = 'block';
                    return;
                }
                if (nameError) nameError.style.display = 'none';
                
                this.generateCertificateCanvas(name);
            });
        }

        const btnClose = document.getElementById('btn-close-modal');
        const btnCloseAlt = document.getElementById('btn-close-modal-alt');
        const modal = document.getElementById('certificate-modal');

        const closeModalFunc = () => {
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        };

        if (btnClose) btnClose.addEventListener('click', closeModalFunc);
        if (btnCloseAlt) btnCloseAlt.addEventListener('click', closeModalFunc);
    }

    generateCertificateCanvas(userName) {
        const canvas = document.getElementById('certificate-canvas');
        if (!canvas) return;

        canvas.width = 2000;
        canvas.height = 1400;
        const ctx = canvas.getContext('2d');

        // Gradient Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#0c1712');
        bgGrad.addColorStop(1, '#050a08');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Frame
        const borderGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        borderGrad.addColorStop(0, '#10b981');
        borderGrad.addColorStop(0.5, '#0ea5e9');
        borderGrad.addColorStop(1, '#a78bfa');
        
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 30;
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 4;
        ctx.strokeRect(45, 45, canvas.width - 90, canvas.height - 90);

        // Decorative corner leaves drawing helper
        const drawLeaf = (x, y, angle, scale) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.scale(scale, scale);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-20, -40, 0, -80);
            ctx.quadraticCurveTo(20, -40, 0, 0);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        };

        // Draw in corners
        drawLeaf(150, 150, Math.PI / 4, 1.3);
        drawLeaf(180, 120, Math.PI / 3, 0.9);
        drawLeaf(120, 180, Math.PI / 6, 0.9);

        drawLeaf(canvas.width - 150, 150, -Math.PI / 4, 1.3);
        drawLeaf(canvas.width - 180, 120, -Math.PI / 3, 0.9);
        drawLeaf(canvas.width - 120, 180, -Math.PI / 6, 0.9);

        drawLeaf(150, canvas.height - 150, 3 * Math.PI / 4, 1.3);
        drawLeaf(canvas.width - 150, canvas.height - 150, -3 * Math.PI / 4, 1.3);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Logo Icon Circle
        ctx.beginPath();
        ctx.arc(canvas.width / 2, 210, 48, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 50px sans-serif';
        ctx.fillText('CO₂', canvas.width / 2, 210);

        // Subtitle
        ctx.fillStyle = '#90a499';
        ctx.font = 'bold 30px "Outfit", sans-serif';
        ctx.fillText('CLIMATE ACTION COMMITMENT PLEDGE', canvas.width / 2, 310);

        // Main Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 75px "Outfit", sans-serif';
        ctx.fillText('CERTIFICATE OF CO₂NSERVATION', canvas.width / 2, 400);

        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 350, 470);
        ctx.lineTo(canvas.width / 2 + 350, 470);
        ctx.stroke();

        // Declaration
        ctx.fillStyle = '#90a499';
        ctx.font = 'italic 28px "Inter", sans-serif';
        ctx.fillText('This document certifies that the individual', canvas.width / 2, 520);

        // User Name
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 68px "Outfit", sans-serif';
        ctx.fillText(userName, canvas.width / 2, 595);

        ctx.fillStyle = '#f1f7f4';
        ctx.font = '30px "Inter", sans-serif';
        ctx.fillText('has calculated their carbon footprint and pledged to a target savings of', canvas.width / 2, 680);

        // Savings percentage
        const total = this.currentCalc.total;
        let totalCommittedSavings = 0;
        window.ActionsCatalog.actions.forEach(action => {
            if (this.committedActions.includes(action.id)) {
                totalCommittedSavings += action.calculateSavings(this.inputs, this.currentCalc);
            }
        });
        totalCommittedSavings = Math.min(totalCommittedSavings, total);
        const projected = Math.max(0, total - totalCommittedSavings);
        const savingsPct = total > 0 ? Math.round((totalCommittedSavings / total) * 100) : 0;

        ctx.fillStyle = '#0ea5e9';
        ctx.font = 'bold 85px "Outfit", sans-serif';
        ctx.fillText(`${savingsPct}% Carbon Reduction`, canvas.width / 2, 770);

        // Stats panel
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 2;
        
        // Rounded rectangle panel
        const rx = 250, ry = 840, rw = canvas.width - 500, rh = 140, radius = 16;
        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + rw - radius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
        ctx.lineTo(rx + rw, ry + rh - radius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
        ctx.lineTo(rx + radius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
        ctx.lineTo(rx, ry + radius);
        ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.font = '28px "Inter", sans-serif';
        ctx.fillStyle = '#90a499';
        ctx.textAlign = 'left';
        
        ctx.fillText('Baseline Footprint:', 300, 910);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px "Outfit", sans-serif';
        ctx.fillText(`${total.toFixed(1)} t CO₂e`, 560, 910);

        ctx.font = '28px "Inter", sans-serif';
        ctx.fillStyle = '#90a499';
        ctx.fillText('Committed Savings:', 940, 910);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 30px "Outfit", sans-serif';
        ctx.fillText(`-${totalCommittedSavings.toFixed(1)} t CO₂e`, 1220, 910);

        ctx.font = '28px "Inter", sans-serif';
        ctx.fillStyle = '#90a499';
        ctx.fillText('Projected Target:', 1510, 910);
        ctx.fillStyle = '#0ea5e9';
        ctx.font = 'bold 30px "Outfit", sans-serif';
        ctx.fillText(`${projected.toFixed(1)} t CO₂e`, 1750, 910);

        // Bullet actions committed list
        ctx.fillStyle = '#90a499';
        ctx.font = 'bold 24px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CO₂NSERVE GREEN HABIT COMMITMENTS:', canvas.width / 2, 1030);

        ctx.font = '22px "Inter", sans-serif';
        ctx.fillStyle = '#f1f7f4';
        
        const committedActionTitles = [];
        window.ActionsCatalog.actions.forEach(action => {
            if (this.committedActions.includes(action.id)) {
                committedActionTitles.push(action.title);
            }
        });

        if (committedActionTitles.length === 0) {
            ctx.fillStyle = '#5e7368';
            ctx.fillText('No actions committed yet. Select actions in the Reduce tab to display them.', canvas.width / 2, 1080);
        } else {
            const listToDraw = committedActionTitles.slice(0, 4);
            const listStr = listToDraw.join('   •   ');
            ctx.fillText(listStr, canvas.width / 2, 1085);
            if (committedActionTitles.length > 4) {
                ctx.fillStyle = '#5e7368';
                ctx.fillText(`& ${committedActionTitles.length - 4} other lifestyle commitments`, canvas.width / 2, 1125);
            }
        }

        // Draw badges
        const drawBadge = (bx, by, title, label, color, glyph) => {
            ctx.save();
            ctx.translate(bx, by);
            
            ctx.beginPath();
            ctx.arc(0, 0, 75, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 0, 65, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Glyph drawing
            ctx.fillStyle = color;
            ctx.font = '36px sans-serif';
            ctx.fillText(glyph, 0, -15);

            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px "Outfit", sans-serif';
            ctx.fillText(title, 0, 25);
            
            // Label
            ctx.fillStyle = color;
            ctx.font = 'bold 13px "Inter", sans-serif';
            ctx.fillText(label, 0, 45);

            ctx.restore();
        };

        // Reducer badge
        let badgeColor = '#90a499';
        let badgeLvl = 'Committed';
        let badgeGlyph = '🌱';
        if (savingsPct >= 50) {
            badgeColor = '#a78bfa';
            badgeLvl = 'Net-Zero Hero';
            badgeGlyph = '🏆';
        } else if (savingsPct >= 35) {
            badgeColor = '#f59e0b';
            badgeLvl = 'Carbon Warrior';
            badgeGlyph = '⚔️';
        } else if (savingsPct >= 20) {
            badgeColor = '#0ea5e9';
            badgeLvl = 'Eco Activist';
            badgeGlyph = '⚡';
        } else if (savingsPct > 0) {
            badgeColor = '#10b981';
            badgeLvl = 'Eco Saver';
            badgeGlyph = '🌿';
        }
        drawBadge(350, 1250, 'REDUCER', badgeLvl, badgeColor, badgeGlyph);

        // Net Zero badge
        if (this.netZeroCertified) {
            drawBadge(canvas.width / 2, 1250, 'NET ZERO', 'Certified', '#10b981', '🌍');
        } else {
            ctx.save();
            ctx.globalAlpha = 0.2;
            drawBadge(canvas.width / 2, 1250, 'NET ZERO', 'Locked', '#90a499', '🔒');
            ctx.restore();
        }

        // Scholar badge
        if (this.triviaScore >= 4) {
            drawBadge(canvas.width - 350, 1250, 'SCHOLAR', 'Passed Quiz', '#f59e0b', '🎓');
        } else {
            ctx.save();
            ctx.globalAlpha = 0.2;
            drawBadge(canvas.width - 350, 1250, 'SCHOLAR', 'Locked', '#90a499', '🔒');
            ctx.restore();
        }

        try {
            const dataUrl = canvas.toDataURL('image/png');
            const previewImg = document.getElementById('certificate-img-preview');
            const downloadLink = document.getElementById('btn-download-certificate');
            
            if (previewImg) previewImg.src = dataUrl;
            if (downloadLink) downloadLink.href = dataUrl;

            const modal = document.getElementById('certificate-modal');
            if (modal) {
                modal.style.display = 'flex';
                modal.offsetHeight; // trigger layout reflow
                modal.classList.add('active');
            }
        } catch (e) {
            console.error('Error generating certificate image:', e);
        }
    }

    /* CONFETTI ANIMATION SYSTEM */
    triggerConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const particles = [];
        const colors = ['#10b981', '#0ea5e9', '#f59e0b', '#ec4899', '#a78bfa'];

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                r: Math.random() * 6 + 4,
                d: Math.random() * canvas.height,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt: Math.random() * 10 - 5,
                tiltAngleIncremental: Math.random() * 0.07 + 0.02,
                tiltAngle: 0,
                speed: Math.random() * 3 + 2.5
            });
        }

        let animationId;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let activeParticles = 0;
            particles.forEach((p, idx) => {
                p.tiltAngle += p.tiltAngleIncremental;
                p.y += p.speed;
                p.x += Math.sin(p.tiltAngle) * 0.5;
                p.tilt = Math.sin(p.tiltAngle - idx/3) * 15;

                if (p.y <= canvas.height) {
                    activeParticles++;
                }

                ctx.beginPath();
                ctx.lineWidth = p.r;
                ctx.strokeStyle = p.color;
                ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
                ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
                ctx.stroke();
            });

            if (activeParticles > 0) {
                animationId = requestAnimationFrame(draw);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                cancelAnimationFrame(animationId);
            }
        };

        draw();
    }
}

// Instantiate and initialize
const app = new CO2nserveApp();
window.app = app;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init();
    });
} else {
    app.init();
}
