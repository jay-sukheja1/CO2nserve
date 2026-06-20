/**
 * @module CO2nserveApp
 * @description Main Application Module for CO2nserve.
 * Coordinates carbon calculation flow, UI updates, event listeners, and pledge certificate generation.
 * Restructured into modular sub-objects (AppState, DataConstants, UIRenderer, EventController, CertificateGenerator)
 * to ensure separation of concerns, ARIA compliance, and full keyboard navigability.
 *
 * Exposes global `window.app` reference to fulfill integration tests.
 */

/* ─── DOM Utility Helpers ──────────────────────────────────────────────────── */

/**
 * Safely set the text content of an element.
 * @param {HTMLElement|null} domEl - Target DOM element
 * @param {string|number} text - Text to set
 * @returns {void}
 */
function safeText(domEl, text) {
    if (domEl) {
        domEl.textContent = String(text);
    }
}

/**
 * Create a DOM element with optional class, text, and child elements.
 * @param {string} tag - HTML tag name (e.g. 'div', 'button')
 * @param {Object} [opts] - Configuration options
 * @param {string} [opts.cls] - Class name to apply
 * @param {string} [opts.id] - ID to apply
 * @param {string} [opts.text] - Text content
 * @param {string} [opts.html] - Safe static HTML content (no user data)
 * @param {Object} [opts.attrs] - Attribute key/value pairs
 * @param {HTMLElement[]} [children] - Array of child elements
 * @returns {HTMLElement} The created DOM element
 */
function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.cls) {
        node.className = opts.cls;
    }
    if (opts.id) {
        node.id = opts.id;
    }
    if (opts.text) {
        node.textContent = opts.text;
    }
    if (opts.html) {
        node.innerHTML = opts.html; // Only used for trusted static strings
    }
    if (opts.attrs) {
        Object.entries(opts.attrs).forEach(([k, v]) => node.setAttribute(k, v));
    }
    children.forEach(child => {
        if (child) node.appendChild(child);
    });
    return node;
}

/**
 * Create a FontAwesome icon element.
 * @param {string} faClass - Icon class name (e.g. 'fa-solid fa-car')
 * @returns {HTMLElement} The created <i> icon element
 */
function icon(faClass) {
    const i = document.createElement('i');
    i.className = faClass;
    return i;
}

/* ─── Data Constants Module ────────────────────────────────────────────────── */

/**
 * Centred lookup catalog and configuration metrics.
 * @namespace DataConstants
 */
const DataConstants = {
    /** @type {Object} Default input profile values */
    DEFAULT_INPUTS: {
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
    },

    /** @type {Array<Object>} Trivia questions catalog */
    TRIVIA_QUESTIONS: [
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
    ],

    /** @type {Array<Object>} Configurations for inputs sliders formatting */
    SLIDER_CONFIGS: [
        { id: 'carMiles',         suffix: ' miles', format: (v) => parseInt(v, 10).toLocaleString() },
        { id: 'transitHours',     suffix: '',        format: (v) => v === '0' ? 'None' : `${v} hrs/wk` },
        { id: 'electricityBill',  prefix: '$',       suffix: ' / month', format: (v) => v },
        { id: 'cleanEnergyShare', suffix: '%',       format: (v) => v },
        { id: 'heatingBill',      prefix: '$',       suffix: ' / month', format: (v) => v },
        { id: 'localFoodPct',     format: (v) => {
            const n = parseInt(v, 10);
            if (n <= 10) return 'Rarely local (10%)';
            if (n >= 90) return 'Exclusively local (90%+)';
            return `Moderate (${n}%)`;
        }},
        { id: 'shoppingHabits',   format: (v) => {
            const labels = ['', 'Minimalist', 'Frugal', 'Average Consumer', 'Frequent Shopper', 'High Spender'];
            return labels[parseInt(v, 10)] || '';
        }}
    ],

    /** @type {Object<string, string>} Category icons lookup */
    CATEGORY_ICONS: {
        transport: 'fa-solid fa-car',
        energy:    'fa-solid fa-bolt',
        food:      'fa-solid fa-utensils',
        waste:     'fa-solid fa-trash-can'
    },

    /** @type {Object<string, string>} Category icons for insights view */
    INSIGHT_CATEGORY_ICONS: {
        transport: 'fa-solid fa-car-side',
        energy:    'fa-solid fa-house-fire',
        food:      'fa-solid fa-wheat-awn',
        waste:     'fa-solid fa-box-open',
        general:   'fa-solid fa-heart'
    },

    /** @type {Array<Object>} Insight Engine data-driven rules catalog */
    INSIGHT_RULES: [
        {
            id: 'car-high',
            category: 'transport',
            severity: 'high',
            title: 'High Driving Emissions',
            recIcon: 'fa-solid fa-bolt',
            rec: 'Action plan: Commit to Switch to Electric Vehicle or cut commuting miles using Transit Commuting in the Reduce tab.',
            test: (inputs, calc) => calc.categories.transport.car > 3.0,
            text: (inputs, calc) => `Your vehicle travel emissions represent ${Math.round((calc.categories.transport.car / calc.total) * 100)}% of your footprint (${calc.categories.transport.car.toFixed(1)} tonnes CO₂e).`,
            score: (inputs, calc) => calc.categories.transport.car
        },
        {
            id: 'car-medium',
            category: 'transport',
            severity: 'medium',
            title: 'Vehicle Fuel Optimization',
            recIcon: 'fa-solid fa-circle-info',
            rec: 'Tip: Consider hybridizing your vehicle or setting up carpools twice a week to save up to 400 kg CO₂e.',
            test: (inputs, calc) => calc.categories.transport.car > 1.2 && calc.categories.transport.car <= 3.0,
            text: (inputs, calc) => `Personal driving accounts for a moderate ${calc.categories.transport.car.toFixed(1)} tonnes.`,
            score: (inputs, calc) => calc.categories.transport.car
        },
        {
            id: 'flights-high',
            category: 'transport',
            severity: 'high',
            title: 'Elevated Flight Impact',
            recIcon: 'fa-solid fa-plane-slash',
            rec: 'Action plan: Commit to Skip One Long-Haul Flight and substitute with regional trains/staycations.',
            test: (inputs, calc) => calc.categories.transport.flights > 2.0,
            text: (inputs, calc) => `Air travel contributes ${calc.categories.transport.flights.toFixed(1)} tonnes to your profile. Flying creates intense high-altitude particulate impact.`,
            score: (inputs, calc) => calc.categories.transport.flights
        },
        {
            id: 'electricity-high',
            category: 'energy',
            severity: 'high',
            title: 'Fossil-Fuel Electric Grid',
            recIcon: 'fa-solid fa-solar-panel',
            rec: 'Action plan: Transition to clean tariffs with the Go 100% Renewable Electricity action.',
            test: (inputs, calc) => calc.categories.energy.electricity > 2.0,
            text: (inputs, calc) => 'Your household electricity uses standard grid electricity. Energy production generates substantial greenhouse gases.',
            score: (inputs, calc) => calc.categories.energy.electricity
        },
        {
            id: 'electricity-medium',
            category: 'energy',
            severity: 'medium',
            title: 'Boost Renewable Energy',
            recIcon: 'fa-solid fa-solar-panel',
            rec: 'Tip: Transitioning grid sourcing from 20% to 100% renewable energy saves you carbon immediately.',
            test: (inputs, calc) => calc.categories.energy.electricity > 0.8 && calc.categories.energy.electricity <= 2.0 && inputs.cleanEnergyShare < 50,
            text: (inputs, calc) => `Your utility plan is only ${inputs.cleanEnergyShare}% renewable, generating ${calc.categories.energy.electricity.toFixed(1)} tonnes CO₂e.`,
            score: (inputs, calc) => calc.categories.energy.electricity
        },
        {
            id: 'heating-oil-high',
            category: 'energy',
            severity: 'high',
            title: 'Carbon-Intensive Heating Oil',
            recIcon: 'fa-solid fa-temperature-arrow-down',
            rec: 'Action plan: Retrofit to high-efficiency electric heat pumps. Or install a Smart Thermostat for a quick 15% reduction.',
            test: (inputs, calc) => inputs.heatingSource === 'oil' && calc.categories.energy.heating > 1.5,
            text: (inputs, calc) => 'Heating Oil is a highly concentrated fossil fuel producing heavy soot and carbon particles.',
            score: (inputs, calc) => calc.categories.energy.heating
        },
        {
            id: 'heating-gas-medium',
            category: 'energy',
            severity: 'medium',
            title: 'Gas Heating Footprint',
            recIcon: 'fa-solid fa-house-chimney',
            rec: 'Tip: Sealing windows, improving wall insulation, and lowering winter temps by 1.5°C saves up to 450 kg CO₂e.',
            test: (inputs, calc) => inputs.heatingSource === 'gas' && calc.categories.energy.heating > 1.8,
            text: (inputs, calc) => `Natural gas combustion accounts for ${calc.categories.energy.heating.toFixed(1)} tonnes of CO₂e annually.`,
            score: (inputs, calc) => calc.categories.energy.heating
        },
        {
            id: 'diet-meat-high',
            category: 'food',
            severity: 'high',
            title: 'High Meat Consumption Impact',
            recIcon: 'fa-solid fa-utensils',
            rec: 'Action plan: Transition to Go Vegan or ease into reductions via Meatless Mondays.',
            test: (inputs, calc) => inputs.dietProfile === 'heavy-meat',
            text: (inputs, calc) => 'Beef and mutton require extensive land use and generate agricultural methane. Livestock represents the largest source of non-fossil carbon.',
            score: (inputs, calc) => calc.categories.food.total
        },
        {
            id: 'diet-meat-medium',
            category: 'food',
            severity: 'medium',
            title: 'Dietary Adjustments',
            recIcon: 'fa-solid fa-carrot',
            rec: 'Tip: Swapping red meat for plant proteins or poultry/fish cut emissions significantly.',
            test: (inputs, calc) => inputs.dietProfile === 'medium-meat',
            text: (inputs, calc) => 'Your dietary profile leads to moderate livestock emissions.',
            score: (inputs, calc) => calc.categories.food.total
        },
        {
            id: 'shopping-high',
            category: 'waste',
            severity: 'high',
            title: 'High Consumptive Lifestyle',
            recIcon: 'fa-solid fa-bag-shopping',
            rec: 'Action plan: Reduce supply chain strain by selecting Buy Secondhand First in the Reduce tab.',
            test: (inputs, calc) => inputs.shoppingHabits >= 4,
            text: (inputs, calc) => 'Manufactured goods and electronic items carry heavy extraction, processing, and shipping footprints.',
            score: (inputs, calc) => calc.categories.waste.total
        },
        {
            id: 'recycling-medium',
            category: 'waste',
            severity: 'medium',
            title: 'Underdeveloped Recycling Habits',
            recIcon: 'fa-solid fa-recycle',
            rec: 'Action plan: Adopt Compost & Recycle Everything to reclaim carbon and compost organic waste.',
            test: (inputs) => {
                let count = 0;
                if (inputs.recyclePaper)   count++;
                if (inputs.recyclePlastic) count++;
                if (inputs.recycleGlass)   count++;
                if (inputs.recycleCompost) count++;
                return count <= 1;
            },
            text: (inputs, calc) => 'Sending paper, metal, and food scraps directly to landfills generates toxic landfill methane.',
            score: (inputs, calc) => 1.0
        }
    ]
};

/* ─── App State Module ─────────────────────────────────────────────────────── */

/**
 * Handles application state loading, saving, resetting, and transactions.
 * @namespace AppState
 */
const AppState = {
    /** @type {CO2nserveApp|null} Reference to parent application */
    app: null,

    /** @type {Object} Current user inputs */
    inputs: {},

    /** @type {Array<string>} Active reduction actions committed */
    committedActions: [],

    /** @type {Object|null} Cached carbon emissions calculation results */
    currentCalc: null,

    /** @type {string} Active navigation tab */
    activeTab: 'dashboard',

    /** @type {string} Active step in the calculator */
    activeCalcStep: 'transport',

    /** @type {number} Target reduction goal percentage */
    reductionGoal: 20,

    /** @type {number} Simulator offset slider percentage */
    offsetPct: 0,

    /** @type {string} Selected offset portfolio type */
    offsetPortfolio: 'forestry',

    /** @type {boolean} Flag indicating certified net-zero status */
    netZeroCertified: false,

    /** @type {number} Total trivia score */
    triviaScore: 0,

    /** @type {number} Active index in the trivia questions loop */
    triviaIndex: 0,

    /**
     * Bind instance references and load default structures.
     * @param {CO2nserveApp} app - Parent app instance
     * @returns {void}
     */
    init(app) {
        this.app = app;
        this.inputs = { ...DataConstants.DEFAULT_INPUTS };
        this.committedActions = [];
        this.currentCalc = null;
        this.activeTab = 'dashboard';
        this.activeCalcStep = 'transport';
        this.reductionGoal = 20;
        this.offsetPct = 0;
        this.offsetPortfolio = 'forestry';
        this.netZeroCertified = false;
        this.triviaScore = 0;
        this.triviaIndex = 0;
    },

    /**
     * Restore state parameters from browser LocalStorage database.
     * @returns {void}
     */
    load() {
        try {
            const savedInputs = localStorage.getItem('co2nserve-inputs');
            if (savedInputs) {
                this.inputs = { ...DataConstants.DEFAULT_INPUTS, ...JSON.parse(savedInputs) };
            }

            const savedActions = localStorage.getItem('co2nserve-actions');
            if (savedActions) {
                this.committedActions = JSON.parse(savedActions);
            }

            const savedGoal = localStorage.getItem('co2nserve-goal');
            if (savedGoal) {
                this.reductionGoal = parseInt(savedGoal, 10) || 20;
                const goalSelect = document.getElementById('goal-select');
                if (goalSelect) {
                    goalSelect.value = this.reductionGoal.toString();
                }
            }

            const savedOffset = localStorage.getItem('co2nserve-offset-pct');
            if (savedOffset) {
                this.offsetPct = parseInt(savedOffset, 10) || 0;
            }

            const savedOffsetPortfolio = localStorage.getItem('co2nserve-offset-portfolio');
            if (savedOffsetPortfolio) {
                this.offsetPortfolio = savedOffsetPortfolio;
            }

            const savedNetZero = localStorage.getItem('co2nserve-netzero-certified');
            if (savedNetZero) {
                this.netZeroCertified = savedNetZero === 'true';
            }

            const savedTriviaScore = localStorage.getItem('co2nserve-trivia-score');
            if (savedTriviaScore) {
                this.triviaScore = parseInt(savedTriviaScore, 10) || 0;
            }
        } catch (e) {
            console.error('Error loading local storage state:', e);
        }
    },

    /**
     * Serialize and write all current state configurations into LocalStorage.
     * @returns {void}
     */
    save() {
        try {
            localStorage.setItem('co2nserve-inputs',            JSON.stringify(this.inputs));
            localStorage.setItem('co2nserve-actions',           JSON.stringify(this.committedActions));
            localStorage.setItem('co2nserve-goal',              this.reductionGoal.toString());
            localStorage.setItem('co2nserve-offset-pct',        this.offsetPct.toString());
            localStorage.setItem('co2nserve-offset-portfolio',  this.offsetPortfolio);
            localStorage.setItem('co2nserve-netzero-certified', this.netZeroCertified.toString());
            localStorage.setItem('co2nserve-trivia-score',      this.triviaScore.toString());
        } catch (e) {
            console.error('Error saving local storage state:', e);
        }
    },

    /**
     * Recalculate carbon emissions and save updated state.
     * @returns {void}
     */
    updateCalculations() {
        this.currentCalc = window.CarbonCalculator.calculate(this.inputs);
        this.save();
    },

    /**
     * Commit or toggle an action state.
     * @param {string} actionId - ID of action to toggle
     * @returns {void}
     */
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
        this.app.updateUI();
        this.save();
    }
};

/* ─── Certificate Generator Module ─────────────────────────────────────────── */

/**
 * Draws professional cert vector frames, leaves, dynamic labels and badges onto HTML5 canvas.
 * @namespace CertificateGenerator
 */
const CertificateGenerator = {
    /**
     * Draw decorative leaf branch at a specific coordinate and angle.
     * @private
     * @param {CanvasRenderingContext2D} ctx - Context context
     * @param {number} x - Target x coordinate
     * @param {number} y - Target y coordinate
     * @param {number} angle - Rotation angle in radians
     * @param {number} scale - Scaling factor
     * @returns {void}
     */
    _drawLeaf(ctx, x, y, angle, scale) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-20, -40, 0, -80);
        ctx.quadraticCurveTo(20, -40, 0, 0);
        ctx.fillStyle   = 'rgba(16, 185, 129, 0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth   = 3;
        ctx.stroke();
        ctx.restore();
    },

    /**
     * Render round medal badge representing carbon achievements.
     * @private
     * @param {CanvasRenderingContext2D} ctx - Context
     * @param {number} bx - Target x center
     * @param {number} by - Target y center
     * @param {string} title - Main badge label (top)
     * @param {string} label - Contextual status message (bottom)
     * @param {string} color - Hex/CSS color identifier
     * @param {string} glyph - Unicode emoji symbol representing the reward
     * @returns {void}
     */
    _drawBadge(ctx, bx, by, title, label, color, glyph) {
        ctx.save();
        ctx.translate(bx, by);
        ctx.beginPath();
        ctx.arc(0, 0, 75, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth   = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 65, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();

        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = color;
        ctx.font         = '36px sans-serif';
        ctx.fillText(glyph, 0, -15);

        ctx.fillStyle    = '#ffffff';
        ctx.font         = 'bold 15px "Outfit", sans-serif';
        ctx.fillText(title, 0, 25);

        ctx.fillStyle    = color;
        ctx.font         = 'bold 13px "Inter", sans-serif';
        ctx.fillText(label, 0, 45);
        ctx.restore();
    },

    /**
     * Draw and download a certified PNG from canvas context based on current results.
     * @param {string} userName - Verified name of target participant
     * @returns {void}
     */
    generate(userName) {
        const canvas = document.getElementById('certificate-canvas');
        if (!canvas) return;

        canvas.width  = 2000;
        canvas.height = 1400;
        const ctx = canvas.getContext('2d');

        // Draw background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#0c1712');
        bgGrad.addColorStop(1, '#050a08');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render borders
        const borderGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        borderGrad.addColorStop(0,   '#10b981');
        borderGrad.addColorStop(0.5, '#0ea5e9');
        borderGrad.addColorStop(1,   '#a78bfa');
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth   = 30;
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth   = 4;
        ctx.strokeRect(45, 45, canvas.width - 90, canvas.height - 90);

        // Corner ornaments
        this._drawLeaf(ctx, 150, 150, Math.PI / 4, 1.3);
        this._drawLeaf(ctx, 180, 120, Math.PI / 3, 0.9);
        this._drawLeaf(ctx, 120, 180, Math.PI / 6, 0.9);
        this._drawLeaf(ctx, canvas.width - 150, 150, -Math.PI / 4, 1.3);
        this._drawLeaf(ctx, canvas.width - 180, 120, -Math.PI / 3, 0.9);
        this._drawLeaf(ctx, canvas.width - 120, 180, -Math.PI / 6, 0.9);
        this._drawLeaf(ctx, 150, canvas.height - 150, 3 * Math.PI / 4, 1.3);
        this._drawLeaf(ctx, canvas.width - 150, canvas.height - 150, -3 * Math.PI / 4, 1.3);

        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        // Logo circle badge
        ctx.beginPath();
        ctx.arc(canvas.width / 2, 210, 48, 0, 2 * Math.PI);
        ctx.fillStyle   = 'rgba(16, 185, 129, 0.08)';
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth   = 3;
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font      = 'bold 50px sans-serif';
        ctx.fillText('CO₂', canvas.width / 2, 210);

        ctx.fillStyle = '#90a499';
        ctx.font      = 'bold 30px "Outfit", sans-serif';
        ctx.fillText('CLIMATE ACTION COMMITMENT PLEDGE', canvas.width / 2, 310);

        ctx.fillStyle = '#ffffff';
        ctx.font      = 'bold 75px "Outfit", sans-serif';
        ctx.fillText('CERTIFICATE OF CO₂NSERVATION', canvas.width / 2, 400);

        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 350, 470);
        ctx.lineTo(canvas.width / 2 + 350, 470);
        ctx.stroke();

        ctx.fillStyle = '#90a499';
        ctx.font      = 'italic 28px "Inter", sans-serif';
        ctx.fillText('This document certifies that the individual', canvas.width / 2, 520);

        // User Name text drawing
        ctx.fillStyle = '#10b981';
        ctx.font      = 'bold 68px "Outfit", sans-serif';
        ctx.fillText(userName, canvas.width / 2, 595);

        ctx.fillStyle = '#f1f7f4';
        ctx.font      = '30px "Inter", sans-serif';
        ctx.fillText('has calculated their carbon footprint and pledged to a target savings of', canvas.width / 2, 680);

        // Compute total savings & percentages
        const total = AppState.currentCalc.total;
        const totalCommittedSavings = AppState.app.calculateTotalSavings();
        const projected  = Math.max(0, total - totalCommittedSavings);
        const savingsPct = total > 0 ? Math.round((totalCommittedSavings / total) * 100) : 0;

        ctx.fillStyle = '#0ea5e9';
        ctx.font      = 'bold 85px "Outfit", sans-serif';
        ctx.fillText(`${savingsPct}% Carbon Reduction`, canvas.width / 2, 770);

        // Stats card box
        ctx.fillStyle   = 'rgba(255,255,255,0.02)';
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth   = 2;
        const rx = 250, ry = 840, rw = canvas.width - 500, rh = 140, r = 16;
        ctx.beginPath();
        ctx.moveTo(rx + r, ry);
        ctx.lineTo(rx + rw - r, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
        ctx.lineTo(rx + rw, ry + rh - r);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
        ctx.lineTo(rx + r, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
        ctx.lineTo(rx, ry + r);
        ctx.quadraticCurveTo(rx, ry, rx + r, ry);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.font      = '28px "Inter", sans-serif';
        ctx.fillStyle = '#90a499';
        ctx.textAlign = 'left';

        ctx.fillText('Baseline Footprint:', 300, 910);
        ctx.fillStyle = '#ffffff';
        ctx.font      = 'bold 30px "Outfit", sans-serif';
        ctx.fillText(`${total.toFixed(1)} t CO₂e`, 560, 910);

        ctx.font      = '28px "Inter", sans-serif';
        ctx.fillStyle = '#90a499';
        ctx.fillText('Committed Savings:', 940, 910);
        ctx.fillStyle = '#10b981';
        ctx.font      = 'bold 30px "Outfit", sans-serif';
        ctx.fillText(`-${totalCommittedSavings.toFixed(1)} t CO₂e`, 1220, 910);

        ctx.font      = '28px "Inter", sans-serif';
        ctx.fillStyle = '#90a499';
        ctx.fillText('Projected Target:', 1510, 910);
        ctx.fillStyle = '#0ea5e9';
        ctx.font      = 'bold 30px "Outfit", sans-serif';
        ctx.fillText(`${projected.toFixed(1)} t CO₂e`, 1750, 910);

        // Draw committed actions titles list
        ctx.fillStyle = '#90a499';
        ctx.font      = 'bold 24px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CO₂NSERVE GREEN HABIT COMMITMENTS:', canvas.width / 2, 1030);

        ctx.font      = '22px "Inter", sans-serif';
        ctx.fillStyle = '#f1f7f4';

        const committedActionTitles = [];
        window.ActionsCatalog.actions.forEach(action => {
            if (AppState.committedActions.includes(action.id)) {
                committedActionTitles.push(action.title);
            }
        });

        if (committedActionTitles.length === 0) {
            ctx.fillStyle = '#5e7368';
            ctx.fillText('No actions committed yet. Select actions in the Reduce tab to display them.', canvas.width / 2, 1080);
        } else {
            const listToDraw = committedActionTitles.slice(0, 4);
            ctx.fillText(listToDraw.join('   •   '), canvas.width / 2, 1085);
            if (committedActionTitles.length > 4) {
                ctx.fillStyle = '#5e7368';
                ctx.fillText(`& ${committedActionTitles.length - 4} other lifestyle commitments`, canvas.width / 2, 1125);
            }
        }

        // Draw reward badges
        let badgeColor = '#90a499', badgeLvl = 'Committed', badgeGlyph = '🌱';
        if      (savingsPct >= 50) { badgeColor = '#a78bfa'; badgeLvl = 'Net-Zero Hero';  badgeGlyph = '🏆'; }
        else if (savingsPct >= 35) { badgeColor = '#f59e0b'; badgeLvl = 'Carbon Warrior'; badgeGlyph = '⚔️'; }
        else if (savingsPct >= 20) { badgeColor = '#0ea5e9'; badgeLvl = 'Eco Activist';   badgeGlyph = '⚡'; }
        else if (savingsPct >   0) { badgeColor = '#10b981'; badgeLvl = 'Eco Saver';      badgeGlyph = '🌿'; }
        this._drawBadge(ctx, 350, 1250, 'REDUCER', badgeLvl, badgeColor, badgeGlyph);

        if (AppState.netZeroCertified) {
            this._drawBadge(ctx, canvas.width / 2, 1250, 'NET ZERO', 'Certified', '#10b981', '🌍');
        } else {
            ctx.save(); ctx.globalAlpha = 0.2;
            this._drawBadge(ctx, canvas.width / 2, 1250, 'NET ZERO', 'Locked', '#90a499', '🔒');
            ctx.restore();
        }

        if (AppState.triviaScore >= 4) {
            this._drawBadge(ctx, canvas.width - 350, 1250, 'SCHOLAR', 'Passed Quiz', '#f59e0b', '🎓');
        } else {
            ctx.save(); ctx.globalAlpha = 0.2;
            this._drawBadge(ctx, canvas.width - 350, 1250, 'SCHOLAR', 'Locked', '#90a499', '🔒');
            ctx.restore();
        }

        // Expose generated URI to the document elements for download
        try {
            const dataUrl     = canvas.toDataURL('image/png');
            const previewImg  = document.getElementById('certificate-img-preview');
            const downloadLink = document.getElementById('btn-download-certificate');
            if (previewImg)   previewImg.src  = dataUrl;
            if (downloadLink) downloadLink.href = dataUrl;

            const modal = document.getElementById('certificate-modal');
            if (modal) {
                modal.style.display = 'flex';
                modal.offsetHeight; // trigger reflow
                modal.classList.add('active');
            }
        } catch (e) {
            console.error('Error generating certificate image:', e);
        }
    }
};

/* ─── UI Renderer Module ───────────────────────────────────────────────────── */

/**
 * Handles all DOM updates, SVG layout calculations, interactive charts and dashboard stats.
 * @namespace UIRenderer
 */
const UIRenderer = {
    /** @type {CO2nserveApp|null} Reference to parent application */
    app: null,

    /**
     * Bind instance context.
     * @param {CO2nserveApp} app - Parent app instance
     * @returns {void}
     */
    init(app) {
        this.app = app;
    },

    /**
     * Force synchronization of all slider and form control elements to match state.
     * @returns {void}
     */
    restoreFormControls() {
        const inputs = AppState.inputs;
        const sliders = [
            'carMiles', 'transitHours', 'electricityBill',
            'cleanEnergyShare', 'heatingBill', 'localFoodPct', 'shoppingHabits'
        ];
        sliders.forEach(id => {
            const domEl = document.getElementById(`input-${this.app.camelToKebab(id)}`);
            if (domEl) domEl.value = inputs[id];
        });

        try {
            const carTypeRadio = document.querySelector(`input[name="car-type"][value="${inputs.carType}"]`);
            if (carTypeRadio) carTypeRadio.checked = true;
        } catch (e) {
            console.warn('Error restoring vehicle radio:', e);
        }

        ['flightsShort', 'flightsLong'].forEach(id => {
            const domEl = document.getElementById(`input-${this.app.camelToKebab(id)}`);
            if (domEl) domEl.value = inputs[id];
        });

        const heatSourceSelect = document.getElementById('input-heating-source');
        if (heatSourceSelect) heatSourceSelect.value = inputs.heatingSource;

        try {
            const dietRadio = document.querySelector(`input[name="diet-profile"][value="${inputs.dietProfile}"]`);
            if (dietRadio) dietRadio.checked = true;
        } catch (e) {
            console.warn('Error restoring diet radio:', e);
        }

        ['recyclePaper', 'recyclePlastic', 'recycleGlass', 'recycleCompost'].forEach(id => {
            const domEl = document.getElementById(this.app.camelToKebab(id));
            if (domEl) domEl.checked = !!inputs[id];
        });
    },

    /**
     * Show or hide the heating utility bill slider based on fuel selections.
     * @param {string} source - Heating fuel identifier (gas, electric, etc.)
     * @returns {void}
     */
    toggleHeatingBillVisibility(source) {
        const billContainer = document.getElementById('heating-bill-container');
        const labelBill     = document.getElementById('label-heating-bill');

        if (source === 'none') {
            if (billContainer) billContainer.style.display = 'none';
        } else {
            if (billContainer) billContainer.style.display = 'flex';
            if (labelBill) {
                const labels = {
                    gas:      'Monthly Natural Gas Bill',
                    oil:      'Monthly Heating Oil Bill',
                    biomass:  'Monthly Wood Heating Bill',
                    electric: 'Monthly Heating Electricity Bill'
                };
                labelBill.textContent = labels[source] || 'Monthly Heating Bill';
            }
        }
    },

    /**
     * Format and set text on values indicator label balloons.
     * @param {HTMLElement} domEl - Target element
     * @param {*} rawValue - Value to represent
     * @param {Object} cfg - Configurations details
     * @returns {void}
     */
    updateValueBubble(domEl, rawValue, cfg) {
        const formatted = cfg.format ? cfg.format(rawValue) : rawValue;
        const prefix    = cfg.prefix || '';
        const suffix    = cfg.suffix || '';

        if (cfg.format && (cfg.id === 'shoppingHabits' || cfg.id === 'localFoodPct')) {
            domEl.textContent = formatted;
        } else {
            domEl.textContent = `${prefix}${formatted}${suffix}`;
        }
    },

    /**
     * Render the table grid list of active savings actions.
     * @returns {void}
     */
    renderActions() {
        const container = document.getElementById('actions-catalog-container');
        if (!container) return;

        container.textContent = ''; // Clear safely

        window.ActionsCatalog.actions.forEach(action => {
            // Build difficulty stars safely
            const starsFrag = document.createDocumentFragment();
            for (let i = 0; i < 5; i++) {
                starsFrag.appendChild(document.createTextNode(i < action.difficulty ? '★' : '☆'));
            }
            const starsSpan = el('span', { cls: 'meta-stat-val text-yellow', attrs: { style: 'letter-spacing:1px' } });
            starsSpan.appendChild(starsFrag);

            // Category badge element
            const badgeEl = el('span', { cls: `action-category-badge ${action.category}` });
            if (DataConstants.CATEGORY_ICONS[action.category]) {
                badgeEl.appendChild(icon(DataConstants.CATEGORY_ICONS[action.category]));
            }
            badgeEl.appendChild(document.createTextNode(` ${action.category}`));

            // Header elements
            const headerEl = el('div', { cls: 'action-header' }, [badgeEl]);
            if (action.badge) {
                headerEl.appendChild(el('span', { cls: 'value-bubble', text: action.badge }));
            }

            const savingsVal = el('span', { cls: 'meta-stat-val text-green', id: `action-savings-val-${action.id}`, text: '-0.0t' });

            // Compile meta stats block
            const metaStats = el('div', { cls: 'action-meta-stats' }, [
                el('div', { cls: 'meta-stat-item' }, [
                    el('span', { cls: 'meta-stat-lbl', text: 'Diff' }),
                    starsSpan
                ]),
                el('div', { cls: 'meta-stat-item' }, [
                    el('span', { cls: 'meta-stat-lbl', text: 'Cost' }),
                    el('span', { cls: 'meta-stat-val', text: action.cost })
                ]),
                el('div', { cls: 'meta-stat-item' }, [
                    el('span', { cls: 'meta-stat-lbl', text: 'Est. Savings' }),
                    savingsVal
                ])
            ]);

            // Custom slider switch checkbox control
            const checkbox = el('input', { attrs: { type: 'checkbox', id: `action-checkbox-${action.id}`, 'aria-label': `Commit to action: ${action.title}` } });
            checkbox.addEventListener('change', () => this.app.toggleActionCommit(action.id));

            const switchSlider = el('span', { cls: 'slider-switch' });
            const adoptSwitch  = el('label', { cls: 'adopt-switch' }, [checkbox, switchSlider]);

            const footerEl = el('div', { cls: 'action-footer' }, [
                el('span', { cls: 'adopt-lbl', text: 'Commit to Action' }),
                adoptSwitch
            ]);

            // Construct final card element
            const card = el('div', {
                cls:   'card action-card glass-card',
                id:    `action-card-${action.id}`,
                attrs: { 'data-category': action.category }
            }, [
                headerEl,
                el('h3', { cls: 'action-title',     text: action.title }),
                el('p',  { cls: 'action-card-desc',  text: action.description }),
                metaStats,
                footerEl
            ]);

            container.appendChild(card);
        });

        this.syncActionUIWithState();
    },

    /**
     * Hide or show action cards to filter.
     * @param {string} category - Category filter
     * @returns {void}
     */
    filterActionCards(category) {
        document.querySelectorAll('.action-card').forEach(card => {
            const cardCat = card.getAttribute('data-category');
            card.style.display = (category === 'all' || cardCat === category) ? 'flex' : 'none';
        });
    },

    /**
     * Synchronize action checkboxes and card visual statuses based on committed state.
     * @returns {void}
     */
    syncActionUIWithState() {
        window.ActionsCatalog.actions.forEach(action => {
            const checkbox   = document.getElementById(`action-checkbox-${action.id}`);
            const card       = document.getElementById(`action-card-${action.id}`);
            const isCommitted = AppState.committedActions.includes(action.id);

            if (checkbox) checkbox.checked = isCommitted;
            if (card) card.classList.toggle('adopted', isCommitted);
        });
    },

    /**
     * Master UI updates orchestrator. Renders all dynamic widgets, cards, charts and badges.
     * @returns {void}
     */
    updateUI() {
        const calc = AppState.currentCalc;
        if (!calc) return;
        
        const totalFootprint = calc.total;

        // 1. Update dashboard text counters
        safeText(document.getElementById('dash-total-footprint'), totalFootprint.toFixed(1));
        safeText(document.getElementById('calc-live-total'),      totalFootprint.toFixed(1));

        // 2. Compute individual and cumulative actions savings
        const totalCommittedSavings = this.app.calculateTotalSavings();
        const projectedFootprint = Math.max(0, totalFootprint - totalCommittedSavings);

        // Show/hide dashboard savings badge
        const savingsBadgeWrapper = document.getElementById('dash-savings-badge-wrapper');
        const dashSavedVal        = document.getElementById('dash-saved-co2-val');
        if (savingsBadgeWrapper && dashSavedVal) {
            if (totalCommittedSavings > 0) {
                savingsBadgeWrapper.style.display = 'block';
                safeText(dashSavedVal, totalCommittedSavings.toFixed(1));
            } else {
                savingsBadgeWrapper.style.display = 'none';
            }
        }

        // Dashboard comparison statistics pill
        const compBarTextEl = document.getElementById('dash-comparison-bar-text');
        if (compBarTextEl) {
            const globalAvg = 4.8;
            const diffPct   = Math.round(((totalFootprint - globalAvg) / globalAvg) * 100);
            compBarTextEl.textContent = '';

            const pillEl = el('span', { cls: `comparison-pill ${diffPct > 0 ? 'warning-pill' : 'success-pill'}` });
            if (diffPct > 0) {
                pillEl.appendChild(icon('fa-solid fa-arrow-trend-up'));
                pillEl.appendChild(document.createTextNode(` ${diffPct}% above average`));
            } else {
                pillEl.appendChild(icon('fa-solid fa-arrow-trend-down'));
                pillEl.appendChild(document.createTextNode(` ${Math.abs(diffPct)}% below average`));
            }
            compBarTextEl.appendChild(pillEl);
            compBarTextEl.appendChild(document.createTextNode(` compared to the global individual average (${globalAvg} tonnes).`));
        }

        // 3. Update simulator UI displays
        safeText(document.getElementById('sim-base-footprint'),    `${totalFootprint.toFixed(1)}t`);
        const simSavingsEl = document.getElementById('sim-total-savings');
        if (simSavingsEl) {
            safeText(simSavingsEl, `-${totalCommittedSavings.toFixed(1)}t`);
            simSavingsEl.className = totalCommittedSavings > 0
                ? 'sim-val val-savings text-emerald' : 'sim-val';
        }
        safeText(document.getElementById('sim-projected-footprint'), `${projectedFootprint.toFixed(1)}t`);

        const savingsPct = totalFootprint > 0 ? Math.round((totalCommittedSavings / totalFootprint) * 100) : 0;
        safeText(document.getElementById('sim-percent-reduction'), `${savingsPct}%`);
        const simBarEl = document.getElementById('sim-reduction-bar');
        if (simBarEl) {
            simBarEl.style.width = `${Math.min(100, savingsPct)}%`;
        }

        // 4. Update equivalents metrics block
        safeText(document.getElementById('eq-trees'), Math.round(totalFootprint / 0.02).toLocaleString());
        const eqPhonesEl = document.getElementById('eq-phones');
        if (eqPhonesEl) {
            const chargeCount = totalFootprint * 121643;
            safeText(eqPhonesEl, chargeCount > 1000000
                ? `${(chargeCount / 1000000).toFixed(1)}M`
                : Math.round(chargeCount).toLocaleString());
        }
        safeText(document.getElementById('eq-flights'), (totalFootprint / 0.9).toFixed(1));
        const eqMilesEl = document.getElementById('eq-miles');
        if (eqMilesEl) {
            const milesCount = totalFootprint / 0.00038;
            safeText(eqMilesEl, milesCount > 1000
                ? `${(milesCount / 1000).toFixed(1)}k`
                : Math.round(milesCount).toLocaleString());
        }

        // 5. Draw charts elements
        const categoriesData = [
            { id: 'transport', label: 'Transport',     value: calc.categories.transport.total, color: 'var(--color-green)' },
            { id: 'energy',    label: 'Energy',        value: calc.categories.energy.total,    color: 'var(--color-yellow)' },
            { id: 'food',      label: 'Diet',          value: calc.categories.food.total,      color: 'var(--color-purple)' },
            { id: 'waste',     label: 'Waste & Goods', value: calc.categories.waste.total,     color: 'var(--color-orange)' }
        ];
        window.CO2nserveCharts.renderDonut('donut-chart-container', categoriesData);
        this.renderChartLegend(categoriesData);
        window.CO2nserveCharts.renderBenchmarks('benchmark-bars-container', totalFootprint, projectedFootprint);
        window.CO2nserveCharts.renderGarden('carbon-garden-container', totalFootprint, savingsPct);

        // 6. Update goals tracker radial meter
        this.updateGoalsTracker(savingsPct);

        // 7. Render dynamic insights engine tips
        this.renderInsights();

        // 8. Update carbon offsets calculator
        this.updateOffsetCalculator();
    },

    /**
     * Render the list mapping category legends in the donut card.
     * @param {Array<Object>} data - Legend category segments
     * @returns {void}
     */
    renderChartLegend(data) {
        const container = document.getElementById('donut-chart-legend');
        if (!container) return;

        container.textContent = ''; // Clear safely
        const total = data.reduce((sum, d) => sum + d.value, 0);

        data.forEach(item => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;

            const dotEl = el('div', { cls: 'legend-color-dot', attrs: { style: `background-color: ${item.color}` } });
            const leftEl = el('div', { cls: 'legend-left' }, [
                dotEl,
                el('span', { cls: 'legend-label', text: item.label })
            ]);
            const rightEl = el('div', { cls: 'legend-value-group' }, [
                el('span', { cls: 'legend-val', text: `${item.value.toFixed(1)} t` }),
                el('span', { cls: 'legend-pct', text: `${pct}%` })
            ]);
            const rowEl = el('div', { cls: 'legend-item', attrs: { tabindex: '0', role: 'button', 'aria-label': `${item.label}: ${item.value.toFixed(1)} tonnes (${pct}%)` } }, [leftEl, rightEl]);
            rowEl.addEventListener('click', () => this.highlightChartCategory(item.id));
            rowEl.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    this.highlightChartCategory(item.id);
                    e.preventDefault();
                }
            });
            container.appendChild(rowEl);
        });
    },

    /**
     * Highlights an active category segment in the donut chart and updates overlay label.
     * @param {string} categoryId - Category segment identifier
     * @returns {void}
     */
    highlightChartCategory(categoryId) {
        const container = document.getElementById('donut-chart-container');
        if (!container) return;

        const segments  = container.querySelectorAll('.donut-segment');
        const overlayVal   = container.querySelector('.donut-center-val');
        const overlayLabel = container.querySelector('.donut-center-label');

        segments.forEach(seg => {
            const segCat = seg.getAttribute('data-category');
            if (segCat === categoryId) {
                seg.setAttribute('stroke-width', '12');
                const label = seg.getAttribute('data-label');
                const val   = parseFloat(seg.getAttribute('data-value'));
                const pct   = seg.getAttribute('data-percent');
                if (overlayVal && overlayLabel) {
                    safeText(overlayVal,   `${val.toFixed(1)}t`);
                    safeText(overlayLabel, `${label} (${pct})`);
                }
            } else {
                seg.setAttribute('stroke-width', '10');
            }
        });
    },

    /**
     * Updates the radial goal tracker meter and announcements.
     * @param {number} savingsPct - Committed reduction savings percentage
     * @returns {void}
     */
    updateGoalsTracker(savingsPct) {
        const circle     = document.getElementById('goal-progress-circle');
        const displayPct = document.getElementById('goal-percent-display');
        const statusBox  = document.getElementById('goal-status-message');
        if (!circle) return;

        const radius = 40;
        const circ   = 2 * Math.PI * radius;
        const score  = Math.min(100, savingsPct);
        const offset = circ - (score / 100) * circ;
        circle.style.strokeDashoffset = offset;

        safeText(displayPct, `${savingsPct}%`);

        if (statusBox) {
            statusBox.textContent = ''; // Clear safely
            const isTargetMet = savingsPct >= AppState.reductionGoal;

            let badgeCls, badgeIconCls, badgeText, msgText;
            if (savingsPct === 0) {
                badgeCls     = 'goal-status-badge inactive';
                badgeIconCls = 'fa-solid fa-circle-notch';
                badgeText    = 'Ready to reduce';
                msgText      = `Select carbon-shaving strategies in the Reduce tab to start chipping away at your ${AppState.reductionGoal}% goal!`;
            } else if (isTargetMet) {
                badgeCls     = 'goal-status-badge success';
                badgeIconCls = 'fa-solid fa-trophy';
                badgeText    = 'Goal Achieved!';
                msgText      = `Amazing! You committed to reducing ${savingsPct}%, exceeding your target of ${AppState.reductionGoal}% carbon savings!`;
            } else {
                const deficit = AppState.reductionGoal - savingsPct;
                badgeCls     = 'goal-status-badge fail';
                badgeIconCls = 'fa-solid fa-circle-dot';
                badgeText    = 'In Progress';
                msgText      = `You are at ${savingsPct}% reduction. Commit to actions saving ${deficit}% more to hit your goal.`;
            }

            const badgeEl = el('span', { cls: badgeCls }, [icon(badgeIconCls)]);
            badgeEl.appendChild(document.createTextNode(` ${badgeText}`));

            const paragraphEl = el('p', { cls: 'goal-status-text', text: msgText });

            statusBox.appendChild(badgeEl);
            statusBox.appendChild(paragraphEl);
        }
    },

    /**
     * Processes state variables and renders optimized carbon recommendations.
     * @returns {void}
     */
    renderInsights() {
        const container = document.getElementById('personalized-insights-list');
        if (!container) return;

        const inputs = AppState.inputs;
        const calc = AppState.currentCalc;
        if (!calc) return;

        const insights = [];

        // Evaluate all dynamic data-driven insights rules
        DataConstants.INSIGHT_RULES.forEach(rule => {
            if (rule.test(inputs, calc)) {
                insights.push({
                    category: rule.category,
                    severity: rule.severity,
                    title: rule.title,
                    text: rule.text(inputs, calc),
                    recIcon: rule.recIcon,
                    rec: rule.rec,
                    score: rule.score ? rule.score(inputs, calc) : 0
                });
            }
        });

        // Sort findings based on impact score
        insights.sort((a, b) => b.score - a.score);

        // Fallback placeholder if user profile is pristine
        if (insights.length === 0) {
            insights.push({
                category: 'general',
                severity: 'low',
                title: 'Low Carbon Champion!',
                text: 'Outstanding job! Your inputs show minimal footprint across transport, household utilities, consumption, and plant-focused diets.',
                recIcon: 'fa-solid fa-thumbs-up',
                rec: 'Tip: Keep it up! Share CO2nserve with others to expand your eco-impact community.',
                score: 0
            });
        }

        container.textContent = ''; // Clear safely

        insights.forEach(ins => {
            const badgeText = ins.severity === 'high' ? 'Critical Area'
                : ins.severity === 'medium' ? 'Opportunity' : 'Healthy';

            const iconBoxEl = el('div', { cls: 'insight-icon-box' }, [
                icon(DataConstants.INSIGHT_CATEGORY_ICONS[ins.category] || 'fa-solid fa-heart')
            ]);

            const recEl = el('div', { cls: 'insight-recommendation' });
            recEl.appendChild(icon(ins.recIcon));
            recEl.appendChild(document.createTextNode(` ${ins.rec}`));

            const detailsEl = el('div', { cls: 'insight-details' }, [
                el('span', { cls: 'insight-badge',       text: badgeText }),
                el('h3',   { cls: 'insight-card-title',  text: ins.title }),
                el('p',    { cls: 'insight-card-text',   text: ins.text }),
                recEl
            ]);

            const card = el('div', { cls: `card insight-card glass-card severity-${ins.severity} fade-in` },
                [iconBoxEl, detailsEl]);
            container.appendChild(card);
        });
    },

    /**
     * Update dynamic portfolio cost configurations inside offsets selector card.
     * @returns {void}
     */
    updateOffsetCalculator() {
        const calc = AppState.currentCalc;
        if (!calc) return;

        const total = calc.total;
        const totalCommittedSavings = this.app.calculateTotalSavings();
        const projected = Math.max(0, total - totalCommittedSavings);

        safeText(document.getElementById('offset-remaining-emissions'), `${projected.toFixed(2)} tonnes`);

        const amountOffset = projected * (AppState.offsetPct / 100);
        safeText(document.getElementById('offset-amount-val'), `${amountOffset.toFixed(2)} tonnes`);

        let pricePerTonne = 15;
        if      (AppState.offsetPortfolio === 'wind-solar') pricePerTonne = 25;
        else if (AppState.offsetPortfolio === 'direct-air') pricePerTonne = 120;
        else if (AppState.offsetPortfolio === 'balanced')   pricePerTonne = 35;

        const annualCost  = amountOffset * pricePerTonne;
        const monthlyCost = annualCost / 12;
        safeText(document.getElementById('offset-cost-annual'),  `$${Math.round(annualCost).toLocaleString()} / yr`);
        safeText(document.getElementById('offset-cost-monthly'), `($${monthlyCost.toFixed(2)} / mo)`);

        const btnNetZero = document.getElementById('btn-achieve-netzero');
        if (btnNetZero) {
            btnNetZero.textContent = ''; // Clear safely
            if (AppState.netZeroCertified) {
                btnNetZero.appendChild(icon('fa-solid fa-circle-check'));
                btnNetZero.appendChild(document.createTextNode(' Net-Zero Certified!'));
                btnNetZero.style.background = 'linear-gradient(135deg, var(--color-green), var(--color-blue))';
                btnNetZero.style.color      = '#ffffff';
                btnNetZero.style.border     = 'none';
            } else {
                btnNetZero.appendChild(icon('fa-solid fa-award'));
                btnNetZero.appendChild(document.createTextNode(' Achieve Certified Net-Zero'));
                btnNetZero.style.background = 'none';
                btnNetZero.style.border     = '1px solid var(--border-card-hover)';
                btnNetZero.style.color      = 'var(--text-primary)';
            }
        }
    },

    /**
     * Render the active climate question and options buttons.
     * @returns {void}
     */
    renderTriviaQuestion() {
        const qData = DataConstants.TRIVIA_QUESTIONS[AppState.triviaIndex];

        safeText(document.getElementById('trivia-q-num'), AppState.triviaIndex + 1);
        const progressPct = ((AppState.triviaIndex + 1) / DataConstants.TRIVIA_QUESTIONS.length) * 100;
        const progressBar = document.getElementById('trivia-q-progress');
        if (progressBar) {
            progressBar.style.width = `${progressPct}%`;
        }

        safeText(document.getElementById('trivia-question-text'), qData.q);

        const feedbackBox = document.getElementById('trivia-feedback-box');
        if (feedbackBox) {
            feedbackBox.style.display = 'none';
        }

        const optionsContainer = document.getElementById('trivia-options-container');
        if (!optionsContainer) return;
        optionsContainer.textContent = ''; // Clear safely

        qData.options.forEach((opt, idx) => {
            const optText    = el('span', { text: opt });
            const chevIcon   = icon('fa-solid fa-chevron-right option-chevron');
            chevIcon.style.cssText = 'opacity:0.3; font-size:0.8rem;';
            const btn = el('button', { cls: 'trivia-option-btn', attrs: { 'aria-label': `Option ${idx + 1}: ${opt}` } }, [optText, chevIcon]);
            btn.addEventListener('click', () => this.app.submitTriviaAnswer(idx, btn));
            optionsContainer.appendChild(btn);
        });
    },

    /**
     * Show trivia quiz results panel.
     * @returns {void}
     */
    showTriviaResults() {
        document.getElementById('trivia-question-screen').style.display = 'none';
        document.getElementById('trivia-result-screen').style.display   = 'flex';

        const scoreDisp  = document.getElementById('trivia-score-display');
        const resultTitle = document.getElementById('trivia-result-title');
        const resultText  = document.getElementById('trivia-result-text');

        safeText(scoreDisp, `${AppState.triviaScore}/${DataConstants.TRIVIA_QUESTIONS.length}`);

        if (AppState.triviaScore >= 4) {
            safeText(resultTitle, 'Climate Scholar Certified!');
            if (resultTitle) resultTitle.style.color = 'var(--color-green)';
            if (resultText) {
                resultText.textContent = '';
                resultText.appendChild(document.createTextNode(
                    `Excellent work! You answered ${AppState.triviaScore} of 5 correctly. You have unlocked the `));
                resultText.appendChild(el('strong', { text: 'Climate Scholar' }));
                resultText.appendChild(document.createTextNode(' badge on your pledge certificate!'));
            }
            this.app.triggerConfetti();
        } else {
            safeText(resultTitle, 'Keep Learning!');
            if (resultTitle) resultTitle.style.color = 'var(--color-yellow)';
            safeText(resultText, `You scored ${AppState.triviaScore} out of 5. Review the explanations, retry the quiz, and score 4/5 or better to earn your certificate badge.`);
        }
        AppState.save();
    }
};

/* ─── Event Controller Module ──────────────────────────────────────────────── */

/**
 * Handles initialization event binding, navigation, spinners, theme selection and keyboard hooks.
 * @namespace EventController
 */
const EventController = {
    /** @type {CO2nserveApp|null} Reference to parent application */
    app: null,

    /**
     * Bind listeners to theme selector, tabs, sliders, spinners and key mappings.
     * @param {CO2nserveApp} app - Parent app instance
     * @returns {void}
     */
    init(app) {
        this.app = app;
        this.setupTheme();
        this.setupNavigation();
        this.setupFormListeners();
        this.setupActionListeners();
        this.setupGoalListeners();
        this.setupOffsetListeners();
        this.setupTriviaListeners();
        this.setupCertificateListeners();
        this.setupKeyboardNavigation();
    },

    /**
     * Theme toggle control listener setup.
     * @returns {void}
     */
    setupTheme() {
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (!themeBtn) return;

        // Load theme safely
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

            this.app.updateUI();
        });
    },

    /**
     * Configure main navigation tabs listeners.
     * @returns {void}
     */
    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                this.app.switchTab(target);
            });
        });
    },

    /**
     * Setup event listeners for forms, slider ranges, selects and checkboxes.
     * @returns {void}
     */
    setupFormListeners() {
        DataConstants.SLIDER_CONFIGS.forEach(cfg => {
            const kebabId  = this.app.camelToKebab(cfg.id);
            const sliderEl = document.getElementById(`input-${kebabId}`);
            const bubbleEl = document.getElementById(`val-${kebabId}`);

            if (sliderEl) {
                // Set initial bubble state
                if (bubbleEl) {
                    UIRenderer.updateValueBubble(bubbleEl, sliderEl.value, cfg);
                }

                sliderEl.addEventListener('input', (e) => {
                    const val = e.target.value;
                    AppState.inputs[cfg.id] = parseFloat(val);
                    if (bubbleEl) {
                        UIRenderer.updateValueBubble(bubbleEl, val, cfg);
                    }
                    AppState.updateCalculations();
                    this.app.updateUI();
                });
            }
        });

        // Vehicle radio inputs change listener
        document.querySelectorAll('input[name="car-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                AppState.inputs.carType = e.target.value;
                AppState.updateCalculations();
                this.app.updateUI();
            });
        });

        // Heating type select input listener
        const heatingSelect = document.getElementById('input-heating-source');
        if (heatingSelect) {
            heatingSelect.addEventListener('change', (e) => {
                const source = e.target.value;
                AppState.inputs.heatingSource = source;
                UIRenderer.toggleHeatingBillVisibility(source);
                AppState.updateCalculations();
                this.app.updateUI();
            });
        }

        // Diet profile radio choices change listener
        document.querySelectorAll('input[name="diet-profile"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                AppState.inputs.dietProfile = e.target.value;
                AppState.updateCalculations();
                this.app.updateUI();
            });
        });

        // Waste sorting recycling checkboxes listeners
        ['recyclePaper', 'recyclePlastic', 'recycleGlass', 'recycleCompost'].forEach(id => {
            const domEl = document.getElementById(this.app.camelToKebab(id));
            if (domEl) {
                domEl.addEventListener('change', (e) => {
                    AppState.inputs[id] = e.target.checked;
                    AppState.updateCalculations();
                    this.app.updateUI();
                });
            }
        });
    },

    /**
     * Wire up filters inside Reduce committed actions catalog view.
     * @returns {void}
     */
    setupActionListeners() {
        const filterContainer = document.getElementById('action-category-filters');
        if (filterContainer) {
            filterContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.filter-btn');
                if (!btn) return;

                filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter');
                this.app.filterActionCards(filter);
            });
        }
    },

    /**
     * Wire up dropdown selector change triggers on goal targets.
     * @returns {void}
     */
    setupGoalListeners() {
        const goalSelect = document.getElementById('goal-select');
        if (goalSelect) {
            goalSelect.addEventListener('change', (e) => {
                AppState.reductionGoal = parseInt(e.target.value, 10) || 20;
                AppState.save();
                this.app.updateUI();
            });
        }
    },

    /**
     * Setup events inside the offset card: sliders, radio buttons, and the certified button.
     * @returns {void}
     */
    setupOffsetListeners() {
        const offsetSlider = document.getElementById('input-offset-pct');
        const offsetBubble = document.getElementById('val-offset-pct');

        if (offsetSlider) {
            offsetSlider.addEventListener('input', (e) => {
                AppState.offsetPct = parseInt(e.target.value, 10) || 0;
                safeText(offsetBubble, `${AppState.offsetPct}%`);
                if (AppState.offsetPct < 100) {
                    AppState.netZeroCertified = false;
                }
                this.app.updateUI();
                AppState.save();
            });
        }

        const portfolioCards = document.querySelectorAll('.portfolio-option-card');
        portfolioCards.forEach(card => {
            card.addEventListener('click', () => {
                portfolioCards.forEach(c => {
                    c.classList.remove('active');
                    c.style.background   = 'rgba(0,0,0,0.1)';
                    c.style.borderColor  = 'var(--border-card)';
                });
                card.classList.add('active');
                card.style.background  = 'var(--color-green-glow)';
                card.style.borderColor = 'var(--border-card-hover)';

                const radio = card.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    AppState.offsetPortfolio = radio.value;
                }
                this.app.updateUI();
                AppState.save();
            });
        });

        const btnNetZero = document.getElementById('btn-achieve-netzero');
        if (btnNetZero) {
            btnNetZero.addEventListener('click', () => {
                AppState.offsetPct = 100;
                if (offsetSlider) offsetSlider.value = '100';
                safeText(offsetBubble, '100%');
                AppState.netZeroCertified = true;
                this.app.triggerConfetti();
                this.app.updateUI();
                AppState.save();
            });
        }

        // Initialize state components
        if (offsetSlider) offsetSlider.value = AppState.offsetPct;
        safeText(offsetBubble, `${AppState.offsetPct}%`);

        portfolioCards.forEach(card => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio && radio.value === AppState.offsetPortfolio) {
                portfolioCards.forEach(c => {
                    c.classList.remove('active');
                    c.style.background  = 'rgba(0,0,0,0.1)';
                    c.style.borderColor = 'var(--border-card)';
                });
                card.classList.add('active');
                card.style.background  = 'var(--color-green-glow)';
                card.style.borderColor = 'var(--border-card-hover)';
                radio.checked = true;
            }
        });
    },

    /**
     * Wire up quiz start, retry and answer button submissions hooks.
     * @returns {void}
     */
    setupTriviaListeners() {
        const btnStart = document.getElementById('btn-start-trivia');
        if (btnStart) {
            btnStart.addEventListener('click', () => {
                document.getElementById('trivia-start-screen').style.display   = 'none';
                document.getElementById('trivia-question-screen').style.display = 'flex';
                AppState.triviaIndex = 0;
                AppState.triviaScore = 0;
                UIRenderer.renderTriviaQuestion();
            });
        }

        const btnNext = document.getElementById('btn-next-trivia');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                AppState.triviaIndex++;
                if (AppState.triviaIndex < DataConstants.TRIVIA_QUESTIONS.length) {
                    UIRenderer.renderTriviaQuestion();
                } else {
                    UIRenderer.showTriviaResults();
                }
            });
        }

        const btnRetry = document.getElementById('btn-retry-trivia');
        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                document.getElementById('trivia-result-screen').style.display   = 'none';
                document.getElementById('trivia-question-screen').style.display = 'flex';
                AppState.triviaIndex = 0;
                AppState.triviaScore = 0;
                UIRenderer.renderTriviaQuestion();
            });
        }
    },

    /**
     * Handle trivia option button selection logic.
     * @param {number} optionIdx - Chosen index number
     * @param {HTMLElement} clickedBtn - Clicked button node element
     * @returns {void}
     */
    submitTriviaAnswer(optionIdx, clickedBtn) {
        const qData     = DataConstants.TRIVIA_QUESTIONS[AppState.triviaIndex];
        const isCorrect = optionIdx === qData.answer;

        const optionsContainer = document.getElementById('trivia-options-container');
        if (!optionsContainer) return;
        const buttons = optionsContainer.querySelectorAll('.trivia-option-btn');

        buttons.forEach(btn => {
            btn.disabled = true;
        });

        const feedbackBox   = document.getElementById('trivia-feedback-box');
        const feedbackIcon  = document.getElementById('trivia-feedback-icon');
        const feedbackTitle = document.getElementById('trivia-feedback-title');
        const feedbackText  = document.getElementById('trivia-feedback-text');

        if (isCorrect) {
            AppState.triviaScore++;
            clickedBtn.classList.add('correct-option');
            const optChevron = clickedBtn.querySelector('.option-chevron');
            if (optChevron) optChevron.className = 'fa-solid fa-circle-check';
            if (feedbackIcon)  feedbackIcon.className = 'fa-solid fa-circle-check text-green';
            safeText(feedbackTitle, 'Correct!');
            if (feedbackTitle) feedbackTitle.style.color = 'var(--color-green)';
        } else {
            clickedBtn.classList.add('incorrect-option');
            const optChevron = clickedBtn.querySelector('.option-chevron');
            if (optChevron) optChevron.className = 'fa-solid fa-circle-xmark';
            if (feedbackIcon)  feedbackIcon.className = 'fa-solid fa-circle-xmark text-danger';
            safeText(feedbackTitle, 'Incorrect');
            if (feedbackTitle) feedbackTitle.style.color = 'var(--color-danger)';

            const correctBtn = buttons[qData.answer];
            if (correctBtn) {
                correctBtn.classList.add('correct-option');
                const cv = correctBtn.querySelector('.option-chevron');
                if (cv) cv.className = 'fa-solid fa-circle-check';
            }
        }

        safeText(feedbackText, qData.explain);
        if (feedbackBox) feedbackBox.style.display = 'flex';
    },

    /**
     * Wire up generation triggers and close operations inside the Climate Pledge certificate modal.
     * @returns {void}
     */
    setupCertificateListeners() {
        const btnGen    = document.getElementById('btn-generate-certificate');
        const nameInput = document.getElementById('input-pledge-name');
        const nameError = document.getElementById('pledge-name-error');

        if (btnGen && nameInput) {
            btnGen.addEventListener('click', () => {
                // Validate inputs: remove typical script tags markup characters
                const rawName = nameInput.value;
                const name    = rawName.replace(/[<>&"']/g, '').trim();
                if (!name) {
                    if (nameError) nameError.style.display = 'block';
                    return;
                }
                if (nameError) nameError.style.display = 'none';
                this.app.generateCertificateCanvas(name);
            });
        }

        const btnClose    = document.getElementById('btn-close-modal');
        const btnCloseAlt = document.getElementById('btn-close-modal-alt');
        const modal       = document.getElementById('certificate-modal');

        const closeModalFunc = () => {
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }
        };

        if (btnClose)    btnClose.addEventListener('click', closeModalFunc);
        if (btnCloseAlt) btnCloseAlt.addEventListener('click', closeModalFunc);
    },

    /**
     * Setup keyboard interaction mapping hooks for accessibility compliance (tablists, option cards, filters).
     * @returns {void}
     */
    setupKeyboardNavigation() {
        // 1. Navigation Tabs Arrow Key Support
        const tabs = Array.from(document.querySelectorAll('.nav-btn'));
        tabs.forEach((tab, index) => {
            tab.addEventListener('keydown', (e) => {
                let targetIndex = null;
                if (e.key === 'ArrowRight') {
                    targetIndex = (index + 1) % tabs.length;
                } else if (e.key === 'ArrowLeft') {
                    targetIndex = (index - 1 + tabs.length) % tabs.length;
                }
                if (targetIndex !== null) {
                    tabs[targetIndex].focus();
                    this.app.switchTab(tabs[targetIndex].getAttribute('data-target'));
                    e.preventDefault();
                }
            });
        });

        // 2. Calculator Step Sidebar List Items Arrow Key Support
        const stepItems = Array.from(document.querySelectorAll('.step-item'));
        stepItems.forEach((item, index) => {
            item.addEventListener('keydown', (e) => {
                let targetIndex = null;
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                    targetIndex = (index + 1) % stepItems.length;
                } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    targetIndex = (index - 1 + stepItems.length) % stepItems.length;
                }
                if (targetIndex !== null) {
                    stepItems[targetIndex].focus();
                    const step = stepItems[targetIndex].getAttribute('data-step');
                    if (step) this.app.setCalcStep(step);
                    e.preventDefault();
                }
            });
        });

        // 3. Offset Simulator Portfolio Cards Keyboard Support
        const portfolioCards = Array.from(document.querySelectorAll('.portfolio-option-card'));
        portfolioCards.forEach((card, index) => {
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'radio');
            card.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    card.click();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    const nextIndex = (index + 1) % portfolioCards.length;
                    portfolioCards[nextIndex].focus();
                    portfolioCards[nextIndex].click();
                    e.preventDefault();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    const prevIndex = (index - 1 + portfolioCards.length) % portfolioCards.length;
                    portfolioCards[prevIndex].focus();
                    portfolioCards[prevIndex].click();
                    e.preventDefault();
                }
            });
        });

        // 4. Reduce Tab Actions Filter Buttons Key Support
        const filterBtns = Array.from(document.querySelectorAll('.filter-btn'));
        filterBtns.forEach((btn, index) => {
            btn.addEventListener('keydown', (e) => {
                let targetIndex = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    targetIndex = (index + 1) % filterBtns.length;
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    targetIndex = (index - 1 + filterBtns.length) % filterBtns.length;
                }
                if (targetIndex !== null) {
                    filterBtns[targetIndex].focus();
                    filterBtns[targetIndex].click();
                    e.preventDefault();
                }
            });
        });
    }
};

/* ─── Application Delegate wrapper class ──────────────────────────────────── */

/**
 * Controller class managing the CO2nserve application lifecycle and public APIs.
 * Preserves the exact properties and method signatures expected by unit/integration tests.
 */
class CO2nserveApp {
    constructor() {
        AppState.init(this);
        UIRenderer.init(this);
    }

    /* ── State Getters/Setters mapping directly to AppState ─────────────────── */
    get inputs() { return AppState.inputs; }
    set inputs(v) { AppState.inputs = v; }
    get committedActions() { return AppState.committedActions; }
    set committedActions(v) { AppState.committedActions = v; }
    get currentCalc() { return AppState.currentCalc; }
    set currentCalc(v) { AppState.currentCalc = v; }
    get activeTab() { return AppState.activeTab; }
    set activeTab(v) { AppState.activeTab = v; }
    get activeCalcStep() { return AppState.activeCalcStep; }
    set activeCalcStep(v) { AppState.activeCalcStep = v; }
    get reductionGoal() { return AppState.reductionGoal; }
    set reductionGoal(v) { AppState.reductionGoal = v; }
    get offsetPct() { return AppState.offsetPct; }
    set offsetPct(v) { AppState.offsetPct = v; }
    get offsetPortfolio() { return AppState.offsetPortfolio; }
    set offsetPortfolio(v) { AppState.offsetPortfolio = v; }
    get netZeroCertified() { return AppState.netZeroCertified; }
    set netZeroCertified(v) { AppState.netZeroCertified = v; }
    get triviaScore() { return AppState.triviaScore; }
    set triviaScore(v) { AppState.triviaScore = v; }
    get triviaIndex() { return AppState.triviaIndex; }
    set triviaIndex(v) { AppState.triviaIndex = v; }
    get triviaQuestions() { return DataConstants.TRIVIA_QUESTIONS; }

    /**
     * Initialize application state, modules, events and render initial views.
     * @returns {void}
     */
    init() {
        AppState.load();
        EventController.init(this);

        // Wire up calculator sidebar step list items click
        document.querySelectorAll('.step-item').forEach(item => {
            item.addEventListener('click', () => {
                const step = item.getAttribute('data-step');
                if (step) this.setCalcStep(step);
            });
        });

        // Wire up Quick CTA banner button
        const ctaBtn = document.getElementById('btn-cta-open-calculator');
        if (ctaBtn) {
            ctaBtn.addEventListener('click', () => this.switchTab('calculator'));
        }

        // Wire up sub-nav step buttons in the calculator cards
        const subNavMap = [
            { id: 'btn-nav-transport-to-energy', action: () => this.setCalcStep('energy') },
            { id: 'btn-nav-energy-to-transport', action: () => this.setCalcStep('transport') },
            { id: 'btn-nav-energy-to-food',      action: () => this.setCalcStep('food') },
            { id: 'btn-nav-food-to-energy',      action: () => this.setCalcStep('energy') },
            { id: 'btn-nav-food-to-waste',       action: () => this.setCalcStep('waste') },
            { id: 'btn-nav-waste-to-food',       action: () => this.setCalcStep('food') },
            { id: 'btn-nav-waste-to-dashboard',  action: () => this.switchTab('dashboard') }
        ];
        subNavMap.forEach(({ id, action }) => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', action);
        });

        // Wire up spin button controls delta targets
        document.querySelectorAll('.spinner-btn[data-spinner-target]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-spinner-target');
                const delta    = parseInt(btn.getAttribute('data-spinner-delta'), 10) || 0;
                if (targetId) this.adjustSpinner(targetId, delta);
            });
        });

        // Bootstrap calculations and triggers render
        this.updateCalculations();
        UIRenderer.renderActions();
        this.updateUI();

        // Restore initial heating elements visibility
        const heatingSelect = document.getElementById('input-heating-source');
        if (heatingSelect) {
            UIRenderer.toggleHeatingBillVisibility(heatingSelect.value);
        }

        // Automatically sync form values with state values loaded
        UIRenderer.restoreFormControls();

        // Trigger updates layout metrics on resize for charts elements
        window.addEventListener('resize', () => this.updateUI());
    }

    /* ─── Public Delegate Methods (expected by tests/HTML) ───────────────────── */

    /**
     * Utility method: convert camelCase strings into kebab-case.
     * @param {string} str - CamelCase string to convert
     * @returns {string} The formatted kebab-case string
     */
    camelToKebab(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Switch current visible views tab.
     * @param {string} tabId - Target tab identifier
     * @returns {void}
     */
    switchTab(tabId) {
        AppState.activeTab = tabId;

        document.querySelectorAll('.nav-btn').forEach(btn => {
            const isActive = btn.getAttribute('data-target') === tabId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        document.querySelectorAll('.tab-view').forEach(view => {
            view.classList.toggle('active', view.id === `view-${tabId}`);
        });

        this.updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Set active calculator step cards view.
     * @param {string} stepId - Step category identifier
     * @returns {void}
     */
    setCalcStep(stepId) {
        AppState.activeCalcStep = stepId;

        document.querySelectorAll('.step-item').forEach(item => {
            const isActive = item.getAttribute('data-step') === stepId;
            item.classList.toggle('active', isActive);
            item.setAttribute('aria-selected', isActive ? 'true' : 'false');
            item.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        document.querySelectorAll('.calc-step-view').forEach(view => {
            view.classList.toggle('active', view.id === `calc-step-${stepId}`);
        });
    }

    /**
     * Increment or decrement flight values controls.
     * @param {string} inputId - Target input element identifier
     * @param {number} delta - Delta modification step integer
     * @returns {void}
     */
    adjustSpinner(inputId, delta) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const val    = parseInt(input.value, 10) || 0;
        const min    = parseInt(input.getAttribute('min'), 10) || 0;
        const max    = parseInt(input.getAttribute('max'), 10) || 999;
        const newVal = Math.min(max, Math.max(min, val + delta));
        input.value  = newVal;

        // Map inputs properties using camelCase mapping
        const stateKey = inputId.replace('input-', '').replace(/-([a-z])/g, (_, g) => g.toUpperCase());
        AppState.inputs[stateKey] = newVal;

        this.updateCalculations();
        this.updateUI();
    }

    /**
     * Wrapper proxy to toggle actions committed items.
     * @param {string} actionId - Target action category ID
     * @returns {void}
     */
    toggleActionCommit(actionId) {
        AppState.toggleActionCommit(actionId);
    }

    /**
     * Wrapper proxy to filter action cards categories.
     * @param {string} filter - Category identifier filter
     * @returns {void}
     */
    filterActionCards(filter) {
        UIRenderer.filterActionCards(filter);
    }

    /**
     * Wrapper proxy to sync committed actions visual layout checkboxes status.
     * @returns {void}
     */
    syncActionUIWithState() {
        UIRenderer.syncActionUIWithState();
    }

    /**
     * Wrapper proxy to update calculation metrics.
     * @returns {void}
     */
    updateCalculations() {
        AppState.updateCalculations();
    }

    /**
     * Wrapper proxy to trigger general UI updates.
     * @returns {void}
     */
    updateUI() {
        UIRenderer.updateUI();
    }

    /**
     * Unified method: compute sum of committed carbon savings.
     * @returns {number} Sum of savings in tonnes CO₂e/yr
     */
    calculateTotalSavings() {
        let totalCommittedSavings = 0;
        window.ActionsCatalog.actions.forEach(action => {
            const savings = action.calculateSavings(AppState.inputs, AppState.currentCalc);
            if (AppState.committedActions.includes(action.id)) {
                totalCommittedSavings += savings;
            }
        });
        return totalCommittedSavings;
    }

    /**
     * Delegate method: triggers canvas drawings.
     * @param {string} name - Verified participant name
     * @returns {void}
     */
    generateCertificateCanvas(name) {
        CertificateGenerator.generate(name);
    }

    /**
     * Wrapper proxy to handle answer selections in trivia quiz widget.
     * @param {number} idx - Selection option number index
     * @param {HTMLElement} btn - Button element target node
     * @returns {void}
     */
    submitTriviaAnswer(idx, btn) {
        EventController.submitTriviaAnswer(idx, btn);
    }

    /**
     * Trigger confetti canvas drops animation.
     * @returns {void}
     */
    triggerConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;

        const ctx       = canvas.getContext('2d');
        const particles = [];
        const colors    = ['#10b981', '#0ea5e9', '#f59e0b', '#ec4899', '#a78bfa'];

        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;

        for (let i = 0; i < 150; i++) {
            particles.push({
                x:     Math.random() * canvas.width,
                y:     Math.random() * canvas.height - canvas.height,
                r:     Math.random() * 6 + 4,
                d:     Math.random() * canvas.height,
                color: colors[Math.floor(Math.random() * colors.length)],
                tilt:  Math.random() * 10 - 5,
                tiltAngleIncremental: Math.random() * 0.07 + 0.02,
                tiltAngle: 0,
                speed:     Math.random() * 3 + 2.5
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
                p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;
                if (p.y <= canvas.height) activeParticles++;
                ctx.beginPath();
                ctx.lineWidth   = p.r;
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

/* ─── Bootstrap Application ───────────────────────────────────────────────── */
const app = new CO2nserveApp();
window.app = app;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}
