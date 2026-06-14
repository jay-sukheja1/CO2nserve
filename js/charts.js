/**
 * CO2nserve Charting Module
 * Renders native SVG-based visualizations with zero external dependencies.
 */

const CO2nserveCharts = {
    /**
     * Renders a dynamic, interactive SVG donut chart.
     * @param {string} containerId - The ID of the container element
     * @param {Array} segments - Array of segment objects { id, label, value, color }
     */
    renderDonut(containerId, segments) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Filter out zero-value categories, but ensure we have at least something to show
        const activeSegments = segments.filter(s => s.value > 0);
        const total = segments.reduce((sum, s) => sum + s.value, 0);

        // If total is 0, render an empty placeholder state
        if (total === 0) {
            container.innerHTML = `
                <div class="donut-center-text">
                    <span class="donut-center-val">0.0</span>
                    <span class="donut-center-label">tonnes</span>
                </div>
                <svg viewBox="0 0 100 100" class="donut-svg">
                    <circle class="donut-hole-bg" cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" stroke-width="12"></circle>
                </svg>
            `;
            return;
        }

        // SVG parameters
        const radius = 38;
        const strokeWidth = 10;
        const circumference = 2 * Math.PI * radius; // ~238.76

        let accumulatedPercent = 0;
        let svgContent = `
            <circle class="donut-hole-bg" cx="50" cy="50" r="${radius}" stroke="rgba(255,255,255,0.03)" stroke-width="${strokeWidth}"></circle>
        `;

        activeSegments.forEach((seg, idx) => {
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
                ></circle>
            `;
            accumulatedPercent += pct;
        });

        // Center text container
        const centerTextHtml = `
            <div class="donut-center-text" id="donut-center-overlay">
                <span class="donut-center-val">${total.toFixed(1)}</span>
                <span class="donut-center-label">t CO₂e/yr</span>
            </div>
        `;

        container.innerHTML = `
            ${centerTextHtml}
            <svg viewBox="0 0 100 100" class="donut-svg">
                ${svgContent}
            </svg>
        `;

        // Add Hover Effects to SVG segments
        const segmentsInDom = container.querySelectorAll('.donut-segment');
        const overlayVal = container.querySelector('.donut-center-val');
        const overlayLabel = container.querySelector('.donut-center-label');

        segmentsInDom.forEach(segEl => {
            segEl.addEventListener('mouseenter', (e) => {
                // Expand segment width on hover
                segmentsInDom.forEach(s => s.setAttribute('stroke-width', strokeWidth));
                e.target.setAttribute('stroke-width', strokeWidth + 2);

                const label = e.target.getAttribute('data-label');
                const val = parseFloat(e.target.getAttribute('data-value'));
                const pct = e.target.getAttribute('data-percent');

                // Update center overlay text
                if (overlayVal && overlayLabel) {
                    overlayVal.innerText = `${val.toFixed(1)}t`;
                    overlayLabel.innerText = `${label} (${pct})`;
                }
            });

            segEl.addEventListener('mouseleave', () => {
                segEl.setAttribute('stroke-width', strokeWidth);
                
                // Restore default total display
                if (overlayVal && overlayLabel) {
                    overlayVal.innerText = `${total.toFixed(1)}t`;
                    overlayLabel.innerText = 't CO₂e/yr';
                }
            });
        });
    },

    /**
     * Renders benchmark bars comparing user emissions to global averages.
     * @param {string} containerId - The ID of the container element
     * @param {number} userCurrent - Current footprint in tonnes
     * @param {number} userProjected - Footprint in tonnes including actions savings
     */
    renderBenchmarks(containerId, userCurrent, userProjected) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const benchmarks = [
            { id: 'user-current', label: 'Your Footprint (Current)', value: userCurrent, type: 'user' },
            { id: 'user-projected', label: 'Your Footprint (Projected)', value: userProjected, type: 'projected' },
            { id: 'us-avg', label: 'US National Average', value: 16.0, type: 'avg' },
            { id: 'eu-avg', label: 'EU National Average', value: 6.8, type: 'avg' },
            { id: 'world-avg', label: 'Global Average', value: 4.8, type: 'avg' },
            { id: 'target', label: '2030 Global Climate Goal', value: 2.0, type: 'target' }
        ];

        // Find max value to calibrate bars
        const maxVal = Math.max(...benchmarks.map(b => b.value), 18.0);

        let barsHtml = '';

        benchmarks.forEach(bench => {
            const widthPct = (bench.value / maxVal) * 100;
            
            let rowClass = 'bench-row';
            let barColorStyle = '';
            
            if (bench.id === 'user-current') {
                rowClass += ' highlighted';
            } else if (bench.id === 'user-projected') {
                rowClass += ' projected-row';
            } else if (bench.id === 'target') {
                rowClass += ' target';
            } else {
                rowClass += ' standard';
            }

            // Inline styles depending on row types
            let iconHtml = '';
            if (bench.id === 'user-current') {
                iconHtml = '<i class="fa-solid fa-user text-green"></i>';
            } else if (bench.id === 'user-projected') {
                iconHtml = '<i class="fa-solid fa-user-astronaut text-blue"></i>';
            } else if (bench.id === 'target') {
                iconHtml = '<i class="fa-solid fa-bullseye text-blue"></i>';
            } else {
                iconHtml = '<i class="fa-solid fa-globe"></i>';
            }

            // Projected bar gets a distinct dashed styling or gradient
            let fillStyle = '';
            if (bench.id === 'user-projected') {
                fillStyle = 'background: linear-gradient(90deg, #10b981, #0ea5e9); opacity: 0.85;';
            } else if (bench.id === 'user-current') {
                fillStyle = 'background: var(--color-green);';
            } else if (bench.id === 'target') {
                fillStyle = 'background: var(--color-blue);';
            } else {
                fillStyle = 'background: rgba(255, 255, 255, 0.2);';
            }

            // For light mode standard bars, override background color
            if (document.documentElement.getAttribute('data-theme') === 'light' && bench.type === 'avg') {
                fillStyle = 'background: rgba(0, 0, 0, 0.15);';
            }

            // Hide projected bar if savings are 0 (it is identical to current)
            if (bench.id === 'user-projected' && userCurrent === userProjected) {
                return; // Skip rendering
            }

            barsHtml += `
                <div class="${rowClass}" id="bench-row-${bench.id}">
                    <div class="bench-info">
                        <span class="bench-label">${iconHtml} ${bench.label}</span>
                        <span class="bench-val">${bench.value.toFixed(1)} tonnes</span>
                    </div>
                    <div class="bench-bar-track">
                        <div class="bench-bar-fill" style="width: ${widthPct}%; ${fillStyle}"></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = barsHtml;
    },

    /**
     * Renders a dynamic, interactive SVG carbon garden ecosystem.
     * @param {string} containerId - The ID of the container element
     * @param {number} total - Current footprint in tonnes
     * @param {number} savingsPct - Committed savings percentage (0-100)
     */
    renderGarden(containerId, total, savingsPct) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Visual states thresholds:
        // Healthy: < 6.0 tonnes
        // Warning: 6.0 - 12.0 tonnes
        // Polluted: > 12.0 tonnes
        const state = total > 12.0 ? 'polluted' : total > 6.0 ? 'warning' : 'healthy';

        // Sky colors
        let skyGradient = '';
        if (state === 'polluted') {
            skyGradient = '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2c3531"/><stop offset="100%" stop-color="#1b2220"/></linearGradient>';
        } else if (state === 'warning') {
            skyGradient = '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#203a30"/><stop offset="100%" stop-color="#0a0f0d"/></linearGradient>';
        } else {
            skyGradient = '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.25"/><stop offset="100%" stop-color="#10b981" stop-opacity="0.05"/></linearGradient>';
        }

        // Sun rendering (only if not polluted)
        let sunHtml = '';
        if (state === 'healthy') {
            sunHtml = `
                <g class="sun-pulse">
                    <circle cx="15" cy="15" r="8" fill="#f59e0b" filter="drop-shadow(0 0 6px rgba(245,158,11,0.6))"/>
                    <circle cx="15" cy="15" r="12" fill="#f59e0b" fill-opacity="0.15"/>
                </g>
            `;
        } else if (state === 'warning') {
            sunHtml = '<circle cx="15" cy="15" r="6" fill="#d97706" opacity="0.4"/>';
        }

        // Clouds (more and darker clouds if polluted)
        let cloudsHtml = '';
        if (state === 'polluted') {
            cloudsHtml = `
                <path d="M70 20 a8 8 0 0 1 12 0 a10 10 0 0 1 14 6 a8 8 0 0 1 -4 12 h-22 z" fill="#4b5563" opacity="0.6" class="cloud-drift"/>
                <path d="M15 35 a6 6 0 0 1 10 0 a8 8 0 0 1 10 4 a6 6 0 0 1 -2 8 h-18 z" fill="#374151" opacity="0.7" class="cloud-drift" style="animation-delay: -3s; animation-duration: 16s;"/>
            `;
        } else if (state === 'warning') {
            cloudsHtml = `
                <path d="M75 18 a6 6 0 0 1 10 0 a8 8 0 0 1 10 4 a6 6 0 0 1 -2 8 h-18 z" fill="rgba(255,255,255,0.12)" class="cloud-drift"/>
            `;
        } else {
            // healthy: single white cloud drifting
            cloudsHtml = `
                <path d="M75 15 a5 5 0 0 1 8 0 a7 7 0 0 1 8 3 a5 5 0 0 1 -2 6 h-14 z" fill="rgba(255,255,255,0.2)" class="cloud-drift" style="animation-duration: 20s;"/>
            `;
        }

        // Birds (only if healthy)
        let birdsHtml = '';
        if (state === 'healthy') {
            birdsHtml = `
                <g class="bird-fly" style="transform-origin: 30px 20px;">
                    <path d="M30 20 Q33 16 35 20 Q37 16 40 20" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.2" stroke-linecap="round"/>
                </g>
                <g class="bird-fly" style="transform-origin: 65px 25px; animation-delay: -6s; animation-duration: 18s;">
                    <path d="M65 25 Q67 22 69 25 Q71 22 73 25" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.9" stroke-linecap="round"/>
                </g>
            `;
        }

        // Tree trunk
        let trunkColor = '#5c4033';
        let trunkWidth = 3;
        if (state === 'polluted') {
            trunkColor = '#3e2723';
            trunkWidth = 2.2;
        } else if (state === 'healthy') {
            trunkColor = '#8b5a2b';
            trunkWidth = 4;
        }
        
        let treeTrunk = `
            <!-- Main Trunk -->
            <path d="M50 85 L50 48" stroke="${trunkColor}" stroke-width="${trunkWidth}" stroke-linecap="round"/>
            <!-- Branch Left -->
            <path d="M50 65 Q44 55 38 52" fill="none" stroke="${trunkColor}" stroke-width="${trunkWidth * 0.7}" stroke-linecap="round"/>
            <!-- Branch Right -->
            <path d="M50 58 Q56 48 64 45" fill="none" stroke="${trunkColor}" stroke-width="${trunkWidth * 0.7}" stroke-linecap="round"/>
        `;

        if (state === 'healthy') {
            // Extra twigs
            treeTrunk += `
                <path d="M38 52 Q34 47 31 49" fill="none" stroke="${trunkColor}" stroke-width="${trunkWidth * 0.45}" stroke-linecap="round"/>
                <path d="M64 45 Q70 40 73 42" fill="none" stroke="${trunkColor}" stroke-width="${trunkWidth * 0.45}" stroke-linecap="round"/>
            `;
        }

        // Leaves rendering
        let leavesHtml = '';
        if (state === 'polluted') {
            // Almost dead tree: 5 small brown/yellow leaves
            leavesHtml = `
                <circle cx="38" cy="52" r="2.2" fill="#d97706" opacity="0.8" class="leaf-sway"/>
                <circle cx="64" cy="45" r="2.4" fill="#78350f" opacity="0.85" class="leaf-sway" style="animation-delay: -1s;"/>
                <circle cx="50" cy="48" r="2.2" fill="#7c2d12" opacity="0.9" class="leaf-sway" style="animation-delay: -2s;"/>
                <circle cx="48" cy="44" r="1.8" fill="#f59e0b" opacity="0.75" class="leaf-sway" style="animation-delay: -0.5s;"/>
                <circle cx="53" cy="45" r="2.2" fill="#78350f" opacity="0.65" class="leaf-sway" style="animation-delay: -1.5s;"/>
            `;
        } else if (state === 'warning') {
            // Moderate tree: 13 medium yellow-green leaves
            const leafCoords = [
                {x: 48, y: 44, r: 5}, {x: 52, y: 45, r: 6}, {x: 50, y: 40, r: 5.5},
                {x: 42, y: 45, r: 4}, {x: 58, y: 43, r: 4.5}, {x: 38, y: 52, r: 5},
                {x: 34, y: 50, r: 4.5}, {x: 64, y: 45, r: 5.5}, {x: 68, y: 42, r: 4},
                {x: 46, y: 48, r: 5}, {x: 54, y: 49, r: 4.5}, {x: 45, y: 42, r: 4.5},
                {x: 55, y: 41, r: 5}
            ];
            leafCoords.forEach((c, i) => {
                // Blend green and yellow-brown
                const leafColor = i % 3 === 0 ? '#84cc16' : i % 3 === 1 ? '#eab308' : '#10b981';
                leavesHtml += `<circle cx="${c.x}" cy="${c.y}" r="${c.r}" fill="${leafColor}" opacity="0.85" class="leaf-sway" style="animation-delay: -${(i*0.3).toFixed(1)}s;"/>`;
            });
        } else {
            // Healthy tree: 23 lush green leaves
            const leafCoords = [
                // Top cluster
                {x: 50, y: 44, r: 8}, {x: 46, y: 40, r: 9}, {x: 54, y: 39, r: 8.5},
                {x: 49, y: 35, r: 7.5}, {x: 42, y: 37, r: 7}, {x: 58, y: 36, r: 7.5},
                // Left cluster
                {x: 38, y: 52, r: 7}, {x: 34, y: 49, r: 8}, {x: 30, y: 48, r: 6.5},
                {x: 35, y: 44, r: 7.5}, {x: 40, y: 46, r: 8}, {x: 32, y: 53, r: 5},
                // Right cluster
                {x: 64, y: 45, r: 7.5}, {x: 68, y: 42, r: 7.5}, {x: 72, y: 43, r: 6},
                {x: 61, y: 40, r: 8}, {x: 66, y: 48, r: 6.5}, {x: 70, y: 49, r: 5},
                // Fillers & center
                {x: 48, y: 48, r: 9}, {x: 53, y: 49, r: 9}, {x: 44, y: 44, r: 8.5},
                {x: 56, y: 43, r: 8.5}, {x: 50, y: 49, r: 9.5}
            ];
            leafCoords.forEach((c, i) => {
                // Vibrant greens
                const leafColor = i % 4 === 0 ? '#10b981' : i % 4 === 1 ? '#059669' : i % 4 === 2 ? '#34d399' : '#047857';
                leavesHtml += `<circle cx="${c.x}" cy="${c.y}" r="${c.r}" fill="${leafColor}" opacity="0.9" class="leaf-sway" style="animation-delay: -${(i*0.25).toFixed(1)}s;"/>`;
            });

            // If active savings, add colorful pink blossoms!
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
                        <g class="wind-sway" style="animation-duration: ${4 + j}s; transform-origin: ${coord.x}px ${coord.y}px;">
                            <!-- Flower blossom -->
                            <circle cx="${coord.x}" cy="${coord.y}" r="2" fill="#ec4899" opacity="0.95"/>
                            <circle cx="${coord.x - 1.5}" cy="${coord.y}" r="1.2" fill="#f472b6" opacity="0.9"/>
                            <circle cx="${coord.x + 1.5}" cy="${coord.y}" r="1.2" fill="#f472b6" opacity="0.9"/>
                            <circle cx="${coord.x}" cy="${coord.y - 1.5}" r="1.2" fill="#f472b6" opacity="0.9"/>
                            <circle cx="${coord.x}" cy="${coord.y + 1.5}" r="1.2" fill="#f472b6" opacity="0.9"/>
                            <!-- Flower center -->
                            <circle cx="${coord.x}" cy="${coord.y}" r="0.6" fill="#fbbf24"/>
                        </g>
                    `;
                }
            }
        }

        // Ground / Grass
        let groundHtml = '';
        if (state === 'polluted') {
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
            // Healthy: beautiful green hills
            groundHtml = `
                <!-- Hill Back -->
                <path d="M0 82 Q30 76 60 81 Q80 84 100 81 L100 100 L0 100 Z" fill="#047857" opacity="0.5"/>
                <!-- Hill Front -->
                <path d="M0 80 Q40 83 70 79 Q85 77 100 80 L100 100 L0 100 Z" fill="#10b981"/>
                <!-- Little flowers on ground -->
                <circle cx="20" cy="85" r="1" fill="#ec4899"/>
                <circle cx="20" cy="85" r="0.4" fill="#fbbf24"/>
                <circle cx="75" cy="83" r="0.8" fill="#f59e0b"/>
                <circle cx="83" cy="86" r="1.2" fill="#ffffff"/>
                <circle cx="83" cy="86" r="0.4" fill="#fbbf24"/>
            `;
        }

        // Complete SVG
        const svgString = `
            <svg viewBox="0 0 100 100" class="garden-svg-container">
                <defs>
                    ${skyGradient}
                </defs>
                <!-- Sky -->
                <rect x="0" y="0" width="100" height="100" fill="url(#skyGrad)"/>
                <!-- Sun -->
                ${sunHtml}
                <!-- Clouds -->
                ${cloudsHtml}
                <!-- Birds -->
                ${birdsHtml}
                <!-- Ground -->
                ${groundHtml}
                <!-- Trunk -->
                ${treeTrunk}
                <!-- Leaves -->
                ${leavesHtml}
            </svg>
        `;

        container.innerHTML = svgString;

        // Update status text dynamically
        const statusEl = document.getElementById('carbon-garden-status');
        if (statusEl) {
            const statusText = statusEl.querySelector('.garden-status-text');
            if (statusText) {
                if (state === 'polluted') {
                    statusText.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--color-orange); margin-right:6px;"></i> Garden is dry & polluted (${total.toFixed(1)}t CO₂e). Cut emissions to revive it!`;
                } else if (state === 'warning') {
                    statusText.innerHTML = `<i class="fa-solid fa-cloud" style="color:var(--color-yellow); margin-right:6px;"></i> Garden is recovering. Commit to more actions to make it lush.`;
                } else {
                    if (savingsPct > 0) {
                        statusText.innerHTML = `<i class="fa-solid fa-face-smile" style="color:var(--color-green); margin-right:6px;"></i> Thriving garden! Your ${savingsPct}% reduction has unlocked flower blossoms!`;
                    } else {
                        statusText.innerHTML = `<i class="fa-solid fa-tree" style="color:var(--color-green); margin-right:6px;"></i> Healthy garden! Commit to reduction actions to grow flowers.`;
                    }
                }
            }
        }
    }
};

window.CO2nserveCharts = CO2nserveCharts;
