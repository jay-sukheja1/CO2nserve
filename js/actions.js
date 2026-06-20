/**
 * @module ActionsCatalog
 * @description CO2nserve Reduction Actions & What-If Simulator Catalog.
 *
 * Each action has:
 * - `id` {string}          — Unique identifier used for DOM elements and state
 * - `title` {string}       — Human-readable action name
 * - `category` {string}    — Emission category (transport | energy | food | waste)
 * - `difficulty` {number}  — Difficulty rating out of 5
 * - `cost` {string}        — Relative cost indicator ($, $$, $$$)
 * - `badge` {string}       — Contextual label for UI badge
 * - `description` {string} — Full description of the action
 * - `calculateSavings(inputs, currentCalc)` {function} — Returns tonnes CO₂e saved/yr
 *
 * Exposes `window.ActionsCatalog`.
 */

const ActionsCatalog = {
    actions: [
        {
            id: 'switch-ev',
            title: 'Switch to Electric Vehicle',
            category: 'transport',
            difficulty: 3,
            cost: '$$$',
            badge: 'High Impact',
            description: 'Replace your primary petroleum-powered vehicle with a fully electric car.',
            /**
             * Savings = (currentFactor − evFactor) × annualMiles / 1000.
             * Returns 0 if already electric or zero miles driven.
             * @param {Object} inputs - Current user inputs
             * @param {Object} currentCalc - Current calculation results
             * @returns {number} Tonnes CO₂e saved per year
             */
            calculateSavings(inputs, currentCalc) {
                if (inputs.carType === 'electric' || !inputs.carMiles || inputs.carMiles === 0) {
                    return 0;
                }
                const miles = parseFloat(inputs.carMiles);
                const currentFactor = window.CarbonCalculator.FACTORS.car[inputs.carType] || 0.38;
                const evFactor = window.CarbonCalculator.FACTORS.car.electric;
                const savingsKg = miles * (currentFactor - evFactor);
                return Math.max(0, Number((savingsKg / 1000).toFixed(2)));
            }
        },
        {
            id: 'commute-transit',
            title: 'Transit Commuting (50%)',
            category: 'transport',
            difficulty: 2,
            cost: '$',
            badge: 'Easy Start',
            description: 'Replace half of your annual driving miles with public transit (bus or train).',
            /**
             * Savings = 50% of miles × (carFactor − transitFactor) / 1000.
             * @param {Object} inputs - Current user inputs
             * @param {Object} currentCalc - Current calculation results
             * @returns {number} Tonnes CO₂e saved per year
             */
            calculateSavings(inputs, currentCalc) {
                if (!inputs.carMiles || inputs.carMiles === 0) return 0;

                const miles = parseFloat(inputs.carMiles);
                const carFactor = window.CarbonCalculator.FACTORS.car[inputs.carType || 'petrol'] || 0.38;
                const shiftedMiles = miles * 0.5;
                const carEmissionsSavedKg = shiftedMiles * carFactor;
                const transitEmissionsAddedKg = shiftedMiles * window.CarbonCalculator.FACTORS.transit;
                const netSavingsKg = carEmissionsSavedKg - transitEmissionsAddedKg;
                return Math.max(0, Number((netSavingsKg / 1000).toFixed(2)));
            }
        },
        {
            id: 'reduce-flights',
            title: 'Skip One Long-Haul Flight',
            category: 'transport',
            difficulty: 2,
            cost: '$',
            badge: 'Behavioral',
            description: 'Replace one long-distance flight per year with local travel or virtual meetings.',
            /**
             * Saves exactly one long-haul flight's worth of emissions (800 kg).
             * Returns 0 if user takes no long flights.
             * @param {Object} inputs - Current user inputs
             * @param {Object} currentCalc - Current calculation results
             * @returns {number} Tonnes CO₂e saved per year
             */
            calculateSavings(inputs, currentCalc) {
                const longFlights = parseFloat(inputs.flightsLong) || 0;
                if (longFlights <= 0) return 0;
                return Number((window.CarbonCalculator.FACTORS.flights.long / 1000).toFixed(2));
            }
        },
        {
            id: 'solar-panels',
            title: 'Go 100% Renewable Electricity',
            category: 'energy',
            difficulty: 4,
            cost: '$$$',
            badge: 'Infrastructure',
            description: 'Install residential rooftop solar panels or transition to a certified green electricity supplier.',
            /**
             * Saves the remaining fossil-fuel portion of electricity emissions.
             * Formula: annualKwh × gridFactor × (1 − currentCleanShare) / 1000.
             * @param {Object} inputs - Current user inputs
             * @param {Object} currentCalc - Current calculation results
             * @returns {number} Tonnes CO₂e saved per year
             */
            calculateSavings(inputs, currentCalc) {
                const electricityBill = parseFloat(inputs.electricityBill) || 0;
                if (electricityBill === 0) return 0;

                const currentCleanShare = (parseFloat(inputs.cleanEnergyShare) || 0) / 100;
                if (currentCleanShare >= 1) return 0;

                const CC = window.CarbonCalculator;
                const annualKwh = (electricityBill / CC.FACTORS.conversions.electricityPricePerKwh) * 12;
                const currentEmissionsKg = annualKwh * CC.FACTORS.electricity * (1 - currentCleanShare);
                return Number((currentEmissionsKg / 1000).toFixed(2));
            }
        },
        {
            id: 'smart-thermostat',
            title: 'Install Smart Thermostat',
            category: 'energy',
            difficulty: 1,
            cost: '$$',
            badge: 'Smart Home',
            description: 'Program heating schedules to lower consumption. Saves an average of 15% on heating costs.',
            /**
             * Saves 15% of current heating emissions.
             * Returns 0 if no heating source or zero heating bill.
             * @param {Object} inputs - Current user inputs
             * @param {Object} currentCalc - Current calculation results
             * @returns {number} Tonnes CO₂e saved per year
             */
            calculateSavings(inputs, currentCalc) {
                if ((inputs.heatingSource || 'none') === 'none') return 0;
                if ((parseFloat(inputs.heatingBill) || 0) === 0) return 0;
                return Number((currentCalc.categories.energy.heating * 0.15).toFixed(2));
            }
        },
        {
            id: 'led-bulbs',
            title: 'Switch to LED Light Bulbs',
            category: 'energy',
            difficulty: 1,
            cost: '$',
            badge: 'Quick Win',
            description: 'Replace incandescent lighting with energy-efficient LED bulbs throughout your home.',
            /**
             * Flat 0.22 tonnes CO₂e saved annually if electricity bill > 0.
             * @param {Object} inputs - Current user inputs
             * @param {Object} currentCalc - Current calculation results
             * @returns {number} Tonnes CO₂e saved per year
             */
            calculateSavings(inputs, currentCalc) {
                if ((parseFloat(inputs.electricityBill) || 0) === 0) return 0;
                return 0.22;
            }
        },
        {
            id: 'go-vegan',
            title: 'Transition to a Vegan Diet',
            category: 'food',
            difficulty: 4,
            cost: '$',
            badge: 'Dietary',
            description: 'Eliminate all animal products from your food intake, switching entirely to plant-based sources.',
            /**
             * Savings = currentDietEmissions − projectedVeganEmissions (with local-food discount).
             * Returns 0 if already vegan.
             * @param {Object} inputs - Current user inputs
             * @param {Object} currentCalc - Current calculation results
             * @returns {number} Tonnes CO₂e saved per year
             */
            calculateSavings(inputs, currentCalc) {
                if ((inputs.dietProfile || 'medium-meat') === 'vegan') return 0;

                const currentDietEmissions = currentCalc.categories.food.total;
                const localFoodPct = (parseFloat(inputs.localFoodPct) || 0) / 100;
                const projectedVegan = window.CarbonCalculator.FACTORS.diet.vegan * (1.0 - (0.10 * localFoodPct));
                const savings = currentDietEmissions - projectedVegan;
                return Math.max(0, Number(savings.toFixed(2)));
            }
        },
        {
            id: 'meatless-mondays',
            title: 'Practice Meatless Mondays',
            category: 'food',
            difficulty: 1,
            cost: '$',
            badge: 'Easy Start',
            description: 'Replace animal protein with plant-based foods just 1 day per week.',
            /**
             * Saves ~4/7 of the difference between current diet and vegetarian emissions.
             * Returns 0 if already vegan or vegetarian (minimum floor of 0.1t).
             * @param {Object} inputs - Current user inputs
             * @param {Object} currentCalc - Current calculation results
             * @returns {number} Tonnes CO₂e saved per year
             */
            calculateSavings(inputs, currentCalc) {
                const currentDiet = inputs.dietProfile || 'medium-meat';
                if (currentDiet === 'vegan' || currentDiet === 'vegetarian') return 0;

                const dietEmissions = currentCalc.categories.food.total;
                const localFoodPct = (parseFloat(inputs.localFoodPct) || 0) / 100;
                const vegEmissions = window.CarbonCalculator.FACTORS.diet.vegetarian * (1.0 - (0.10 * localFoodPct));
                const diff = dietEmissions - vegEmissions;
                const savings = (diff > 0) ? (diff * 4 / 7) : 0.25;
                return Number(Math.max(0.1, savings).toFixed(2));
            }
        },
        {
            id: 'shop-secondhand',
            title: 'Buy Secondhand First (50%)',
            category: 'waste',
            difficulty: 2,
            cost: '$',
            badge: 'Circular Economy',
            description: 'Commit to purchasing clothes, gadgets, and furniture secondhand instead of new.',
            /**
             * Saves 25% of the shopping baseline for the current consumption level.
             * Returns 0 for minimalist consumers (level 1).
             * @param {Object} inputs - Current user inputs
             * @param {Object} currentCalc - Current calculation results
             * @returns {number} Tonnes CO₂e saved per year
             */
            calculateSavings(inputs, currentCalc) {
                const shoppingLevel = parseInt(inputs.shoppingHabits) || 3;
                if (shoppingLevel <= 1) return 0;
                const shoppingBaseline = window.CarbonCalculator.FACTORS.shopping[shoppingLevel];
                return Number((shoppingBaseline * 0.25).toFixed(2));
            }
        },
        {
            id: 'full-recycling',
            title: 'Compost & Recycle Everything',
            category: 'waste',
            difficulty: 2,
            cost: '$',
            badge: 'Waste Reduction',
            description: 'Strictly sort paper, plastic, metals, glass, and compost food scraps to zero-out landfill waste.',
            /**
             * Saves recycleReduction × countOfUncheckedCategories.
             * Counts which recycling categories the user hasn't yet adopted.
             * @param {Object} inputs - Current user inputs
             * @param {Object} currentCalc - Current calculation results
             * @returns {number} Tonnes CO₂e saved per year
             */
            calculateSavings(inputs, currentCalc) {
                const uncheckedCount = [
                    !inputs.recyclePaper,
                    !inputs.recyclePlastic,
                    !inputs.recycleGlass,
                    !inputs.recycleCompost
                ].filter(Boolean).length;
                return Number((uncheckedCount * window.CarbonCalculator.FACTORS.waste.recycleReduction).toFixed(2));
            }
        }
    ]
};

window.ActionsCatalog = ActionsCatalog;
