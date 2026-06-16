/**
 * CO2nserve Automated Test Suite
 * ───────────────────────────────────────────────────────────────────────────
 * Exposes window.__runAppTests() — call it from the browser console to get
 * a structured report of unit + integration test results.
 *
 * Returns: { passed, failed, total, results: [{name, status, error}] }
 *
 * Example (console):
 *   const r = await window.__runAppTests();
 *   console.table(r.results);
 */

(function installTestHarness() {
    'use strict';

    /* ── Micro assertion helpers ─────────────────────────────────────────── */

    function assert(condition, message) {
        if (!condition) throw new Error(message || 'Assertion failed');
    }

    function assertClose(a, b, tolerance, message) {
        const diff = Math.abs(a - b);
        if (diff > (tolerance || 0.0001)) {
            throw new Error(
                message || `Expected ${a} ≈ ${b} (diff ${diff.toFixed(6)} > ${tolerance})`
            );
        }
    }

    function assertEq(a, b, message) {
        if (a !== b) throw new Error(message || `Expected ${JSON.stringify(a)} === ${JSON.stringify(b)}`);
    }

    /* ── Test runner ─────────────────────────────────────────────────────── */

    async function runTests() {
        const results = [];
        let passed = 0;
        let failed = 0;

        async function test(name, fn) {
            try {
                await fn();
                results.push({ name, status: 'PASS', error: null });
                passed++;
            } catch (err) {
                results.push({ name, status: 'FAIL', error: err.message });
                failed++;
                console.warn(`[FAIL] ${name}:`, err.message);
            }
        }

        const CC = window.CarbonCalculator;

        /* ════════════════════════════════════════════════════════════════════
         *  UNIT TESTS — CarbonCalculator.calculate()
         * ════════════════════════════════════════════════════════════════════ */

        // ── Test 1: Default inputs produce expected total ──────────────────
        await test('Unit: default inputs yield ~16.6t total', () => {
            const inputs = {
                carMiles: 10000, carType: 'petrol', transitHours: 2,
                flightsShort: 2, flightsLong: 1,
                electricityBill: 100, cleanEnergyShare: 20,
                heatingSource: 'gas', heatingBill: 80,
                dietProfile: 'medium-meat', localFoodPct: 40,
                shoppingHabits: 3,
                recyclePaper: true, recyclePlastic: true,
                recycleGlass: false, recycleCompost: false
            };
            const result = CC.calculate(inputs);
            // Transport car:    10000 * 0.38 / 1000          = 3.8000
            // Transit:          2 * 20 * 52 * 0.09 / 1000   = 0.1872
            // Flights:          (2*150 + 1*800) / 1000       = 1.1000
            // Electricity:      (100/0.16)*12 * 0.38 * 0.8 / 1000 = 2.2800
            // Heating gas:      (80/1.20)*12 * 5.3 / 1000   = 4.2400
            // Food medium-meat: 2.8 * (1 - 0.10*0.40)       = 2.6880
            // Waste shop3+2rec: 1.8 + max(0.2, 0.8-0.30)    = 2.3000
            // Total ≈ 16.5952
            assertClose(result.total, 16.6, 0.1, `Total expected ≈16.6, got ${result.total}`);
        });


        // ── Test 2: Zero car miles → transportCar === 0 ───────────────────
        await test('Unit: zero car miles → car emissions = 0', () => {
            const inputs = { carMiles: 0, carType: 'petrol', transitHours: 0,
                flightsShort: 0, flightsLong: 0,
                electricityBill: 0, cleanEnergyShare: 0,
                heatingSource: 'none', heatingBill: 0,
                dietProfile: 'medium-meat', localFoodPct: 0,
                shoppingHabits: 3, recyclePaper: false,
                recyclePlastic: false, recycleGlass: false, recycleCompost: false };
            const result = CC.calculate(inputs);
            assertEq(result.categories.transport.car, 0, `Expected car=0, got ${result.categories.transport.car}`);
        });

        // ── Test 3: Electric car at 10k miles ─────────────────────────────
        await test('Unit: electric car 10k miles → car = 0.8t', () => {
            const inputs = { carMiles: 10000, carType: 'electric', transitHours: 0,
                flightsShort: 0, flightsLong: 0,
                electricityBill: 0, cleanEnergyShare: 0,
                heatingSource: 'none', heatingBill: 0,
                dietProfile: 'medium-meat', localFoodPct: 0,
                shoppingHabits: 3, recyclePaper: false,
                recyclePlastic: false, recycleGlass: false, recycleCompost: false };
            const result = CC.calculate(inputs);
            // 10000 * 0.08 / 1000 = 0.8
            assertClose(result.categories.transport.car, 0.8, 0.001,
                `Electric car expected 0.8t, got ${result.categories.transport.car}`);
        });

        // ── Test 4: 100% clean energy → electricity emissions = 0 ─────────
        await test('Unit: 100% clean energy → electricity emissions = 0', () => {
            const inputs = { carMiles: 0, carType: 'petrol', transitHours: 0,
                flightsShort: 0, flightsLong: 0,
                electricityBill: 200, cleanEnergyShare: 100,
                heatingSource: 'none', heatingBill: 0,
                dietProfile: 'medium-meat', localFoodPct: 0,
                shoppingHabits: 3, recyclePaper: false,
                recyclePlastic: false, recycleGlass: false, recycleCompost: false };
            const result = CC.calculate(inputs);
            assertEq(result.categories.energy.electricity, 0,
                `Expected 0 electricity emissions at 100% clean, got ${result.categories.energy.electricity}`);
        });

        // ── Test 5: Vegan diet matches factor exactly ──────────────────────
        await test('Unit: vegan diet @ 0% local → food = 1.5t', () => {
            const inputs = { carMiles: 0, carType: 'petrol', transitHours: 0,
                flightsShort: 0, flightsLong: 0,
                electricityBill: 0, cleanEnergyShare: 0,
                heatingSource: 'none', heatingBill: 0,
                dietProfile: 'vegan', localFoodPct: 0,
                shoppingHabits: 3, recyclePaper: false,
                recyclePlastic: false, recycleGlass: false, recycleCompost: false };
            const result = CC.calculate(inputs);
            assertClose(result.categories.food.total, 1.5, 0.001,
                `Vegan food expected 1.5t, got ${result.categories.food.total}`);
        });

        // ── Test 6: Heavy-meat diet matches factor ─────────────────────────
        await test('Unit: heavy-meat diet @ 0% local → food = 3.4t', () => {
            const inputs = { carMiles: 0, carType: 'petrol', transitHours: 0,
                flightsShort: 0, flightsLong: 0,
                electricityBill: 0, cleanEnergyShare: 0,
                heatingSource: 'none', heatingBill: 0,
                dietProfile: 'heavy-meat', localFoodPct: 0,
                shoppingHabits: 3, recyclePaper: false,
                recyclePlastic: false, recycleGlass: false, recycleCompost: false };
            const result = CC.calculate(inputs);
            assertClose(result.categories.food.total, 3.4, 0.001,
                `Heavy-meat food expected 3.4t, got ${result.categories.food.total}`);
        });

        // ── Test 7: All recycling checked → correct waste calculation ──────
        await test('Unit: all recycling checked → waste = shoppingBaseline + 0.2 (min)', () => {
            const inputs = { carMiles: 0, carType: 'petrol', transitHours: 0,
                flightsShort: 0, flightsLong: 0,
                electricityBill: 0, cleanEnergyShare: 0,
                heatingSource: 'none', heatingBill: 0,
                dietProfile: 'medium-meat', localFoodPct: 0,
                shoppingHabits: 3, recyclePaper: true,
                recyclePlastic: true, recycleGlass: true, recycleCompost: true };
            const result = CC.calculate(inputs);
            // waste = 1.8 (shoppingBaseline level-3) + max(0.2, 0.8 - 4*0.15)
            // = 1.8 + max(0.2, 0.2) = 1.8 + 0.2 = 2.0
            assertClose(result.categories.waste.total, 2.0, 0.001,
                `All recycled waste expected 2.0t, got ${result.categories.waste.total}`);
        });

        // ── Test 8: Two long flights exact calculation ─────────────────────
        await test('Unit: 2 long flights → flights = 1.6t', () => {
            const inputs = { carMiles: 0, carType: 'petrol', transitHours: 0,
                flightsShort: 0, flightsLong: 2,
                electricityBill: 0, cleanEnergyShare: 0,
                heatingSource: 'none', heatingBill: 0,
                dietProfile: 'medium-meat', localFoodPct: 0,
                shoppingHabits: 3, recyclePaper: false,
                recyclePlastic: false, recycleGlass: false, recycleCompost: false };
            const result = CC.calculate(inputs);
            // 2 * 800 / 1000 = 1.6
            assertClose(result.categories.transport.flights, 1.6, 0.001,
                `2 long flights expected 1.6t, got ${result.categories.transport.flights}`);
        });

        // ── Test 9: heatingSource = 'none' → energyHeating = 0 ───────────
        await test('Unit: heatingSource none → heating = 0', () => {
            const inputs = { carMiles: 0, carType: 'petrol', transitHours: 0,
                flightsShort: 0, flightsLong: 0,
                electricityBill: 0, cleanEnergyShare: 0,
                heatingSource: 'none', heatingBill: 200,
                dietProfile: 'medium-meat', localFoodPct: 0,
                shoppingHabits: 3, recyclePaper: false,
                recyclePlastic: false, recycleGlass: false, recycleCompost: false };
            const result = CC.calculate(inputs);
            assertEq(result.categories.energy.heating, 0,
                `Heating 'none' expected 0, got ${result.categories.energy.heating}`);
        });

        // ── Test 10: shoppingHabits = 5 → shoppingBaseline = 3.8 ──────────
        await test('Unit: shoppingHabits=5 → shopping contribution = 3.8 baseline', () => {
            const inputs = { carMiles: 0, carType: 'petrol', transitHours: 0,
                flightsShort: 0, flightsLong: 0,
                electricityBill: 0, cleanEnergyShare: 0,
                heatingSource: 'none', heatingBill: 0,
                dietProfile: 'medium-meat', localFoodPct: 0,
                shoppingHabits: 5, recyclePaper: false,
                recyclePlastic: false, recycleGlass: false, recycleCompost: false };
            const result = CC.calculate(inputs);
            // waste = 3.8 (shopping level 5) + max(0.2, 0.8 - 0) = 3.8 + 0.8 = 4.6
            assertClose(result.categories.waste.total, 4.6, 0.001,
                `Shopping=5 waste expected 4.6t, got ${result.categories.waste.total}`);
        });

        // ── Test 11: Invalid carType is whitelisted to 'petrol' ───────────
        await test('Unit: invalid carType string defaults to petrol factor', () => {
            const inputs = { carMiles: 1000, carType: '<script>alert(1)</script>', transitHours: 0,
                flightsShort: 0, flightsLong: 0,
                electricityBill: 0, cleanEnergyShare: 0,
                heatingSource: 'none', heatingBill: 0,
                dietProfile: 'medium-meat', localFoodPct: 0,
                shoppingHabits: 3, recyclePaper: false,
                recyclePlastic: false, recycleGlass: false, recycleCompost: false };
            const result = CC.calculate(inputs);
            // 1000 * 0.38 / 1000 = 0.38 (petrol factor)
            assertClose(result.categories.transport.car, 0.38, 0.001,
                `Invalid carType should default to petrol 0.38t, got ${result.categories.transport.car}`);
        });

        // ── Test 12: Out-of-bounds car miles clamped at max ───────────────
        await test('Unit: extreme carMiles (999999) clamped to 100000', () => {
            const inputs = { carMiles: 999999, carType: 'petrol', transitHours: 0,
                flightsShort: 0, flightsLong: 0,
                electricityBill: 0, cleanEnergyShare: 0,
                heatingSource: 'none', heatingBill: 0,
                dietProfile: 'medium-meat', localFoodPct: 0,
                shoppingHabits: 3, recyclePaper: false,
                recyclePlastic: false, recycleGlass: false, recycleCompost: false };
            const result = CC.calculate(inputs);
            // Clamped to 100000 * 0.38 / 1000 = 38.0
            assertClose(result.categories.transport.car, 38.0, 0.001,
                `Clamped carMiles expected 38.0t, got ${result.categories.transport.car}`);
        });

        /* ════════════════════════════════════════════════════════════════════
         *  INTEGRATION / DOM TESTS
         * ════════════════════════════════════════════════════════════════════ */

        // ── Test 13: Slider input event updates value bubble ──────────────
        await test('Integration: car-miles slider input updates value bubble', () => {
            const slider = document.getElementById('input-car-miles');
            const bubble = document.getElementById('val-car-miles');
            assert(slider && bubble, 'Slider and bubble elements must exist');

            slider.value = 5000;
            slider.dispatchEvent(new Event('input', { bubbles: true }));

            const bubbleText = bubble.textContent || bubble.innerText || '';
            assert(bubbleText.includes('5,000') || bubbleText.includes('5000'),
                `Bubble should show 5000, got: "${bubbleText}"`);
        });

        // ── Test 14: Clean energy 100% decreases dashboard total ──────────
        await test('Integration: 100% clean energy reduces dashboard total', () => {
            const slider = document.getElementById('input-clean-energy-share');
            assert(slider, 'Clean energy slider must exist');

            // Store original
            const origVal = slider.value;

            slider.value = 0;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            const totalBefore = parseFloat(document.getElementById('dash-total-footprint').textContent);

            slider.value = 100;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            const totalAfter = parseFloat(document.getElementById('dash-total-footprint').textContent);

            // Restore
            slider.value = origVal;
            slider.dispatchEvent(new Event('input', { bubbles: true }));

            assert(totalAfter < totalBefore,
                `100% clean energy should reduce total. Before: ${totalBefore}, After: ${totalAfter}`);
        });

        // ── Test 15: switchTab('calculator') activates calculator view ─────
        await test('Integration: switchTab calculator activates view-calculator', () => {
            window.app.switchTab('calculator');
            const view = document.getElementById('view-calculator');
            assert(view && view.classList.contains('active'),
                'view-calculator should have class active after switchTab');
            // Restore
            window.app.switchTab('dashboard');
        });

        // ── Test 16: setCalcStep('energy') activates energy step ──────────
        await test('Integration: setCalcStep energy activates calc-step-energy', () => {
            window.app.setCalcStep('energy');
            const stepView = document.getElementById('calc-step-energy');
            assert(stepView && stepView.classList.contains('active'),
                'calc-step-energy should have class active after setCalcStep');
            // Restore
            window.app.setCalcStep('transport');
        });

        // ── Test 17: Spinner +1 on flights-long increases value ───────────
        await test('Integration: spinner +1 on flights-long increments value', () => {
            const input = document.getElementById('input-flights-long');
            assert(input, 'input-flights-long must exist');
            const before = parseInt(input.value, 10);
            window.app.adjustSpinner('input-flights-long', 1);
            const after = parseInt(input.value, 10);
            assertEq(after, before + 1, `Spinner +1: expected ${before + 1}, got ${after}`);
            // Restore
            window.app.adjustSpinner('input-flights-long', -1);
        });

        // ── Test 18: Diet change to vegan → footprint drops ───────────────
        await test('Integration: diet change to vegan reduces footprint', () => {
            const app = window.app;

            // Set heavy-meat
            app.inputs.dietProfile = 'heavy-meat';
            app.updateCalculations();
            const heavyTotal = app.currentCalc.categories.food.total;

            // Set vegan
            app.inputs.dietProfile = 'vegan';
            app.updateCalculations();
            const veganTotal = app.currentCalc.categories.food.total;

            // Restore
            app.inputs.dietProfile = 'medium-meat';
            app.updateCalculations();

            assert(veganTotal < heavyTotal,
                `Vegan (${veganTotal}) should be less than heavy-meat (${heavyTotal})`);
        });

        // ── Test 19: toggleActionCommit adds/removes from committedActions ─
        await test('Integration: toggleActionCommit adds action to committedActions', () => {
            const app = window.app;
            const actionId = 'switch-ev';

            // Ensure not committed
            app.committedActions = app.committedActions.filter(id => id !== actionId);
            app.syncActionUIWithState();

            // Simulate checking the checkbox
            const checkbox = document.getElementById(`action-checkbox-${actionId}`);
            assert(checkbox, `Checkbox for ${actionId} must exist`);
            checkbox.checked = true;
            app.toggleActionCommit(actionId);

            assert(app.committedActions.includes(actionId),
                `${actionId} should be in committedActions after commit`);

            // Undo
            checkbox.checked = false;
            app.toggleActionCommit(actionId);
            assert(!app.committedActions.includes(actionId),
                `${actionId} should be removed after unchecking`);
        });

        // ── Test 20: filter 'transport' hides non-transport action cards ───
        await test('Integration: filter transport hides non-transport cards', () => {
            window.app.filterActionCards('transport');

            const nonTransportCards = document.querySelectorAll('.action-card:not([data-category="transport"])');
            let allHidden = true;
            nonTransportCards.forEach(card => {
                if (card.style.display !== 'none') allHidden = false;
            });

            // Restore
            window.app.filterActionCards('all');

            assert(allHidden, 'Non-transport cards should be hidden when filter=transport');
        });

        /* ══════════════════════════════════════════════════════════════════ */

        const total = passed + failed;
        const summary = { passed, failed, total, results };

        console.groupCollapsed(
            `%c CO2nserve Tests: ${passed}/${total} passed %c`,
            `background:${failed === 0 ? '#10b981' : '#ef4444'};color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold`,
            ''
        );
        results.forEach(r => {
            const style = r.status === 'PASS'
                ? 'color:#10b981;font-weight:bold'
                : 'color:#ef4444;font-weight:bold';
            console.log(`%c${r.status}%c  ${r.name}${r.error ? ' — ' + r.error : ''}`,
                style, 'color:inherit;font-weight:normal');
        });
        console.groupEnd();

        if (failed > 0) {
            console.warn(`⚠️  ${failed} test(s) failed. See above for details.`);
        } else {
            console.info(`✅ All ${total} tests passed!`);
        }

        return summary;
    }

    // Expose globally for automated evaluators
    window.__runAppTests = runTests;

    // Auto-run once the app is initialised (non-blocking, after a tick)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                runTests().catch(err => console.error('Test harness error:', err));
            }, 600); // wait for app.init() to finish
        });
    } else {
        setTimeout(() => {
            runTests().catch(err => console.error('Test harness error:', err));
        }, 600);
    }
}());
