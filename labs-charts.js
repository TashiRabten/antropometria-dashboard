// Lab Charts - Chart.js visualizations for lab trends

let trendChart = null;
let comparisonChart = null;
let listenersInitialized = false;

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
                label: `${marker} Levels`,
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
                    text: `${marker} Trend Over Time`,
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
                        text: 'Date'
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

    // Collect data from all labs
    allLabs.forEach(lab => {
        if (lab.isPeriodLab) {
            // Period lab has multiple data points
            const markerData = lab.values[marker];
            if (markerData && markerData.dataPoints) {
                markerData.dataPoints.forEach(dp => {
                    dataPoints.push({
                        date: dp.date,
                        value: dp.value,
                        status: dp.status,
                        unit: markerData.unit
                    });
                });
            }
        } else {
            // Single date lab
            const markerData = lab.values[marker];
            if (markerData && lab.collectionDate) {
                dataPoints.push({
                    date: lab.collectionDate,
                    value: markerData.value,
                    status: markerData.status,
                    unit: markerData.unit
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
                    label: 'Pre-Diet Average (2018-2022)',
                    data: comparisonData.preDiet,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: '#667eea',
                    borderWidth: 2
                },
                {
                    label: 'Post-Diet Average (2023-2025)',
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
                    text: 'Pre-Diet vs Post-Diet Comparison',
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
                        text: 'Value'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Lab Marker'
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
    const markers = ['Glucose', 'Hemoglobin', 'WBC', 'Sodium', 'Potassium', 'Creatinine'];
    const preDietCutoff = new Date('2023-01-01');

    const preDiet = [];
    const postDiet = [];

    markers.forEach(marker => {
        const preValues = [];
        const postValues = [];

        allLabs.forEach(lab => {
            if (lab.isPeriodLab) {
                const markerData = lab.values[marker];
                if (markerData && markerData.dataPoints) {
                    markerData.dataPoints.forEach(dp => {
                        if (dp.date < preDietCutoff) {
                            preValues.push(dp.value);
                        } else {
                            postValues.push(dp.value);
                        }
                    });
                }
            } else {
                const markerData = lab.values[marker];
                if (markerData && lab.collectionDate) {
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
