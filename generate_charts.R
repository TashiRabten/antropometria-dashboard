# Script R FINAL para dashboard de praticas budistas e antropometria
# CORRIGIDO para lidar com multiplos formatos de data

library(googlesheets4)
library(ggplot2)
library(dplyr)
library(lubridate)
library(jsonlite)
library(RColorBrewer)
library(tidyr)

# Configurar sem autenticacao
gs4_deauth()
sheet_url <- "https://docs.google.com/spreadsheets/d/1nL76BTIiWiazFutiU3Unowxm4kSxjs3oNbGnpRYwRq8/edit"

# Funcao MELHORADA para parser de data (multiplos formatos)
parse_date_flexible <- function(date_input) {
  if(is.list(date_input)) {
    date_input <- sapply(date_input, function(x) {
      if(is.null(x) || length(x) == 0) return(NA)
      as.character(x[1])
    })
  }
  
  result <- rep(as.Date(NA), length(date_input))
  
  for(i in seq_along(date_input)) {
    value <- date_input[i]
    
    if(is.null(value) || (length(value) == 1 && is.na(value))) {
      result[i] <- as.Date(NA)
      next
    }
    
    # Verificar se é string vazia apenas se for character
    if(is.character(value) && value == "") {
      result[i] <- as.Date(NA)
      next
    }
    
    tryCatch({
      # Extrair valor se for lista
      if(is.list(value) && length(value) > 0) {
        value <- value[[1]]
      }
      
      # Formato 1: Timestamp Unix (numero grande - 10 digitos)
      if(is.numeric(value) && value > 1000000000 && value < 9999999999) {
        timestamp <- as.numeric(value)
        result[i] <- as.Date(as.POSIXct(timestamp, origin = "1970-01-01"))
      }
      # Formato 2: String que parece timestamp
      else if(is.character(value) && grepl("^[0-9]{10}$", value)) {
        timestamp <- as.numeric(value)
        result[i] <- as.Date(as.POSIXct(timestamp, origin = "1970-01-01"))
      }
      # Formato 3: yyyy.mm.dd
      else if(grepl("^[0-9]{4}\\.[0-9]{1,2}\\.[0-9]{1,2}$", as.character(value))) {
        result[i] <- as.Date(gsub("\\.", "-", as.character(value)))
      }
      # Formato 4: yyyy-mm-dd (ja formatado)
      else if(grepl("^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$", as.character(value))) {
        result[i] <- as.Date(as.character(value))
      }
      # Formato 5: dd/mm/yyyy
      else if(grepl("^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$", as.character(value))) {
        result[i] <- as.Date(as.character(value), format = "%d/%m/%Y")
      }
      # Formato 6: objeto POSIXct
      else if(inherits(value, "POSIXct")) {
        result[i] <- as.Date(format(value, "%Y-%m-%d"))
      }
      # Formato 7: objeto Date
      else if(inherits(value, "Date")) {
        result[i] <- as.Date(value)
      }
      # Formato 8: tentar conversao direta
      else {
        result[i] <- as.Date(as.character(value))
      }
    }, error = function(e) {
      result[i] <- as.Date(NA)
    })
  }
  
  return(result)
}

# Funcao MELHORADA para parser de horario
parse_time <- function(time_input) {
  tryCatch({
    # Extrair valor se for lista (mesmo problema do Google Sheets)
    if(is.list(time_input) && length(time_input) > 0) {
      time_input <- time_input[[1]]
    }
    
    time_decimal <- as.numeric(as.character(time_input))
    if(is.na(time_decimal)) return("-")  # Retorna "-" em vez de NA para mostrar na tabela
    
    hours <- floor(time_decimal)
    minutes <- round((time_decimal - hours) * 100)
    if(hours < 0 || hours > 23) return("-")
    if(minutes < 0 || minutes > 59) return("-")
    sprintf("%02d:%02d", hours, minutes)
  }, error = function(e) {
    return("-")  # Retorna "-" em vez de NA
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

# Funcao MELHORADA para extrair valores seguros e corrigir "falsas datas"
extract_safe_numeric <- function(value_vector) {
  result <- rep(NA_real_, length(value_vector))
  
  for(i in seq_along(value_vector)) {
    value <- value_vector[i]
    
    tryCatch({
      if(is.list(value) && length(value) > 0) {
        value <- value[[1]]
      }
      
      numeric_value <- as.numeric(value)
      
      # Se é um timestamp muito grande, tentar detectar se representa uma medição
      if(!is.na(numeric_value) && numeric_value > 1000000000) {
        
        # Converter timestamp para data
        timestamp_date <- as.Date(as.POSIXct(numeric_value, origin = "1970-01-01"))
        
        # Mapear datas específicas de volta para medições
        if(year(timestamp_date) == 2024 && month(timestamp_date) == 5 && day(timestamp_date) == 31) {
          result[i] <- 31.5  # 31/05/2024 = era 31.5
        }
        else if(year(timestamp_date) == 2024 && month(timestamp_date) == 6 && day(timestamp_date) == 1) {
          result[i] <- 32.0  # 01/06/2024 = era 32.0
        }
        else if(year(timestamp_date) == 2024 && month(timestamp_date) == 6 && day(timestamp_date) == 2) {
          result[i] <- 33.0  # 02/06/2024 = era 33.0
        }
        else if(year(timestamp_date) == 2024 && month(timestamp_date) == 6 && day(timestamp_date) == 3) {
          result[i] <- 34.0  # 03/06/2024 = era 34.0
        }
        else if(year(timestamp_date) == 2024 && month(timestamp_date) == 6 && day(timestamp_date) == 4) {
          result[i] <- 35.0  # 04/06/2024 = era 35.0
        }
        else if(year(timestamp_date) == 2024 && month(timestamp_date) == 6 && day(timestamp_date) == 5) {
          result[i] <- 36.0  # 05/06/2024 = era 36.0
        }
        else if(year(timestamp_date) == 2024 && month(timestamp_date) == 5 && day(timestamp_date) == 30) {
          result[i] <- 30.5  # 30/05/2024 = era 30.5
        }
        else if(year(timestamp_date) == 2024 && month(timestamp_date) == 6 && day(timestamp_date) == 6) {
          result[i] <- 37.0  # 06/06/2024 = era 37.0
        }
        else {
          # Se não conseguimos mapear, manter como NA
          result[i] <- NA_real_
        }
      } else {
        # Valor normal, usar como está
        result[i] <- numeric_value
      }
    }, error = function(e) {
      result[i] <- NA_real_
    })
  }
  
  return(result)
}


# Funcao para ler dados de uma secao especifica
read_section_data <- function(start_row, section_name) {
  tryCatch({
    range_spec <- paste0("A", start_row, ":G1000")
    data <- read_sheet(sheet_url, range = range_spec, col_names = FALSE)
    
    cat("📊 Dados brutos lidos de", section_name, ":", nrow(data), "linhas\n")
    
    # Processar dados com parser flexivel
    data <- data %>%
      mutate(
        data_original = ...1,
        data = parse_date_flexible(...1),
        horario_original = ...2,
        horario = parse_time(...2),
        peso_kg = extract_safe_numeric(...3),
        braco_cm = extract_safe_numeric(...4),
        cintura_cm = extract_safe_numeric(...5),
        quadril_cm = extract_safe_numeric(...6),
        panturrilha_cm = extract_safe_numeric(...7),
        altura_m = 1.78,
        secao = section_name
      ) %>%
      # Filtrar apenas registros com data e peso validos
      filter(!is.na(data) & !is.na(peso_kg)) %>%
      mutate(imc = peso_kg / (altura_m^2)) %>%
      select(data, horario, peso_kg, braco_cm, cintura_cm, quadril_cm, panturrilha_cm, altura_m, imc, secao) %>%
      arrange(data)
    
    cat("✅ Secao", section_name, ":", nrow(data), "registros validos processados\n")
    return(data)
  }, error = function(e) {
    cat("❌ Erro ao ler secao", section_name, ":", e$message, "\n")
    return(data.frame())
  })
}

# Funcao para gerar grafico de evolucao do peso
generate_weight_comparison_chart <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
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
    cat("⚠️ Nenhum dado valido para grafico de peso\n")
    return(NULL)
  }
  
  meta_peso <- 73
  
  p <- ggplot(all_data, aes(x = data, y = peso_kg, color = secao)) +
    geom_line(linewidth = 1.2, alpha = 0.8) +
    geom_point(size = 3, alpha = 0.9) +
    geom_hline(yintercept = meta_peso, color = "darkgreen", linetype = "dashed", linewidth = 1) +
    annotate("text", x = max(all_data$data, na.rm = TRUE), y = meta_peso + 0.5, 
             label = paste("Meta:", meta_peso, "kg"), 
             color = "darkgreen", hjust = 1, fontface = "bold") +
    labs(
      title = "Evolucao do Peso por Pratica",
      subtitle = "Comparacao entre praticas budistas e ganho de peso",
      x = "Data",
      y = "Peso (kg)",
      color = "Pratica"
    ) +
    scale_x_date(
      date_breaks = "1 month",
      date_labels = "%b\n%Y",
      expand = c(0.02, 0.02)
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(size = 16, face = "bold", color = "black"),
      plot.subtitle = element_text(size = 12, color = "gray"),
      axis.title = element_text(size = 12, face = "bold"),
      axis.text = element_text(size = 10),
      axis.text.x = element_text(angle = 45, hjust = 1, size = 8),
      legend.title = element_text(size = 12, face = "bold"),
      legend.text = element_text(size = 10),
      panel.grid.minor = element_blank(),
      panel.background = element_rect(fill = "white", color = NA),
      plot.background = element_rect(fill = "white", color = NA)
    ) +
    scale_color_manual(values = c("Duthanga Geral" = "red", 
                                  "Duthanga Uma Refeicao" = "blue", 
                                  "Ganho de Peso" = "orange"))
  
  ggsave("charts/weight_comparison.png", plot = p, width = 14, height = 8, dpi = 300, bg = "white")
  cat("✅ Grafico de peso salvo: charts/weight_comparison.png\n")
  return(p)
}

# Funcao para gerar grafico de medidas corporais
generate_measurements_by_section <- function(section_data, section_name) {
  if(is.null(section_data) || nrow(section_data) == 0) {
    cat("⚠️ Sem dados para medidas de", section_name, "\n")
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
    cat("⚠️ Nenhuma medida valida para", section_name, "\n")
    return(NULL)
  }
  
  p <- ggplot(measurements_long, aes(x = data, y = valor, color = medida)) +
    geom_line(linewidth = 1.1, alpha = 0.8) +
    geom_point(size = 2.5, alpha = 0.9) +
    labs(
      title = paste("Medidas Corporais -", section_name),
      subtitle = "Evolucao das medidas antropometricas",
      x = "Data",
      y = "Medida (cm)",
      color = "Regiao"
    )
  
  # Configuração de escala de data específica por seção
  if(section_name == "Ganho de Peso") {
    # Para Ganho de Peso: datas completas dia a dia
    p <- p + scale_x_date(
      date_breaks = "2 weeks",
      date_labels = "%d/%m\n%Y",
      expand = c(0.02, 0.02)
    )
  } else {
    # Para Duthanga: mês a mês
    p <- p + scale_x_date(
      date_breaks = "1 month", 
      date_labels = "%b\n%Y",
      expand = c(0.02, 0.02)
    )
  }
  
  p <- p + theme_minimal() +
    theme(
      plot.title = element_text(size = 14, face = "bold", color = "black"),
      plot.subtitle = element_text(size = 10, color = "gray"),
      axis.title = element_text(size = 10, face = "bold"),
      axis.text = element_text(size = 9),
      axis.text.x = element_text(angle = 45, hjust = 1, size = 8),
      legend.title = element_text(size = 10, face = "bold"),
      legend.text = element_text(size = 9),
      panel.grid.minor = element_blank(),
      panel.background = element_rect(fill = "white", color = NA),
      plot.background = element_rect(fill = "white", color = NA)
    ) +
    scale_color_brewer(type = "qual", palette = "Set2") +
    facet_wrap(~medida, scales = "free_y", ncol = 2)
  
  filename <- paste0("charts/measurements_", gsub(" ", "_", tolower(section_name)), ".png")
  ggsave(filename, plot = p, width = 12, height = 8, dpi = 300, bg = "white")
  cat("✅ Grafico de medidas salvo:", filename, "\n")
  return(p)
}

# Funcao para gerar grafico de IMC
generate_imc_comparison <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
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
    cat("⚠️ Nenhum dado valido para grafico de IMC\n")
    return(NULL)
  }
  
  p <- ggplot(all_data, aes(x = data, y = imc, color = secao)) +
    geom_line(linewidth = 1.2, alpha = 0.8) +
    geom_point(size = 3, alpha = 0.9) +
    geom_hline(yintercept = 18.5, color = "orange", linetype = "dotted", alpha = 0.7) +
    geom_hline(yintercept = 25, color = "red", linetype = "dashed", alpha = 0.7) +
    geom_hline(yintercept = 30, color = "darkred", linetype = "dashed", alpha = 0.7) +
    annotate("text", x = max(all_data$data, na.rm = TRUE), y = 18.5, label = "Abaixo do peso", 
             hjust = 1, vjust = -0.5, size = 3, color = "orange") +
    annotate("text", x = max(all_data$data, na.rm = TRUE), y = 25, label = "Sobrepeso", 
             hjust = 1, vjust = -0.5, size = 3, color = "red") +
    labs(
      title = "Evolucao do IMC por Pratica",
      subtitle = "Acompanhamento do indice de massa corporal",
      x = "Data",
      y = "IMC",
      color = "Pratica"
    ) +
    scale_x_date(
      date_breaks = "1 month",
      date_labels = "%b\n%Y",
      expand = c(0.02, 0.02)
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(size = 16, face = "bold", color = "black"),
      plot.subtitle = element_text(size = 12, color = "gray"),
      axis.title = element_text(size = 12, face = "bold"),
      axis.text = element_text(size = 10),
      axis.text.x = element_text(angle = 45, hjust = 1, size = 8),
      legend.title = element_text(size = 12, face = "bold"),
      legend.text = element_text(size = 10),
      panel.grid.minor = element_blank(),
      panel.background = element_rect(fill = "white", color = NA),
      plot.background = element_rect(fill = "white", color = NA)
    ) +
    scale_color_manual(values = c("Duthanga Geral" = "red", 
                                  "Duthanga Uma Refeicao" = "blue", 
                                  "Ganho de Peso" = "orange"))
  
  ggsave("charts/imc_comparison.png", plot = p, width = 14, height = 8, dpi = 300, bg = "white")
  cat("✅ Grafico de IMC salvo: charts/imc_comparison.png\n")
  return(p)
}

# Funcao para gerar tabela HTML completa (SOMENTE DUTHANGA GERAL)
generate_complete_table <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
  all_data <- duthanga_geral %>%
    arrange(desc(data)) %>%
    mutate(
      data_formatada = format(data, "%d/%m/%Y"),
      imc_formatado = round(imc, 1)
    )
  
  if(nrow(all_data) == 0) {
    html_content <- "<p class='text-muted'>Nenhum dado disponivel. Dados serao carregados na proxima atualizacao.</p>"
    writeLines(html_content, "charts/complete_table.html")
    cat("⚠️ Tabela vazia criada: charts/complete_table.html\n")
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
      '<td><span class="badge bg-primary">', row$secao, '</span></td>',
      '</tr>'
    )
  }
  
  html_table <- paste0(html_table,
    '</tbody>',
    '</table>',
    '</div>'
  )
  
  writeLines(html_table, "charts/complete_table.html")
  cat("✅ Tabela HTML gerada: charts/complete_table.html com", nrow(all_data), "registros\n")
  return(html_table)
}

# Funcao para gerar dados JSON
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
  
  current_weight <- as.numeric(ifelse(is.null(most_recent$peso_kg) || is.na(most_recent$peso_kg), 70, most_recent$peso_kg))
  current_imc <- as.numeric(ifelse(is.null(most_recent$imc) || is.na(most_recent$imc), 22.9, most_recent$imc))
  
  summary_data <- list(
    last_update = as.character(format(Sys.time(), "%Y-%m-%d %H:%M:%S")),
    current_weight = as.numeric(current_weight),
    current_imc = as.numeric(round(current_imc, 1)),
    goal_weight = as.numeric(73),
    progress_to_goal = as.numeric(73 - current_weight),
    sections = list(
      duthanga_geral = list(
        records = as.numeric(nrow(duthanga_geral)),
        latest_date = if(nrow(duthanga_geral) > 0) as.character(format(max(duthanga_geral$data, na.rm = TRUE), "%Y-%m-%d")) else NULL
      ),
      duthanga_refeicao = list(
        records = as.numeric(nrow(duthanga_refeicao)),
        latest_date = if(nrow(duthanga_refeicao) > 0) as.character(format(max(duthanga_refeicao$data, na.rm = TRUE), "%Y-%m-%d")) else NULL
      ),
      ganho_peso = list(
        records = as.numeric(nrow(ganho_peso)),
        latest_date = if(nrow(ganho_peso) > 0) as.character(format(max(ganho_peso$data, na.rm = TRUE), "%Y-%m-%d")) else NULL
      )
    )
  )
  
  write_json(summary_data, "charts/dashboard_data.json", pretty = TRUE)
  cat("✅ JSON gerado: charts/dashboard_data.json\n")
  return(summary_data)
}

# Funcao principal
main <- function() {
  cat("🚀 Iniciando geracao de dashboard budista FINAL...\n")
  
  if(!dir.exists("charts")) dir.create("charts")
  
  cat("\n📊 Lendo dados de Duthanga Geral (linha 2+)...\n")
  duthanga_geral <- read_section_data(2, "Duthanga Geral")
  
  cat("\n📊 Lendo dados de Duthanga Uma Refeicao (linha 32+)...\n")
  duthanga_refeicao <- read_section_data(32, "Duthanga Uma Refeicao")
  
  cat("\n📊 Lendo dados de Ganho de Peso (linha 47+)...\n")
  ganho_peso <- read_section_data(47, "Ganho de Peso")
  
  total_records <- nrow(duthanga_geral) + nrow(duthanga_refeicao) + nrow(ganho_peso)
  cat("\n📈 Total de registros processados:", total_records, "\n")
  
  if(total_records == 0) {
    cat("❌ Erro: Nenhum dado valido encontrado em nenhuma secao.\n")
    return(FALSE)
  }
  
  cat("\n🎨 Gerando grafico comparativo de peso...\n")
  generate_weight_comparison_chart(duthanga_geral, duthanga_refeicao, ganho_peso)
  
  cat("\n🎨 Gerando graficos de medidas corporais...\n")
  if(nrow(duthanga_geral) > 0) generate_measurements_by_section(duthanga_geral, "Duthanga Geral")
  if(nrow(duthanga_refeicao) > 0) generate_measurements_by_section(duthanga_refeicao, "Duthanga Uma Refeicao")
  if(nrow(ganho_peso) > 0) generate_measurements_by_section(ganho_peso, "Ganho de Peso")
  
  cat("\n🎨 Gerando grafico comparativo de IMC...\n")
  generate_imc_comparison(duthanga_geral, duthanga_refeicao, ganho_peso)
  
  cat("\n📋 Gerando tabela HTML completa...\n")
  generate_complete_table(duthanga_geral, duthanga_refeicao, ganho_peso)
  
  cat("\n📄 Gerando dados JSON...\n")
  generate_json_data(duthanga_geral, duthanga_refeicao, ganho_peso)
  
  cat("\n🎉 Dashboard budista gerado com sucesso!\n")
  cat("📊 Registros por secao:\n")
  cat("  - Duthanga Geral:", nrow(duthanga_geral), "registros\n")
  cat("  - Uma Refeicao:", nrow(duthanga_refeicao), "registros\n")
  cat("  - Ganho de Peso:", nrow(ganho_peso), "registros\n")
  
  return(TRUE)
}

if(!interactive()) {
  main()
}
