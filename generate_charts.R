     # Script R completo para dashboard de práticas budistas e antropometria                                                            
     # Conecta com Google Sheets e gera visualizações para 3 seções

     # Carregar bibliotecas necessárias
     library(googlesheets4)
     library(ggplot2)
     library(dplyr)
     library(lubridate)
     library(jsonlite)
     library(RColorBrewer)
     library(tidyr)

     # Configurar autenticação para GitHub Actions
     gs4_deauth()
     gs4_auth(email = "sheets-reader@antropometria-dashboard.iam.gserviceaccount.com",
              path = "auth_token.json")

     # URL da planilha Google Sheets
     sheet_url <-
     "https://docs.google.com/spreadsheets/d/1nL76BTIiWiazFutiU3Unowxm4kSxjs3oNbGnpRYwRq8/edit?usp=drive_web&ouid=111902732217167107299"

     # Função para parser de data (yyyy.mm.dd)
     parse_date <- function(date_string) {
       tryCatch({
         as.Date(gsub("\\.", "-", as.character(date_string)))
       }, error = function(e) {
         return(NA)
       })
     }

     # Função para parser de horário (hh.mm)
     parse_time <- function(time_decimal) {
       tryCatch({
         hours <- floor(time_decimal)
         minutes <- round((time_decimal - hours) * 100)
         sprintf("%02d:%02d", hours, minutes)
       }, error = function(e) {
         return(NA)
       })
     }

     # Função para ler dados de uma seção específica
     read_section_data <- function(start_row, section_name) {
       tryCatch({
         # Ler dados a partir da linha especificada
         range_spec <- paste0("A", start_row, ":G")
         data <- read_sheet(sheet_url, range = range_spec, col_names = FALSE)

         # Definir nomes das colunas
         colnames(data) <- c("data", "horario", "peso_kg", "braco_cm", "cintura_cm", "quadril_cm", "panturrilha_cm")

         # Limpar e processar dados
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
             # Calcular IMC (assumindo altura de 1.75m - ajustar conforme necessário)
             altura_m = 1.75,
             imc = peso_kg / (altura_m^2),
             secao = section_name
           ) %>%
           filter(!is.na(data)) %>%
           arrange(data)

         cat("Seção", section_name, ":", nrow(data), "registros válidos\n")
         return(data)
       }, error = function(e) {
         cat("Erro ao ler seção", section_name, ":", e$message, "\n")
         return(NULL)
       })
     }

     # Função para gerar gráfico de evolução do peso por seção
     generate_weight_comparison_chart <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
       # Combinar dados de todas as seções
       all_data <- bind_rows(
         duthanga_geral %>% select(data, peso_kg, secao),
         duthanga_refeicao %>% select(data, peso_kg, secao),
         ganho_peso %>% select(data, peso_kg, secao)
       ) %>%
       filter(!is.na(peso_kg))

       if(nrow(all_data) == 0) return(NULL)

       # Meta de peso
       meta_peso <- 73

       p <- ggplot(all_data, aes(x = data, y = peso_kg, color = secao)) +
         geom_line(size = 1.2, alpha = 0.8) +
         geom_point(size = 3, alpha = 0.9) +
         geom_hline(yintercept = meta_peso, color = "#4CAF50", linetype = "dashed", size = 1) +
         geom_text(aes(x = max(data, na.rm = TRUE), y = meta_peso + 0.5),
                   label = paste("Meta:", meta_peso, "kg"),
                   color = "#4CAF50", hjust = 1, fontface = "bold", inherit.aes = FALSE) +
         labs(
           title = "Evolução do Peso por Prática",
           subtitle = paste("Comparação entre práticas budistas e ganho de peso"),
           x = "Data",
           y = "Peso (kg)",
           color = "Prática"
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
                                       "Duthanga Uma Refeição" = "#4ECDC4",
                                       "Ganho de Peso" = "#45B7D1")) +
         scale_x_date(date_labels = "%m/%d", date_breaks = "1 week")

       ggsave("charts/weight_comparison.png", plot = p, width = 14, height = 8, dpi = 300, bg = "white")
       return(p)
     }

     # Função para gerar gráfico de medidas corporais por seção
     generate_measurements_by_section <- function(section_data, section_name) {
       if(is.null(section_data) || nrow(section_data) == 0) return(NULL)

       # Preparar dados para visualização
       measurements_long <- section_data %>%
         select(data, braco_cm, cintura_cm, quadril_cm, panturrilha_cm) %>%
         pivot_longer(cols = -data, names_to = "medida", values_to = "valor") %>%
         filter(!is.na(valor)) %>%
         mutate(
           medida = case_when(
             medida == "braco_cm" ~ "Braço",
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
           subtitle = "Evolução das medidas antropométricas",
           x = "Data",
           y = "Medida (cm)",
           color = "Região"
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

     # Função para gerar gráfico de IMC comparativo
     generate_imc_comparison <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
       # Combinar dados de todas as seções
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
           title = "Evolução do IMC por Prática",
           subtitle = "Acompanhamento do índice de massa corporal",
           x = "Data",
           y = "IMC",
           color = "Prática"
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
                                       "Duthanga Uma Refeição" = "#4ECDC4",
                                       "Ganho de Peso" = "#45B7D1")) +
         scale_x_date(date_labels = "%m/%d", date_breaks = "1 week")

       ggsave("charts/imc_comparison.png", plot = p, width = 14, height = 8, dpi = 300, bg = "white")
       return(p)
     }

     # Função para gerar tabela HTML completa
     generate_complete_table <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
       # Combinar todos os dados
       all_data <- bind_rows(
         duthanga_geral,
         duthanga_refeicao,
         ganho_peso
       ) %>%
       arrange(desc(data)) %>%  # Mais recentes primeiro
       mutate(
         data_formatada = format(data, "%d/%m/%Y"),
         imc_formatado = round(imc, 1)
       )

       if(nrow(all_data) == 0) {
         return("<p>Nenhum dado disponível.</p>")
       }

       # Gerar HTML da tabela
       html_table <- paste0(
         '<div class="table-responsive">',
         '<table class="table table-striped table-hover" id="complete-data-table">',
         '<thead class="table-dark">',
         '<tr>',
         '<th>Data</th>',
         '<th>Horário</th>',
         '<th>Peso (kg)</th>',
         '<th>Braço (cm)</th>',
         '<th>Cintura (cm)</th>',
         '<th>Quadril (cm)</th>',
         '<th>Panturrilha (cm)</th>',
         '<th>IMC</th>',
         '<th>Prática</th>',
         '</tr>',
         '</thead>',
         '<tbody>'
       )

       # Adicionar linhas de dados
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
           '<td><span class="badge bg-',
           case_when(
             row$secao == "Duthanga Geral" ~ "primary",
             row$secao == "Duthanga Uma Refeição" ~ "success",
             row$secao == "Ganho de Peso" ~ "info",
             TRUE ~ "secondary"
           ), '">', row$secao, '</span></td>',
           '</tr>'
         )
       }

       html_table <- paste0(html_table,
         '</tbody>',
         '</table>',
         '</div>',
         '<script>',
         '// Adicionar funcionalidade de ordenação se DataTables estiver disponível',
         'if(typeof jQuery !== "undefined" && jQuery.fn.DataTable) {',
         '  jQuery(document).ready(function() {',
         '    jQuery("#complete-data-table").DataTable({',
         '      "order": [[ 0, "desc" ]],',  # Ordenar por data (mais recente primeiro)
         '      "pageLength": 25,',
         '      "language": {',
         '        "url": "//cdn.datatables.net/plug-ins/1.10.24/i18n/Portuguese-Brasil.json"',
         '      }',
         '    });',
         '  });',
         '}',
         '</script>'
       )

       # Salvar tabela HTML
       writeLines(html_table, "charts/complete_table.html")
       cat("Tabela HTML gerada: charts/complete_table.html\n")

       return(html_table)
     }

     # Função para gerar dados JSON para a página web
     generate_json_data <- function(duthanga_geral, duthanga_refeicao, ganho_peso) {
       # Pegar dados mais recentes de cada seção
       latest_geral <- if(nrow(duthanga_geral) > 0) tail(duthanga_geral, 1) else NULL
       latest_refeicao <- if(nrow(duthanga_refeicao) > 0) tail(duthanga_refeicao, 1) else NULL
       latest_peso <- if(nrow(ganho_peso) > 0) tail(ganho_peso, 1) else NULL

       # Determinar dados mais recentes globalmente
       all_latest <- list()
       if(!is.null(latest_geral)) all_latest[["geral"]] <- latest_geral
       if(!is.null(latest_refeicao)) all_latest[["refeicao"]] <- latest_refeicao
       if(!is.null(latest_peso)) all_latest[["peso"]] <- latest_peso

       # Pegar o mais recente por data
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

     # Função principal
     main <- function() {
       cat("Iniciando geração de dashboard budista...\n")

       # Criar diretório charts se não existir
       if(!dir.exists("charts")) dir.create("charts")

       # Ler dados das 3 seções
       cat("Lendo dados de Duthanga Geral (linha 2+)...\n")
       duthanga_geral <- read_section_data(2, "Duthanga Geral")

       cat("Lendo dados de Duthanga Uma Refeição (linha 32+)...\n")
       duthanga_refeicao <- read_section_data(32, "Duthanga Uma Refeição")

       cat("Lendo dados de Ganho de Peso (linha 53+)...\n")
       ganho_peso <- read_section_data(53, "Ganho de Peso")

       # Verificar se temos dados
       if(is.null(duthanga_geral) && is.null(duthanga_refeicao) && is.null(ganho_peso)) {
         cat("Erro: Nenhum dado válido encontrado em nenhuma seção.\n")
         return(FALSE)
       }

       # Gerar gráficos
       cat("Gerando gráfico comparativo de peso...\n")
       generate_weight_comparison_chart(
         if(is.null(duthanga_geral)) data.frame() else duthanga_geral,
         if(is.null(duthanga_refeicao)) data.frame() else duthanga_refeicao,
         if(is.null(ganho_peso)) data.frame() else ganho_peso
       )

       cat("Gerando gráficos de medidas corporais...\n")
       if(!is.null(duthanga_geral)) generate_measurements_by_section(duthanga_geral, "Duthanga Geral")
       if(!is.null(duthanga_refeicao)) generate_measurements_by_section(duthanga_refeicao, "Duthanga Uma Refeição")
       if(!is.null(ganho_peso)) generate_measurements_by_section(ganho_peso, "Ganho de Peso")

       cat("Gerando gráfico comparativo de IMC...\n")
       generate_imc_comparison(
         if(is.null(duthanga_geral)) data.frame() else duthanga_geral,
         if(is.null(duthanga_refeicao)) data.frame() else duthanga_refeicao,
         if(is.null(ganho_peso)) data.frame() else ganho_peso
       )

       cat("Gerando tabela HTML completa...\n")
       generate_complete_table(
         if(is.null(duthanga_geral)) data.frame() else duthanga_geral,
         if(is.null(duthanga_refeicao)) data.frame() else duthanga_refeicao,
         if(is.null(ganho_peso)) data.frame() else ganho_peso
       )

       cat("Gerando dados JSON...\n")
       generate_json_data(
         if(is.null(duthanga_geral)) data.frame() else duthanga_geral,
         if(is.null(duthanga_refeicao)) data.frame() else duthanga_refeicao,
         if(is.null(ganho_peso)) data.frame() else ganho_peso
       )

       cat("Dashboard budista gerado com sucesso!\n")
       return(TRUE)
     }

     # Executar se script for chamado diretamente
     if(!interactive()) {
       main()
     }
