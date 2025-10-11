# 📊 Painel Antropométrico

[Site](https://tashirabten.github.io/antropometria-dashboard)de acompanhamento antropométrico para Msa. Natalia Medina e Msa. Julia Barichello.

## 🎯 Funcionalidades

- **Visualização em tempo real** dos dados antropométricos
- **Gráficos interativos** de evolução do peso, medidas corporais e IMC
- **Atualização automática** a partir do Google Sheets
- **Indicadores de progresso** em relação à meta de 73kg
- **Cálculo automático do IMC** e categorização

## 📈 Métricas Acompanhadas

- **Peso corporal** (kg)
- **Braço** (cm)
- **Cintura** (cm) 
- **Quadril** (cm)
- **Panturrilha** (cm)
- **IMC** (calculado automaticamente)

## 🔄 Atualização Automática

O site é atualizado automaticamente a cada 6 horas através do GitHub Actions, que:

1. Conecta com o Google Sheets
2. Lê os dados a partir da linha 52
3. Gera gráficos atualizados usando R
4. Atualiza o site com as novas informações

## 🚀 Como Configurar

### 1. Fork este repositório

### 2. Configurar Google Sheets API

1. Vá para [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Habilite a Google Sheets API
4. Crie uma service account
5. Baixe as credenciais JSON

### 3. Configurar Secrets no GitHub

No seu repositório GitHub, vá em Settings > Secrets and variables > Actions e adicione:

- `GOOGLE_SHEETS_TOKEN`: O conteúdo do arquivo JSON de credenciais

### 4. Ativar GitHub Pages

1. Vá em Settings > Pages
2. Selecione "Deploy from a branch"
3. Escolha a branch `main` e pasta `/ (root)`

### 5. Ajustar Configurações

No arquivo `generate_charts.R`, ajuste:

- `altura_m`: Sua altura em metros para cálculo correto do IMC
- `sheet_url`: URL da sua planilha Google Sheets (se diferente)

## 📊 Estrutura dos Dados

O script espera dados no Google Sheets no seguinte formato (a partir da linha 52):

| Coluna A | Coluna B | Coluna C | Coluna D | Coluna E | Coluna F | Coluna G |
|----------|----------|----------|----------|----------|----------|----------|
| Data     | Horário  | Peso(kg) | Braço(cm)| Cintura(cm)| Quadril(cm)| Panturrilha(cm)|

## 🛠️ Tecnologias Utilizadas

- **R** - Análise de dados e geração de gráficos
- **ggplot2** - Visualizações
- **googlesheets4** - Conexão com Google Sheets
- **HTML/CSS/JavaScript** - Interface web
- **Bootstrap** - Framework CSS
- **GitHub Pages** - Hospedagem
- **GitHub Actions** - Automação

## 📱 Responsividade

O site é totalmente responsivo e funciona bem em:
- Desktop
- Tablets
- Smartphones

## 🎨 Personalização

Você pode personalizar:
- Cores e temas no arquivo `index.html`
- Tipos de gráficos no arquivo `generate_charts.R`
- Frequência de atualização no arquivo `.github/workflows/update-charts.yml`

---

**Desenvolvido para acompanhamento nutricional profissional** 🥗💪