// Lab Charts - Chart.js visualizations for lab trends

let trendChart = null;
let comparisonChart = null;
let listenersInitialized = false;

// Marker aliases - maps different names to a canonical name
// Format: { 'Canonical Name': ['alias1', 'alias2', ...] }
const markerAliases = {
    // Blood counts
    'Hemoglobina': ['Hemoglobin', 'Hgb', 'HGB', 'Hemoglobina', 'HEMOGLOBIN'],
    'Hematócrito': ['Hematocrit', 'Hct', 'HCT', 'Hematócrito', 'HEMATOCRIT'],
    'Leucócitos': ['WBC', 'White Blood Cells', 'White Blood Cell Count', 'Leucócitos', 'Leukocytes', 'WBCs', 'WHITE BLOOD CELLS'],
    'Hemácias': ['RBC', 'Red Blood Cells', 'Red Blood Cell Count', 'Hemácias', 'Eritrócitos', 'RED BLOOD CELLS'],
    'Plaquetas': ['Platelets', 'Platelet Count', 'PLT', 'Plaquetas', 'PLATELETS', 'PLATELET COUNT', 'WBCs Platelet Count'],
    'MCV': ['MCV', 'Mean Corpuscular Volume', 'VCM'],
    'MCH': ['MCH', 'Mean Corpuscular Hemoglobin', 'HCM'],
    'MCHC': ['MCHC', 'Mean Corpuscular Hemoglobin Concentration', 'CHCM'],
    'RDW': ['RDW', 'Red Cell Distribution Width', 'RDW-CV'],

    // Metabolic panel
    'Glicose': ['Glucose', 'Glicose', 'Blood Glucose', 'Fasting Glucose'],
    'Sódio': ['Sodium', 'Na', 'Sódio'],
    'Potássio': ['Potassium', 'K', 'Potássio'],
    'Cloreto': ['Chloride', 'Cl', 'Cloreto'],
    'CO2': ['CO2', 'Carbon Dioxide', 'Bicarbonate', 'HCO3'],
    'Creatinina': ['Creatinine', 'Creatinina', 'Creat'],
    'Ureia': ['BUN', 'Blood Urea Nitrogen', 'Ureia', 'Urea'],
    'Cálcio': ['Calcium', 'Ca', 'Cálcio'],

    // Liver
    'AST': ['AST', 'SGOT', 'AST (SGOT)', 'Aspartate Aminotransferase'],
    'ALT': ['ALT', 'SGPT', 'ALT (SGPT)', 'Alanine Aminotransferase'],
    'Bilirrubina Total': ['Total Bilirubin', 'Bilirubin', 'Bilirrubina Total', 'Bilirrubina'],
    'Fosfatase Alcalina': ['Alkaline Phosphatase', 'ALP', 'Alk Phos', 'Fosfatase Alcalina'],

    // Proteins
    'Proteína Total': ['Total Protein', 'Proteína Total', 'Protein'],
    'Albumina': ['Albumin', 'Albumina', 'Alb'],
    'Globulina': ['Globulin', 'Globulina'],

    // Lipids
    'Colesterol Total': ['Total Cholesterol', 'Cholesterol', 'Colesterol Total', 'Colesterol', 'CHOLESTEROL', 'TOTAL CHOLESTEROL'],
    'HDL': ['HDL', 'HDL Cholesterol', 'HDL-C', 'HDL CHOLESTEROL'],
    'LDL': ['LDL', 'LDL Cholesterol', 'LDL-C', 'LDL Calculated', 'LDL CHOLESTEROL', 'LDL CALCULATED'],
    'VLDL': ['VLDL', 'VLDL Cholesterol', 'VLDL Cholesterol Calculated', 'VLDL, CALCULATED', 'VLDL-C'],
    'Triglicerídeos': ['Triglycerides', 'Triglicerídeos', 'TG', 'Trig', 'TRIGLYCERIDES'],

    // Thyroid
    'TSH': ['TSH', 'Thyroid Stimulating Hormone', 'TSH Ultrassensível'],
    'T3 Livre': ['Free T3', 'T3 Free', 'T3 Livre', 'FT3'],
    'T4 Livre': ['Free T4', 'T4 Free', 'T4 Livre', 'FT4', 'Thyroxine Free'],

    // Iron
    'Ferro': ['Iron', 'Ferro', 'Fe', 'Serum Iron'],
    'Ferritina': ['Ferritin', 'Ferritina'],
    'TIBC': ['TIBC', 'Total Iron Binding Capacity', 'Capacidade de Ligação'],

    // Vitamins
    'Vitamina D': ['Vitamin D', 'Vitamina D', '25-OH Vitamin D', '25-Hydroxyvitamin D', 'Vit D', 'Vitamin D, 25 hydroxy', 'VITAMIN D, 25 HYDROXY', '25-OH Vitamin D, Total'],
    'Vitamina B12': ['Vitamin B12', 'B12', 'Vitamina B12', 'Cobalamin', 'VITAMIN B12', 'Vitamin B12 level'],
    'Folato': ['Folate', 'Folato', 'Folic Acid', 'FOLATE'],
    'Vitamina C': ['Vitamin C', 'Vitamina C', 'Ascorbic Acid', 'VITAMIN C', 'Vitamin C, Plasma', 'VITAMIN C, PLASMA'],
    'Vitamina E (Alpha)': ['Vitamin E (Alpha-tocopherol)', 'VITAMIN E (ALPHA-TOCOPHEROL)', 'Vitamin E Alpha', 'Alpha Tocopherol'],
    'Vitamina E (Gamma)': ['Vitamin E (Gamma Tocopherol)', 'VITAMIN E (GAMMA-TOCOPHEROL)', 'Vitamin E Gamma', 'Gamma Tocopherol'],
    'Vitamina K1': ['Vitamin K1', 'VITAMIN K1', 'Vitamina K1', 'Phylloquinone'],
    'Vitamina A': ['Vitamin A', 'VITAMIN A', 'Vitamina A', 'Retinol'],

    // Other
    'A1C': ['A1C', 'Hemoglobin A1C', 'HbA1c', 'Glycated Hemoglobin', 'Hemoglobina Glicada'],
    'PCR': ['CRP', 'C-Reactive Protein', 'PCR', 'hs-CRP'],
    'eGFR': ['eGFR', 'Estimated GFR', 'GFR'],
    'PTH': ['PTH', 'Parathyroid Hormone', 'PTH Intacto'],
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
                label: `Níveis de ${marker}`,
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
                    text: `Tendência de ${marker} ao Longo do Tempo`,
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
                            if (data.statuses && data.statuses[context.dataIndex]) {
                                label += ` (${data.statuses[context.dataIndex]})`;
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
                        text: data.unit || marker
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Data'
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
            if (lab.values[alias]) {
                markerData = lab.values[alias];
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
                    markerData = lab.values[matchingKey];
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

    // Filter by timerange
    const now = new Date();
    const filteredPoints = dataPoints.filter(dp => {
        if (timerange === 'all') return true;
        if (timerange === 'recent') return dp.date >= new Date('2023-01-01');
        if (timerange === 'baseline') return dp.date < new Date('2023-01-01');
        return true;
    });

    // Sort by date
    filteredPoints.sort((a, b) => a.date - b.date);

    // Prepare chart data
    const labels = filteredPoints.map(dp => dp.date ? dp.date.toLocaleDateString('pt-BR') : 'Data desconhecida');
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
                    label: 'Média Pré-Dieta (2018-2022)',
                    data: comparisonData.preDiet,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: '#667eea',
                    borderWidth: 2
                },
                {
                    label: 'Média Pós-Dieta (2023-2025)',
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
                    text: 'Comparação Pré-Dieta vs Pós-Dieta',
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
                if (lab.values[alias]) {
                    markerData = lab.values[alias];
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
                        markerData = lab.values[matchingKey];
                        break;
                    }
                }
            }

            if (!markerData) return;

            if (lab.isPeriodLab) {
                if (markerData.dataPoints) {
                    markerData.dataPoints.forEach(dp => {
                        if (dp.date < preDietCutoff) {
                            preValues.push(dp.value);
                        } else {
                            postValues.push(dp.value);
                        }
                    });
                }
            } else {
                if (lab.collectionDate) {
                    if (lab.collectionDate < preDietCutoff) {
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
