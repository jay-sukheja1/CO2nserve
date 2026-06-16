/**
 * CO2nserve Carbon Calculator Engine
 * Uses standardized emission factors based on EPA (Environmental Protection Agency)
 * and IPCC (Intergovernmental Panel on Climate Change) guidelines.
 */

/* ─── Input Sanitization Helpers ──────────────────────────────────────────── */

/**
 * Safely parse and clamp a numeric value.
 * Returns `fallback` when the value is NaN, non-finite, or out of [min, max].
 * @param {*}      val      - Raw input value
 * @param {number} min      - Inclusive minimum
 * @param {number} max      - Inclusive maximum
 * @param {number} fallback - Value to use when parsing fails
 * @returns {number}
 */
function sanitizeNumber(val, min, max, fallback) {
    const n = parseFloat(val);
    if (!isFinite(n) || isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

/**
 * Safely validate a string against an explicit allow-list.
 * Returns `fallback` when `val` is not in the list.
 * @param {*}        val      - Raw input value
 * @param {string[]} allowed  - Permitted values
 * @param {string}   fallback - Value to use when validation fails
 * @returns {string}
 */
function sanitizeString(val, allowed, fallback) {
    const s = String(val).trim();
    return allowed.includes(s) ? s : fallback;
}

/* ─── Calculator Object ────────────────────────────────────────────────────── */

const CarbonCalculator = {
    // EMISSION FACTORS (in kg CO2e per unit)
    FACTORS: {
        // Cars (per mile)
        car: {
            petrol:   0.38,  // kg CO2e per mile for average gasoline car
            diesel:   0.35,  // kg CO2e per mile for average diesel car
            hybrid:   0.20,  // kg CO2e per mile for hybrid car
            electric: 0.08   // kg CO2e per mile (average grid lifecycle emissions)
        },

        // Public Transit (per passenger-mile)
        transit: 0.09,       // average bus/rail transit blend

        // Flights (flat kg CO2e per flight)
        flights: {
            short: 150,      // < 3 hours (~150 kg per passenger flight)
            long:  800       // > 3 hours (~800 kg per passenger flight)
        },

        // Grid Electricity (per kWh)
        electricity: 0.38,   // US average electric grid intensity

        // Heating fuels (per energy unit)
        heating: {
            gas:      5.3,   // kg CO2e per therm of Natural Gas
            oil:     10.1,   // kg CO2e per gallon of Heating Oil
            biomass:  0.8,   // kg CO2e per lb of wood/pellets
            electric: 0.38   // (tied to electricity factor)
        },

        // Unit conversion configurations
        conversions: {
            electricityPricePerKwh: 0.16, // average cost in USD
            gasPricePerTherm:       1.20,
            oilPricePerGallon:      3.50,
            woodPricePerLb:         0.10,
            transitMph:             20    // estimated average transit speed
        },

        // Food Annual Baselines (in metric tonnes of CO2e per year)
        diet: {
            'heavy-meat':  3.4,
            'medium-meat': 2.8,
            'low-meat':    2.4,
            vegetarian:    1.7,
            vegan:         1.5
        },

        // Consumption Annual Baselines (in metric tonnes of CO2e per year)
        shopping: {
            1: 0.5, // Minimalist
            2: 1.0, // Frugal
            3: 1.8, // Average
            4: 2.6, // Frequent
            5: 3.8  // High Spender
        },

        // Waste baseline & recycling savings (in tonnes per year)
        waste: {
            baseline:         0.8,
            recycleReduction: 0.15 // savings per material category recycled
        }
    },

    /** Allowed values for enum-type inputs */
    ALLOWED: {
        carType:       ['petrol', 'diesel', 'hybrid', 'electric'],
        heatingSource: ['gas', 'electric', 'oil', 'biomass', 'none'],
        dietProfile:   ['heavy-meat', 'medium-meat', 'low-meat', 'vegetarian', 'vegan']
    },

    /**
     * Calculate carbon footprint based on UI inputs.
     * @param {Object} inputs
     * @returns {Object} Broken-down emissions in tonnes of CO2e per year
     */
    calculate(inputs) {
        // Initialize outputs (all in metric tonnes CO2e/year)
        let transportCar     = 0;
        let transportTransit = 0;
        let transportFlights = 0;
        let energyElectric   = 0;
        let energyHeating    = 0;
        let foodEmissions    = 0;
        let wasteEmissions   = 0;

        // ── 1. TRANSPORTATION ──────────────────────────────────────────────
        // Car: miles × factor. Convert kg → tonnes (÷ 1000)
        const carMiles  = sanitizeNumber(inputs.carMiles, 0, 100000, 0);
        const carType   = sanitizeString(inputs.carType, this.ALLOWED.carType, 'petrol');
        const carFactor = this.FACTORS.car[carType];
        transportCar    = (carMiles * carFactor) / 1000;

        // Public Transit: weekly hours × speed × 52 weeks × factor → tonnes
        const transitHours    = sanitizeNumber(inputs.transitHours, 0, 168, 0);
        const transitMilesYear = transitHours * this.FACTORS.conversions.transitMph * 52;
        transportTransit      = (transitMilesYear * this.FACTORS.transit) / 1000;

        // Flights: quantity × flat factors → tonnes
        const flightsShort  = sanitizeNumber(inputs.flightsShort, 0, 365, 0);
        const flightsLong   = sanitizeNumber(inputs.flightsLong,  0, 365, 0);
        transportFlights    = ((flightsShort * this.FACTORS.flights.short) +
                               (flightsLong  * this.FACTORS.flights.long)) / 1000;

        const totalTransport = transportCar + transportTransit + transportFlights;

        // ── 2. HOME ENERGY ─────────────────────────────────────────────────
        const cleanEnergyShare  = sanitizeNumber(inputs.cleanEnergyShare, 0, 100, 0) / 100;

        // Electricity: monthly bill → annual kWh → emissions × (1 − clean share)
        const electricityBill = sanitizeNumber(inputs.electricityBill, 0, 10000, 0);
        const annualKwh       = (electricityBill / this.FACTORS.conversions.electricityPricePerKwh) * 12;
        energyElectric        = (annualKwh * this.FACTORS.electricity * (1 - cleanEnergyShare)) / 1000;

        // Heating: monthly bill → annual energy → emissions
        const heatingSource = sanitizeString(inputs.heatingSource, this.ALLOWED.heatingSource, 'none');
        const heatingBill   = sanitizeNumber(inputs.heatingBill, 0, 10000, 0);

        if (heatingSource === 'gas') {
            const annualTherms = (heatingBill / this.FACTORS.conversions.gasPricePerTherm) * 12;
            energyHeating = (annualTherms * this.FACTORS.heating.gas) / 1000;
        } else if (heatingSource === 'oil') {
            const annualGallons = (heatingBill / this.FACTORS.conversions.oilPricePerGallon) * 12;
            energyHeating = (annualGallons * this.FACTORS.heating.oil) / 1000;
        } else if (heatingSource === 'biomass') {
            const annualLbs = (heatingBill / this.FACTORS.conversions.woodPricePerLb) * 12;
            energyHeating = (annualLbs * this.FACTORS.heating.biomass) / 1000;
        } else if (heatingSource === 'electric') {
            // Electric heating shares the electricity-grid intensity and clean-energy share
            const annualHeatKwh = (heatingBill / this.FACTORS.conversions.electricityPricePerKwh) * 12;
            energyHeating = (annualHeatKwh * this.FACTORS.electricity * (1 - cleanEnergyShare)) / 1000;
        } else {
            energyHeating = 0; // none
        }

        const totalEnergy = energyElectric + energyHeating;

        // ── 3. DIET & FOOD ─────────────────────────────────────────────────
        const dietType    = sanitizeString(inputs.dietProfile, this.ALLOWED.dietProfile, 'medium-meat');
        const dietBaseline = this.FACTORS.diet[dietType];

        // Local sourcing discount: up to 10 % reduction of food emissions
        const localFoodPct = sanitizeNumber(inputs.localFoodPct, 0, 100, 0) / 100;
        foodEmissions = dietBaseline * (1.0 - (0.10 * localFoodPct));

        // ── 4. WASTE & CONSUMPTION ─────────────────────────────────────────
        const shoppingLevel   = sanitizeNumber(inputs.shoppingHabits, 1, 5, 3);
        const shoppingInt     = Math.round(shoppingLevel);           // must be an integer key
        const shoppingBaseline = this.FACTORS.shopping[shoppingInt] || this.FACTORS.shopping[3];

        const recyclePaper   = !!inputs.recyclePaper;
        const recyclePlastic = !!inputs.recyclePlastic;
        const recycleGlass   = !!inputs.recycleGlass;
        const recycleCompost = !!inputs.recycleCompost;

        let recyclingDiscount = 0;
        if (recyclePaper)   recyclingDiscount += this.FACTORS.waste.recycleReduction;
        if (recyclePlastic) recyclingDiscount += this.FACTORS.waste.recycleReduction;
        if (recycleGlass)   recyclingDiscount += this.FACTORS.waste.recycleReduction;
        if (recycleCompost) recyclingDiscount += this.FACTORS.waste.recycleReduction;

        wasteEmissions = shoppingBaseline + Math.max(0.2, this.FACTORS.waste.baseline - recyclingDiscount);

        // ── TOTALS & BREAKDOWN ─────────────────────────────────────────────
        const total = totalTransport + totalEnergy + foodEmissions + wasteEmissions;

        return {
            categories: {
                transport: {
                    car:     Number(transportCar.toFixed(2)),
                    transit: Number(transportTransit.toFixed(2)),
                    flights: Number(transportFlights.toFixed(2)),
                    total:   Number(totalTransport.toFixed(2))
                },
                energy: {
                    electricity: Number(energyElectric.toFixed(2)),
                    heating:     Number(energyHeating.toFixed(2)),
                    total:       Number(totalEnergy.toFixed(2))
                },
                food:  { total: Number(foodEmissions.toFixed(2)) },
                waste: { total: Number(wasteEmissions.toFixed(2)) }
            },
            total: Number(total.toFixed(2))
        };
    }
};

// Expose calculator and sanitization helpers globally
window.CarbonCalculator  = CarbonCalculator;
window.sanitizeNumber    = sanitizeNumber;
window.sanitizeString    = sanitizeString;
