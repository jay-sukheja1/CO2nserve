/**
 * @module CarbonCalculator
 * @description CO2nserve Carbon Calculator Engine.
 * Uses standardized emission factors based on EPA (Environmental Protection Agency)
 * and IPCC (Intergovernmental Panel on Climate Change) guidelines.
 *
 * Exposes `CarbonCalculator`, `sanitizeNumber`, and `sanitizeString` globally.
 */

/* ─── Input Sanitization Helpers ──────────────────────────────────────────── */

/**
 * Safely parse and clamp a numeric value.
 * Returns `fallback` when the value is NaN, non-finite, or out of [min, max].
 * @param {*}      val      - Raw input value
 * @param {number} min      - Inclusive minimum
 * @param {number} max      - Inclusive maximum
 * @param {number} fallback - Value to use when parsing fails
 * @returns {number} Clamped numeric value within [min, max]
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
 * @returns {string} Validated string from the allow-list
 */
function sanitizeString(val, allowed, fallback) {
    const s = String(val).trim();
    return allowed.includes(s) ? s : fallback;
}

/* ─── Calculator Object ────────────────────────────────────────────────────── */

/**
 * @typedef {Object} TransportBreakdown
 * @property {number} car     - Car emissions in tonnes CO₂e/yr
 * @property {number} transit - Public transit emissions in tonnes CO₂e/yr
 * @property {number} flights - Flight emissions in tonnes CO₂e/yr
 * @property {number} total   - Total transport emissions in tonnes CO₂e/yr
 */

/**
 * @typedef {Object} EnergyBreakdown
 * @property {number} electricity - Grid electricity emissions in tonnes CO₂e/yr
 * @property {number} heating     - Heating fuel emissions in tonnes CO₂e/yr
 * @property {number} total       - Total energy emissions in tonnes CO₂e/yr
 */

/**
 * @typedef {Object} CategoryBreakdown
 * @property {TransportBreakdown} transport - Transport category
 * @property {EnergyBreakdown}    energy    - Energy category
 * @property {{total: number}}    food      - Food category with total in tonnes
 * @property {{total: number}}    waste     - Waste category with total in tonnes
 */

/**
 * @typedef {Object} CalculationResult
 * @property {CategoryBreakdown} categories - Per-category breakdown
 * @property {number}            total      - Grand total emissions in tonnes CO₂e/yr
 */

/**
 * Stateless calculator engine. All methods are pure functions of their inputs.
 * @namespace CarbonCalculator
 */
const CarbonCalculator = {
    /** @description Emission factors in kg CO₂e per unit, sourced from EPA/IPCC. */
    FACTORS: {
        /** Per-mile emission factors by vehicle fuel type (kg CO₂e/mile) */
        car: {
            petrol:   0.38,
            diesel:   0.35,
            hybrid:   0.20,
            electric: 0.08
        },

        /** Average public transit blend per passenger-mile (kg CO₂e) */
        transit: 0.09,

        /** Flat per-flight emission factors (kg CO₂e per passenger flight) */
        flights: {
            short: 150,
            long:  800
        },

        /** US-average grid electricity intensity (kg CO₂e/kWh) */
        electricity: 0.38,

        /** Heating fuel factors (kg CO₂e per energy unit) */
        heating: {
            gas:      5.3,
            oil:     10.1,
            biomass:  0.8,
            electric: 0.38
        },

        /** Unit-price conversions for bill-to-consumption calculations */
        conversions: {
            electricityPricePerKwh: 0.16,
            gasPricePerTherm:       1.20,
            oilPricePerGallon:      3.50,
            woodPricePerLb:         0.10,
            transitMph:             20
        },

        /** Annual food baseline emissions by diet type (tonnes CO₂e/yr) */
        diet: {
            'heavy-meat':  3.4,
            'medium-meat': 2.8,
            'low-meat':    2.4,
            vegetarian:    1.7,
            vegan:         1.5
        },

        /** Annual shopping baseline emissions by consumption level (tonnes CO₂e/yr) */
        shopping: {
            1: 0.5,
            2: 1.0,
            3: 1.8,
            4: 2.6,
            5: 3.8
        },

        /** Waste baseline & per-category recycling savings (tonnes CO₂e/yr) */
        waste: {
            baseline:         0.8,
            recycleReduction: 0.15
        }
    },

    /** @description Allowed enum values for string-type inputs. */
    ALLOWED: {
        carType:       ['petrol', 'diesel', 'hybrid', 'electric'],
        heatingSource: ['gas', 'electric', 'oil', 'biomass', 'none'],
        dietProfile:   ['heavy-meat', 'medium-meat', 'low-meat', 'vegetarian', 'vegan']
    },

    /**
     * Heating fuel calculation lookup map.
     * Each entry maps a fuel type to a function(bill, cleanEnergyShare) → tonnes CO₂e/yr.
     * @private
     */
    _heatingCalcMap: null,

    /**
     * Lazily initialise and return the heating calculation lookup map.
     * @private
     * @returns {Object.<string, function(number, number): number>}
     */
    _getHeatingCalcMap() {
        if (this._heatingCalcMap) return this._heatingCalcMap;

        const F = this.FACTORS;
        this._heatingCalcMap = {
            gas: (bill) => {
                const annualTherms = (bill / F.conversions.gasPricePerTherm) * 12;
                return (annualTherms * F.heating.gas) / 1000;
            },
            oil: (bill) => {
                const annualGallons = (bill / F.conversions.oilPricePerGallon) * 12;
                return (annualGallons * F.heating.oil) / 1000;
            },
            biomass: (bill) => {
                const annualLbs = (bill / F.conversions.woodPricePerLb) * 12;
                return (annualLbs * F.heating.biomass) / 1000;
            },
            electric: (bill, cleanShare) => {
                const annualHeatKwh = (bill / F.conversions.electricityPricePerKwh) * 12;
                return (annualHeatKwh * F.electricity * (1 - cleanShare)) / 1000;
            },
            none: () => 0
        };
        return this._heatingCalcMap;
    },

    /**
     * Calculate carbon footprint based on UI inputs.
     * @param {Object} inputs - User-provided lifestyle inputs
     * @param {number}  inputs.carMiles         - Annual miles driven
     * @param {string}  inputs.carType          - Vehicle fuel type
     * @param {number}  inputs.transitHours     - Weekly public transit hours
     * @param {number}  inputs.flightsShort     - Annual short-haul flights
     * @param {number}  inputs.flightsLong      - Annual long-haul flights
     * @param {number}  inputs.electricityBill  - Monthly electricity bill (USD)
     * @param {number}  inputs.cleanEnergyShare - Percent of electricity from renewables
     * @param {string}  inputs.heatingSource    - Primary heating fuel type
     * @param {number}  inputs.heatingBill      - Monthly heating bill (USD)
     * @param {string}  inputs.dietProfile      - Dietary lifestyle type
     * @param {number}  inputs.localFoodPct     - Percent of food sourced locally
     * @param {number}  inputs.shoppingHabits   - Consumption level (1–5)
     * @param {boolean} inputs.recyclePaper     - Whether paper is recycled
     * @param {boolean} inputs.recyclePlastic   - Whether plastics are recycled
     * @param {boolean} inputs.recycleGlass     - Whether glass is recycled
     * @param {boolean} inputs.recycleCompost   - Whether food waste is composted
     * @returns {CalculationResult} Broken-down emissions in tonnes of CO₂e per year
     */
    calculate(inputs) {
        // ── 1. TRANSPORTATION ──────────────────────────────────────────────
        const carMiles  = sanitizeNumber(inputs.carMiles, 0, 100000, 0);
        const carType   = sanitizeString(inputs.carType, this.ALLOWED.carType, 'petrol');
        const carFactor = this.FACTORS.car[carType];
        const transportCar = (carMiles * carFactor) / 1000;

        const transitHours     = sanitizeNumber(inputs.transitHours, 0, 168, 0);
        const transitMilesYear = transitHours * this.FACTORS.conversions.transitMph * 52;
        const transportTransit = (transitMilesYear * this.FACTORS.transit) / 1000;

        const flightsShort   = sanitizeNumber(inputs.flightsShort, 0, 365, 0);
        const flightsLong    = sanitizeNumber(inputs.flightsLong,  0, 365, 0);
        const transportFlights = ((flightsShort * this.FACTORS.flights.short) +
                                  (flightsLong  * this.FACTORS.flights.long)) / 1000;

        const totalTransport = transportCar + transportTransit + transportFlights;

        // ── 2. HOME ENERGY ─────────────────────────────────────────────────
        const cleanEnergyShare = sanitizeNumber(inputs.cleanEnergyShare, 0, 100, 0) / 100;

        const electricityBill = sanitizeNumber(inputs.electricityBill, 0, 10000, 0);
        const annualKwh       = (electricityBill / this.FACTORS.conversions.electricityPricePerKwh) * 12;
        const energyElectric  = (annualKwh * this.FACTORS.electricity * (1 - cleanEnergyShare)) / 1000;

        // Heating: use lookup map instead of if-else chain
        const heatingSource = sanitizeString(inputs.heatingSource, this.ALLOWED.heatingSource, 'none');
        const heatingBill   = sanitizeNumber(inputs.heatingBill, 0, 10000, 0);
        const heatingCalcFn = this._getHeatingCalcMap()[heatingSource];
        const energyHeating = heatingCalcFn(heatingBill, cleanEnergyShare);

        const totalEnergy = energyElectric + energyHeating;

        // ── 3. DIET & FOOD ─────────────────────────────────────────────────
        const dietType     = sanitizeString(inputs.dietProfile, this.ALLOWED.dietProfile, 'medium-meat');
        const dietBaseline = this.FACTORS.diet[dietType];
        const localFoodPct = sanitizeNumber(inputs.localFoodPct, 0, 100, 0) / 100;
        const foodEmissions = dietBaseline * (1.0 - (0.10 * localFoodPct));

        // ── 4. WASTE & CONSUMPTION ─────────────────────────────────────────
        const shoppingLevel    = sanitizeNumber(inputs.shoppingHabits, 1, 5, 3);
        const shoppingInt      = Math.round(shoppingLevel);
        const shoppingBaseline = this.FACTORS.shopping[shoppingInt] || this.FACTORS.shopping[3];

        const recycleFlags = [
            !!inputs.recyclePaper,
            !!inputs.recyclePlastic,
            !!inputs.recycleGlass,
            !!inputs.recycleCompost
        ];
        const recyclingDiscount = recycleFlags.filter(Boolean).length * this.FACTORS.waste.recycleReduction;
        const wasteEmissions = shoppingBaseline + Math.max(0.2, this.FACTORS.waste.baseline - recyclingDiscount);

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
