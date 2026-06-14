/**
 * CO2nserve Reduction Actions & What-If Simulator Catalog
 */

const ActionsCatalog = {
    actions: [
        {
            id: 'switch-ev',
            title: 'Switch to Electric Vehicle',
            category: 'transport',
            difficulty: 3, // out of 5
            cost: '$$$',
            badge: 'High Impact',
            description: 'Replace your primary petroleum-powered vehicle with a fully electric car.',
            calculateSavings(inputs, currentCalculations) {
                // If they drive 0 miles or already have an electric car, savings = 0
                if (inputs.carType === 'electric' || !inputs.carMiles || inputs.carMiles === 0) {
                    return 0;
                }
                const miles = parseFloat(inputs.carMiles);
                const currentType = inputs.carType;
                
                const currentFactor = window.CarbonCalculator.FACTORS.car[currentType] || 0.38;
                const evFactor = window.CarbonCalculator.FACTORS.car.electric;
                
                // Difference in emissions
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
            calculateSavings(inputs, currentCalculations) {
                if (!inputs.carMiles || inputs.carMiles === 0) return 0;
                
                const miles = parseFloat(inputs.carMiles);
                const carType = inputs.carType || 'petrol';
                const carFactor = window.CarbonCalculator.FACTORS.car[carType] || 0.38;
                
                // Shift half of miles to transit
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
            calculateSavings(inputs, currentCalculations) {
                const longFlights = parseFloat(inputs.flightsLong) || 0;
                if (longFlights <= 0) return 0;
                
                // Replaces exactly 1 long flight emissions
                const savingsKg = window.CarbonCalculator.FACTORS.flights.long;
                return Number((savingsKg / 1000).toFixed(2));
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
            calculateSavings(inputs, currentCalculations) {
                const electricityBill = parseFloat(inputs.electricityBill) || 0;
                if (electricityBill === 0) return 0;
                
                const currentCleanShare = (parseFloat(inputs.cleanEnergyShare) || 0) / 100;
                if (currentCleanShare >= 1) return 0; // already 100% clean
                
                // Standard emissions factors
                const annualKwh = (electricityBill / window.CarbonCalculator.FACTORS.conversions.electricityPricePerKwh) * 12;
                
                // Savings is the remaining fossil fuels portion of their electricity bill
                const currentEmissionsKg = annualKwh * window.CarbonCalculator.FACTORS.electricity * (1 - currentCleanShare);
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
            calculateSavings(inputs, currentCalculations) {
                const heatingSource = inputs.heatingSource || 'none';
                const heatingBill = parseFloat(inputs.heatingBill) || 0;
                if (heatingSource === 'none' || heatingBill === 0) return 0;
                
                // 15% reduction in heating emissions
                const currentHeatingEmissions = currentCalculations.categories.energy.heating;
                const savings = currentHeatingEmissions * 0.15;
                return Number(savings.toFixed(2));
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
            calculateSavings(inputs, currentCalculations) {
                // If electricity bill is $0, no savings. Otherwise, constant flat saving
                const electricityBill = parseFloat(inputs.electricityBill) || 0;
                if (electricityBill === 0) return 0;
                
                return 0.22; // Flat 220 kg CO2e saved annually
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
            calculateSavings(inputs, currentCalculations) {
                const currentDiet = inputs.dietProfile || 'medium-meat';
                if (currentDiet === 'vegan') return 0;
                
                const currentDietEmissions = currentCalculations.categories.food.total;
                
                // Projected vegan food emissions with local food percentage
                const localFoodPct = (parseFloat(inputs.localFoodPct) || 0) / 100;
                const veganBaseline = window.CarbonCalculator.FACTORS.diet.vegan;
                const projectedVeganEmissions = veganBaseline * (1.0 - (0.10 * localFoodPct));
                
                const savings = currentDietEmissions - projectedVeganEmissions;
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
            calculateSavings(inputs, currentCalculations) {
                const currentDiet = inputs.dietProfile || 'medium-meat';
                // If already vegan or vegetarian, meatless mondays does nothing extra
                if (currentDiet === 'vegan' || currentDiet === 'vegetarian') return 0;
                
                // Shaves off ~1/7th of meat-to-veg difference
                const dietEmissions = currentCalculations.categories.food.total;
                const vegBaseline = window.CarbonCalculator.FACTORS.diet.vegetarian;
                const localFoodPct = (parseFloat(inputs.localFoodPct) || 0) / 100;
                const vegEmissions = vegBaseline * (1.0 - (0.10 * localFoodPct));
                
                const diff = dietEmissions - vegEmissions;
                // If they eat heavy meat, savings are greater.
                const savings = (diff > 0) ? (diff * 4 / 7) : 0.25; // scaling factor
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
            calculateSavings(inputs, currentCalculations) {
                const shoppingLevel = parseInt(inputs.shoppingHabits) || 3;
                if (shoppingLevel <= 1) return 0; // Already minimal
                
                // Reduce consumption baseline emissions by roughly 20%
                const shoppingBaseline = window.CarbonCalculator.FACTORS.shopping[shoppingLevel];
                const savings = shoppingBaseline * 0.25;
                return Number(savings.toFixed(2));
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
            calculateSavings(inputs, currentCalculations) {
                // Determine which boxes aren't checked in current inputs
                let countUnchecked = 0;
                if (!inputs.recyclePaper) countUnchecked++;
                if (!inputs.recyclePlastic) countUnchecked++;
                if (!inputs.recycleGlass) countUnchecked++;
                if (!inputs.recycleCompost) countUnchecked++;
                
                // Total savings is the reduction for each unchecked box that would become checked
                const savings = countUnchecked * window.CarbonCalculator.FACTORS.waste.recycleReduction;
                return Number(savings.toFixed(2));
            }
        }
    ]
};

window.ActionsCatalog = ActionsCatalog;
