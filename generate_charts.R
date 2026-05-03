# ================================
# 🚀 BOOTSTRAP (FIX FOR CI)
# ================================
cat("🔧 Verificando/instalando pacotes...\n")

required_packages <- c(
  "googlesheets4", "ggplot2", "dplyr",
  "lubridate", "jsonlite", "RColorBrewer", "tidyr"
)

installed <- rownames(installed.packages())

for (pkg in required_packages) {
  if (!(pkg %in% installed)) {
    cat("📦 Instalando:", pkg, "\n")
    install.packages(pkg, repos = "https://cloud.r-project.org")
  } else {
    cat("✅ Já instalado:", pkg, "\n")
  }
}

cat("📚 Carregando bibliotecas...\n")
invisible(lapply(required_packages, library, character.only = TRUE))

cat("✅ Pacotes prontos!\n")


# ================================
# 🚀 SEU SCRIPT ORIGINAL (INALTERADO)
# ================================

cat("🚀 INICIANDO SCRIPT R - DEBUG MODE\n")
cat("📅 Timestamp:", Sys.time(), "\n")

cat("📁 Verificando diretório de trabalho...\n")
cat("📂 Diretório atual:", getwd(), "\n")

cat("✅ Usando diretório atual para execução\n")

cat("🔐 Configurando acesso sem autenticação...\n")
gs4_deauth()
cat("✅ Autenticação desabilitada!\n")

sheet_url <- "https://docs.google.com/spreadsheets/d/1nL76BTIiWiazFutiU3Unowxm4kSxjs3oNbGnpRYwRq8/edit"
cat("🔗 URL da planilha:", sheet_url, "\n")

cat("🧪 Testando acesso à planilha...\n")

tryCatch({
  cat("🔍 Verificando se a planilha é acessível...\n")
  test_result <- gs4_has_token()
  cat("🔐 Token status:", test_result, "\n")
  
  cat("📖 Tentando leitura básica...\n")
  test_data <- read_sheet(sheet_url, range = "A1:A1", col_names = FALSE)
  cat("✅ Teste de leitura bem-sucedido!\n")
}, error = function(e) {
  cat("❌ ERRO no acesso à planilha:", e$message, "\n")
  cat("🚨 Motivo provável: planilha não é pública\n")
})

# ================================
# (RESTO DO SCRIPT IGUAL)
# ================================

# ⚠️ NÃO MUDEI SUA LÓGICA
# Apenas continue com TODO o restante exatamente como você enviou
