// Dashboard Budista - JavaScript Principal
// Funções comuns para todas as páginas

// Variáveis globais
let allData = null;
let latestData = null;

// Função principal de inicialização
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    initializeCommonFeatures();
});

// Carregar dados do JSON gerado pelo R
async function loadDashboardData() {
    try {
        const response = await fetch('charts/dashboard_data.json');
        if (!response.ok) {
            throw new Error('Dados não encontrados. Serão carregados na próxima atualização.');
        }
        
        allData = await response.json();
        latestData = getLatestMeasurements();
        
        // Atualizar todas as métricas na página atual
        updatePageMetrics();
        
    } catch (error) {
        console.log('Dados ainda não disponíveis:', error.message);
        showDataPlaceholders();
    }
}

// Obter últimas medições de cada prática
function getLatestMeasurements() {
    if (!allData) return null;
    
    const latest = {};
    
    // Encontrar última medição de cada prática
    ['Duthanga Geral', 'Duthanga Uma Refeicao', 'Ganho de Peso'].forEach(practice => {
        if (allData[practice] && allData[practice].length > 0) {
            const practiceData = allData[practice];
            latest[practice] = practiceData[practiceData.length - 1];
        }
    });
    
    // Determinar valores mais recentes globalmente
    const allEntries = [];
    Object.values(allData).forEach(practiceData => {
        if (Array.isArray(practiceData)) {
            allEntries.push(...practiceData);
        }
    });
    
    // Ordenar por data
    allEntries.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    
    if (allEntries.length > 0) {
        latest.global = allEntries[allEntries.length - 1];
    }
    
    return latest;
}

// Atualizar métricas baseado na página atual
function updatePageMetrics() {
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'index':
            updateDashboardMetrics();
            break;
        case 'antropometria':
            updateAnthropometryMetrics();
            break;
        case 'duthanga':
            updateDuthangaMetrics();
            break;
        case 'dados':
            updateDataPageMetrics();
            break;
    }
}

// Identificar página atual
function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('antropometria')) return 'antropometria';
    if (path.includes('duthanga')) return 'duthanga';
    if (path.includes('dados')) return 'dados';
    if (path.includes('sobre')) return 'sobre';
    return 'index';
}

// Atualizar métricas da página principal
function updateDashboardMetrics() {
    if (!allData) return;
    
    // Usar dados diretos do JSON gerado pelo R
    const currentWeight = allData.current_weight || 0;
    const currentIMC = allData.current_imc || 0;
    const goalWeight = allData.goal_weight || 73;
    const progressToGoal = allData.progress_to_goal || 0;
    
    // Peso atual (só o número, pois "kg" já está no HTML)
    updateElement('current-weight', currentWeight ? `${currentWeight}` : '--');
    
    // IMC atual
    updateElement('current-imc', currentIMC ? `${currentIMC}` : '--');
    
    // Categoria do IMC
    updateElement('imc-category', getIMCCategory(currentIMC));
    
    // Progresso para meta (kg restantes)
    updateElement('progress-to-goal', progressToGoal > 0 ? `${progressToGoal.toFixed(1)}` : '0');
    
    // Total de registros
    const totalRecords = (allData.sections?.duthanga_geral?.records || 0) + 
                        (allData.sections?.duthanga_refeicao?.records || 0) + 
                        (allData.sections?.ganho_peso?.records || 0);
    updateElement('total-records', totalRecords.toString());
    
    // Atualizar barra de progresso
    updateProgressBar(currentWeight, goalWeight);
    
    // Atualizar timestamp
    updateElement('last-update', allData.last_update || 'Não disponível');
}

// Atualizar métricas da página de antropometria
function updateAnthropometryMetrics() {
    if (!latestData || !latestData.global) return;
    
    const latest = latestData.global;
    
    // Métricas atuais
    updateElement('peso-atual', latest.Weight || '--');
    
    const imc = calculateIMC(latest.Weight, 1.74);
    updateElement('imc-atual', imc ? imc.toFixed(1) : '--');
    updateElement('imc-status', getIMCStatus(imc));
    
    updateElement('braco-atual', latest.Arm || '--');
    updateElement('cintura-atual', latest.Waist || '--');
    updateElement('quadril-atual', latest.Hip || '--');
    updateElement('panturrilha-atual', latest.Calf || '--');
    
    // Progresso para meta
    updateGoalProgress(latest.Weight, 73);
    
    // Análise nutricional
    updateNutritionalAnalysis(latest, imc);
    
    // Status IMC atual
    updateElement('status-imc-value', imc ? imc.toFixed(1) : '--');
    updateElement('status-imc-label', getIMCStatus(imc));
}

// Atualizar métricas da página Duthanga
function updateDuthangaMetrics() {
    if (!allData) return;
    
    // Contadores por prática
    const geralCount = allData['Duthanga Geral'] ? allData['Duthanga Geral'].length : 0;
    const refeicaoCount = allData['Duthanga Uma Refeicao'] ? allData['Duthanga Uma Refeicao'].length : 0;
    
    updateElement('geral-records', geralCount);
    updateElement('refeicao-records', refeicaoCount);
    
    // Últimas medições
    if (latestData['Duthanga Geral']) {
        updateElement('geral-last', formatDate(latestData['Duthanga Geral'].Date));
    }
    if (latestData['Duthanga Uma Refeicao']) {
        updateElement('refeicao-last', formatDate(latestData['Duthanga Uma Refeicao'].Date));
    }
}

// Atualizar métricas da página de dados
function updateDataPageMetrics() {
    if (!allData) return;
    
    // Contadores totais
    const geralCount = allData['Duthanga Geral'] ? allData['Duthanga Geral'].length : 0;
    const refeicaoCount = allData['Duthanga Uma Refeicao'] ? allData['Duthanga Uma Refeicao'].length : 0;
    const pesoCount = allData['Ganho de Peso'] ? allData['Ganho de Peso'].length : 0;
    const totalCount = geralCount + refeicaoCount + pesoCount;
    
    updateElement('total-geral', geralCount);
    updateElement('total-refeicao', refeicaoCount);
    updateElement('total-peso', pesoCount);
    updateElement('total-registros', totalCount);
    
    // Estatísticas de peso
    calculateWeightStatistics();
    
    // Timeline
    calculateTimeline();
}

// Calcular IMC
function calculateIMC(weight, height) {
    if (!weight || !height) return null;
    return weight / (height * height);
}

// Obter status do IMC
function getIMCStatus(imc) {
    if (!imc) return '--';
    if (imc < 18.5) return 'Abaixo do peso';
    if (imc <= 24.9) return 'Peso normal';
    if (imc <= 29.9) return 'Sobrepeso';
    return 'Obesidade';
}

// Atualizar progresso para meta
function updateGoalProgress(currentWeight, targetWeight) {
    if (!currentWeight) return;
    
    const startWeight = 70; // Peso inicial estimado
    const progress = ((currentWeight - startWeight) / (targetWeight - startWeight)) * 100;
    const remaining = Math.max(0, targetWeight - currentWeight);
    
    updateElement('goal-progress-bar', '', (el) => {
        el.style.width = Math.min(100, Math.max(0, progress)) + '%';
    });
    
    updateElement('goal-progress-text', `${progress.toFixed(1)}%`);
    updateElement('remaining-kg', remaining.toFixed(1));
}

// Atualizar estatísticas por prática
function updatePracticeStats() {
    if (!allData) return;
    
    Object.entries(allData).forEach(([practice, data]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        
        const latest = data[data.length - 1];
        const elementSuffix = practice.toLowerCase().replace(/ /g, '-');
        
        updateElement(`${elementSuffix}-peso`, latest.Weight ? `${latest.Weight} kg` : '--');
        updateElement(`${elementSuffix}-registros`, data.length);
    });
}

// Análise nutricional
function updateNutritionalAnalysis(latest, imc) {
    let imcAnalysis = 'Dados insuficientes';
    let weightTrend = 'Analisando tendência...';
    let generalProgress = 'Acompanhamento em progresso';
    
    if (imc) {
        if (imc < 18.5) {
            imcAnalysis = 'Abaixo do peso ideal - acompanhamento nutricional recomendado';
        } else if (imc <= 24.9) {
            imcAnalysis = 'Peso dentro da faixa normal - manter acompanhamento';
        } else {
            imcAnalysis = 'Acima do peso ideal - avaliar estratégias nutricionais';
        }
    }
    
    updateElement('imc-analysis', imcAnalysis);
    updateElement('weight-trend', weightTrend);
    updateElement('general-progress', generalProgress);
}

// Calcular estatísticas de peso
function calculateWeightStatistics() {
    if (!allData) return;
    
    const allWeights = [];
    const allIMCs = [];
    
    Object.values(allData).forEach(practiceData => {
        if (Array.isArray(practiceData)) {
            practiceData.forEach(entry => {
                if (entry.Weight) {
                    allWeights.push(entry.Weight);
                    const imc = calculateIMC(entry.Weight, 1.74);
                    if (imc) allIMCs.push(imc);
                }
            });
        }
    });
    
    if (allWeights.length > 0) {
        const minWeight = Math.min(...allWeights);
        const maxWeight = Math.max(...allWeights);
        const avgWeight = allWeights.reduce((a, b) => a + b, 0) / allWeights.length;
        const variation = maxWeight - minWeight;
        
        updateElement('peso-min', `${minWeight} kg`);
        updateElement('peso-max', `${maxWeight} kg`);
        updateElement('peso-medio', `${avgWeight.toFixed(1)} kg`);
        updateElement('peso-variacao', `${variation.toFixed(1)} kg`);
    }
    
    if (allIMCs.length > 0) {
        const minIMC = Math.min(...allIMCs);
        const maxIMC = Math.max(...allIMCs);
        const avgIMC = allIMCs.reduce((a, b) => a + b, 0) / allIMCs.length;
        const latestIMC = allIMCs[allIMCs.length - 1];
        
        updateElement('imc-min', minIMC.toFixed(1));
        updateElement('imc-max', maxIMC.toFixed(1));
        updateElement('imc-medio', avgIMC.toFixed(1));
        updateElement('imc-categoria', getIMCStatus(latestIMC));
    }
}

// Calcular timeline
function calculateTimeline() {
    if (!allData) return;
    
    const allDates = [];
    
    Object.values(allData).forEach(practiceData => {
        if (Array.isArray(practiceData)) {
            practiceData.forEach(entry => {
                if (entry.Date) {
                    allDates.push(new Date(entry.Date));
                }
            });
        }
    });
    
    if (allDates.length > 0) {
        allDates.sort((a, b) => a - b);
        
        const firstDate = allDates[0];
        const lastDate = allDates[allDates.length - 1];
        const daysDiff = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24));
        
        updateElement('first-record', formatDate(firstDate));
        updateElement('last-record', formatDate(lastDate));
        updateElement('total-period', `${daysDiff} dias`);
    }
}

// Função auxiliar para atualizar elementos
function updateElement(id, content, customUpdate = null) {
    const element = document.getElementById(id);
    if (element) {
        if (customUpdate) {
            customUpdate(element);
        } else {
            element.textContent = content;
        }
    }
}

// Função para calcular categoria do IMC
function getIMCCategory(imc) {
    if (!imc || imc <= 0) return 'Não disponível';
    if (imc < 18.5) return 'Abaixo do peso';
    if (imc < 25) return 'Peso normal';
    if (imc < 30) return 'Sobrepeso';
    return 'Obesidade';
}

// Função para atualizar barra de progresso
function updateProgressBar(currentWeight, goalWeight) {
    const progressIndicator = document.getElementById('progress-indicator');
    if (!progressIndicator || !currentWeight || !goalWeight) return;
    
    // Assumindo peso inicial de 96kg baseado nos dados
    const initialWeight = 96;
    const totalToLose = initialWeight - goalWeight;
    const alreadyLost = initialWeight - currentWeight;
    const progressPercentage = Math.min(100, Math.max(0, (alreadyLost / totalToLose) * 100));
    
    // Atualizar width da barra e texto
    progressIndicator.style.width = `${progressPercentage}%`;
    progressIndicator.textContent = `${progressPercentage.toFixed(1)}%`;
}

// Formatar data
function formatDate(date) {
    if (!date) return '--/--/----';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
}

// Mostrar placeholders quando dados não estão disponíveis
function showDataPlaceholders() {
    const placeholders = {
        'peso-atual': '--',
        'imc-atual': '--',
        'braco-atual': '--',
        'cintura-atual': '--',
        'quadril-atual': '--',
        'panturrilha-atual': '--',
        'goal-progress-text': 'Carregando...',
        'remaining-kg': '-'
    };
    
    Object.entries(placeholders).forEach(([id, value]) => {
        updateElement(id, value);
    });
}

// Inicializar recursos comuns
function initializeCommonFeatures() {
    // Animações de entrada
    addScrollAnimations();
    
    // Tooltips do Bootstrap
    if (typeof bootstrap !== 'undefined') {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    // Smooth scrolling
    addSmoothScrolling();
}

// Adicionar animações de scroll
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observar cards que têm animação
    document.querySelectorAll('.metric-card, .chart-container, .quick-link-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(card);
    });
}

// Adicionar smooth scrolling
function addSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Função para atualizar dados (usado nos botões de refresh)
function refreshData() {
    location.reload();
}

// Função de export para CSV (páginas que precisam)
function exportToCSV(data, filename) {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => row[header] || '').join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Função de utilidade para debug
function debugData() {
    console.log('All Data:', allData);
    console.log('Latest Data:', latestData);
}

// Disponibilizar funções globalmente
window.loadDashboardData = loadDashboardData;
window.refreshData = refreshData;
window.exportToCSV = exportToCSV;
window.debugData = debugData;
