# Setup

## Passos

### 1. Criar Repositório
1. Vá para https:ok//github.com/TashiRabten/
2. Clique "New repository"
3. Nome: `antropometria-dashboard`
4. Marque como público
5. Adicione README
6. Clique "Create repository"

### 2. Subir os Arquivos
```bash
# Clone o novo repositório
git clone https://github.com/TashiRabten/antropometria-dashboard.git
cd antropometria-dashboard

# Copie todos os arquivos desta pasta R para o repositório
# Depois execute:
git add .
git commit -m "Setup inicial do painel antropométrico"
git push origin main
```

### 3. Configurar Google Sheets API
- Siga as instruções no README.md para criar service account
- Configure o secret `GOOGLE_SHEETS_TOKEN` no GitHub

### 4. Ativar GitHub Pages
- Settings > Pages > Deploy from branch "main"

### 5. Ajustar altura
No arquivo `generate_charts.R`, linha ~30, altere:
```r
altura_m = 1.75,  # Substitua pela sua altura real
```

## 🌐 Site ficará disponível em:
`https://tashirabten.github.io/antropometria-dashboard/`