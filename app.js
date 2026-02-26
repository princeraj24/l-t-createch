document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page-content');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const targetPage = item.getAttribute('data-page');
            pages.forEach(p => {
                if (p.id === 'page-' + targetPage) {
                    p.classList.remove('hidden');
                } else {
                    p.classList.add('hidden');
                }
            });
        });
    });

    // --- Premium Logic: Readiness Simulation ---
    function calculateReadiness(daysSincePour) {
        const CURING_TARGET = 7;
        if (daysSincePour >= CURING_TARGET) return 100.0;

        // Non-linear curing curve (simulating concrete strength gain)
        return (daysSincePour * daysSincePour) / (CURING_TARGET * CURING_TARGET) * 100;
    }

    // --- Render Lifecycle Timeline ---
    function renderTimeline() {
        const timelineEl = document.getElementById('lifecycle-timeline');
        if (!timelineEl) return;

        const events = [
            { day: 1, title: "Level 1 Pour Executed", desc: "Initiating curing sequence." },
            { day: 3, title: "Initial Set Verified", desc: "Non-structural stripping." },
            { day: 5, title: "Pre-curing Phase", desc: "Maintaining moisture levels." },
            { day: 7, title: "Material Shift Actionable", desc: "Target strength achieved." },
            { day: 8, title: "Deployed to Level 2", desc: "Active in-situ." }
        ];

        timelineEl.innerHTML = events.map(evt => {
            const readiness = calculateReadiness(evt.day);
            const status = (readiness >= 100.0) ? "READY FOR SHIFT / ACTIVE" : "CURING...";
            const isActionable = evt.day === 7;
            const isComplete = readiness >= 100.0;

            return `
                <div class="timeline-item ${isActionable ? 'ready' : ''}">
                    <div class="timeline-date">DAY ${evt.day < 10 ? '0' + evt.day : evt.day}</div>
                    <div class="timeline-title">${evt.title}</div>
                    <div class="text-muted" style="font-size: 0.85rem; margin-bottom: 4px;">${evt.desc}</div>
                    <div class="timeline-status mono-text" style="font-size: 0.75rem; color: ${isComplete ? 'var(--success)' : 'var(--warning)'}; font-weight: 500;">
                        > [${readiness.toFixed(1)}% STR] - ${status}
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- Render Custom Inventory Heatmap ---
    function renderHeatmap() {
        const heatmapEl = document.getElementById('inventory-heatmap');
        if (!heatmapEl) return;

        const data = [
            { label: 'LVL 1', red: 0, green: 100, yellow: 0 },
            { label: 'LVL 2', red: 0, green: 80, yellow: 20 },
            { label: 'LVL 3', red: 90, green: 10, yellow: 0 },
            { label: 'LVL 4', red: 100, green: 0, yellow: 0 },
            { label: 'LVL 5', red: 20, green: 0, yellow: 80 },
            { label: 'LVL 6', red: 0, green: 0, yellow: 100 }
        ];

        heatmapEl.innerHTML = data.map(col => `
            <div class="heatmap-col">
                <div class="bar-container">
                    <div class="bar-fill bg-yellow-grad" style="height: ${col.yellow}%"></div>
                    <div class="bar-fill bg-green-grad shimmer" style="height: ${col.green}%"></div>
                    <div class="bar-fill bg-red-grad" style="height: ${col.red}%"></div>
                </div>
                <label>${col.label}</label>
            </div>
        `).join('');
    }

    // Initialize UI Elements
    renderTimeline();
    renderHeatmap();


    // --- Kitting Optimization Logic (Greedy Best-Fit) ---
    const kittingForm = document.getElementById('kitting-form');
    let currentBoQData = [];

    kittingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const floorArea = parseFloat(document.getElementById('floor-area').value);
        const wallHeight = parseFloat(document.getElementById('wall-height').value);

        if (!floorArea || !wallHeight) return;

        // Execute C++ logic converted algorithm
        const { boq, gap, perimeter, layers } = calculateKitting(floorArea, wallHeight);
        currentBoQData = boq;

        // Warning logic
        const gapAlert = document.getElementById('gap-alert');
        if (gap > 50) {
            document.getElementById('gap-val').textContent = gap.toFixed(1);
            gapAlert.classList.remove('hidden');
        } else {
            gapAlert.classList.add('hidden');
        }

        // Render Visualizer
        render2DVisualizer(perimeter, layers);

        // Show BoQ Wrapper
        document.getElementById('kitting-results').classList.remove('hidden');

        // Render Table with Bloomberg Flicker Effect
        renderBoQTable(currentBoQData, true);

        // Optional alert
        // alert(`Logic Simulation Complete. Calculated Area: ${floorArea}sqm.`);
    });

    function calculateKitting(area, height) {
        // C++ translation: Greedy Best-Fit Algorithm
        const P_WIDTH = 600; // Primary: 600mm
        const S_WIDTH = 300; // Secondary: 300mm
        const P_HEIGHT = 1200; // 1200mm panels

        const perimeterMm = Math.sqrt(area) * 4 * 1000;
        const layers = Math.ceil((height * 1000) / P_HEIGHT);

        let currentLength = 0;
        let pCount = 0;
        let sCount = 0;

        // Greedy fit largest panels
        while (currentLength + P_WIDTH <= perimeterMm) {
            pCount++;
            currentLength += P_WIDTH;
        }

        // Fit smaller panels
        while (currentLength + S_WIDTH <= perimeterMm) {
            sCount++;
            currentLength += S_WIDTH;
        }

        const gapMm = perimeterMm - currentLength;

        // Finalize per layer
        const opt600 = pCount * layers;
        const opt300 = sCount * layers;

        // Manual estimator typically over-orders standard sizes by +15-20% 
        // and doesn't calculate exact seam fits.
        const manual600 = Math.ceil((perimeterMm / 1000 / 0.6) * layers * 1.15);
        const manual300 = Math.ceil(manual600 * 0.1); // Random guess ratio often used manually

        const optPins = (opt600 + opt300) * 4;
        const manualPins = Math.ceil(optPins * 1.4); // Huge manual wastage

        const boqArr = [
            { id: 'LT-FW-600', desc: 'Standard Obs. Wall Panel', size: '600x1200', manual: manual600, opt: opt600 },
            { id: 'LT-FW-300', desc: 'Precise Filler Panel', size: '300x1200', manual: manual300, opt: opt300 },
            { id: 'LT-AC-PIN', desc: 'High-Tensile Pins', size: 'Standard', manual: manualPins, opt: optPins },
            { id: 'LT-AC-WDG', desc: 'Pressure Wedges', size: 'Standard', manual: manualPins, opt: optPins },
            { id: 'LT-SP-100', desc: 'Slab Shoring Prop', size: '2.5m - 4.0m', manual: Math.ceil(area / 1.5), opt: Math.ceil(area / 1.8) }
        ];

        return { boq: boqArr, gap: gapMm, perimeter: perimeterMm, layers };
    }

    function render2DVisualizer(perimeterMm, layers) {
        const wrapper = document.getElementById('panel-visualizer');
        const grid = document.getElementById('visualizer-grid');
        const placeholder = wrapper.querySelector('.visualizer-placeholder');

        placeholder.classList.add('hidden');
        grid.classList.remove('hidden');

        // Max limit DOM nodes so browser doesn't crash on huge buildings - sample a 10m wall segment
        const wallSegmentMm = Math.min(perimeterMm, 12000);

        let visualizerHtml = '';

        // Draw layers from top to bottom
        for (let l = layers; l > 0; l--) {
            let rowHtml = `<div style="display: flex; gap: 2px; height: 35px; width: 100%; justify-content: center;">`;
            let drawLen = 0;

            while (drawLen + 600 <= wallSegmentMm) {
                rowHtml += `<div class="vis-panel vis-panel-600" title="600x1200 Panel">60</div>`;
                drawLen += 600;
            }
            while (drawLen + 300 <= wallSegmentMm) {
                rowHtml += `<div class="vis-panel vis-panel-300" title="300x1200 Panel">30</div>`;
                drawLen += 300;
            }

            rowHtml += `</div>`;
            visualizerHtml += rowHtml;
        }

        grid.innerHTML = `<div style="display: flex; flex-direction: column; gap: 2px; width: 100%; align-items: center;">${visualizerHtml}</div>`;
    }

    function renderBoQTable(data, triggerFlicker = false) {
        const tbody = document.getElementById('boq-table-body');
        if (!tbody) return;

        tbody.innerHTML = data.map((row, index) => {
            const saveQty = row.manual - row.opt;
            const savePct = row.manual > 0 ? ((saveQty / row.manual) * 100).toFixed(1) : 0;

            // Generate subtle anim delay to make it feel like "data streaming"
            const animDelay = triggerFlicker ? `animation-delay: ${index * 0.1}s;` : '';
            const flashClass = triggerFlicker ? 'flash-update' : '';

            return `
                <tr>
                    <td class="mono-text"><strong>${row.id}</strong></td>
                    <td>${row.desc}</td>
                    <td class="mono-text">${row.size}</td>
                    <td class="text-muted"><del>${row.manual}</del></td>
                    <td style="color: var(--primary); font-weight: bold; font-size: 1.1rem;" class="${flashClass}" style="${animDelay}">${row.opt}</td>
                    <td class="text-green uppercase" style="font-weight: 500;">
                        <i class="fas fa-caret-down"></i> ${saveQty} <span style="opacity:0.6;">(${savePct}%)</span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // --- Executive Report Logic ---
    const btnExportPdf = document.getElementById('btn-export-pdf');
    const loadingOverlay = document.getElementById('export-loading');

    if (btnExportPdf && loadingOverlay) {
        btnExportPdf.addEventListener('click', () => {
            if (!currentBoQData || currentBoQData.length === 0) {
                // If clicked from topbar without data
                return alert("Please run AI Optimization from the Kitting Tool first before extracting an Executive Report.");
            }

            // Show Premium Loading state
            loadingOverlay.classList.remove('hidden');

            // Simulate generation latency
            setTimeout(() => {
                generatePDF();
                loadingOverlay.classList.add('hidden');
            }, 1800);
        });
    }

    function generatePDF() {
        if (!window.jspdf) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Theme Styling Map
        doc.setFillColor(11, 14, 20);
        doc.rect(0, 0, 210, 297, 'F');

        // Header
        doc.setTextColor(255, 215, 0); // Gold
        doc.setFontSize(22);
        doc.text("L&T CREATECH", 14, 25);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text("EXECUTIVE BOQ ANALYSIS", 14, 34);

        doc.setFontSize(10);
        doc.setTextColor(150, 163, 175);
        doc.text(`DATE GENERATED: ${new Date().toLocaleDateString().toUpperCase()}`, 14, 42);

        doc.setDrawColor(255, 215, 0);
        doc.setLineWidth(0.5);
        doc.line(14, 46, 196, 46);

        // Map data for AutoTable plugin (if available) or manual print
        if (doc.autoTable) {
            const tableData = currentBoQData.map(r => [
                r.id,
                r.desc,
                r.size,
                r.manual.toString(),
                r.opt.toString(),
                `-${(r.manual - r.opt)} units`
            ]);

            doc.autoTable({
                startY: 55,
                head: [['ITEM CODE', 'DESCRIPTION', 'SIZE (mm)', 'MANUAL EST.', 'AI OPTIMIZED', 'DELTA SAVE']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [255, 215, 0], textColor: [11, 14, 20], fontStyle: 'bold' },
                bodyStyles: { fillColor: [20, 25, 30], textColor: [255, 255, 255], lineColor: [50, 50, 50] },
                alternateRowStyles: { fillColor: [30, 35, 45] }
            });
        }

        doc.save("LT_Createch_Executive_Report.pdf");
    }

    // Export CSV
    const btnExportExcel = document.getElementById('btn-export-excel');
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            if (!currentBoQData || !currentBoQData.length) return;

            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Item Code,Description,Size,Manual Estimate,AI Optimized,Net Savings (Units)\n";

            currentBoQData.forEach(row => {
                const savings = row.manual - row.opt;
                csvContent += `${row.id},${row.desc},${row.size},${row.manual},${row.opt},${savings}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "LT_Createch_Datagrid.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Search logic (Client side filtering)
    const searchInput = document.getElementById('boq-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = currentBoQData.filter(row =>
                row.id.toLowerCase().includes(term) ||
                row.desc.toLowerCase().includes(term)
            );
            renderBoQTable(filtered, false);
        });
    }

    // Simple sort toggles
    const headers = document.querySelectorAll('th[data-sort]');
    let sortAsc = true;

    headers.forEach(header => {
        header.addEventListener('click', () => {
            if (!currentBoQData || !currentBoQData.length) return;
            const sortKey = header.getAttribute('data-sort');

            currentBoQData.sort((a, b) => {
                let valA = a[sortKey];
                let valB = b[sortKey];

                if (sortKey === 'save') {
                    valA = a.manual - a.opt;
                    valB = b.manual - b.opt;
                }

                if (typeof valA === 'string') {
                    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                } else {
                    return sortAsc ? valA - valB : valB - valA;
                }
            });

            sortAsc = !sortAsc;
            renderBoQTable(currentBoQData, false);
        });
    });
});
