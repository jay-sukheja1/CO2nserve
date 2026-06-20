/**
 * @module CO2nserveCharts
 * @description CO2nserve Charting Module.
 * Renders native SVG-based visualizations with zero external dependencies.
 * Includes donut chart, benchmarks bar chart, and dynamic carbon garden ecosystem.
 *
 * Exposes `window.CO2nserveCharts`.
 */

const CO2nserveCharts = {
    /**
     * Renders a dynamic, interactive SVG donut chart with hover effects.
     * @param {string} containerId - The ID of the container DOM element
     * @param {Array<{id: string, label: string, value: number, color: string}>} segments - Chart segments
     * @returns {void}
     */
    renderDonut(containerId, segments) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const activeSegments = segments.filter(s => s.value > 0);
        const total = segments.reduce((sum, s) => sum + s.value, 0);

        // Zero-state placeholder
        if (total === 0) {
            container.innerHTML = `
                <div class="donut-center-text">
                    <span class="donut-center-val">0.0</span>
                    <span class="donut-center-label">tonnes</span>
                </div>
                <svg viewBox="0 0 100 100" class="donut-svg" role="img" aria-label="Empty donut chart — no emissions calculated">
                    <circle class="donut-hole-bg" cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" stroke-width="12"></circle>
                </svg>
            `;
            return;
        }

        const radius = 38;
        const strokeWidth = 10;
        const circumference = 2 * Math.PI * radius;

        let accumulatedPercent = 0;
        let svgContent = `
            <circle class="donut-hole-bg" cx="50" cy="50" r="${radius}" stroke="rgba(255,255,255,0.03)" stroke-width="${strokeWidth}"></circle>
        `;

        activeSegments.forEach((seg) => {
            const pct = seg.value / total;
            const strokeLength = pct * circumference;
            const strokeGap = circumference - strokeLength;
            const strokeOffset = -accumulatedPercent * circumference;

            svgContent += `
                <circle class="donut-segment" 
                        cx="50" 
                        cy="50" 
                        r="${radius}" 
                        fill="none" 
                        stroke="${seg.color}" 
                        stroke-width="${strokeWidth}" 
                        stroke-dasharray="${strokeLength} ${strokeGap}" 
                        stroke-dashoffset="${strokeOffset}"
                        data-category="${seg.id}"
                        data-value="${seg.value}"
                        data-label="${seg.label}"
                        data-percent="${Math.round(pct * 100)}%"
                        style="transition: stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease; stroke-linecap: round;"
                        role="graphics-symbol"
                        aria-label="${seg.label}: ${seg.value.toFixed(1)} tonnes (${Math.round(pct * 100)}%)"
                ></circle>
            `;
            accumulatedPercent += pct;
        });

        const centerTextHtml = `
            <div class="donut-center-text" id="donut-center-overlay">
                <span class="donut-center-val">${total.toFixed(1)}</span>
                <span class="donut-center-label">t CO₂e/yr</span>
            </div>
        `;

        container.innerHTML = `
            ${centerTextHtml}
            <svg viewBox="0 0 100 100" class="donut-svg" role="img" aria-label="Donut chart showing ${total.toFixed(1)} tonnes CO₂e per year across ${activeSegments.length} categories">
                ${svgContent}
            </svg>
        `;

        // Hover effects
        const segmentsInDom = container.querySelectorAll('.donut-segment');
        const overlayVal = container.querySelector('.donut-center-val');
        const overlayLabel = container.querySelector('.donut-center-label');

        segmentsInDom.forEach(segEl => {
            segEl.addEventListener('mouseenter', (e) => {
                segmentsInDom.forEach(s => s.setAttribute('stroke-width', strokeWidth));
                e.target.setAttribute('stroke-width', strokeWidth + 2);

                const label = e.target.getAttribute('data-label');
                const val = parseFloat(e.target.getAttribute('data-value'));
                const pct = e.target.getAttribute('data-percent');

                if (overlayVal && overlayLabel) {
                    overlayVal.innerText = `${val.toFixed(1)}t`;
                    overlayLabel.innerText = `${label} (${pct})`;
                }
            });

            segEl.addEventListener('mouseleave', () => {
                segEl.setAttribute('stroke-width', strokeWidth);
                if (overlayVal && overlayLabel) {
                    overlayVal.innerText = `${total.toFixed(1)}t`;
                    overlayLabel.innerText = 't CO₂e/yr';
                }
            });
        });
    },

    /**
     * Renders benchmark bars comparing user emissions to global averages.
     * @param {string} containerId  - The ID of the container element
     * @param {number} userCurrent  - Current footprint in tonnes
     * @param {number} userProjected - Projected footprint including committed savings
     * @returns {void}
     */
    renderBenchmarks(containerId, userCurrent, userProjected) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const benchmarks = [
            { id: 'user-current',   label: 'Your Footprint (Current)',  value: userCurrent,   type: 'user' },
            { id: 'user-projected', label: 'Your Footprint (Projected)',value: userProjected, type: 'projected' },
            { id: 'us-avg',         label: 'US National Average',       value: 16.0,          type: 'avg' },
            { id: 'eu-avg',         label: 'EU National Average',       value: 6.8,           type: 'avg' },
            { id: 'world-avg',      label: 'Global Average',            value: 4.8,           type: 'avg' },
            { id: 'target',         label: '2030 Global Climate Goal',  value: 2.0,           type: 'target' }
        ];

        /** @type {Object.<string, string>} Icon class map by benchmark ID */
        const iconMap = {
            'user-current':   '<i class="fa-solid fa-user text-green" aria-hidden="true"></i>',
            'user-projected': '<i class="fa-solid fa-user-astronaut text-blue" aria-hidden="true"></i>',
            'target':         '<i class="fa-solid fa-bullseye text-blue" aria-hidden="true"></i>'
        };
        const defaultIcon = '<i class="fa-solid fa-globe" aria-hidden="true"></i>';

        /** @type {Object.<string, string>} Fill style map by benchmark ID */
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        const fillStyleMap = {
            'user-current':   'background: var(--color-green);',
            'user-projected': 'background: linear-gradient(90deg, #10b981, #0ea5e9); opacity: 0.85;',
            'target':         'background: var(--color-blue);'
        };
        const defaultFill = isLight ? 'background: rgba(0, 0, 0, 0.15);' : 'background: rgba(255, 255, 255, 0.2);';

        /** @type {Object.<string, string>} Row class suffix map by benchmark ID */
        const rowClassMap = {
            'user-current':   ' highlighted',
            'user-projected': ' projected-row',
            'target':         ' target'
        };

        const maxVal = Math.max(...benchmarks.map(b => b.value), 18.0);
        let barsHtml = '';

        benchmarks.forEach(bench => {
            // Skip projected bar when identical to current
            if (bench.id === 'user-projected' && userCurrent === userProjected) return;

            const widthPct = (bench.value / maxVal) * 100;
            const rowClass = 'bench-row' + (rowClassMap[bench.id] || ' standard');
            const iconHtml = iconMap[bench.id] || defaultIcon;
            const fillStyle = fillStyleMap[bench.id] || defaultFill;

            barsHtml += `
                <div class="${rowClass}" id="bench-row-${bench.id}">
                    <div class="bench-info">
                        <span class="bench-label">${iconHtml} ${bench.label}</span>
                        <span class="bench-val">${bench.value.toFixed(1)} tonnes</span>
                    </div>
                    <div class="bench-bar-track" role="meter" aria-valuenow="${bench.value}" aria-valuemin="0" aria-valuemax="${maxVal}" aria-label="${bench.label}: ${bench.value.toFixed(1)} tonnes">
                        <div class="bench-bar-fill" style="width: ${widthPct}%; ${fillStyle}"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = barsHtml;
    },

    /**
     * Determines the garden visual state based on total emissions.
     * @private
     * @param {number} total - Current footprint in tonnes
     * @returns {'pristine'|'healthy'|'warning'|'polluted'|'critical'} Garden visual state
     */
    _getGardenState(total) {
        if (total === 0)    return 'pristine';
        if (total > 25.0)   return 'critical';
        if (total > 12.0)   return 'polluted';
        if (total > 6.0)    return 'warning';
        return 'healthy';
    },

    /**
     * Returns the sky gradient SVG `<linearGradient>` definition for the garden.
     * @private
     * @param {string} state - Garden visual state
     * @returns {string} SVG gradient definition
     */
    _getSkyGradient(state) {
        const gradients = {
            pristine: '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/><stop offset="100%" stop-color="#10b981" stop-opacity="0.1"/></linearGradient>',
            healthy:  '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.25"/><stop offset="100%" stop-color="#10b981" stop-opacity="0.05"/></linearGradient>',
            warning:  '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#203a30"/><stop offset="100%" stop-color="#0a0f0d"/></linearGradient>',
            polluted: '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2c3531"/><stop offset="100%" stop-color="#1b2220"/></linearGradient>',
            critical: '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1110"/><stop offset="100%" stop-color="#0d0808"/></linearGradient>'
        };
        return gradients[state] || gradients.healthy;
    },

    /**
     * Returns the sun SVG element for the garden based on state.
     * @private
     * @param {string} state - Garden visual state
     * @returns {string} SVG sun markup
     */
    _getSunHtml(state) {
        if (state === 'pristine' || state === 'healthy') {
            return `
                <g class="sun-pulse" aria-hidden="true">
                    <circle cx="15" cy="15" r="8" fill="#f59e0b" filter="drop-shadow(0 0 6px rgba(245,158,11,0.6))"/>
                    <circle cx="15" cy="15" r="12" fill="#f59e0b" fill-opacity="0.15"/>
                </g>
            `;
        }
        if (state === 'warning') {
            return '<circle cx="15" cy="15" r="6" fill="#d97706" opacity="0.4" aria-hidden="true"/>';
        }
        return '';
    },

    /**
     * Returns cloud SVG elements for the garden based on state.
     * @private
     * @param {string} state - Garden visual state
     * @returns {string} SVG cloud markup
     */
    _getCloudsHtml(state) {
        if (state === 'critical') {
            return `
                <g aria-hidden="true">
                    <path d="M70 20 a8 8 0 0 1 12 0 a10 10 0 0 1 14 6 a8 8 0 0 1 -4 12 h-22 z" fill="#3b3b3b" opacity="0.8" class="cloud-drift"/>
                    <path d="M15 30 a6 6 0 0 1 10 0 a8 8 0 0 1 10 4 a6 6 0 0 1 -2 8 h-18 z" fill="#2b2b2b" opacity="0.85" class="cloud-drift" style="animation-delay: -3s;"/>
                    <path d="M40 12 a5 5 0 0 1 8 0 a6 6 0 0 1 8 4 a5 5 0 0 1 -2 6 h-14 z" fill="#333" opacity="0.7" class="cloud-drift" style="animation-delay: -6s;"/>
                </g>
            `;
        }
        if (state === 'polluted') {
            return `
                <g aria-hidden="true">
                    <path d="M70 20 a8 8 0 0 1 12 0 a10 10 0 0 1 14 6 a8 8 0 0 1 -4 12 h-22 z" fill="#4b5563" opacity="0.6" class="cloud-drift"/>
                    <path d="M15 35 a6 6 0 0 1 10 0 a8 8 0 0 1 10 4 a6 6 0 0 1 -2 8 h-18 z" fill="#374151" opacity="0.7" class="cloud-drift" style="animation-delay: -3s; animation-duration: 16s;"/>
                </g>
            `;
        }
        if (state === 'warning') {
            return '<path d="M75 18 a6 6 0 0 1 10 0 a8 8 0 0 1 10 4 a6 6 0 0 1 -2 8 h-18 z" fill="rgba(255,255,255,0.12)" class="cloud-drift" aria-hidden="true"/>';
        }
        // pristine / healthy
        return '<path d="M75 15 a5 5 0 0 1 8 0 a7 7 0 0 1 8 3 a5 5 0 0 1 -2 6 h-14 z" fill="rgba(255,255,255,0.2)" class="cloud-drift" style="animation-duration: 20s;" aria-hidden="true"/>';
    },

    /**
     * Returns bird SVG elements. Birds only appear in pristine/healthy states.
     * @private
     * @param {string} state - Garden visual state
     * @returns {string} SVG bird markup
     */
    _getBirdsHtml(state) {
        if (state !== 'pristine' && state !== 'healthy') return '';

        let html = `
            <g class="bird-fly" style="transform-origin: 30px 20px;" aria-hidden="true">
                <path d="M30 20 Q33 16 35 20 Q37 16 40 20" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2" stroke-linecap="round"/>
            </g>
            <g class="bird-fly" style="transform-origin: 65px 25px; animation-delay: -6s; animation-duration: 18s;" aria-hidden="true">
                <path d="M65 25 Q67 22 69 25 Q71 22 73 25" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.9" stroke-linecap="round"/>
            </g>
        `;
        // Pristine state gets extra butterflies
        if (state === 'pristine') {
            html += `
                <g class="bird-fly" style="transform-origin: 80px 30px; animation-delay: -10s; animation-duration: 12s;" aria-hidden="true">
                    <path d="M80 30 Q82 27 84 30 Q86 27 88 30" fill="none" stroke="#ec4899" stroke-width="1" stroke-linecap="round"/>
                </g>
            `;
        }
        return html;
    },

    /**
     * Renders a dynamic, interactive SVG carbon garden ecosystem.
     * Visual states: pristine (0t), healthy (<6t), warning (6-12t), polluted (12-25t), critical (>25t).
     * @param {string} containerId - The ID of the container element
     * @param {number} total       - Current footprint in tonnes
     * @param {number} savingsPct  - Committed savings percentage (0-100)
     * @returns {void}
     */
    renderGarden(containerId, total, savingsPct) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const state = this._getGardenState(total);
        const skyGradient = this._getSkyGradient(state);
        const sunHtml = this._getSunHtml(state);
        const cloudsHtml = this._getCloudsHtml(state);
        const birdsHtml = this._getBirdsHtml(state);

        // Tree trunk
        const trunkConfig = {
            pristine: { color: '#8b5a2b', width: 4.5 },
            healthy:  { color: '#8b5a2b', width: 4 },
            warning:  { color: '#5c4033', width: 3 },
            polluted: { color: '#3e2723', width: 2.2 },
            critical: { color: '#1a1210', width: 1.8 }
        };
        const { color: trunkColor, width: trunkWidth } = trunkConfig[state] || trunkConfig.warning;

        let treeTrunk = `
            <path d="M50 85 L50 48" stroke="${trunkColor}" stroke-width="${trunkWidth}" stroke-linecap="round"/>
            <path d="M50 65 Q44 55 38 52" fill="none" stroke="${trunkColor}" stroke-width="${trunkWidth * 0.7}" stroke-linecap="round"/>
            <path d="M50 58 Q56 48 64 45" fill="none" stroke="${trunkColor}" stroke-width="${trunkWidth * 0.7}" stroke-linecap="round"/>
        `;

        if (state === 'healthy' || state === 'pristine') {
            treeTrunk += `
                <path d="M38 52 Q34 47 31 49" fill="none" stroke="${trunkColor}" stroke-width="${trunkWidth * 0.45}" stroke-linecap="round"/>
                <path d="M64 45 Q70 40 73 42" fill="none" stroke="${trunkColor}" stroke-width="${trunkWidth * 0.45}" stroke-linecap="round"/>
            `;
        }

        // Leaves
        let leavesHtml = '';
        if (state === 'critical') {
            // Barren: 3 dead leaves only
            leavesHtml = `
                <circle cx="50" cy="48" r="1.5" fill="#4a3520" opacity="0.7" class="leaf-sway"/>
                <circle cx="38" cy="52" r="1.2" fill="#3e2723" opacity="0.6" class="leaf-sway" style="animation-delay: -1s;"/>
                <circle cx="64" cy="45" r="1.3" fill="#4a3520" opacity="0.55" class="leaf-sway" style="animation-delay: -2s;"/>
            `;
        } else if (state === 'polluted') {
            leavesHtml = `
                <circle cx="38" cy="52" r="2.2" fill="#d97706" opacity="0.8" class="leaf-sway"/>
                <circle cx="64" cy="45" r="2.4" fill="#78350f" opacity="0.85" class="leaf-sway" style="animation-delay: -1s;"/>
                <circle cx="50" cy="48" r="2.2" fill="#7c2d12" opacity="0.9" class="leaf-sway" style="animation-delay: -2s;"/>
                <circle cx="48" cy="44" r="1.8" fill="#f59e0b" opacity="0.75" class="leaf-sway" style="animation-delay: -0.5s;"/>
                <circle cx="53" cy="45" r="2.2" fill="#78350f" opacity="0.65" class="leaf-sway" style="animation-delay: -1.5s;"/>
            `;
        } else if (state === 'warning') {
            const leafCoords = [
                {x: 48, y: 44, r: 5}, {x: 52, y: 45, r: 6}, {x: 50, y: 40, r: 5.5},
                {x: 42, y: 45, r: 4}, {x: 58, y: 43, r: 4.5}, {x: 38, y: 52, r: 5},
                {x: 34, y: 50, r: 4.5}, {x: 64, y: 45, r: 5.5}, {x: 68, y: 42, r: 4},
                {x: 46, y: 48, r: 5}, {x: 54, y: 49, r: 4.5}, {x: 45, y: 42, r: 4.5},
                {x: 55, y: 41, r: 5}
            ];
            const warningColors = ['#84cc16', '#eab308', '#10b981'];
            leafCoords.forEach((c, i) => {
                const leafColor = warningColors[i % 3];
                leavesHtml += `<circle cx="${c.x}" cy="${c.y}" r="${c.r}" fill="${leafColor}" opacity="0.85" class="leaf-sway" style="animation-delay: -${(i*0.3).toFixed(1)}s;"/>`;
            });

            // Warning recovery: sprouting green shoots when savings > 15%
            if (savingsPct > 15) {
                const shootCount = Math.min(5, Math.ceil(savingsPct / 10));
                const shootCoords = [{x:42,y:50},{x:55,y:48},{x:35,y:53},{x:62,y:44},{x:50,y:42}];
                for (let j = 0; j < shootCount; j++) {
                    const sc = shootCoords[j];
                    leavesHtml += `<circle cx="${sc.x}" cy="${sc.y}" r="${3 + j * 0.5}" fill="#34d399" opacity="0.8" class="leaf-sway" style="animation-delay: -${j*0.4}s;"/>`;
                }
            }
        } else {
            // Healthy / Pristine tree: 23 lush green leaves
            const leafCoords = [
                {x: 50, y: 44, r: 8}, {x: 46, y: 40, r: 9}, {x: 54, y: 39, r: 8.5},
                {x: 49, y: 35, r: 7.5}, {x: 42, y: 37, r: 7}, {x: 58, y: 36, r: 7.5},
                {x: 38, y: 52, r: 7}, {x: 34, y: 49, r: 8}, {x: 30, y: 48, r: 6.5},
                {x: 35, y: 44, r: 7.5}, {x: 40, y: 46, r: 8}, {x: 32, y: 53, r: 5},
                {x: 64, y: 45, r: 7.5}, {x: 68, y: 42, r: 7.5}, {x: 72, y: 43, r: 6},
                {x: 61, y: 40, r: 8}, {x: 66, y: 48, r: 6.5}, {x: 70, y: 49, r: 5},
                {x: 48, y: 48, r: 9}, {x: 53, y: 49, r: 9}, {x: 44, y: 44, r: 8.5},
                {x: 56, y: 43, r: 8.5}, {x: 50, y: 49, r: 9.5}
            ];
            const healthyColors = ['#10b981', '#059669', '#34d399', '#047857'];
            leafCoords.forEach((c, i) => {
                const leafColor = healthyColors[i % 4];
                const size = state === 'pristine' ? c.r * 1.1 : c.r;
                leavesHtml += `<circle cx="${c.x}" cy="${c.y}" r="${size}" fill="${leafColor}" opacity="0.9" class="leaf-sway" style="animation-delay: -${(i*0.25).toFixed(1)}s;"/>`;
            });

            // Blossoms when savings > 0
            if (savingsPct > 0) {
                const blossomCount = Math.min(12, Math.ceil(savingsPct / 4));
                const blossomCoords = [
                    {x: 48, y: 37}, {x: 52, y: 42}, {x: 35, y: 46}, {x: 65, y: 43},
                    {x: 42, y: 41}, {x: 58, y: 38}, {x: 32, y: 51}, {x: 69, y: 46},
                    {x: 50, y: 32}, {x: 45, y: 47}, {x: 55, y: 47}, {x: 38, y: 48}
                ];
                for (let j = 0; j < blossomCount; j++) {
                    const coord = blossomCoords[j];
                    leavesHtml += `
                        <g class="wind-sway" style="animation-duration: ${4 + j}s; transform-origin: ${coord.x}px ${coord.y}px;" aria-hidden="true">
                            <circle cx="${coord.x}" cy="${coord.y}" r="2" fill="#ec4899" opacity="0.95"/>
                            <circle cx="${coord.x - 1.5}" cy="${coord.y}" r="1.2" fill="#f472b6" opacity="0.9"/>
                            <circle cx="${coord.x + 1.5}" cy="${coord.y}" r="1.2" fill="#f472b6" opacity="0.9"/>
                            <circle cx="${coord.x}" cy="${coord.y - 1.5}" r="1.2" fill="#f472b6" opacity="0.9"/>
                            <circle cx="${coord.x}" cy="${coord.y + 1.5}" r="1.2" fill="#f472b6" opacity="0.9"/>
                            <circle cx="${coord.x}" cy="${coord.y}" r="0.6" fill="#fbbf24"/>
                        </g>
                    `;
                }
            }
        }

        // Ground
        let groundHtml = '';
        if (state === 'critical') {
            groundHtml = `
                <rect x="0" y="80" width="100" height="20" fill="#1a0f0a"/>
                <path d="M0 80 L100 80" stroke="#0d0605" stroke-width="1.5"/>
                <path d="M25 85 Q27 83 29 85" fill="none" stroke="#3e2723" stroke-width="0.5" opacity="0.4"/>
                <path d="M60 87 Q62 85 64 87" fill="none" stroke="#3e2723" stroke-width="0.5" opacity="0.3"/>
            `;
        } else if (state === 'polluted') {
            groundHtml = `
                <rect x="0" y="80" width="100" height="20" fill="#2d221c"/>
                <path d="M0 80 L100 80" stroke="#1c1410" stroke-width="1.5"/>
            `;
        } else if (state === 'warning') {
            groundHtml = `
                <rect x="0" y="80" width="100" height="20" fill="#4d423a"/>
                <rect x="0" y="80" width="100" height="4" fill="#65a30d" opacity="0.6"/>
                <path d="M0 80 Q25 78 50 80 Q75 82 100 80" fill="none" stroke="#3f6212" stroke-width="1"/>
            `;
        } else {
            // Healthy / Pristine ground
            groundHtml = `
                <path d="M0 82 Q30 76 60 81 Q80 84 100 81 L100 100 L0 100 Z" fill="#047857" opacity="0.5"/>
                <path d="M0 80 Q40 83 70 79 Q85 77 100 80 L100 100 L0 100 Z" fill="#10b981"/>
                <circle cx="20" cy="85" r="1" fill="#ec4899"/><circle cx="20" cy="85" r="0.4" fill="#fbbf24"/>
                <circle cx="75" cy="83" r="0.8" fill="#f59e0b"/>
                <circle cx="83" cy="86" r="1.2" fill="#ffffff"/><circle cx="83" cy="86" r="0.4" fill="#fbbf24"/>
            `;
            if (state === 'pristine') {
                groundHtml += `
                    <circle cx="12" cy="87" r="0.9" fill="#ec4899"/><circle cx="12" cy="87" r="0.3" fill="#fbbf24"/>
                    <circle cx="40" cy="84" r="1.1" fill="#a78bfa"/><circle cx="40" cy="84" r="0.35" fill="#fbbf24"/>
                    <circle cx="92" cy="84" r="0.7" fill="#f472b6"/>
                `;
            }
        }

        // Complete SVG assembly
        const svgString = `
            <svg viewBox="0 0 100 100" class="garden-svg-container" role="img" aria-label="Carbon garden visualization: ${state} state at ${total.toFixed(1)} tonnes CO₂e">
                <defs>${skyGradient}</defs>
                <rect x="0" y="0" width="100" height="100" fill="url(#skyGrad)"/>
                ${sunHtml}
                ${cloudsHtml}
                ${birdsHtml}
                ${groundHtml}
                ${treeTrunk}
                ${leavesHtml}
            </svg>
        `;

        container.innerHTML = svgString;

        // Update status text using safe DOM methods
        const statusEl = document.getElementById('carbon-garden-status');
        if (!statusEl) return;

        const statusText = statusEl.querySelector('.garden-status-text');
        if (!statusText) return;

        /** @type {Object.<string, {icon: string, color: string, text: string}>} Status messages */
        const statusMessages = {
            pristine: {
                icon: 'fa-solid fa-sparkles', color: 'var(--color-blue)',
                text: `Pristine paradise! Zero emissions detected — your garden is a utopia.`
            },
            critical: {
                icon: 'fa-solid fa-skull-crossbones', color: 'var(--color-danger)',
                text: `Critical: ${total.toFixed(1)}t CO₂e. Garden is barren. Immediate action needed!`
            },
            polluted: {
                icon: 'fa-solid fa-triangle-exclamation', color: 'var(--color-orange)',
                text: `Garden is dry & polluted (${total.toFixed(1)}t CO₂e). Cut emissions to revive it!`
            },
            warning: {
                icon: 'fa-solid fa-cloud', color: 'var(--color-yellow)',
                text: savingsPct > 15
                    ? `Garden is recovering! Your ${savingsPct}% savings are sprouting green shoots.`
                    : `Garden is recovering. Commit to more actions to make it lush.`
            }
        };

        // Healthy state with/without savings
        if (state === 'healthy') {
            const msg = savingsPct > 0
                ? { icon: 'fa-solid fa-face-smile', color: 'var(--color-green)', text: `Thriving garden! Your ${savingsPct}% reduction has unlocked flower blossoms!` }
                : { icon: 'fa-solid fa-tree', color: 'var(--color-green)', text: `Healthy garden! Commit to reduction actions to grow flowers.` };
            statusMessages.healthy = msg;
        }

        const msg = statusMessages[state];
        if (msg) {
            statusText.textContent = '';
            const iconEl = document.createElement('i');
            iconEl.className = msg.icon;
            iconEl.style.cssText = `color:${msg.color}; margin-right:6px;`;
            iconEl.setAttribute('aria-hidden', 'true');
            statusText.appendChild(iconEl);
            statusText.appendChild(document.createTextNode(msg.text));
        }
    }
};

window.CO2nserveCharts = CO2nserveCharts;
