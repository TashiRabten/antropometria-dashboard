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
gs4_auth(email = "sheets-reader@antropometria-dashboard.iam.gserviceaccount.com", 
         path = "auth_token.json")

# URL da planilha Google Sheets
sheet_url <- "https://docs.google.com/spreadsheets/d/1nL76BTIiWiazFutiU3Unowxm4kSxjs3oNbGnpRYwRq8/edit?usp=drive_web&ouid=111902732217167107299"

# Funcao para parser de data (yyyy.mm.dd)
parse_date <- function(date_string) {
  tryCatch({
    as.Date(gsub("\\.", "-", as.character(date_string)))
  }, error = function(e) {
    return(NA)
  })
}

# Funcao para parser de horario (hh.mm ou h.mm)
parse_time <- function(time_input) {
  tryCatch({
    time_decimal <- as.numeric(time_input)
    hours <- floor(time_decimal)
    minutes <- round((time_decimal - hours) * 100)
    if(hours < 0 || hours > 23) return(NA)
    if(minutes < 0 || minutes > 59) return(NA)
    sprintf("%02d:%02d", hours, minutes)
  }, error = function(e) {
    return(NA)
  })
}

# Funcao para ler dados de uma secao especifica
read_section_data <- function(start_row, section_name) {
  tryCatch({
    range_spec <- paste0("A", start_row, ":G")
    data <- read_sheet(sheet_url, range = range_spec, col_names = FALSE)
    
    colnames(data) <- c("data", "horario", "peso_kg", "braco_cm", "cintura_cm", "quadril_cm", "panturrilha_cm")
    
    data <- data %>%
      filter(!is.na(data) & !is.na(peso_kg) & data != "" & peso_kg != "") %>%
      mutate(
        data_original = data,
        data = parse_date(data),
        horario_original = horario,
        horario = parse_time(as.numeric(horario)),
        peso_kg = as.numeric(peso_kg),
        braco_cm = as.numeric(braco_cm),
        cintura_cm = as.numeric(cintura_cm),
        quadril_cm = as.numeric(quadril_cm),
        panturrilha_cm = as.numeric(panturrilha_cm),
        altura_m = 1.78,
        imc = peso_kg / (altura_m^2),
        secao = section_name
      ) %>%
      filter(!is.na(data)) %>%
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
  all_data <- bind_rows(
    duthanga_geral %>% select(data, peso_kg, secao),
    duthanga_refeicao %>% select(data, peso_kg, secao),
    ganho_peso %>% select(data, peso_kg, secao)
  ) %>%
  filter(!is.na(peso_kg))
  
  if(nrow(all_data) == 0) return(NULL)
  
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
  return(p)
}

# Funcao para gerar grafico de medidas corporais por secao
generate_measurements_by_section <- function(section_data, section_name) {
  if(is.null(section_data) || nrow(section_data) == 0) return(NULL)
  
  measurements_long <- section_data %>%
    select(data, braco_cm, cintura_cm, quadril_cm, panturrilha_cm) %>%
    pivot_longer(cols = -data, names_to = "medida", values_to = "valor") %>%
    filter(!is.na(valor)) %>%
    mutate(
      medida = case_when(
        medida == "braco_cm" ~ "Braco",
        medida == "cintura_cm" ~ "Cintura", 
        medida == "quadril_cm" ~ "Quadril",
        medida == "panturrilha_cm" ~ "Panturrilha"
      )
    )
  
  if(nrow(measurements_long) == 0) return(NULL)
  
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
  return(p)
}

# Funcao para gerar grafico de IMC comparativo
generate_imc_comparison <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
  all_data <- bind_rows(
    duthanga_geral %>% select(data, imc, secao),
    duthanga_refeicao %>% select(data, imc, secao),
    ganho_peso %>% select(data, imc, secao)
  ) %>%
  filter(!is.na(imc))
  
  if(nrow(all_data) == 0) return(NULL)
  
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
  return(p)
}

# Funcao para gerar tabela HTML completa
generate_complete_table <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
  all_data <- bind_rows(
    duthanga_geral,
    duthanga_refeicao,
    ganho_peso
  ) %>%
  arrange(desc(data)) %>%
  mutate(
    data_formatada = format(data, "%d/%m/%Y"),
    imc_formatado = round(imc, 1)
  )
  
  if(nrow(all_data) == 0) {
    return("<p>Nenhum dado disponivel.</p>")
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
    
    badge_color <- "secondary"
    if(row$secao == "Duthanga Geral") badge_color <- "primary"
    if(row$secao == "Duthanga Uma Refeicao") badge_color <- "success"
    if(row$secao == "Ganho de Peso") badge_color <- "info"
    
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
    dates <- sapply(all_latest, function(x) x$data)
    most_recent <- all_latest[[which.max(dates)]]
  } else {
    most_recent <- list(peso_kg = 70, imc = 22.9)
  }
  
  summary_data <- list(
    last_update = format(Sys.time(), "%Y-%m-%d %H:%M:%S"),
    current_weight = most_recent$peso_kg,
    current_imc = round(most_recent$imc, 1),
    goal_weight = 73,
    progress_to_goal = 73 - most_recent$peso_kg,
    sections = list(
      duthanga_geral = list(
        records = nrow(duthanga_geral),
        latest_date = if(nrow(duthanga_geral) > 0) format(max(duthanga_geral$data), "%Y-%m-%d") else NULL
      ),
      duthanga_refeicao = list(
        records = nrow(duthanga_refeicao),
        latest_date = if(nrow(duthanga_refeicao) > 0) format(max(duthanga_refeicao$data), "%Y-%m-%d") else NULL
      ),
      ganho_peso = list(
        records = nrow(ganho_peso),
        latest_date = if(nrow(ganho_peso) > 0) format(max(ganho_peso$data), "%Y-%m-%d") else NULL
      )
    )
  )
  
  write_json(summary_data, "charts/data.json", pretty = TRUE)
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
  
  if(nrow(duthanga_geral) == 0 && nrow(duthanga_refeicao) == 0 && nrow(ganho_peso) == 0) {
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

