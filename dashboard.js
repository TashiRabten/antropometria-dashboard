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
        console.log('🔍 DEBUG: Iniciando carregamento dos dados...');
        console.log('🔍 DEBUG: URL base:', window.location.href);
        console.log('🔍 DEBUG: Tentando carregar:', 'charts/dashboard_data.json');
        
        const response = await fetch('charts/dashboard_data.json');
        console.log('🔍 DEBUG: Response status:', response.status);
        console.log('🔍 DEBUG: Response ok:', response.ok);
        console.log('🔍 DEBUG: Response headers:', response.headers);
        
        if (!response.ok) {
            console.log('🔍 DEBUG: Response não ok, lançando erro');
            throw new Error('Dados não encontrados. Serão carregados na próxima atualização.');
        }
        
        console.log('🔍 DEBUG: Tentando fazer parse do JSON...');
        allData = await response.json();
        console.log('🔍 DEBUG: Dados carregados com sucesso:', allData);
        
        console.log('🔍 DEBUG: Obtendo latest data...');
        latestData = getLatestMeasurements();
        console.log('🔍 DEBUG: Latest data:', latestData);
        
        console.log('🔍 DEBUG: Chamando updatePageMetrics...');
        // Atualizar todas as métricas na página atual
        updatePageMetrics();
        console.log('🔍 DEBUG: updatePageMetrics concluído');
        
    } catch (error) {
        console.log('🔍 DEBUG: Erro capturado:', error);
        console.log('🔍 DEBUG: Tipo do erro:', error.name);
        console.log('🔍 DEBUG: Mensagem do erro:', error.message);
        console.log('🔍 DEBUG: Stack do erro:', error.stack);
        console.log('Dados ainda não disponíveis:', error.message);
        showDataPlaceholders();
    }
}

// Obter últimas medições - ADAPTADO para nova estrutura JSON
function getLatestMeasurements() {
    if (!allData) return null;
    
    // Usar dados diretos do JSON gerado pelo R
    return {
        global: {
            Weight: allData.current_weight,
            IMC: allData.current_imc,
            Date: allData.last_update
        },
        sections: allData.sections
    };
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
    if (path.includes('antropometria.html')) return 'antropometria';
    if (path.includes('duthanga.html')) return 'duthanga';
    if (path.includes('dados.html')) return 'dados';
    if (path.includes('sobre.html')) return 'sobre';
    return 'index';
}

// Atualizar métricas da página principal
function updateDashboardMetrics() {
    console.log('🔍 DEBUG: updateDashboardMetrics iniciado');
    console.log('🔍 DEBUG: allData existe:', !!allData);
    if (!allData) {
        console.log('🔍 DEBUG: allData é null/undefined, saindo');
        return;
    }
    
    console.log('🔍 DEBUG: allData completo:', allData);
    
    // Usar dados diretos do JSON gerado pelo R - corrigir arrays
    const currentWeight = Array.isArray(allData.current_weight) ? allData.current_weight[0] : allData.current_weight || 0;
    const currentIMC = Array.isArray(allData.current_imc) ? allData.current_imc[0] : allData.current_imc || 0;
    const goalWeight = Array.isArray(allData.goal_weight) ? allData.goal_weight[0] : allData.goal_weight || 73;
    const progressToGoal = Array.isArray(allData.progress_to_goal) ? allData.progress_to_goal[0] : allData.progress_to_goal || 0;
    
    console.log('🔍 DEBUG: Valores extraídos:');
    console.log('🔍 DEBUG: currentWeight:', currentWeight);
    console.log('🔍 DEBUG: currentIMC:', currentIMC);
    console.log('🔍 DEBUG: goalWeight:', goalWeight);
    console.log('🔍 DEBUG: progressToGoal:', progressToGoal);
    
    // Peso atual (só o número, pois "kg" já está no HTML)
    updateElement('current-weight', currentWeight ? `${currentWeight}` : '--');
    
    // IMC atual
    updateElement('current-imc', currentIMC ? `${currentIMC}` : '--');
    
    // Categoria do IMC
    updateElement('imc-category', getIMCCategory(currentIMC));
    
    // Progresso para meta (kg restantes)
    updateElement('progress-to-goal', progressToGoal > 0 ? `${progressToGoal.toFixed(1)}` : '0');
    
    // Total de registros - usar apenas duthanga_geral (48)
    const geralRecords = allData.sections?.duthanga_geral?.records || 0;
    const totalRecords = Array.isArray(geralRecords) ? geralRecords[0] : geralRecords;
    updateElement('total-records', totalRecords.toString());
    
    // Atualizar barra de progresso
    updateProgressBar(currentWeight, goalWeight);
    
    // Atualizar timestamp - corrigir array
    const lastUpdate = Array.isArray(allData.last_update) ? allData.last_update[0] : allData.last_update;
    updateElement('last-update', lastUpdate || 'Não disponível');
}

// Atualizar métricas da página de antropometria
function updateAnthropometryMetrics() {
    if (!allData) return;
    
    const currentWeight = Array.isArray(allData.current_weight) ? allData.current_weight[0] : allData.current_weight;
    const currentIMC = Array.isArray(allData.current_imc) ? allData.current_imc[0] : allData.current_imc;
    
    // Métricas atuais - usar dados disponíveis do JSON
    updateElement('peso-atual', currentWeight ? `${currentWeight}` : '--');
    updateElement('imc-atual', currentIMC ? `${currentIMC}` : '--');
    updateElement('imc-status', getIMCStatus(currentIMC));
    
    // Medidas corporais - usar dados reais do JSON
    const currentBraco = Array.isArray(allData.current_braco) ? allData.current_braco[0] : allData.current_braco;
    const currentCintura = Array.isArray(allData.current_cintura) ? allData.current_cintura[0] : allData.current_cintura;
    const currentQuadril = Array.isArray(allData.current_quadril) ? allData.current_quadril[0] : allData.current_quadril;
    const currentPanturrilha = Array.isArray(allData.current_panturrilha) ? allData.current_panturrilha[0] : allData.current_panturrilha;
    
    updateElement('braco-atual', currentBraco ? `${currentBraco}` : '--');
    updateElement('cintura-atual', currentCintura ? `${currentCintura}` : '--');
    updateElement('quadril-atual', currentQuadril ? `${currentQuadril}` : '--');
    updateElement('panturrilha-atual', currentPanturrilha ? `${currentPanturrilha}` : '--');
    
    // Progresso para meta
    updateGoalProgress(currentWeight, 73);
    
    // Análise nutricional
    updateNutritionalAnalysis(currentWeight, currentIMC);
    
    // Status IMC atual
    updateElement('status-imc-value', currentIMC ? `${currentIMC}` : '--');
    updateElement('status-imc-label', getIMCStatus(currentIMC));
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
    
    // Usar dados das seções disponíveis - corrigir arrays
    const geralRecords = allData.sections?.duthanga_geral?.records || 0;
    const geralCount = Array.isArray(geralRecords) ? geralRecords[0] : geralRecords;
    
    updateElement('total-geral', geralCount);
    updateElement('total-registros', geralCount);
    
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

// Alias para compatibilidade
function getIMCCategory(imc) {
    return getIMCStatus(imc);
}

// Função utilitária para atualizar elementos DOM
function updateElement(id, content, callback = null) {
    console.log(`🔍 DEBUG: updateElement chamado para ${id} com conteúdo:`, content);
    const element = document.getElementById(id);
    console.log(`🔍 DEBUG: Elemento ${id} encontrado:`, !!element);
    if (element) {
        if (callback) {
            console.log(`🔍 DEBUG: Executando callback para ${id}`);
            callback(element);
        } else {
            console.log(`🔍 DEBUG: Atualizando textContent de ${id} para:`, content);
            element.textContent = content;
        }
        console.log(`🔍 DEBUG: ${id} atualizado com sucesso`);
    } else {
        console.log(`🔍 DEBUG: ERRO - Elemento ${id} não encontrado no DOM!`);
    }
}

// Atualizar progresso para meta
function updateGoalProgress(currentWeight, targetWeight) {
    if (!currentWeight) return;
    
    const startWeight = 70; // Peso inicial conforme indicado
    const totalToGain = targetWeight - startWeight;
    const alreadyGained = currentWeight - startWeight;
    const progress = Math.min(100, Math.max(0, (alreadyGained / totalToGain) * 100));
    const remaining = Math.max(0, targetWeight - currentWeight);
    
    updateElement('goal-progress-bar', '', (el) => {
        el.style.width = progress + '%';
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
function updateNutritionalAnalysis(currentWeight, imc) {
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
    
    // Análise de tendência baseada no progresso atual
    if (allData && allData.progress_to_goal !== undefined) {
        const progressValue = Array.isArray(allData.progress_to_goal) ? allData.progress_to_goal[0] : allData.progress_to_goal;
        if (progressValue > 0) {
            weightTrend = `Faltam ${progressValue.toFixed(1)}kg para atingir a meta de 73kg`;
            generalProgress = 'Progresso positivo no ganho de peso saudável';
        } else {
            weightTrend = 'Meta de peso atingida';
            generalProgress = 'Objetivo alcançado - manter peso atual';
        }
    }
    
    updateElement('imc-analysis', imcAnalysis);
    updateElement('weight-trend', weightTrend);
    updateElement('general-progress', generalProgress);
}

// Calcular estatísticas de peso - SIMPLIFICADO para nova estrutura
function calculateWeightStatistics() {
    if (!allData) return;
    
    // Usar valores diretos do JSON
    const currentWeight = allData.current_weight;
    const currentIMC = allData.current_imc;
    
    if (currentWeight && currentIMC) {
        // Mostrar valores atuais como estatísticas
        updateElement('peso-atual-stat', `${currentWeight} kg`);
        updateElement('imc-atual-stat', `${currentIMC}`);
        updateElement('categoria-imc-stat', getIMCCategory(currentIMC));
        
        // Informações das seções
        if (allData.sections) {
            const totalRecords = (allData.sections.duthanga_geral?.records || 0) + 
                               (allData.sections.duthanga_refeicao?.records || 0) + 
                               (allData.sections.ganho_peso?.records || 0);
            updateElement('total-records-stat', totalRecords);
        }
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
    
    // Corrigir para ganho de peso: peso inicial baixo -> meta mais alta
    const initialWeight = 70; // Peso inicial conforme indicado
    const totalToGain = goalWeight - initialWeight;
    const alreadyGained = currentWeight - initialWeight;
    const progressPercentage = Math.min(100, Math.max(0, (alreadyGained / totalToGain) * 100));
    
    // Atualizar width da barra e texto - centralizar
    progressIndicator.style.width = `${progressPercentage}%`;
    progressIndicator.style.display = 'flex';
    progressIndicator.style.alignItems = 'center';
    progressIndicator.style.justifyContent = 'center';
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
