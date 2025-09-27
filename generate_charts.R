# Script R completo para dashboard de praticas budistas e antropometria
# Conecta com Google Sheets e gera visualizacoes para 3 secoes

# Carregar bibliotecas necessarias
library(googlesheets4)
library(ggplot2)
library(dplyr)
library(lubridate)
library(jsonlite)
library(RColorBrewer)
library(tidyr)

# Configurar autenticacao para GitHub Actions
gs4_deauth()

# URL da planilha Google Sheets
sheet_url <- "https://docs.google.com/spreadsheets/d/1nL76BTIiWiazFutiU3Unowxm4kSxjs3oNbGnpRYwRq8/edit"

# Funcao para parser de data (yyyy.mm.dd)
parse_date <- function(date_string) {
  tryCatch({
    as.Date(gsub("\\.", "-", as.character(date_string)))
  }, error = function(e) {
    return(as.Date(NA))
  })
}

# Funcao para parser de horario (hh.mm ou h.mm)
parse_time <- function(time_input) {
  tryCatch({
    time_decimal <- as.numeric(as.character(time_input))
    if(is.na(time_decimal)) return(NA)
    hours <- floor(time_decimal)
    minutes <- round((time_decimal - hours) * 100)
    if(hours < 0 || hours > 23) return(NA)
    if(minutes < 0 || minutes > 59) return(NA)
    sprintf("%02d:%02d", hours, minutes)
  }, error = function(e) {
    return(NA)
  })
}

# Funcao robusta para converter dados numericos
safe_numeric <- function(x) {
  if(is.list(x)) {
    x <- sapply(x, function(item) {
      if(is.null(item) || length(item) == 0) return(NA)
      as.character(item[1])
    })
  }
  x <- as.character(x)
  x <- gsub("[^0-9.]", "", x)
  x <- ifelse(x == "" | is.na(x), NA, x)
  as.numeric(x)
}

# Funcao para ler dados de uma secao especifica
read_section_data <- function(start_row, section_name) {
  tryCatch({
    range_spec <- paste0("A", start_row, ":G1000")
    data <- read_sheet(sheet_url, range = range_spec, col_names = FALSE)
    
    # Filtrar linhas vazias primeiro
    data <- data %>%
      filter(!is.na(...1))
    
    if(nrow(data) == 0) {
      cat("Secao", section_name, ": 0 registros validos\n")
      return(data.frame())
    }
    
    # Processar e limpar dados
    data <- data %>%
      mutate(
        data_original = ...1,
        data = parse_date(...1),
        horario_original = ...2,
        horario = parse_time(...2),
        peso_kg = safe_numeric(...3),
        braco_cm = safe_numeric(...4),
        cintura_cm = safe_numeric(...5),
        quadril_cm = safe_numeric(...6),
        panturrilha_cm = safe_numeric(...7),
        altura_m = 1.78,
        imc = peso_kg / (altura_m^2),
        secao = section_name
      ) %>%
      select(data, horario, peso_kg, braco_cm, cintura_cm, quadril_cm, panturrilha_cm, altura_m, imc, secao) %>%
      filter(!is.na(data) & !is.na(peso_kg)) %>%
      arrange(data)
    
    cat("Secao", section_name, ":", nrow(data), "registros validos\n")
    return(data)
  }, error = function(e) {
    cat("Erro ao ler secao", section_name, ":", e$message, "\n")
    return(data.frame())
  })
}

# Funcao para gerar grafico de evolucao do peso por secao
generate_weight_comparison_chart <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
  # Filtrar e preparar dados de cada secao
  prep_data <- function(df) {
    if(nrow(df) == 0) return(data.frame())
    df %>% 
      select(data, peso_kg, secao) %>%
      filter(!is.na(data) & !is.na(peso_kg) & is.finite(peso_kg))
  }
  
  all_data <- bind_rows(
    prep_data(duthanga_geral),
    prep_data(duthanga_refeicao),
    prep_data(ganho_peso)
  )
  
  if(nrow(all_data) == 0) {
    cat("Nenhum dado valido para grafico de peso\n")
    return(NULL)
  }
  
  meta_peso <- 73
  
  p <- ggplot(all_data, aes(x = data, y = peso_kg, color = secao)) +
    geom_line(size = 1.2, alpha = 0.8) +
    geom_point(size = 3, alpha = 0.9) +
    geom_hline(yintercept = meta_peso, color = "#4CAF50", linetype = "dashed", size = 1) +
    geom_text(aes(x = max(data, na.rm = TRUE), y = meta_peso + 0.5), 
              label = paste("Meta:", meta_peso, "kg"), 
              color = "#4CAF50", hjust = 1, fontface = "bold", inherit.aes = FALSE) +
    labs(
      title = "Evolucao do Peso por Pratica",
      subtitle = "Comparacao entre praticas budistas e ganho de peso",
      x = "Data",
      y = "Peso (kg)",
      color = "Pratica"
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
    scale_color_manual(values = c("Duthanga Geral" = "#FF6B6B", 
                                  "Duthanga Uma Refeicao" = "#4ECDC4", 
                                  "Ganho de Peso" = "#45B7D1")) +
    scale_x_date(date_labels = "%m/%d", date_breaks = "1 week")
  
  ggsave("charts/weight_comparison.png", plot = p, width = 14, height = 8, dpi = 300, bg = "white")
  cat("Grafico de peso salvo: charts/weight_comparison.png\n")
  return(p)
}

# Funcao para gerar grafico de medidas corporais por secao
generate_measurements_by_section <- function(section_data, section_name) {
  if(is.null(section_data) || nrow(section_data) == 0) {
    cat("Sem dados para medidas de", section_name, "\n")
    return(NULL)
  }
  
  measurements_long <- section_data %>%
    select(data, braco_cm, cintura_cm, quadril_cm, panturrilha_cm) %>%
    filter(!is.na(data)) %>%
    pivot_longer(cols = -data, names_to = "medida", values_to = "valor") %>%
    filter(!is.na(valor) & is.finite(valor)) %>%
    mutate(
      medida = case_when(
        medida == "braco_cm" ~ "Braco",
        medida == "cintura_cm" ~ "Cintura", 
        medida == "quadril_cm" ~ "Quadril",
        medida == "panturrilha_cm" ~ "Panturrilha",
        TRUE ~ medida
      )
    )
  
  if(nrow(measurements_long) == 0) {
    cat("Nenhuma medida valida para", section_name, "\n")
    return(NULL)
  }
  
  p <- ggplot(measurements_long, aes(x = data, y = valor, color = medida)) +
    geom_line(size = 1.1, alpha = 0.8) +
    geom_point(size = 2.5, alpha = 0.9) +
    labs(
      title = paste("Medidas Corporais -", section_name),
      subtitle = "Evolucao das medidas antropometricas",
      x = "Data",
      y = "Medida (cm)",
      color = "Regiao"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(size = 14, face = "bold", color = "#333"),
      plot.subtitle = element_text(size = 10, color = "#666"),
      axis.title = element_text(size = 10, face = "bold"),
      axis.text = element_text(size = 9),
      legend.title = element_text(size = 10, face = "bold"),
      legend.text = element_text(size = 9),
      panel.grid.minor = element_blank(),
      panel.background = element_rect(fill = "white", color = NA),
      plot.background = element_rect(fill = "white", color = NA)
    ) +
    scale_color_brewer(type = "qual", palette = "Set2") +
    scale_x_date(date_labels = "%m/%d", date_breaks = "1 week") +
    facet_wrap(~medida, scales = "free_y", ncol = 2)
  
  filename <- paste0("charts/measurements_", gsub(" ", "_", tolower(section_name)), ".png")
  ggsave(filename, plot = p, width = 12, height = 8, dpi = 300, bg = "white")
  cat("Grafico de medidas salvo:", filename, "\n")
  return(p)
}

# Funcao para gerar grafico de IMC comparativo
generate_imc_comparison <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
  # Filtrar e preparar dados de cada secao
  prep_data <- function(df) {
    if(nrow(df) == 0) return(data.frame())
    df %>% 
      select(data, imc, secao) %>%
      filter(!is.na(data) & !is.na(imc) & is.finite(imc))
  }
  
  all_data <- bind_rows(
    prep_data(duthanga_geral),
    prep_data(duthanga_refeicao),
    prep_data(ganho_peso)
  )
  
  if(nrow(all_data) == 0) {
    cat("Nenhum dado valido para grafico de IMC\n")
    return(NULL)
  }
  
  p <- ggplot(all_data, aes(x = data, y = imc, color = secao)) +
    geom_line(size = 1.2, alpha = 0.8) +
    geom_point(size = 3, alpha = 0.9) +
    geom_hline(yintercept = 18.5, color = "#ff9800", linetype = "dotted", alpha = 0.7) +
    geom_hline(yintercept = 25, color = "#f44336", linetype = "dashed", alpha = 0.7) +
    geom_hline(yintercept = 30, color = "#e91e63", linetype = "dashed", alpha = 0.7) +
    annotate("text", x = max(all_data$data, na.rm = TRUE), y = 18.5, label = "Abaixo do peso", 
             hjust = 1, vjust = -0.5, size = 3, color = "#ff9800") +
    annotate("text", x = max(all_data$data, na.rm = TRUE), y = 25, label = "Sobrepeso", 
             hjust = 1, vjust = -0.5, size = 3, color = "#f44336") +
    labs(
      title = "Evolucao do IMC por Pratica",
      subtitle = "Acompanhamento do indice de massa corporal",
      x = "Data",
      y = "IMC",
      color = "Pratica"
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
    scale_color_manual(values = c("Duthanga Geral" = "#FF6B6B", 
                                  "Duthanga Uma Refeicao" = "#4ECDC4", 
                                  "Ganho de Peso" = "#45B7D1")) +
    scale_x_date(date_labels = "%m/%d", date_breaks = "1 week")
  
  ggsave("charts/imc_comparison.png", plot = p, width = 14, height = 8, dpi = 300, bg = "white")
  cat("Grafico de IMC salvo: charts/imc_comparison.png\n")
  return(p)
}

# Funcao para gerar tabela HTML completa (SOMENTE DUTHANGA GERAL)
generate_complete_table <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
  # Usar somente dados da Duthanga Geral para evitar duplicacao
  all_data <- duthanga_geral %>%
    arrange(desc(data)) %>%
    mutate(
      data_formatada = format(data, "%d/%m/%Y"),
      imc_formatado = round(imc, 1)
    )
  
  if(nrow(all_data) == 0) {
    html_content <- "<p class='text-muted'>Nenhum dado disponivel ainda. Dados serao carregados na proxima atualizacao.</p>"
    writeLines(html_content, "charts/complete_table.html")
    cat("Tabela vazia criada: charts/complete_table.html\n")
    return(html_content)
  }
  
  html_table <- paste0(
    '<div class="table-responsive">',
    '<table class="table table-striped table-hover" id="complete-data-table">',
    '<thead class="table-dark">',
    '<tr>',
    '<th>Data</th>',
    '<th>Horario</th>',
    '<th>Peso (kg)</th>',
    '<th>Braco (cm)</th>',
    '<th>Cintura (cm)</th>',
    '<th>Quadril (cm)</th>',
    '<th>Panturrilha (cm)</th>',
    '<th>IMC</th>',
    '<th>Pratica</th>',
    '</tr>',
    '</thead>',
    '<tbody>'
  )
  
  for(i in 1:nrow(all_data)) {
    row <- all_data[i, ]
    
    # Badge sempre primary para Duthanga Geral
    badge_color <- "primary"
    
    html_table <- paste0(html_table,
      '<tr>',
      '<td>', row$data_formatada, '</td>',
      '<td>', ifelse(is.na(row$horario), '-', row$horario), '</td>',
      '<td>', sprintf("%.1f", row$peso_kg), '</td>',
      '<td>', ifelse(is.na(row$braco_cm), '-', sprintf("%.1f", row$braco_cm)), '</td>',
      '<td>', ifelse(is.na(row$cintura_cm), '-', sprintf("%.1f", row$cintura_cm)), '</td>',
      '<td>', ifelse(is.na(row$quadril_cm), '-', sprintf("%.1f", row$quadril_cm)), '</td>',
      '<td>', ifelse(is.na(row$panturrilha_cm), '-', sprintf("%.1f", row$panturrilha_cm)), '</td>',
      '<td>', row$imc_formatado, '</td>',
      '<td><span class="badge bg-', badge_color, '">', row$secao, '</span></td>',
      '</tr>'
    )
  }
  
  html_table <- paste0(html_table,
    '</tbody>',
    '</table>',
    '</div>',
    '<script>',
    'if(typeof jQuery !== "undefined" && jQuery.fn.DataTable) {',
    '  jQuery(document).ready(function() {',
    '    jQuery("#complete-data-table").DataTable({',
    '      "order": [[ 0, "desc" ]],',
    '      "pageLength": 25,',
    '      "language": {',
    '        "url": "//cdn.datatables.net/plug-ins/1.10.24/i18n/Portuguese-Brasil.json"',
    '      }',
    '    });',
    '  });',
    '}',
    '</script>'
  )
  
  writeLines(html_table, "charts/complete_table.html")
  cat("Tabela HTML gerada: charts/complete_table.html\n")
  return(html_table)
}

# Funcao para gerar dados JSON para a pagina web
generate_json_data <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
  latest_geral <- if(nrow(duthanga_geral) > 0) tail(duthanga_geral, 1) else NULL
  latest_refeicao <- if(nrow(duthanga_refeicao) > 0) tail(duthanga_refeicao, 1) else NULL
  latest_peso <- if(nrow(ganho_peso) > 0) tail(ganho_peso, 1) else NULL
  
  all_latest <- list()
  if(!is.null(latest_geral)) all_latest[["geral"]] <- latest_geral
  if(!is.null(latest_refeicao)) all_latest[["refeicao"]] <- latest_refeicao
  if(!is.null(latest_peso)) all_latest[["peso"]] <- latest_peso
  
  if(length(all_latest) > 0) {
    dates <- sapply(all_latest, function(x) as.Date(x$data))
    most_recent <- all_latest[[which.max(dates)]]
  } else {
    most_recent <- list(peso_kg = 70, imc = 22.9)
  }
  
  # Garantir valores numericos validos
  current_weight <- ifelse(is.null(most_recent$peso_kg) || is.na(most_recent$peso_kg), 70, most_recent$peso_kg)
  current_imc <- ifelse(is.null(most_recent$imc) || is.na(most_recent$imc), 22.9, most_recent$imc)
  
  summary_data <- list(
    last_update = format(Sys.time(), "%Y-%m-%d %H:%M:%S"),
    current_weight = current_weight,
    current_imc = round(current_imc, 1),
    goal_weight = 73,
    progress_to_goal = 73 - current_weight,
    sections = list(
      duthanga_geral = list(
        records = nrow(duthanga_geral),
        latest_date = if(nrow(duthanga_geral) > 0) format(max(duthanga_geral$data, na.rm = TRUE), "%Y-%m-%d") else NULL
      ),
      duthanga_refeicao = list(
        records = nrow(duthanga_refeicao),
        latest_date = if(nrow(duthanga_refeicao) > 0) format(max(duthanga_refeicao$data, na.rm = TRUE), "%Y-%m-%d") else NULL
      ),
      ganho_peso = list(
        records = nrow(ganho_peso),
        latest_date = if(nrow(ganho_peso) > 0) format(max(ganho_peso$data, na.rm = TRUE), "%Y-%m-%d") else NULL
      )
    )
  )
  
  write_json(summary_data, "charts/dashboard_data.json", pretty = TRUE)
  cat("JSON gerado: charts/dashboard_data.json\n")
  return(summary_data)
}

# Funcao principal
main <- function() {
  cat("Iniciando geracao de dashboard budista...\n")
  
  if(!dir.exists("charts")) dir.create("charts")
  
  cat("Lendo dados de Duthanga Geral (linha 2+)...\n")
  duthanga_geral <- read_section_data(2, "Duthanga Geral")
  
  cat("Lendo dados de Duthanga Uma Refeicao (linha 32+)...\n")
  duthanga_refeicao <- read_section_data(32, "Duthanga Uma Refeicao")
  
  cat("Lendo dados de Ganho de Peso (linha 47+)...\n")
  ganho_peso <- read_section_data(47, "Ganho de Peso")
  
  total_records <- nrow(duthanga_geral) + nrow(duthanga_refeicao) + nrow(ganho_peso)
  
  if(total_records == 0) {
    cat("Erro: Nenhum dado valido encontrado em nenhuma secao.\n")
    return(FALSE)
  }
  
  cat("Gerando grafico comparativo de peso...\n")
  generate_weight_comparison_chart(duthanga_geral, duthanga_refeicao, ganho_peso)
  
  cat("Gerando graficos de medidas corporais...\n")
  if(nrow(duthanga_geral) > 0) generate_measurements_by_section(duthanga_geral, "Duthanga Geral")
  if(nrow(duthanga_refeicao) > 0) generate_measurements_by_section(duthanga_refeicao, "Duthanga Uma Refeicao")
  if(nrow(ganho_peso) > 0) generate_measurements_by_section(ganho_peso, "Ganho de Peso")
  
  cat("Gerando grafico comparativo de IMC...\n")
  generate_imc_comparison(duthanga_geral, duthanga_refeicao, ganho_peso)
  
  cat("Gerando tabela HTML completa...\n")
  generate_complete_table(duthanga_geral, duthanga_refeicao, ganho_peso)
  
  cat("Gerando dados JSON...\n")
  generate_json_data(duthanga_geral, duthanga_refeicao, ganho_peso)
  
  cat("Dashboard budista gerado com sucesso!\n")
  return(TRUE)
}

if(!interactive()) {
  main()
}
