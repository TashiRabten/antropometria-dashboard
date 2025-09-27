# Script R para gerar gráficos de antropometria
# Conecta com Google Sheets e gera visualizações automáticas

# Carregar bibliotecas necessárias
library(googlesheets4)
library(ggplot2)
library(dplyr)
library(lubridate)
library(jsonlite)
library(RColorBrewer)

# Configurar autenticação do Google Sheets
# Para uso em GitHub Actions, usar service account
gs4_auth(token = "auth_token.json")

# URL da planilha Google Sheets
sheet_url <- "https://docs.google.com/spreadsheets/d/1nL76BTIiWiazFutiU3Unowxm4kSxjs3oNbGnpRYwRq8/edit?usp=drive_web&ouid=111902732217167107299"

# Função para ler dados da planilha
read_anthropometry_data <- function() {
  tryCatch({
    # Ler dados a partir da linha 52, colunas A até G
    data <- read_sheet(sheet_url, range = "A52:G", col_names = FALSE)
    
    # Definir nomes das colunas
    colnames(data) <- c("data", "horario", "peso_kg", "braco_cm", "cintura_cm", "quadril_cm", "panturrilha_cm")
    
    # Limpar e processar dados
    data <- data %>%
      filter(!is.na(data) & !is.na(peso_kg)) %>%
      mutate(
        data = as.Date(data),
        peso_kg = as.numeric(peso_kg),
        braco_cm = as.numeric(braco_cm),
        cintura_cm = as.numeric(cintura_cm),
        quadril_cm = as.numeric(quadril_cm),
        panturrilha_cm = as.numeric(panturrilha_cm),
        # Calcular IMC (assumindo altura de 1.75m - ajustar conforme necessário)
        altura_m = 1.75,
        imc = peso_kg / (altura_m^2)
      ) %>%
      arrange(data)
    
    return(data)
  }, error = function(e) {
    cat("Erro ao ler dados:", e$message, "\n")
    return(NULL)
  })
}

# Função para gerar gráfico de evolução do peso
generate_weight_chart <- function(data) {
  if(is.null(data) || nrow(data) == 0) return(NULL)
  
  # Meta de peso
  meta_peso <- 73
  
  p <- ggplot(data, aes(x = data, y = peso_kg)) +
    geom_line(color = "#667eea", size = 1.2, alpha = 0.8) +
    geom_point(color = "#667eea", size = 3, alpha = 0.9) +
    geom_hline(yintercept = meta_peso, color = "#4CAF50", linetype = "dashed", size = 1) +
    geom_text(aes(x = max(data), y = meta_peso + 0.5), 
              label = paste("Meta:", meta_peso, "kg"), 
              color = "#4CAF50", hjust = 1, fontface = "bold") +
    labs(
      title = "Evolução do Peso Corporal",
      subtitle = paste("Peso atual:", tail(data$peso_kg, 1), "kg | Meta: 73kg"),
      x = "Data",
      y = "Peso (kg)"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(size = 16, face = "bold", color = "#333"),
      plot.subtitle = element_text(size = 12, color = "#666"),
      axis.title = element_text(size = 12, face = "bold"),
      axis.text = element_text(size = 10),
      panel.grid.minor = element_blank(),
      panel.background = element_rect(fill = "white", color = NA),
      plot.background = element_rect(fill = "white", color = NA)
    ) +
    scale_x_date(date_labels = "%d/%m", date_breaks = "1 week") +
    scale_y_continuous(breaks = seq(floor(min(data$peso_kg, na.rm = TRUE)), 
                                   ceiling(max(meta_peso, max(data$peso_kg, na.rm = TRUE))), 1))
  
  ggsave("charts/weight_evolution.png", plot = p, width = 12, height = 6, dpi = 300, bg = "white")
  return(p)
}

# Função para gerar gráfico de medidas corporais
generate_measurements_chart <- function(data) {
  if(is.null(data) || nrow(data) == 0) return(NULL)
  
  # Preparar dados para visualização
  measurements_long <- data %>%
    select(data, braco_cm, cintura_cm, quadril_cm, panturrilha_cm) %>%
    tidyr::pivot_longer(cols = -data, names_to = "medida", values_to = "valor") %>%
    filter(!is.na(valor)) %>%
    mutate(
      medida = case_when(
        medida == "braco_cm" ~ "Braço",
        medida == "cintura_cm" ~ "Cintura", 
        medida == "quadril_cm" ~ "Quadril",
        medida == "panturrilha_cm" ~ "Panturrilha"
      )
    )
  
  p <- ggplot(measurements_long, aes(x = data, y = valor, color = medida)) +
    geom_line(size = 1.1, alpha = 0.8) +
    geom_point(size = 2.5, alpha = 0.9) +
    labs(
      title = "Evolução das Medidas Corporais",
      subtitle = "Acompanhamento das principais medidas antropométricas",
      x = "Data",
      y = "Medida (cm)",
      color = "Região"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(size = 16, face = "bold", color = "#333"),
      plot.subtitle = element_text(size = 12, color = "#666"),
      axis.title = element_text(size = 12, face = "bold"),
      axis.text = element_text(size = 10),
      legend.title = element_text(size = 12, face = "bold"),
      legend.text = element_text(size = 10),
      panel.grid.minor = element_blank(),
      panel.background = element_rect(fill = "white", color = NA),
      plot.background = element_rect(fill = "white", color = NA)
    ) +
    scale_color_brewer(type = "qual", palette = "Set2") +
    scale_x_date(date_labels = "%d/%m", date_breaks = "1 week") +
    facet_wrap(~medida, scales = "free_y", ncol = 2)
  
  ggsave("charts/body_measurements.png", plot = p, width = 12, height = 8, dpi = 300, bg = "white")
  return(p)
}

# Função para gerar gráfico de evolução do IMC
generate_imc_chart <- function(data) {
  if(is.null(data) || nrow(data) == 0) return(NULL)
  
  p <- ggplot(data, aes(x = data, y = imc)) +
    geom_line(color = "#764ba2", size = 1.2, alpha = 0.8) +
    geom_point(color = "#764ba2", size = 3, alpha = 0.9) +
    geom_hline(yintercept = 18.5, color = "#ff9800", linetype = "dotted", alpha = 0.7) +
    geom_hline(yintercept = 25, color = "#f44336", linetype = "dashed", alpha = 0.7) +
    geom_hline(yintercept = 30, color = "#e91e63", linetype = "dashed", alpha = 0.7) +
    annotate("text", x = max(data$data), y = 18.5, label = "Abaixo do peso", 
             hjust = 1, vjust = -0.5, size = 3, color = "#ff9800") +
    annotate("text", x = max(data$data), y = 25, label = "Sobrepeso", 
             hjust = 1, vjust = -0.5, size = 3, color = "#f44336") +
    labs(
      title = "Evolução do Índice de Massa Corporal (IMC)",
      subtitle = paste("IMC atual:", round(tail(data$imc, 1), 1)),
      x = "Data",
      y = "IMC"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(size = 16, face = "bold", color = "#333"),
      plot.subtitle = element_text(size = 12, color = "#666"),
      axis.title = element_text(size = 12, face = "bold"),
      axis.text = element_text(size = 10),
      panel.grid.minor = element_blank(),
      panel.background = element_rect(fill = "white", color = NA),
      plot.background = element_rect(fill = "white", color = NA)
    ) +
    scale_x_date(date_labels = "%d/%m", date_breaks = "1 week")
  
  ggsave("charts/imc_evolution.png", plot = p, width = 12, height = 6, dpi = 300, bg = "white")
  return(p)
}

# Função para gerar dados JSON para a página web
generate_json_data <- function(data) {
  if(is.null(data) || nrow(data) == 0) return(NULL)
  
  latest_data <- tail(data, 1)
  
  summary_data <- list(
    last_update = format(Sys.time(), "%Y-%m-%d %H:%M:%S"),
    current_weight = latest_data$peso_kg,
    current_imc = round(latest_data$imc, 1),
    goal_weight = 73,
    progress_to_goal = 73 - latest_data$peso_kg,
    days_monitored = as.numeric(max(data$data) - min(data$data)),
    total_weight_change = latest_data$peso_kg - data$peso_kg[1],
    recent_measurements = tail(data, 5) %>%
      mutate(data = format(data, "%d/%m/%Y")) %>%
      select(-altura_m)
  )
  
  write_json(summary_data, "charts/data.json", pretty = TRUE)
  return(summary_data)
}

# Função principal
main <- function() {
  cat("Iniciando geração de gráficos...\n")
  
  # Ler dados
  data <- read_anthropometry_data()
  
  if(is.null(data)) {
    cat("Erro: Não foi possível ler os dados da planilha.\n")
    return(FALSE)
  }
  
  cat("Dados lidos com sucesso:", nrow(data), "registros\n")
  
  # Gerar gráficos
  cat("Gerando gráfico de peso...\n")
  generate_weight_chart(data)
  
  cat("Gerando gráfico de medidas corporais...\n")
  generate_measurements_chart(data)
  
  cat("Gerando gráfico de IMC...\n")
  generate_imc_chart(data)
  
  cat("Gerando dados JSON...\n")
  generate_json_data(data)
  
  cat("Gráficos gerados com sucesso!\n")
  return(TRUE)
}

# Executar se script for chamado diretamente
if(!interactive()) {
  main()
}