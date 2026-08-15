/* global Chart, allLabs, getObjectValue, t, displayCanonicalMarker, dateLocale */
// Lab Charts - Chart.js visualizations for lab trends
// Language helpers (t, displayCanonicalMarker, dateLocale) come from labs-parser.js,
// which labs.html loads first.

let trendChart = null;
let comparisonChart = null;
let listenersInitialized = false;

// Marker aliases - maps different names to a canonical name
// Format: { 'Canonical Name': ['alias1', 'alias2', ...] }
const markerAliases = {
    // Blood counts - Basic
    'Hemoglobina': ['Hemoglobin', 'Hgb', 'HGB', 'Hemoglobina', 'HEMOGLOBIN'],
    'Hematócrito': ['Hematocrit', 'Hct', 'HCT', 'Hematócrito', 'HEMATOCRIT'],
    'Leucócitos': ['WBC', 'White Blood Cells', 'White Blood Cell Count', 'Leucócitos', 'Leukocytes', 'WBCs', 'WHITE BLOOD CELLS'],
    'Hemácias': ['RBC', 'Red Blood Cells', 'Red Blood Cell Count', 'Hemácias', 'Eritrócitos', 'RED BLOOD CELLS'],
    'Plaquetas': ['Platelets', 'Platelet Count', 'PLT', 'Plaquetas', 'PLATELETS', 'PLATELET COUNT', 'PLATELET', 'Platelet', 'WBCs Platelet Count'],
    'VCM': ['MCV', 'Mean Corpuscular Volume', 'VCM'],
    'HCM': ['MCH', 'Mean Corpuscular Hemoglobin', 'HCM'],
    'CHCM': ['MCHC', 'Mean Corpuscular Hemoglobin Concentration', 'CHCM'],
    'RDW': ['RDW', 'Red Cell Distribution Width', 'RDW-CV', 'RDW-SD'],
    'VPM': ['MPV', 'Mean Platelet Volume', 'VPM'],

    // Blood counts - Differential (Relative %)
    'Neutrófilos': ['Neutrophils', 'Neutrophils Relative', 'Neutrófilos', '% NEUTROPHIL - AUTOMATED COUNT'],
    'Linfócitos': ['Lymphocytes', 'Lymphocytes Relative', 'Linfócitos', '% LYMPHOCYTE - AUTOMATED COUNT'],
    'Monócitos': ['Monocytes', 'Monocytes Relative', 'Monócitos', '% MONOCYTE - AUTOMATED COUNT'],
    'Eosinófilos': ['Eosinophils', 'Eosinophils Relative', 'Eosinófilos', '% EOSINOPHIL - AUTOMATED COUNT'],
    'Basófilos': ['Basophils', 'Basophils Relative', 'Basófilos', '% BASOPHIL - AUTOMATED COUNT'],

    // Blood counts - Differential (Absolute)
    'Neutrófilos Absolutos': ['Neutrophils Absolute', 'Absolute neutrophils', 'Abs. Neutrophil', 'ABSOLUTE NEUTROPHIL - AUTOMATED COUNT', 'Neutrófilos Absolutos'],
    'Linfócitos Absolutos': ['Lymphocytes Absolute', 'Absolute lymphocytes', 'ABSOLUTE LYMPHOCYTE - AUTOMATED COUNT', 'Linfócitos Absolutos'],
    'Monócitos Absolutos': ['Monocytes Absolute', 'Absolute monocytes', 'Abs. Monocyte', 'ABSOLUTE MONOCYTE - AUTOMATED COUNT', 'Monócitos Absolutos'],
    'Eosinófilos Absolutos': ['Eosinophils Absolute', 'Absolute eosinophils', 'ABSOLUTE EOSINOPHIL - AUTOMATED COUNT', 'Eosinófilos Absolutos'],
    'Basófilos Absolutos': ['Basophils Absolute', 'Absolute basophils', 'Abs. Basophil', 'ABSOLUTE BASOPHIL - AUTOMATED COUNT', 'Basófilos Absolutos'],
    'Granulócitos Imaturos': ['Immature Granulocytes', 'Absolute Immature Granulocytes', 'Absolute Immature', 'Granulócitos Imaturos', 'ABSOLUTE IMMATURE GRANULOCYTES'],
    // kept separate from the absolute count above so both can be charted
    'Granulócitos Imaturos %': ['% IMMATURE GRANULOCYTES', 'Immature Granulocytes Relative', 'Granulócitos Imaturos %'],
    'Fração Plaquetas Imaturas': ['Immature Platelet Fraction', 'Abs. Immature Platelet Fraction', 'Fração Plaquetas Imaturas'],
    'Hemácias Nucleadas': ['Nucleated RBCS', 'Nucleated RBCs', 'Hemácias Nucleadas', "NUCLEATED RBC'S - AUTOMATED COUNT", 'NUCLEATED RBCS - AUTOMATED COUNT'],

    // Metabolic panel
    'Glicose': ['Glucose', 'Glicose', 'Blood Glucose', 'Fasting Glucose', 'GLUCOSE'],
    'Sódio': ['Sodium', 'Na', 'Sódio', 'SODIUM'],
    'Potássio': ['Potassium', 'K', 'Potássio', 'POTASSIUM'],
    'Cloreto': ['Chloride', 'Cl', 'Cloreto', 'CHLORIDE'],
    'CO2': ['CO2', 'Carbon Dioxide', 'Bicarbonate', 'HCO3', 'CO2 CONTENT', 'CO2 Content'],
    'Creatinina': ['Creatinine', 'Creatinina', 'Creat', 'CREATININE'],
    'Ureia': ['BUN', 'Blood Urea Nitrogen', 'Ureia', 'Urea', 'BLOOD UREA NITROGEN', 'Blood Urea Nitrogen (BUN)'],
    'Cálcio': ['Calcium', 'Ca', 'Cálcio', 'CALCIUM'],
    'Ânion Gap': ['Anion Gap', 'Anion gap', 'ANION GAP', 'Ânion Gap'],
    'Relação BUN/Creatinina': ['BUN/Creatinine Ratio', 'BUN/Creat Ratio', 'Relação BUN/Creatinina'],
    // the "RATE, CKD-" variant is a wrapped line that loses its "EPI" suffix
    'eGFR': ['eGFR', 'Estimated GFR', 'GFR', 'ESTIMATED GLOMERULAR FILTRATION', 'Estimated Glomerular Filtration', 'ESTIMATED GLOMERULAR FILTRATION RATE, CKD-EPI', 'ESTIMATED GLOMERULAR FILTRATION RATE, CKD-'],

    // Liver
    'AST': ['AST', 'SGOT', 'AST (SGOT)', 'Aspartate Aminotransferase'],
    'ALT': ['ALT', 'SGPT', 'ALT (SGPT)', 'Alanine Aminotransferase'],
    'Bilirrubina Total': ['Total Bilirubin', 'Bilirubin', 'Bilirrubina Total', 'Bilirrubina', 'BILIRUBIN, TOTAL', 'Bilirubin, Total', 'Bilirubin (total)'],
    'Bilirrubina Direta': ['Bilirubin (direct)', 'Direct Bilirubin', 'Bilirrubina Direta'],
    'Fosfatase Alcalina': ['Alkaline Phosphatase', 'ALP', 'Alk Phos', 'Alk phos', 'ALK PHOS', 'Fosfatase Alcalina'],
    'Gama GT': ['GGT', 'GGTP', 'Gamma GT', 'GAMMA GT', 'Gama GT', 'GAMMA GLUTAMYL TRANSPEP', 'Gamma Glutamyl Transpeptidase', 'Gamma-Glutamyl Transferase'],

    // Proteins
    'Proteína Total': ['Total Protein', 'Proteína Total', 'Protein', 'TOTAL PROTEIN', 'Total protein'],
    'Albumina': ['Albumin', 'Albumina', 'Alb', 'ALBUMIN', 'ALBUMI N'],
    'Globulina': ['Globulin', 'Globulina'],
    'Relação Albumina/Globulina': ['Albumin/Globulin Ratio', 'A/G Ratio', 'Relação Albumina/Globulina'],
    'Pré-albumina': ['Prealbumin', 'PREALBUMIN', 'Pré-albumina', 'Prealbumina'],

    // Lipids
    'Colesterol Total': ['Total Cholesterol', 'Cholesterol', 'Colesterol Total', 'Colesterol', 'CHOLESTEROL', 'TOTAL CHOLESTEROL', 'CHOLESTEROL, SERUM OR PLASMA'],
    'HDL': ['HDL', 'HDL Cholesterol', 'HDL-C', 'HDL CHOLESTEROL'],
    'LDL': ['LDL', 'LDL Cholesterol', 'LDL-C', 'LDL Calculated', 'LDL CHOLESTEROL', 'LDL CALCULATED', 'LDL, CALCULATED', 'LDL CHOLESTEROL, DIRECT', 'Calculated LDL'],
    'VLDL': ['VLDL', 'VLDL Cholesterol', 'VLDL Cholesterol Calculated', 'VLDL, CALCULATED', 'VLDL-C', 'Calculated VLDL2'],
    'Triglicerídeos': ['Triglycerides', 'Triglicerídeos', 'TG', 'Trig', 'TRIGLYCERIDES', 'TRIGLYCERIDE', 'TRIGLYCERIDES, SERUM OR PLASMA'],
    'Colesterol não-HDL': ['Non HDL Cholesterol', 'Non-HDL Cholesterol', 'Colesterol não-HDL'],
    'Relação Colesterol/HDL': ['Chol/HDL Ratio', 'Chol/HDL ratio', 'Cholesterol/HDL Ratio', 'Calculated LDL/HDL ratio', 'Relação Colesterol/HDL'],

    // Thyroid
    'TSH': ['TSH', 'Thyroid Stimulating Hormone', 'TSH Ultrassensível', 'TSH Ultrasensitive', 'Ultra TSH', 'TSH W/FT4 REFLEX', 'TSH W/ FT4 REFLEX', 'TSH W/FT4 Reflex'],
    'T3 Livre': ['Free T3', 'T3 Free', 'T3 Livre', 'FT3', 'T3 (Triiodothyronine), Free'],
    'T4 Livre': ['Free T4', 'T4 Free', 'T4 Livre', 'FT4', 'Thyroxine Free', 'T4 (Thyroxine), Free'],

    // Iron
    'Ferro': ['Iron', 'Ferro', 'Fe', 'Serum Iron', 'IRON', 'Iron, Total'],
    'Ferritina': ['Ferritin', 'Ferritina', 'FERRITIN'],
    'TIBC': ['TIBC', 'Total Iron Binding Capacity', 'Capacidade de Ligação', 'TOTAL IRON BINDING CAPACITY', 'Total Iron Binding Capacity (TIBC)'],
    'Transferrina': ['Transferrin', 'TRANSFERRIN', 'Transferrina'],
    'Saturação de Ferro': ['Iron Saturation', 'Unbound Iron Binding Capacity (IBC) Iron Saturation', 'Saturação de Ferro', '% TRANSFERRIN SATURATION', 'TRANSFERRIN SATURATION', 'Transferrin Saturation'],

    // Vitamins
    'Vitamina D': ['Vitamin D', 'Vitamina D', '25-OH Vitamin D', '25-Hydroxyvitamin D', 'Vit D', 'Vitamin D, 25 hydroxy', 'VITAMIN D, 25 HYDROXY', '25-OH Vitamin D, Total', 'VITAMIN D (25OH)'],
    'Vitamina B12': ['Vitamin B12', 'B12', 'Vitamina B12', 'Cobalamin', 'VITAMIN B12', 'Vitamin B12 level'],
    'Vitamina B6': ['Vitamin B6', 'VITAMIN B6 (PYRIDOXAL 5-PHOSPHATE)', 'Pyridoxal 5-Phosphate', 'Vitamina B6'],
    'Vitamina B1': ['Thiamin (Vitamin B1), Whole Blood', 'Thiamine', 'Vitamin B1', 'Vitamina B1', 'Tiamina'],
    'Folato': ['Folate', 'Folato', 'Folic Acid', 'FOLATE'],
    'Vitamina C': ['Vitamin C', 'Vitamina C', 'Ascorbic Acid', 'VITAMIN C', 'Vitamin C, Plasma', 'VITAMIN C, PLASMA'],
    'Vitamina E (Alpha)': ['Vitamin E (Alpha-tocopherol)', 'VITAMIN E (ALPHA-TOCOPHEROL)', 'Vitamin E Alpha', 'Alpha Tocopherol'],
    'Vitamina E (Gamma)': ['Vitamin E (Gamma Tocopherol)', 'VITAMIN E (GAMMA-TOCOPHEROL)', 'Vitamin E Gamma', 'Gamma Tocopherol'],
    'Vitamina K1': ['Vitamin K1', 'VITAMIN K1', 'Vitamina K1', 'Phylloquinone'],
    'Vitamina A': ['Vitamin A', 'VITAMIN A', 'Vitamina A', 'Retinol', 'VITAMIN A (RETINOL)'],

    // Diabetes
    'Hemoglobina A1C': ['A1C', 'Hemoglobin A1C', 'Hemoglobin A1c', 'HbA1c', 'Glycated Hemoglobin', 'Hemoglobina Glicada', 'GLYCOSYLATED HGB'],
    'Glicose Média Estimada': ['Estimated average glucose', 'eAG', 'Glicose Média Estimada'],

    // Inflammation
    'PCR': ['CRP', 'C-Reactive Protein', 'PCR', 'hs-CRP', 'CRP (C-Reactive Protein)'],
    'PCR Alta Sensibilidade': ['HIGH SENSITIVE CRP', 'hs-CRP', 'High Sensitivity CRP', 'PCR Alta Sensibilidade'],

    // Other
    'PTH': ['PTH', 'Parathyroid Hormone', 'PTH Intacto', 'PTH, Intact'],
};

// Get all aliases for a marker (including the marker itself) - case insensitive
function getMarkerAliases(marker) {
    const markerLower = marker.toLowerCase();

    // Check if marker is a canonical name (case insensitive)
    for (const [canonical, aliases] of Object.entries(markerAliases)) {
        if (canonical.toLowerCase() === markerLower) {
            return [canonical, ...aliases];
        }
    }

    // Check if marker is an alias (case insensitive)
    for (const [canonical, aliases] of Object.entries(markerAliases)) {
        if (aliases.some(a => a.toLowerCase() === markerLower)) {
            return [canonical, ...aliases];
        }
    }

    // No aliases found, return the marker in different cases to catch variations
    return [marker, marker.toUpperCase(), marker.toLowerCase()];
}

// Normalize marker name to canonical form - case insensitive
function normalizeMarkerName(marker) {
    const markerLower = marker.toLowerCase();

    // Check if it's a canonical name (case insensitive)
    for (const [canonical, aliases] of Object.entries(markerAliases)) {
        if (canonical.toLowerCase() === markerLower) {
            return canonical;
        }
    }

    // Check if it's an alias (case insensitive)
    for (const [canonical, aliases] of Object.entries(markerAliases)) {
        if (aliases.some(a => a.toLowerCase() === markerLower)) {
            return canonical;
        }
    }

    // No match, return as-is with Title Case
    return marker;
}

// Initialize chart event listeners (only once)
function initializeChartListeners() {
    if (listenersInitialized) return;

    // Initialize charts when tab is clicked
    document.getElementById('charts-tab')?.addEventListener('click', function() {
        setTimeout(() => initializeTrendChart(), 100);
    });

    document.getElementById('comparison-tab')?.addEventListener('click', function() {
        setTimeout(() => initializeComparisonChart(), 100);
    });

    // Update charts when marker or timerange changes
    document.getElementById('chart-marker')?.addEventListener('change', initializeTrendChart);
    document.getElementById('chart-timerange')?.addEventListener('change', initializeTrendChart);

    listenersInitialized = true;
    console.log('📊 Chart listeners initialized');
}

// Call initialization after DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChartListeners);
} else {
    initializeChartListeners();
}

// Initialize trend chart
function initializeTrendChart() {
    const markerSelect = document.getElementById('chart-marker');
    const marker = markerSelect?.value;

    if (!marker || marker === '') {
        console.log('⚠️ Nenhum marcador selecionado ainda');
        return;
    }

    const timerange = document.getElementById('chart-timerange')?.value || 'all';

    const data = prepareChartData(marker, timerange);

    if (!data || data.values.length === 0) {
        console.log('⚠️ Nenhum dado encontrado para o marcador:', marker);
        return;
    }

    if (trendChart) {
        trendChart.destroy();
    }

    const ctx = document.getElementById('trend-chart');
    if (!ctx) return;

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: t(`Níveis de ${displayCanonicalMarker(marker)}`,
                         `${displayCanonicalMarker(marker)} levels`),
                data: data.values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: data.colors,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: t(`Tendência de ${displayCanonicalMarker(marker)} ao Longo do Tempo`,
                            `${displayCanonicalMarker(marker)} Trend Over Time`),
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y;
                            label += ' ' + (data.unit || '');
                            const pointStatus = Array.isArray(data.statuses) ? data.statuses.at(context.dataIndex) : null;
                            if (pointStatus) {
                                label += ` (${pointStatus})`;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: data.unit || displayCanonicalMarker(marker)
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: t('Data', 'Date')
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Prepare chart data from labs
function prepareChartData(marker, timerange) {
    console.log(`📊 Preparando dados do gráfico para ${marker} (timerange: ${timerange})`);

    const dataPoints = [];

    // Get all aliases for this marker
    const aliases = getMarkerAliases(marker);
    console.log(`🔍 Buscando aliases: ${aliases.join(', ')}`);

    // Collect data from all labs, checking all aliases (case insensitive)
    allLabs.forEach(lab => {
        // Find marker data using any of the aliases (case insensitive)
        let markerData = null;
        let foundAlias = null;

        // First try exact match
        for (const alias of aliases) {
            const value = getObjectValue(lab.values, alias);
            if (value) {
                markerData = value;
                foundAlias = alias;
                break;
            }
        }

        // If not found, try case-insensitive match
        if (!markerData) {
            const labValueKeys = Object.keys(lab.values);
            for (const alias of aliases) {
                const aliasLower = alias.toLowerCase();
                const matchingKey = labValueKeys.find(k => k.toLowerCase() === aliasLower);
                if (matchingKey) {
                    markerData = getObjectValue(lab.values, matchingKey);
                    foundAlias = matchingKey;
                    break;
                }
            }
        }

        if (!markerData) return;

        if (lab.isPeriodLab) {
            // Period lab has multiple data points
            if (markerData.dataPoints) {
                markerData.dataPoints.forEach(dp => {
                    dataPoints.push({
                        date: dp.date,
                        value: dp.value,
                        status: dp.status,
                        unit: markerData.unit,
                        source: foundAlias
                    });
                });
            }
        } else {
            // Single date lab
            if (lab.collectionDate) {
                dataPoints.push({
                    date: lab.collectionDate,
                    value: markerData.value,
                    status: markerData.status,
                    unit: markerData.unit,
                    source: foundAlias
                });
            }
        }
    });

    console.log(`📈 ${dataPoints.length} pontos de dados coletados para ${marker}`);

    // Helper to convert any date format to Date object
    const toDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) return d;
        if (typeof d === 'string') return new Date(d);
        if (typeof d === 'number') return new Date(d);
        if (d.seconds) return new Date(d.seconds * 1000); // Firestore Timestamp
        return null;
    };

    // Convert all dates to Date objects
    dataPoints.forEach(dp => {
        dp.date = toDate(dp.date);
    });

    // Filter out invalid dates and filter by timerange
    const now = new Date();
    const filteredPoints = dataPoints.filter(dp => {
        if (!dp.date || isNaN(dp.date.getTime())) return false;
        if (timerange === 'all') return true;
        if (timerange === 'recent') return dp.date >= new Date('2023-01-01');
        if (timerange === 'baseline') return dp.date < new Date('2023-01-01');
        return true;
    });

    // Sort by date
    filteredPoints.sort((a, b) => a.date - b.date);

    // Prepare chart data
    const labels = filteredPoints.map(dp => dp.date.toLocaleDateString(dateLocale()));
    const values = filteredPoints.map(dp => dp.value);
    const statuses = filteredPoints.map(dp => dp.status);
    const colors = filteredPoints.map(dp => {
        if (dp.status === 'high') return '#f44336';
        if (dp.status === 'low') return '#ff9800';
        return '#4CAF50';
    });
    const unit = filteredPoints[0]?.unit || '';

    console.log(`✅ Gráfico preparado com ${filteredPoints.length} pontos`);

    return { labels, values, statuses, colors, unit };
}

// Initialize before/after comparison chart
function initializeComparisonChart() {
    const comparisonData = prepareComparisonData();

    if (comparisonChart) {
        comparisonChart.destroy();
    }

    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: comparisonData.labels,
            datasets: [
                {
                    label: t('Média Pré-Dieta (2018-2022)', 'Pre-Diet Average (2018-2022)'),
                    data: comparisonData.preDiet,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: '#667eea',
                    borderWidth: 2
                },
                {
                    label: t('Média Pós-Dieta (2023-2025)', 'Post-Diet Average (2023-2025)'),
                    data: comparisonData.postDiet,
                    backgroundColor: 'rgba(76, 175, 80, 0.6)',
                    borderColor: '#4CAF50',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: t('Comparação Pré-Dieta vs Pós-Dieta', 'Pre-Diet vs Post-Diet Comparison'),
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y.toFixed(1);
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Valor'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Marcador'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Prepare before/after comparison data
function prepareComparisonData() {
    // Use Portuguese canonical names
    const markers = ['Glicose', 'Hemoglobina', 'Leucócitos', 'Sódio', 'Potássio', 'Creatinina'];
    const preDietCutoff = new Date('2023-01-01');

    const preDiet = [];
    const postDiet = [];

    markers.forEach(marker => {
        const preValues = [];
        const postValues = [];

        // Get all aliases for this marker
        const aliases = getMarkerAliases(marker);

        allLabs.forEach(lab => {
            // Find marker data using any alias (case insensitive)
            let markerData = null;

            // First try exact match
            for (const alias of aliases) {
                const value = getObjectValue(lab.values, alias);
                if (value) {
                    markerData = value;
                    break;
                }
            }

            // If not found, try case-insensitive match
            if (!markerData) {
                const labValueKeys = Object.keys(lab.values);
                for (const alias of aliases) {
                    const aliasLower = alias.toLowerCase();
                    const matchingKey = labValueKeys.find(k => k.toLowerCase() === aliasLower);
                    if (matchingKey) {
                        markerData = getObjectValue(lab.values, matchingKey);
                        break;
                    }
                }
            }

            if (!markerData) return;

            // Helper to convert any date format to Date object
            const toDate = (d) => {
                if (!d) return null;
                if (d instanceof Date) return d;
                if (typeof d === 'string') return new Date(d);
                if (typeof d === 'number') return new Date(d);
                if (d.seconds) return new Date(d.seconds * 1000); // Firestore Timestamp
                return null;
            };

            if (lab.isPeriodLab) {
                if (markerData.dataPoints) {
                    markerData.dataPoints.forEach(dp => {
                        const dpDate = toDate(dp.date);
                        if (!dpDate || isNaN(dpDate.getTime())) return;
                        if (dpDate < preDietCutoff) {
                            preValues.push(dp.value);
                        } else {
                            postValues.push(dp.value);
                        }
                    });
                }
            } else {
                const labDate = toDate(lab.collectionDate);
                if (labDate && !isNaN(labDate.getTime())) {
                    if (labDate < preDietCutoff) {
                        preValues.push(markerData.value);
                    } else {
                        postValues.push(markerData.value);
                    }
                }
            }
        });

        // Calculate averages
        const preAvg = preValues.length > 0 ?
            preValues.reduce((a, b) => a + b, 0) / preValues.length : 0;
        const postAvg = postValues.length > 0 ?
            postValues.reduce((a, b) => a + b, 0) / postValues.length : 0;

        preDiet.push(preAvg);
        postDiet.push(postAvg);
    });

    return {
        labels: markers,
        preDiet: preDiet,
        postDiet: postDiet
    };
}
