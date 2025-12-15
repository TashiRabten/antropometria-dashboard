// Lab Parser - Handles 5 different lab formats
// 1. MyChart Single-Date Format
// 2. Follow My Health Format
// 3. MyChart Period Format (multi-date)
// 4. Chart Labs (JPG OCR)
// 5. UI Health Pathology Laboratories Format

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3/build/pdf.worker.min.js';

// Global lab data
let allLabs = [];
let labsData = {};
let isScanning = false; // Flag to prevent multiple simultaneous scans

// Scan lab files from Firestore (Firebase version)
async function scanLabFiles() {
    // Prevent multiple simultaneous scans
    if (isScanning) {
        console.log('⏸️ Scan já em andamento, ignorando chamada duplicada');
        return;
    }

    isScanning = true;
    console.log('🔍 Iniciando scan de exames do Firestore...');

    try {
        document.getElementById('labs-loading').style.display = 'block';
        document.getElementById('labs-list').style.display = 'none';

        // Get current user
        const userId = firebaseAuth.getCurrentUserId();
        if (!userId) {
            console.warn('⚠️ Usuário não autenticado, não é possível carregar labs');
            isScanning = false;
            return;
        }

        // Set up real-time listener for labs
        const unsubscribe = firebaseDB.listen(
            userId,
            (labs) => {
                // Callback when labs data changes
                console.log(`📦 ${labs.length} exame(s) carregado(s) do Firestore`);

                allLabs = labs;

                // Update summary stats
                updateSummaryStats();

                // Display labs
                displayLabs(labs);

                console.log(`✅ Labs atualizados: ${labs.length} exames`);

                // Initialize charts with loaded data
                if (typeof initializeTrendChart === 'function') {
                    initializeTrendChart();
                }
                if (typeof initializeComparisonChart === 'function') {
                    initializeComparisonChart();
                }
            },
            (error) => {
                // Error callback
                console.error('❌ Erro no listener de labs:', error);
                alert('Erro ao carregar exames. Verifique o console.');
            }
        );

        // Store unsubscribe function for cleanup
        window.labsListenerUnsubscribe = unsubscribe;

        console.log('✅ Listener do Firestore configurado (real-time sync ativado)');

    } catch (error) {
        console.error('❌ Erro fatal no scan:', error);
        alert('Erro ao carregar exames. Verifique o console.');
    } finally {
        isScanning = false;
        console.log('🏁 Scan finalizado');
    }
}

// DEPRECATED: IndexedDB functions (kept for reference, not used with Firebase)
// Firebase version uses direct download URLs from Cloud Storage

// // Create blob URL from stored file data
// function createBlobUrl(fileData) {
//     if (fileData.type.startsWith('image/')) {
//         // For images, data is already a data URL
//         return fileData.data;
//     } else {
//         // For PDFs, create blob from ArrayBuffer
//         const blob = new Blob([fileData.data], { type: fileData.type });
//         return URL.createObjectURL(blob);
//     }
// }

// // Process a stored file from IndexedDB
// async function processStoredFile(fileData) {
//     // DEPRECATED: Firebase version handles parsing during upload
//     // See labs-upload.js parseFileForFirebase()
// }

// Clean lab type - remove garbage from extracted lab type names
function cleanLabType(labType) {
    if (!labType) return 'Exame';
    return labType
        .replace(/^(CA|No,?\s*PCP)\s+/gi, '')  // Remove "CA " or "No, PCP " prefix
        .replace(/\s+(NAME|VALUE|REFERENCE|RANGE|RESULT)[\s\S]*/gi, '')  // Remove table headers
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// Identify lab type from filename
function identifyLabTypeFromFilename(filename) {
    const nameLower = filename.toLowerCase();

    // Check for specific lab types in filename (order matters - more specific first)

    // Bone density (check before vitamin D to avoid "D Bone" matching vitamin D)
    if (nameLower.includes('bone') || nameLower.includes('densidade') || nameLower.includes('axial skeleton')) {
        return 'Densidade Óssea';
    }

    // Vitamins (check specific vitamins before generic patterns)
    if (nameLower.includes('vitamin_k') || nameLower.includes('vitamin k') || nameLower.includes('k vitamin')) {
        return 'Vitamina K';
    }
    if (nameLower.includes('vitamin_e') || nameLower.includes('vitamin e')) {
        return 'Vitamina E';
    }
    if (nameLower.includes('vitamin_a') || nameLower.includes('vitamin a')) {
        return 'Vitamina A';
    }
    if (nameLower.includes('vitamin_c') || nameLower.includes('vitamin c') || nameLower.includes('vit c')) {
        return 'Vitamina C';
    }
    if (nameLower.includes('vitamin_d') || nameLower.includes('vitamin d') || nameLower.includes('vit d')) {
        return 'Vitamina D';
    }

    // Thyroid tests
    if (nameLower.includes('tsh') || nameLower.includes('thyroid')) {
        return 'TSH';
    }
    if (nameLower.includes('t4')) {
        return 'T4';
    }
    if (nameLower.includes('t3')) {
        return 'T3';
    }

    // Metabolic panels
    if (nameLower.includes('cmp') || nameLower.includes('comprehensive metabolic')) {
        return 'CMP';
    }

    // Blood counts (check CBC before diff)
    if (nameLower.includes('cbc') || nameLower.includes('hemograma') || nameLower.includes('csc')) {
        return 'CBC';
    }

    // Lipids (check before diff to avoid false match)
    if (nameLower.includes('lipid')) {
        return 'Lipídios';
    }

    // B vitamins (check B1 before B12)
    if (nameLower === 'b1.pdf' || nameLower.includes('thiamin')) {
        return 'B1';
    }
    if (nameLower.includes('b12') || nameLower.includes('b_12')) {
        return 'B12';
    }
    if (nameLower.includes('b6')) {
        return 'B6';
    }

    // Other specific tests
    if (nameLower.includes('ferritin') || nameLower.includes('ferretin')) {
        return 'Ferritina';
    }
    if (nameLower.includes('folate') || nameLower.includes('folato')) {
        return 'Folato';
    }
    if (nameLower.includes('crp') || nameLower.includes('c protein') || nameLower.includes('proteina')) {
        return 'PCR';
    }
    if (nameLower.includes('iron')) {
        return 'Ferro';
    }
    if (nameLower.includes('pth') || nameLower.includes('parathyroid')) {
        return 'PTH';
    }
    if (nameLower.includes('prealbumin')) {
        return 'Prealbumina';
    }
    if (nameLower.includes('a1c') || nameLower.includes('hemo')) {
        return 'A1C';
    }
    if (nameLower.includes('total ck') || nameLower.includes('ck')) {
        return 'CK Total';
    }
    if (nameLower.includes('endocrinology')) {
        return 'Endocrinologia';
    }
    if (nameLower.includes('protein_marker') || nameLower.includes('protein marker')) {
        return 'Marcadores Proteicos';
    }

    // Differentials (check after lipid)
    if (nameLower.includes('blood diff') || nameLower.includes('diff')) {
        return 'Diferencial';
    }

    // Charts/images
    if (nameLower.includes('lab_a') || nameLower.includes('lab_')) {
        return 'Gráfico';
    }

    return 'Exame';
}

// Extract PDF text from ArrayBuffer data (for uploaded files)
async function extractPDFTextFromData(arrayBuffer) {
    try {
        const loadingTask = pdfjsLib.getDocument({data: arrayBuffer});
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    } catch (error) {
        console.error('Erro ao extrair texto do PDF:', error);
        return '';
    }
}

// Parse image OCR from data URL (for uploaded files)
async function parseImageOCRFromData(labInfo, dataUrl) {
    try {
        console.log(`🔍 Executando OCR em ${labInfo.filename}...`);

        const result = await Tesseract.recognize(
            dataUrl,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        if (progress % 20 === 0) {
                            console.log(`OCR progresso: ${progress}%`);
                        }
                    }
                }
            }
        );

        labInfo.rawText = result.data.text;
        labInfo.collectionDate = extractDateFromOCR(result.data.text);
        labInfo.dates = labInfo.collectionDate ? [labInfo.collectionDate] : [];
        labInfo.values = extractChartLabValues(result.data.text, labInfo.filename);

        console.log('✅ OCR completo');
        return labInfo;
    } catch (error) {
        console.error('❌ Erro no OCR:', error);
        return labInfo;
    }
}

// Generate unique lab ID
function generateLabId(filename) {
    return filename.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}


// Identify PDF format
function identifyPDFFormat(text, filename) {
    // Check for UI Health format first
    // Identifiers: "UI Health Pathology Laboratories", "PATIENT DEMOGRAPHICS", "ORDER INFORMATION"
    if (text.includes('UI Health Pathology Laboratories') ||
        (text.includes('PATIENT DEMOGRAPHICS') && text.includes('ORDER INFORMATION'))) {
        return 'ui-health';
    }

    // Check for period lab (historical multi-date format)
    // 1. Filename has '_all'
    // 2. Text has "Past Results" (with or without dash)
    // 3. Has "Standard Range" AND multiple dates in header row
    if (filename.includes('_all') ||
        text.match(/Past Results/i) ||
        (text.includes('Standard Range') && /Standard Range\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text))) {
        return 'mychart-period';
    }

    // Check filename for number suffix to determine format
    // Files with (3) and onwards are Healow format
    // Files before (3) are MyChart format
    const numberMatch = filename.match(/\((\d+)\)/);
    if (numberMatch) {
        const num = parseInt(numberMatch[1]);
        if (num >= 3) {
            return 'healow';
        } else {
            return 'mychart-single';
        }
    }

    // If no number, check text content for Healow indicators
    if (text.includes('Collection Date:') && text.match(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}/)) {
        return 'healow';
    }

    // Default to MyChart single-date if has MyChart indicators
    if (text.includes('Collected on') || text.includes('MyChart')) {
        return 'mychart-single';
    }

    // If still unknown, try to infer from text content
    return 'mychart-single';
}

// Parse PDF based on format
async function parsePDF(labInfo, text) {
    switch (labInfo.format) {
        case 'mychart-single':
            return parseMyChartSingle(labInfo, text);
        case 'healow':
            return parseHealow(labInfo, text);
        case 'mychart-period':
            return parseMyChartPeriod(labInfo, text);
        case 'ui-health':
            return parseUIHealth(labInfo, text);
        default:
            return labInfo;
    }
}

// Parse MyChart Single-Date Format
function parseMyChartSingle(labInfo, text) {
    console.log('📋 Parseando formato MyChart Single...');

    // Extract lab type from title
    // First try specific known patterns
    const titleMatch = text.match(/(COMPREHENSIVE METABOLIC PANEL|CBC W.*?DIFFERENTIAL|HEMOGLOBIN A1C|A1C|IRON AND TOTAL IRON BINDING|LIPID PANEL|25-OH VITAMIN D|VITAMIN D|VITAMIN C|VITAMIN B-?12|B-?12|FERRITIN|FOLATE|C-REACTIVE PROTEIN|THIAMINE|B-?1)/i);
    if (titleMatch) {
        console.log('🏷️ Título específico encontrado:', titleMatch[1]);
        const title = titleMatch[1];
        if (title.includes('COMPREHENSIVE METABOLIC')) labInfo.labType = 'CMP';
        else if (title.includes('CBC')) labInfo.labType = 'CBC';
        else if (title.match(/HEMOGLOBIN A1C|A1C/i)) labInfo.labType = 'A1C';
        else if (title.match(/IRON/i)) labInfo.labType = 'Ferro';
        else if (title.match(/LIPID/i)) labInfo.labType = 'Lipídios';
        else if (title.match(/VITAMIN D|25-OH VITAMIN D/i)) labInfo.labType = 'Vitamina D';
        else if (title.match(/VITAMIN C/i)) labInfo.labType = 'Vitamina C';
        else if (title.match(/\bB-?12\b/i)) labInfo.labType = 'B12';
        else if (title.match(/\bB-?1\b/i) && !title.match(/B-?12/i)) labInfo.labType = 'B1';
        else if (title.includes('FERRITIN')) labInfo.labType = 'Ferritina';
        else if (title.includes('FOLATE')) labInfo.labType = 'Folato';
        else if (title.includes('C-REACTIVE')) labInfo.labType = 'PCR';
        else if (title.includes('THIAMINE')) labInfo.labType = 'B1';
    } else {
        // Fallback: Extract any ALL-CAPS title before "Collected on"
        // Make it greedy to capture full title including commas and numbers
        const genericTitleMatch = text.match(/\b([A-Z][A-Z\s\d\-\/\(\),&]{4,80})\s{2,}Collected on/);
        if (genericTitleMatch) {
            let genericTitle = genericTitleMatch[1].trim();
            // Clean up the title - remove trailing words that are just markers
            genericTitle = genericTitle
                .replace(/,?\s+(TOTAL|FREE|INTACT)$/, ', $1')  // Ensure comma before TOTAL/FREE/INTACT
                .replace(/\s+W\/.*$/i, '')  // Remove "W/..." suffix
                .replace(/\s+AND\s+/gi, ' & ')  // Replace AND with &
                .trim();
            labInfo.labType = cleanLabType(genericTitle);
            console.log('🏷️ Título genérico encontrado (MyChart):', labInfo.labType);
        } else {
            console.log('⚠️ Nenhum título encontrado no texto');
        }
    }

    // Extract collection date - try multiple patterns
    let dateMatch = text.match(/Collected on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
    if (dateMatch) {
        labInfo.collectionDate = new Date(dateMatch[1]);
        labInfo.dates = [labInfo.collectionDate];
        console.log('📅 Data encontrada (MyChart):', labInfo.collectionDate.toLocaleDateString('pt-BR'));
    } else {
        console.log('⚠️ "Collected on" não encontrado, tentando formato alternativo...');
        // Try alternative date format
        dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
            labInfo.collectionDate = new Date(dateMatch[3], parseInt(dateMatch[1]) - 1, dateMatch[2]);
            labInfo.dates = [labInfo.collectionDate];
            console.log('📅 Data encontrada (alternativa):', labInfo.collectionDate.toLocaleDateString('pt-BR'));
        } else {
            console.log('❌ Nenhuma data encontrada no PDF');
        }
    }

    // Extract values (pattern: Test Name, Normal range, Value)
    labInfo.values = extractMyChartSingleValues(text);
    console.log(`📊 Valores extraídos: ${Object.keys(labInfo.values).length} marcadores`);

    return labInfo;
}

// Clean test name - remove garbage prefixes from PDF parsing
function cleanTestName(name) {
    if (!name) return '';
    let cleaned = name
        .replace(/^(New|Old|Final|Preliminary)\s+/i, '')
        .replace(/\s*(PM|AM)\s+Page\s+\d+\s+of\s+\d+\s*/gi, '')
        .replace(/[\r\n]+/g, ' ')
        // Remove reference range patterns at start: "0.9 - 11.2)" or "12 - 88)"
        .replace(/^[\d.]+\s*-\s*[\d.]+\s*\)\s*/g, '')
        // Remove "Ref:" patterns
        .replace(/^\(Ref:\s*[^)]+\)\s*/gi, '')
        // Remove unit prefixes with numbers
        .replace(/^[\d.]+\s*(?:mg\/dL|ug\/dL|mmol\/L|g\/dL|mL\/min\/m2|mL\/min|U\/L|%|fL|pg|PG\/ML|NG\/ML|K\/UL|GM\/DL|10\*[36]\/uL)\s*/gi, '')
        // Remove unit prefix alone
        .replace(/^(?:mg\/dL|ug\/dL|mmol\/L|g\/dL|mL\/min|U\/L|uL|fL|pg|PG\/ML|NG\/ML|K\/UL|GM\/DL|%)\s+/i, '')
        .replace(/^10\*[36]\/uL\s+/i, '')
        .replace(/^m2\s+/i, '')
        .replace(/^Value\s+[\d.]+\s*/gi, '')
        .replace(/^[\d.]+\s+Value\s+[\d.]+\s*/gi, '')
        // Remove repeated "Yes" or "No" patterns
        .replace(/^(?:Yes\s+|No\s+)+/gi, '')
        // Remove repeated numbers
        .replace(/^(?:[\d.]+\s+){2,}(?=\D)/g, '')
        // Remove leading single number
        .replace(/^[\d.]+\s+(?=[A-Za-z])/g, '')
        .replace(/^(or greater|or less)\s+/i, '')
        .replace(/.*?(MD|DO|PA|NP)\s*\([^)]*\)\s*/gi, '')
        .replace(/^(High|Low|Normal)\s+/i, '')
        // Remove trailing "normal", "high", "low"
        .replace(/\s+(normal|high|low)$/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    // Run number removal again in case there are still leading numbers
    cleaned = cleaned.replace(/^[\d.]+\s+(?=[A-Za-z])/g, '').trim();
    // Remove any remaining leading parenthesis with range
    cleaned = cleaned.replace(/^[\d.\-\s]+\)\s*/g, '').trim();

    return cleaned;
}

// Extract values from MyChart single-date format
function extractMyChartSingleValues(text) {
    const values = {};

    console.log('🔍 Iniciando extração MyChart Single...');

    // MyChart format (text is often on one line):
    // "Sodium  Normal range: 134 - 145 mmol/L  134 134   145 145  138"
    // The value is at the END of the segment, after the repeated range numbers

    // "RBC  Normal value: 4.04 - 5.75 10*6/uL  Value  4.81"
    // Value comes after "Value" keyword

    // IMPORTANT: Run Pattern 6 FIRST (visual chart with digit-dash prefix like "25-OH")
    // This prevents Pattern 1 from matching partial names like "OH Vitamin D" instead of "25-OH Vitamin D"

    // Pattern 6: Value on own line before visual chart
    // Format: "Test Name\nNormal range: 30 - 100 unit\n...\n30 30   100 100  33"
    // The actual value appears AFTER the range boundaries are repeated
    // IMPORTANT: Test name can start with digit-dash (e.g., "25-OH Vitamin D")
    // Use programmatic filtering instead of regex backreferences for more reliability
    // Changed to greedy matching and require proper test name structure
    const visualChartPattern = /((?:\d+-)?[A-Za-z][A-Za-z0-9\s\-\/\(\),]{2,50})\s+Normal\s+(?:range|value):\s*([\d.]+)\s*-\s*([\d.]+)\s+([A-Za-z\/]+)/gi;

    let match;
    while ((match = visualChartPattern.exec(text)) !== null) {
        let testName = cleanTestName(match[1]);
        const lowRange = parseFloat(match[2]);
        const highRange = parseFloat(match[3]);
        const unit = match[4];

        // Skip if test name is empty or too short after cleaning
        if (!testName || testName.length < 2) {
            console.log(`  ⚠️ Skipping - test name too short after cleaning`);
            continue;
        }

        // Skip if test name has excessive whitespace (likely spanning two columns)
        if (/\s{5,}/.test(testName)) {
            console.log(`  ⚠️ Skipping "${testName}" - excessive whitespace (two-column layout)`);
            continue;
        }

        // Skip if already parsed
        if (values[testName]) {
            console.log(`  ⚠️ Skipping "${testName}" - already parsed`);
            continue;
        }

        // Get the segment after the unit until the next "Normal" or reasonable distance
        const startPos = match.index + match[0].length;
        const nextNormalPos = text.indexOf('Normal', startPos);
        const segmentEnd = nextNormalPos > 0 && nextNormalPos - startPos < 600 ? nextNormalPos : startPos + 600;
        const segment = text.substring(startPos, segmentEnd);

        // Extract all numbers from the segment
        const allNumbers = [...segment.matchAll(/([\d.]+)/g)].map(m => parseFloat(m[1]));

        // Filter out:
        // 1. Numbers that equal the range boundaries
        // 2. Numbers that are less than lowRange (descriptive text like "< 20")
        // 3. Numbers that are exactly between boundaries mentioned in descriptive text
        const candidateValues = allNumbers.filter(num => {
            // Skip range boundaries
            if (num === lowRange || num === highRange) return false;
            // Skip numbers below the low range (from "< 20" or "20 to 29" descriptions)
            if (num < lowRange) return false;
            return true;
        });

        // The first remaining number is the actual value
        if (candidateValues.length > 0) {
            const value = candidateValues[0];

            // Clean test name
            testName = testName
                .replace(/^(New|Old|Final|Preliminary)\s+/i, '')
                .replace(/\s{2,}/g, ' ')
                .trim();

            if (!values[testName] && !isNaN(value)) {
                let status = 'normal';
                if (value < lowRange) status = 'low';
                else if (value > highRange) status = 'high';

                values[testName] = {
                    value: value,
                    unit: unit,
                    range: `${lowRange} - ${highRange}`,
                    status: status
                };
                console.log(`  ✓ ${testName}: ${value} ${unit} (visual chart pattern, filtered from ${allNumbers.length} numbers)`);
            }
        } else {
            console.log(`  ⚠️ Visual chart pattern matched "${testName}" but no valid value found after filtering`);
        }
    }

    // Pattern 1: Test Name + Normal range: X - Y unit + ... + VALUE at end
    // Match: TestName  Normal range: LOW - HIGH UNIT ... VALUE [High/Low]
    // Fixed pattern - more flexible matching for test names with numbers
    // Limited to max 80 chars for test name to avoid capturing garbage from previous tests
    // NOTE: This pattern requires test name to start with a LETTER (not digit)
    // For names starting with digits (like "25-OH"), use Pattern 6 above
    const rangePattern = /([A-Za-z][A-Za-z0-9\s\-\/\(\),]{0,80}?)\s{2,}Normal\s+(?:range|value):\s*([\d.]+)\s*-\s*([\d.]+)\s+([A-Za-z\*%\/\d]+)/gi;

    // Reuse match variable declared earlier
    let matchCount = 0;

    while ((match = rangePattern.exec(text)) !== null) {
        matchCount++;
        let testName = cleanTestName(match[1]);
        const lowRange = match[2];
        const highRange = match[3];
        const unit = match[4];

        console.log(`  📌 Match ${matchCount}: "${testName}" | Range: ${lowRange}-${highRange} ${unit}`);

        // Skip if test name is empty after cleaning
        if (!testName || testName.length < 2) {
            console.log(`  ⚠️ Skipping - test name too short after cleaning`);
            continue;
        }

        // Skip if this exact test name already exists
        if (values[testName]) {
            console.log(`  ⚠️ Skipping "${testName}" - already parsed`);
            continue;
        }

        // Skip if this test name is a suffix of an already-parsed test
        // Example: Skip "OH Vitamin D, Total" if "25-OH Vitamin D, Total" exists
        const isPartialMatch = Object.keys(values).some(existing => existing.endsWith(testName));
        if (isPartialMatch) {
            console.log(`  ⚠️ Skipping "${testName}" - is a suffix of an already-parsed test`);
            continue;
        }

        // Also check if there's a version with digit prefix that we should prefer
        // Look back in text to see if this test name has a digit prefix like "25-"
        const testNamePos = text.indexOf(testName);
        if (testNamePos > 0) {
            const prefixCheck = text.substring(Math.max(0, testNamePos - 10), testNamePos);
            const digitPrefix = prefixCheck.match(/(\d+-)$/);
            if (digitPrefix) {
                const fullName = digitPrefix[1] + testName;
                console.log(`  ⚠️ Found digit prefix "${digitPrefix[1]}" - should use "${fullName}" instead`);
                testName = fullName;
            }
        }

        // Find the value - it's the last number before the next test name or end
        // Get the text after this match until the next "Normal" or end
        const startPos = match.index + match[0].length;
        const nextNormalPos = text.indexOf('Normal', startPos);
        const segment = nextNormalPos > 0 ? text.substring(startPos, nextNormalPos) : text.substring(startPos, startPos + 100);

        console.log(`  📝 Segment para buscar valor: "${segment.substring(0, 60)}..."`);

        // Clean segment: remove description text that contains misleading numbers
        // Patterns like "< 20 ng/mL: Deficiency" or "20 to 29 ng/mL: Insufficiency"
        const cleanedSegment = segment
            .replace(/<?>\s*\d+\s*ng\/mL[:\s]*(?:Deficiency|Insufficiency|Sufficiency|Toxicity|Optimal|Normal)[^0-9]*/gi, ' ')
            .replace(/\d+\s+to\s+\d+\s*ng\/mL[:\s]*(?:Deficiency|Insufficiency|Sufficiency|Toxicity|Optimal|Normal)[^0-9]*/gi, ' ');

        // Find all numbers in the cleaned segment
        const numbers = [...cleanedSegment.matchAll(/([\d.]+)\s*(High|Low|H|L)?/gi)];

        console.log(`  🔢 ${numbers.length} números encontrados no segmento limpo`);

        if (numbers.length > 0) {
            // The actual value is typically the last meaningful number
            // Skip numbers that are just repeats of the range
            let actualValue = null;
            let status = 'normal';

            const low = parseFloat(lowRange);
            const high = parseFloat(highRange);

            // Filter out range boundary values and description text numbers
            const filteredNumbers = numbers.filter(n => {
                const num = parseFloat(n[1]);
                // Skip exact range boundaries (often repeated in visual charts)
                if (num === low || num === high) return false;
                return true;
            });

            // For MyChart visual chart format, the value comes AFTER the repeated range markers
            // Pattern: "30 30   100 100  33" - the last unique number is the actual value
            // So we should take the LAST number, not the first
            if (filteredNumbers.length > 0) {
                // Take the LAST non-range number (the actual test value at end of visual chart)
                const lastNum = filteredNumbers[filteredNumbers.length - 1];
                actualValue = parseFloat(lastNum[1]);
                const flag = lastNum[2];

                if (flag) {
                    status = flag.toLowerCase().startsWith('h') ? 'high' : 'low';
                } else {
                    // Check if value is within normal range
                    if (actualValue < low) {
                        status = 'low';
                    } else if (actualValue > high) {
                        status = 'high';
                    }
                }
            }

            if (actualValue !== null && !isNaN(actualValue)) {
                values[testName] = {
                    value: actualValue,
                    unit: unit,
                    range: `${lowRange} - ${highRange}`,
                    status: status
                };
                console.log(`  ✓ ${testName}: ${actualValue} ${unit} (${status})`);
            } else {
                console.log(`  ⚠️ Valor não encontrado para ${testName} (todos eram range values)`);
            }
        }
    }

    console.log(`🔍 Total de matches encontrados: ${matchCount}`);

    // Pattern 2: Test Name + Normal value/range + "Value" + NUMBER
    const valuePattern = /([A-Za-z][A-Za-z0-9\s\-\/\(\),]+?)\s+Normal (?:range|value):[^V]+Value\s+([\d.]+)/gi;

    while ((match = valuePattern.exec(text)) !== null) {
        let testName = cleanTestName(match[1]);
        const value = parseFloat(match[2]);

        if (!testName || testName.length < 2) continue;
        if (values[testName]) continue;

        if (!isNaN(value)) {
            values[testName] = {
                value: value,
                unit: '',
                range: '',
                status: 'normal'
            };
            console.log(`  ✓ ${testName}: ${value} (Value pattern)`);
        }
    }

    // Pattern 3: "Normal range: above >X" format (like Folate with ">20.0")
    // Capture both exact values and >values
    const abovePattern = /([A-Za-z][A-Za-z0-9\s\-\/\(\),]+?)\s+Normal\s+(?:range|value):\s*above\s*>?([\d.]+)\s*([A-Za-z\/]+)[\s\S]{0,100}?Value\s+>?([\d.]+)/gi;

    while ((match = abovePattern.exec(text)) !== null) {
        let testName = cleanTestName(match[1]);
        const threshold = parseFloat(match[2]);
        const unit = match[3];
        const value = parseFloat(match[4]);

        if (!testName || testName.length < 2) continue;
        if (values[testName]) continue;

        if (!isNaN(value)) {
            values[testName] = {
                value: value,
                unit: unit,
                range: `> ${threshold}`,
                status: value >= threshold ? 'normal' : 'low'
            };
            console.log(`  ✓ ${testName}: ${value} ${unit} (${value >= threshold ? 'normal' : 'low'})`);
        }
    }

    // Pattern 4: "Normal range: below <X" format (like CRP and A1C)
    const belowPattern = /([A-Za-z][A-Za-z0-9\s\-\/\(\),]+?)\s+Normal range:\s*below\s*<?([\d.]+)\s*([A-Za-z\/\*%]+)[^V]*Value\s+([\d.]+)/gi;

    while ((match = belowPattern.exec(text)) !== null) {
        let testName = cleanTestName(match[1]);
        const threshold = parseFloat(match[2]);
        const unit = match[3];
        const value = parseFloat(match[4]);

        if (!testName || testName.length < 2) continue;
        if (values[testName]) continue;

        if (!isNaN(value)) {
            values[testName] = {
                value: value,
                unit: unit,
                range: `< ${threshold}`,
                status: value < threshold ? 'normal' : 'high'
            };
            console.log(`  ✓ ${testName}: ${value} ${unit}`);
        }
    }

    // Pattern 5: Test name followed by value and "High" or "Low" marker (like "990 High")
    // More flexible - allows lots of space/newlines between unit and value
    const highLowPattern = /([A-Za-z][A-Za-z\s\-\/0-9]+?)\s+Normal\s+(?:range|value):\s*([\d.]+)\s*-\s*([\d.]+)\s+([A-Za-z\/\*%]+)[\s\S]{0,200}?([\d.]+)\s+(High|Low)/gi;

    while ((match = highLowPattern.exec(text)) !== null) {
        let testName = cleanTestName(match[1]);
        const lowRange = parseFloat(match[2]);
        const highRange = parseFloat(match[3]);
        const unit = match[4];
        const value = parseFloat(match[5]);
        const status = match[6].toLowerCase();

        if (!testName || testName.length < 2) continue;
        if (values[testName]) continue;

        // Skip if value equals range boundaries
        if (value === lowRange || value === highRange) continue;

        if (!isNaN(value)) {
            values[testName] = {
                value: value,
                unit: unit,
                range: `${lowRange} - ${highRange}`,
                status: status
            };
            console.log(`  ✓ ${testName}: ${value} ${unit} (${status})`);
        }
    }

    // Pattern 7: "Value" keyword on one line, number on next line
    // Format: "Test Name\nNormal range: X - Y unit\n\nValue\n123"
    // Important: Test name should NOT span multiple lines (to avoid two-column layouts)
    // IMPORTANT: Test name can start with digit (e.g., "25-OH Vitamin D")
    const splitValuePattern = /([A-Za-z0-9][A-Za-z0-9\s\-\/\(\),]{2,60}?)\s+Normal\s+(?:range|value):\s*(?:below\s*<?|above\s*>?)?\s*([\d.]+)(?:\s*-\s*([\d.]+))?\s+([A-Za-z\/]+)[\s\S]{0,50}?Value\s+([\d.]+)/gi;

    while ((match = splitValuePattern.exec(text)) !== null) {
        let testName = cleanTestName(match[1]);
        const lowRange = match[2] ? parseFloat(match[2]) : null;
        const highRange = match[3] ? parseFloat(match[3]) : null;
        const unit = match[4];
        const value = parseFloat(match[5]);

        // Skip if test name is empty or too short after cleaning
        if (!testName || testName.length < 2) {
            console.log(`  ⚠️ Skipping - test name too short after cleaning`);
            continue;
        }

        // Skip if test name has excessive whitespace (likely spanning two columns)
        if (/\s{5,}/.test(testName)) {
            console.log(`  ⚠️ Skipping "${testName}" - excessive whitespace (two-column layout)`);
            continue;
        }

        // Skip if already parsed
        if (values[testName]) {
            console.log(`  ⚠️ Skipping "${testName}" - already parsed`);
            continue;
        }

        if (!isNaN(value)) {
            let status = 'normal';
            let range = '';

            if (lowRange !== null && highRange !== null) {
                range = `${lowRange} - ${highRange}`;
                if (value < lowRange) status = 'low';
                else if (value > highRange) status = 'high';
            } else if (lowRange !== null) {
                range = `< ${lowRange}`;
                status = value < lowRange ? 'normal' : 'high';
            }

            values[testName] = {
                value: value,
                unit: unit,
                range: range,
                status: status
            };
            console.log(`  ✓ ${testName}: ${value} ${unit} (split Value pattern)`);
        }
    }

    return values;
}

// Parse Healow Format
function parseHealow(labInfo, text) {
    console.log('📋 Parseando formato Healow...');

    // Extract lab type from title
    // First try specific known patterns
    const titleMatch = text.match(/(BASIC METABOLIC PANEL|COMPREHENSIVE METABOLIC PANEL|COMPLETE BLOOD COUNT|BLOOD DIFFERENTIAL|LIPID PANEL|VITAMIN B-?12|B-?12|VITAMIN B-?6|B-?6|FERRITIN|FOLATE|C-REACTIVE PROTEIN)/i);
    if (titleMatch) {
        console.log('🏷️ Título específico encontrado:', titleMatch[1]);
        const title = titleMatch[1];
        if (title.includes('COMPREHENSIVE') || title.includes('CMP')) labInfo.labType = 'CMP';
        else if (title.includes('BASIC METABOLIC')) labInfo.labType = 'BMP';
        else if (title.includes('BLOOD COUNT') || title.includes('CBC')) labInfo.labType = 'CBC';
        else if (title.includes('BLOOD DIFFERENTIAL')) labInfo.labType = 'Diferencial';
        else if (title.match(/LIPID/i)) labInfo.labType = 'Lipídios';
        else if (title.match(/\bB-?12\b/i)) labInfo.labType = 'B12';
        else if (title.match(/\bB-?6\b/i)) labInfo.labType = 'B6';
        else if (title.includes('FERRITIN')) labInfo.labType = 'Ferritina';
        else if (title.includes('FOLATE')) labInfo.labType = 'Folato';
        else if (title.includes('C-REACTIVE')) labInfo.labType = 'PCR';
    } else {
        // Fallback: Healow titles appear before the first asterisk (*)
        // Pattern: "LIPID PANEL, EXTENDED *"
        const asteriskMatch = text.match(/([A-Z][A-Z\s\d\-\/\(\),&]{4,60}?)\s*\*/);
        if (asteriskMatch) {
            labInfo.labType = cleanLabType(asteriskMatch[1]
                .replace(/\s+AND\s+/gi, ' & ')
                .replace(/,?\s*(EXTENDED|W\/.*|WITH.*)$/i, ''));
            console.log('🏷️ Título encontrado antes do asterisco (Healow):', labInfo.labType);
        } else {
            // Second fallback: Look for pattern "TITLE  F   " (Healow without asterisk)
            const healowPattern = text.match(/\b([A-Z][A-Z\s\d\-\/\(\),&]{4,60}?)\s{2,}F\s{2,}/);
            if (healowPattern) {
                labInfo.labType = cleanLabType(healowPattern[1]
                    .replace(/\s+AND\s+/gi, ' & ')
                    .replace(/,?\s+(INTACT|TOTAL|FREE)$/, ', $1'));
                console.log('🏷️ Título encontrado por padrão F (Healow):', labInfo.labType);
            } else {
                // Third fallback: Look for ALL-CAPS text in first few lines
                const lines = text.split('\n').slice(0, 15);
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.length >= 5 && trimmed.length <= 50 &&
                        trimmed === trimmed.toUpperCase() &&
                        /^[A-Z\s\d\-\/\(\)&,]+$/.test(trimmed) &&
                        !trimmed.includes('FINAL RESULT') &&
                        !trimmed.includes('BLOOD') &&
                        !trimmed.includes('ACCESSION')) {
                        labInfo.labType = cleanLabType(trimmed.replace(/\s+AND\s+/gi, ' & '));
                        console.log('🏷️ Título genérico encontrado (Healow):', labInfo.labType);
                        break;
                    }
                }
            }
        }
        if (!labInfo.labType || labInfo.labType === 'Exame') {
            console.log('⚠️ Nenhum título encontrado no texto');
        }
    }

    // Extract collection date - Follow My Health format: MM/DD/YYYY HH:MM:SS
    const dateMatch = text.match(/Collection Date:\s*(\d{2})\/(\d{2})\/(\d{4})\s+\d{2}:\d{2}:\d{2}/i);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]);
        const day = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        labInfo.collectionDate = new Date(year, month - 1, day);
        labInfo.dates = [labInfo.collectionDate];
        console.log('📅 Data encontrada (Healow):', labInfo.collectionDate.toLocaleDateString('pt-BR'));
    } else {
        console.log('❌ "Collection Date:" não encontrado no PDF');
    }

    // Extract values from table format
    labInfo.values = extractHealowValues(text);
    console.log(`📊 Valores extraídos: ${Object.keys(labInfo.values).length} marcadores`);

    return labInfo;
}

// Extract values from Healow format
function extractHealowValues(text) {
    const values = {};

    console.log('🔍 Extraindo valores do formato Healow...');

    // Healow format (text often on one line):
    // "VITAMIN B12 *  F   VITAMIN B12   1004 H   181-914 (PG/ML)"
    // "F      VITAMIN B6 (PYRIDOXAL 5-PHOSPHATE)         42.9        20.0-125.0 (nmol/L)"
    // "F         HIGH SENSITIVE CRP                                     0.5                                See below (MG/L)"

    // Pattern 1: F + TestName (may have parentheses) + Value + H/L + Range + (Unit)
    const pattern1 = /F\s+([A-Z][A-Z0-9\s,\-\(\)]+?)\s+([\d.]+)\s*([HL])?\s+([\d.\-<>]+)\s*\(([^)]+)\)/gi;

    let match;
    while ((match = pattern1.exec(text)) !== null) {
        const name = match[1].trim();
        const value = parseFloat(match[2]);
        const abnormal = match[3];
        const range = match[4];
        const unit = match[5];

        // Skip if name is too short or looks like a header
        if (name.length < 2 || name === 'NAME') continue;

        values[name] = {
            value: value,
            unit: unit,
            range: range,
            status: abnormal === 'H' ? 'high' : abnormal === 'L' ? 'low' : 'normal'
        };
        console.log(`  ✓ ${name}: ${value} ${unit} (${abnormal || 'normal'})`);
    }

    // Pattern 2: Look for specific test names followed by values
    // Common tests in Follow My Health format
    const testNames = [
        'VITAMIN B12', 'VITAMIN B6', 'FOLATE', 'FERRITIN',
        'GLUCOSE', 'SODIUM', 'POTASSIUM', 'CHLORIDE', 'CO2',
        'BUN', 'CREATININE', 'CALCIUM', 'TOTAL PROTEIN', 'ALBUMIN',
        'BILIRUBIN', 'AST', 'ALT', 'ALKALINE PHOSPHATASE',
        'WBC', 'RBC', 'HEMOGLOBIN', 'HEMATOCRIT', 'MCV', 'MCH', 'MCHC',
        'PLATELET', 'NEUTROPHIL', 'LYMPHOCYTE', 'MONOCYTE',
        'C-REACTIVE PROTEIN', 'CRP'
    ];

    for (const testName of testNames) {
        if (values[testName]) continue; // Already found

        // Look for pattern: TEST_NAME ... VALUE H/L ... RANGE (UNIT)
        const escapedName = testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const testPattern = new RegExp(escapedName + '\\s+(\\d+\\.?\\d*)\\s*([HL])?\\s+([\\d.\\-<>]+)\\s*\\(([^)]+)\\)', 'i');
        const testMatch = text.match(testPattern);

        if (testMatch) {
            const value = parseFloat(testMatch[1]);
            const abnormal = testMatch[2];
            const range = testMatch[3];
            const unit = testMatch[4];

            values[testName] = {
                value: value,
                unit: unit,
                range: range,
                status: abnormal === 'H' ? 'high' : abnormal === 'L' ? 'low' : 'normal'
            };
            console.log(`  ✓ ${testName}: ${value} ${unit} (${abnormal || 'normal'})`);
        }
    }

    return values;
}

// Parse MyChart Period Format (multi-date)
function parseMyChartPeriod(labInfo, text) {
    labInfo.isPeriodLab = true;
    console.log('📋 Parseando formato MyChart Period (multi-data)...');

    // Extract lab type from title
    // First try specific patterns
    const titleMatch = text.match(/(CBC W.*?DIFFERENTIAL|COMPREHENSIVE METABOLIC PANEL|LIPID PANEL|THYROID[- ]STIMULATING HORMONE[^-\n]*|TOTAL CK)\s*-?\s*Past Results/i);
    if (titleMatch) {
        const title = titleMatch[1];
        if (title.includes('CBC')) labInfo.labType = 'CBC';
        else if (title.includes('COMPREHENSIVE')) labInfo.labType = 'CMP';
        else if (title.match(/LIPID/i)) labInfo.labType = 'Lipídios';
        else if (title.match(/THYROID/i)) labInfo.labType = 'TSH';
        else if (title.match(/TOTAL CK/i)) labInfo.labType = 'CK Total';
        else labInfo.labType = cleanLabType(title);
        console.log('🏷️ Tipo identificado:', labInfo.labType);
    } else {
        // Fallback: Extract any ALL-CAPS title before "- Past Results" or just before "Standard Range"
        const genericMatch = text.match(/([A-Z][A-Z\s\d\-\/\(\),&]{4,80}?)\s*-?\s*Past Results/i) ||
                             text.match(/([A-Z][A-Z\s\d\-\/\(\),&]{4,80}?)\s{2,}Name\s+Standard Range/);
        if (genericMatch) {
            labInfo.labType = cleanLabType(genericMatch[1]
                .replace(/\s+AND\s+/gi, ' & ')
                .replace(/,?\s+(TOTAL|FREE|INTACT)$/, ', $1'));
            console.log('🏷️ Título genérico encontrado (Period):', labInfo.labType);
        }
    }

    // Extract dates from text (format: M/D/YY or MM/DD/YYYY)
    // Look for multiple dates that are close together (header row)
    const allDates = [...text.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g)];
    let headerDates = [];

    // Filter dates that are likely test dates (not page print dates)
    // Page dates are usually at edges, test dates are grouped together
    if (allDates.length > 2) {
        headerDates = allDates.slice(0, 10).map(m => {
            let year = parseInt(m[3]);
            if (year < 100) year += 2000;
            return new Date(year, parseInt(m[1]) - 1, parseInt(m[2]));
        });
        // Remove duplicates
        headerDates = [...new Set(headerDates.map(d => d.getTime()))].map(t => new Date(t));
        console.log(`📅 ${headerDates.length} datas encontradas`);
    }

    labInfo.dates = headerDates;

    // Extract multi-date values
    labInfo.values = extractPeriodValues(text, headerDates);
    console.log(`📊 ${Object.keys(labInfo.values).length} marcadores extraídos`);

    return labInfo;
}

// Parse UI Health Format
function parseUIHealth(labInfo, text) {
    console.log('📋 Parseando formato UI Health...');

    // Extract collection date (format: "Collected: MM/DD/YYYY HH:MM")
    const collectedMatch = text.match(/Collected:\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+\d{1,2}:\d{2}/);
    if (collectedMatch) {
        const month = parseInt(collectedMatch[1]);
        const day = parseInt(collectedMatch[2]);
        const year = parseInt(collectedMatch[3]);
        labInfo.collectionDate = new Date(year, month - 1, day);
        labInfo.dates = [labInfo.collectionDate];
        console.log(`📅 Data de coleta: ${labInfo.collectionDate.toLocaleDateString()}`);
    }

    // Extract lab type from section header
    // Look for all-caps section headers like "COMPREHENSIVE METABOLIC PANEL", "CBC W DIFFERENTIAL", etc.
    const sectionMatch = text.match(/\n([A-Z][A-Z\s&-]{10,60})\n(?:[A-Z][a-z])/);
    if (sectionMatch) {
        const sectionName = sectionMatch[1].trim();

        // Map common section names to lab types
        if (sectionName.includes('COMPREHENSIVE METABOLIC')) labInfo.labType = 'CMP';
        else if (sectionName.includes('CBC W DIFFERENTIAL') || sectionName.includes('CBC W')) labInfo.labType = 'CBC';
        else if (sectionName.includes('LIPID')) labInfo.labType = 'Lipídios';
        else if (sectionName.includes('ENDOCRINOLOGY')) labInfo.labType = 'Endocrinologia';
        else labInfo.labType = cleanLabType(sectionName);

        console.log(`🏷️ Tipo de exame: ${labInfo.labType}`);
    }

    // Extract lab values
    // Format: "Test Name: Value UNIT (Ref: range)" or "Test Name: Value UNIT (High/Low) (Ref: range)"
    labInfo.values = extractUIHealthValues(text);
    console.log(`📊 ${Object.keys(labInfo.values).length} valores extraídos`);

    return labInfo;
}

// Extract values from UI Health format
function extractUIHealthValues(text) {
    const values = {};

    console.log('🔍 Extraindo valores do formato UI Health...');

    // Pattern: Test Name: Value UNIT (optional: High/Low) (Ref: range)
    // Examples:
    // "Blood Urea Nitrogen: 22 MG/DL (High) (Ref: 06-20)"
    // "Sodium: 140 MMOL/L (Ref: 135-145)"
    // "Ferritin: 83 NG/ML (Ref: 22 - 275)"
    // "Cholesterol: 173 MG/DL (Ref: <200)"

    // UI Health PDFs often have all text on one line separated by double spaces
    // Split by double space or newline
    const segments = text.split(/\s{2,}|\n/).filter(s => s.trim());

    // Also try regex matching directly on the full text for better results
    // Test name can start with letter, number, or % (like "% Immature Platelet")
    // Test name should be 2-50 chars, not contain header words
    // Unit pattern matches: MG/DL, NG/ML, K/UL, %, GM/DL, FL, PG, etc.

    // Pattern 1: TestName: Value UNIT (High/Low) (Ref: range)
    const pattern1 = /([A-Za-z0-9%][A-Za-z0-9\s,.\-\/()%]{1,50}?):\s*([\d.]+)\s+([A-Z][A-Za-z\/\*%0-9]+)\s+\((?:High|Low)\)\s+\(Ref:\s*([^)]+)\)/gi;

    // Pattern 2: TestName: Value UNIT (Ref: range) - without High/Low
    const pattern2 = /([A-Za-z0-9%][A-Za-z0-9\s,.\-\/()%]{1,50}?):\s*([\d.]+)\s+([A-Z][A-Za-z\/\*%0-9]+)\s+\(Ref:\s*([^)]+)\)/gi;

    // Pattern 3: TestName: Value UNIT (no ref range)
    const pattern3 = /([A-Za-z0-9%][A-Za-z0-9\s,.\-\/()%]{1,50}?):\s*([\d.]+)\s+([A-Z][A-Za-z\/\*%0-9]+)(?:\s|$)/gi;

    // Words that indicate headers, not test names
    const headerWords = ['PATIENT', 'ORDER', 'LABORATORY', 'DEMOGRAPHICS', 'INFORMATION',
                         'PANEL', 'COMPREHENSIVE', 'METABOLIC', 'DIFFERENTIAL', 'ENDOCRINOLOGY',
                         'LIPID', 'PROTEIN', 'MARKERS', 'CBC', 'CLIENT', 'PROVIDER', 'ACCESSION',
                         'AGE', 'SEX', 'DOB', 'NAME', 'MR #', 'ACCOUNT', 'PENDING', 'COLLECTED',
                         'RECEIVED', 'REPORTED', 'ORDERING'];

    let match;

    // Try Pattern 1 first (with High/Low flag)
    while ((match = pattern1.exec(text)) !== null) {
        const testName = cleanTestName(match[1]);
        const value = parseFloat(match[2]);
        const unit = match[3];
        const refRange = match[4].trim();

        // Skip if test name contains header words
        const upperName = testName.toUpperCase();
        const isHeader = headerWords.some(hw => upperName.includes(hw));

        if (testName && !isNaN(value) && !values[testName] && !isHeader) {
            // Determine status from context
            const contextStart = Math.max(0, match.index);
            const contextEnd = Math.min(text.length, match.index + match[0].length + 10);
            const context = text.substring(contextStart, contextEnd);

            let status = 'normal';
            if (context.includes('(High)')) status = 'high';
            else if (context.includes('(Low)')) status = 'low';

            values[testName] = {
                value: value,
                unit: unit,
                range: refRange,
                status: status
            };
            console.log(`  ✓ ${testName}: ${value} ${unit} (${status}) [Ref: ${refRange}]`);
        }
    }

    // Try Pattern 2 (without High/Low flag)
    while ((match = pattern2.exec(text)) !== null) {
        const testName = cleanTestName(match[1]);
        const value = parseFloat(match[2]);
        const unit = match[3];
        const refRange = match[4].trim();

        // Skip if test name contains header words
        const upperName = testName.toUpperCase();
        const isHeader = headerWords.some(hw => upperName.includes(hw));

        if (testName && !isNaN(value) && !values[testName] && !isHeader) {
            // Determine status from range
            let status = 'normal';
            const rangeMatch = refRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
            if (rangeMatch) {
                const low = parseFloat(rangeMatch[1]);
                const high = parseFloat(rangeMatch[2]);
                if (value < low) status = 'low';
                else if (value > high) status = 'high';
            } else if (refRange.startsWith('<')) {
                const threshold = parseFloat(refRange.replace(/[<>]/g, ''));
                if (!isNaN(threshold) && value >= threshold) status = 'high';
            } else if (refRange.startsWith('>')) {
                const threshold = parseFloat(refRange.replace(/[<>]/g, ''));
                if (!isNaN(threshold) && value <= threshold) status = 'low';
            }

            values[testName] = {
                value: value,
                unit: unit,
                range: refRange,
                status: status
            };
            console.log(`  ✓ ${testName}: ${value} ${unit} (${status}) [Ref: ${refRange}]`);
        }
    }

    // Try Pattern 3 (no ref range - for calculated values)
    while ((match = pattern3.exec(text)) !== null) {
        const testName = cleanTestName(match[1]);
        const value = parseFloat(match[2]);
        const unit = match[3];

        // Skip if test name contains header words
        const upperName = testName.toUpperCase();
        const isHeader = headerWords.some(hw => upperName.includes(hw));

        // Skip if already found or if it's a header/label
        if (testName && !isNaN(value) && !values[testName] && !isHeader) {
            values[testName] = {
                value: value,
                unit: unit,
                range: '',
                status: 'normal'
            };
            console.log(`  ✓ ${testName}: ${value} ${unit} (no ref)`);
        }
    }

    console.log(`📊 Total: ${Object.keys(values).length} valores extraídos (UI Health)`);
    return values;
}

// Extract values from period format
function extractPeriodValues(text, dates) {
    const values = {};

    console.log('🔍 Extraindo valores do formato período...');
    console.log(`📅 Datas disponíveis: ${dates.length}`);

    // Period format: TestName  Range Unit  Value1  Value2  Value3...
    // Example: "Basophils Absolute  0.0 - 0.2 10*3/uL  0.0   0.1   0.1   0.1"
    // Example: "Chol/HDL Ratio  <5.0  10.9 H   9.5 H   7.0"

    // Period format tests - look for known test names followed by range and values
    const periodTests = [
        // CBC tests
        'Hemoglobin', 'Hematocrit', 'RBC', 'WBC', 'Platelets', 'Platelet Count',
        'MCV', 'MCH', 'MCHC', 'RDW', 'RDW-CV', 'RDW-SD', 'MPV',
        'Neutrophils Absolute', 'Neutrophils Relative', 'Neutrophils',
        'Lymphocytes Absolute', 'Lymphocytes Relative', 'Lymphocytes',
        'Monocytes Absolute', 'Monocytes Relative', 'Monocytes',
        'Eosinophils Absolute', 'Eosinophils Relative', 'Eosinophils',
        'Basophils Absolute', 'Basophils Relative', 'Basophils',
        'Absolute Immature Granulocytes', 'Immature Granulocytes',
        // CMP tests
        'Sodium', 'Potassium', 'Chloride', 'CO2', 'Glucose', 'Carbon Dioxide',
        'BUN', 'Blood Urea Nitrogen', 'Creatinine', 'Calcium', 'eGFR',
        'Total Protein', 'Albumin', 'Globulin', 'Albumin/Globulin Ratio', 'A/G Ratio',
        'AST', 'ALT', 'Alkaline Phosphatase', 'Alk Phos', 'Total Bilirubin', 'Bilirubin',
        'Anion Gap', 'BUN/Creatinine Ratio',
        // Lipid tests
        'Cholesterol', 'Total Cholesterol', 'Triglycerides', 'HDL', 'LDL',
        'HDL Cholesterol', 'LDL Cholesterol', 'VLDL', 'VLDL Cholesterol',
        'Chol/HDL Ratio', 'LDL/HDL Ratio', 'Non-HDL Cholesterol',
        // Thyroid tests
        'TSH', 'T3', 'T4', 'Free T3', 'Free T4', 'T3 Free', 'T4 Free',
        // Other tests
        'CK', 'Total CK', 'Creatine Kinase'
    ];

    for (const testName of periodTests) {
        // Look for test name followed by range then values
        const escapedName = testName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Pattern 1: TestName  Range (X - Y)  Unit  Values...
        // Example: "Basophils Absolute  0.0 - 0.2 10*3/uL  0.0   0.1   0.1   0.1"
        const pattern1 = new RegExp(
            escapedName +
            '\\s+' +                                    // whitespace
            '([\\d.]+\\s*-\\s*[\\d.]+)\\s*' +          // range like "0.0 - 0.2"
            '([A-Za-z\\*\\/\\d%]+)?\\s*' +             // optional unit like "10*3/uL"
            '([\\d.]+(?:\\s*[HL])?(?:\\s+[\\d.]+(?:\\s*[HL])?)*)',  // values
            'i'
        );

        // Pattern 2: TestName  Range (<X or >X)  Values...
        // Example: "Chol/HDL Ratio  <5.0  10.9 H   9.5 H"
        const pattern2 = new RegExp(
            escapedName +
            '\\s+' +                                    // whitespace
            '([<>][\\d.]+)\\s+' +                      // range like "<5.0" or ">40"
            '([\\d.]+(?:\\s*[HL])?(?:\\s+[\\d.]+(?:\\s*[HL])?)*)',  // values
            'i'
        );

        let match = text.match(pattern1);
        let range = '';
        let unit = '';
        let valuesStr = '';

        if (match) {
            range = match[1];
            unit = match[2] || '';
            valuesStr = match[3];
        } else {
            match = text.match(pattern2);
            if (match) {
                range = match[1];
                valuesStr = match[2];
            }
        }

        if (match && valuesStr) {
            // Extract all numbers from the matched group
            const valueMatches = [...valuesStr.matchAll(/([\d.]+)\s*([HL])?/g)];

            if (valueMatches.length > 0) {
                const dataPoints = [];

                for (let j = 0; j < Math.min(valueMatches.length, dates.length); j++) {
                    const value = parseFloat(valueMatches[j][1]);
                    const flag = valueMatches[j][2];
                    const status = flag === 'H' ? 'high' : flag === 'L' ? 'low' : 'normal';

                    if (!isNaN(value) && dates[j]) {
                        dataPoints.push({
                            date: dates[j],
                            value: value,
                            status: status
                        });
                    }
                }

                if (dataPoints.length > 0) {
                    values[testName] = {
                        unit: unit,
                        range: range,
                        dataPoints: dataPoints
                    };
                    console.log(`  ✓ ${testName}: ${dataPoints.length} valores`);
                }
            }
        }
    }

    // Also try generic pattern to catch any remaining tests
    // Pattern: TestName  RangeOrValue  Value1 H/L  Value2 H/L...
    const genericPattern = /([A-Za-z][A-Za-z\s\/\-]+?)\s{2,}([<>]?[\d.]+(?:\s*-\s*[\d.]+)?)\s+([A-Za-z\*\/\d%]*)\s*([\d.]+(?:\s*[HL])?(?:\s+[\d.]+(?:\s*[HL])?)+)/gi;

    let genericMatch;
    while ((genericMatch = genericPattern.exec(text)) !== null) {
        let testName = cleanTestName(genericMatch[1]);
        const range = genericMatch[2];
        const unit = genericMatch[3] || '';
        const valuesStr = genericMatch[4];

        // Skip if already found or is a header
        if (values[testName] || !testName || testName.length < 2) continue;
        const upperName = testName.toUpperCase();
        if (['NAME', 'STANDARD', 'RANGE', 'RESULT', 'DATE'].some(h => upperName.includes(h))) continue;

        const valueMatches = [...valuesStr.matchAll(/([\d.]+)\s*([HL])?/g)];

        if (valueMatches.length > 1) {  // Need at least 2 values for period format
            const dataPoints = [];

            for (let j = 0; j < Math.min(valueMatches.length, dates.length); j++) {
                const value = parseFloat(valueMatches[j][1]);
                const flag = valueMatches[j][2];
                const status = flag === 'H' ? 'high' : flag === 'L' ? 'low' : 'normal';

                if (!isNaN(value) && dates[j]) {
                    dataPoints.push({
                        date: dates[j],
                        value: value,
                        status: status
                    });
                }
            }

            if (dataPoints.length > 1) {
                values[testName] = {
                    unit: unit,
                    range: range,
                    dataPoints: dataPoints
                };
                console.log(`  ✓ ${testName}: ${dataPoints.length} valores (generic)`);
            }
        }
    }

    console.log(`📊 Total: ${Object.keys(values).length} testes com múltiplos valores`);
    return values;
}

// Parse Image with OCR
async function parseImageOCR(labInfo) {
    try {
        console.log(`🔍 Executando OCR em ${labInfo.filename}...`);
        console.log('⏳ Isso pode demorar alguns segundos...');

        const result = await Tesseract.recognize(
            labInfo.filepath,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        const progress = Math.round(m.progress * 100);
                        if (progress % 20 === 0) {
                            console.log(`OCR progresso: ${progress}%`);
                        }
                    }
                }
            }
        );

        labInfo.rawText = result.data.text;
        console.log('📄 Texto OCR extraído (primeiros 800 chars):', labInfo.rawText.substring(0, 800));

        // Extract date from header (format: M/D/YYYY in the flowsheet)
        labInfo.collectionDate = extractDateFromOCR(result.data.text);
        labInfo.dates = labInfo.collectionDate ? [labInfo.collectionDate] : [];

        // The JPGs are flowsheets similar to MyChart Period format
        // Parse as a table with test names and values
        labInfo.values = extractChartLabValues(result.data.text, labInfo.filename);
        labInfo.labType = 'Gráfico';

        console.log('✅ OCR completo - valores extraídos:', Object.keys(labInfo.values).length);
        return labInfo;
    } catch (error) {
        console.error('❌ Erro no OCR:', error);
        return labInfo;
    }
}

// Extract date from OCR text
function extractDateFromOCR(text) {
    // Look for date patterns like "3/16/2023" in header
    const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]);
        const day = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        return new Date(year, month - 1, day);
    }

    // Try alternative format
    const altDateMatch = text.match(/Printed on:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (altDateMatch) {
        const month = parseInt(altDateMatch[1]);
        const day = parseInt(altDateMatch[2]);
        const year = parseInt(altDateMatch[3]);
        return new Date(year, month - 1, day);
    }

    return null;
}

// Extract values from chart lab OCR text
function extractChartLabValues(text, filename) {
    const values = {};
    const lines = text.split('\n');

    console.log('🔍 Parseando linhas do OCR...');

    // The JPG flowsheets have format:
    // Test Name                    Value1    Value2
    // Where values may have L (low) or H (high) markers

    // Common test names to look for (with flexible matching for OCR errors)
    const testPatterns = [
        { name: 'Hemoglobin', patterns: [/hemoglobin/i, /hemo.*bin/i] },
        { name: 'Hematocrit', patterns: [/hematocrit/i, /hemat.*crit/i] },
        { name: 'RBC', patterns: [/\bRBC\b/i, /red.*cell/i] },
        { name: 'MCV', patterns: [/\bMCV\b/i] },
        { name: 'MCH', patterns: [/\bMCH\b(?!C)/i] },
        { name: 'MCHC', patterns: [/\bMCHC\b/i] },
        { name: 'RDW', patterns: [/\bRDW\b/i] },
        { name: 'WBC', patterns: [/\bWBC\b/i, /white.*cell/i] },
        { name: 'Platelets', patterns: [/platelets?/i, /plat.*lets?/i] },
        { name: 'MPV', patterns: [/\bMPV\b/i] },
        { name: 'Neutrophils', patterns: [/neutrophils?/i, /neutr.*phils?/i] },
        { name: 'Lymphocytes', patterns: [/lymphocytes?/i, /lymph.*cytes?/i] },
        { name: 'Monocytes', patterns: [/monocytes?/i, /mono.*cytes?/i] },
        { name: 'Eosinophils', patterns: [/eosinophils?/i, /eosin.*phils?/i] },
        { name: 'Basophils', patterns: [/basophils?/i, /baso.*phils?/i] },
        { name: 'Sodium', patterns: [/\bsodium\b/i, /\bNa\b/] },
        { name: 'Potassium', patterns: [/\bpotassium\b/i, /\bK\b/] },
        { name: 'Chloride', patterns: [/\bchloride\b/i, /\bCl\b/] },
        { name: 'CO2', patterns: [/\bCO2\b/i, /carbon.*dioxide/i] },
        { name: 'BUN', patterns: [/\bBUN\b/i] },
        { name: 'Creatinine', patterns: [/creatinine/i, /creat.*nine/i] },
        { name: 'eGFR', patterns: [/\beGFR\b/i, /egfr/i] },
        { name: 'Glucose', patterns: [/\bglucose\b/i] },
        { name: 'Calcium', patterns: [/\bcalcium\b/i, /\bCa\b/] },
        { name: 'AST', patterns: [/\bAST\b/i] },
        { name: 'ALT', patterns: [/\bALT\b/i] },
        { name: 'Alk phos', patterns: [/alk.*phos/i, /alkaline.*phos/i] },
        { name: 'Total protein', patterns: [/total.*protein/i] },
        { name: 'Albumin', patterns: [/\balbumin\b/i] },
        { name: 'Bilirubin', patterns: [/bilirubin/i] },
        { name: 'Anion gap', patterns: [/anion.*gap/i] },
        { name: 'Cholesterol', patterns: [/\bcholesterol\b/i] },
        { name: 'HDL', patterns: [/\bHDL\b/i] },
        { name: 'LDL', patterns: [/\bLDL\b/i, /calculated.*ldl/i] },
        { name: 'Triglycerides', patterns: [/triglycerides?/i] },
        { name: 'Hemoglobin A1C', patterns: [/hemoglobin.*a1c/i, /hba1c/i, /a1c/i] },
        { name: 'Vitamin B12', patterns: [/vitamin.*b12/i, /b12.*level/i] },
        { name: 'Folate', patterns: [/\bfolate\b/i] },
        { name: 'Free T3', patterns: [/free.*t3/i] },
        { name: 'Free T4', patterns: [/free.*t4/i] },
        { name: 'TSH', patterns: [/\bTSH\b/i, /ultra.*tsh/i] },
        { name: 'Vitamin D', patterns: [/vitamin.*d/i, /25.*hydroxy/i] }
    ];

    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.trim().length < 3) continue;

        // Try to match test patterns
        for (const test of testPatterns) {
            let matched = false;
            for (const pattern of test.patterns) {
                if (pattern.test(line)) {
                    matched = true;
                    break;
                }
            }

            if (matched) {
                // Extract all numbers from the line (values)
                // Pattern: number possibly followed by L, H, or *
                const numberMatches = [...line.matchAll(/([\d.]+)\s*([LH*])?/g)];

                // Take the last number on the line (usually the most recent value)
                if (numberMatches.length > 0) {
                    const lastMatch = numberMatches[numberMatches.length - 1];
                    const value = parseFloat(lastMatch[1]);
                    const flag = lastMatch[2];

                    if (!isNaN(value) && value > 0) {
                        values[test.name] = {
                            value: value,
                            unit: '',
                            range: '',
                            status: flag === 'H' ? 'high' : flag === 'L' ? 'low' : 'normal'
                        };
                        console.log(`  ✓ ${test.name}: ${value} ${flag || ''}`);
                    }
                }
                break;
            }
        }
    }

    return values;
}

// Parse date string
function parseDate(dateStr) {
    // Handle formats like: 1/29/18, 10/18/19, 5/26/20
    const parts = dateStr.split('/');
    let month = parseInt(parts[0]);
    let day = parseInt(parts[1]);
    let year = parseInt(parts[2]);

    // Convert 2-digit year to 4-digit
    if (year < 100) {
        year += year < 50 ? 2000 : 1900;
    }

    return new Date(year, month - 1, day);
}

// Update summary statistics
function updateSummaryStats() {
    const totalLabs = allLabs.length;
    const periodLabs = allLabs.filter(lab => lab.isPeriodLab).length;

    // Find latest lab date
    let latestDate = null;
    allLabs.forEach(lab => {
        if (lab.collectionDate && (!latestDate || lab.collectionDate > latestDate)) {
            latestDate = lab.collectionDate;
        }
    });

    // Count total data points
    let totalDataPoints = 0;
    allLabs.forEach(lab => {
        totalDataPoints += Object.keys(lab.values).length;
    });

    // Update UI
    document.getElementById('total-labs').textContent = totalLabs;
    document.getElementById('period-labs-count').textContent = periodLabs;
    document.getElementById('total-data-points').textContent = totalDataPoints;
    document.getElementById('latest-lab-date').textContent = latestDate ?
        latestDate.toLocaleDateString('pt-BR') : '--';

    // Update dynamic dropdowns
    updateLabTypeFilter();
    updateChartMarkerFilter();
}

// Update lab type filter dropdown dynamically
function updateLabTypeFilter() {
    const filterType = document.getElementById('filter-type');
    if (!filterType) return;

    // Get unique lab types
    const labTypes = new Set();
    allLabs.forEach(lab => {
        if (lab.labType) {
            labTypes.add(lab.labType);
        }
    });

    // Clear existing options except the first ones
    const staticOptions = `
        <option value="all">Todos os Exames</option>
        <option value="period">Exames de Período (2018-2022)</option>
        <option value="chart">Exames de Gráfico (Imagens)</option>
    `;

    // Add dynamic options based on found lab types
    let dynamicOptions = '';
    Array.from(labTypes).sort().forEach(labType => {
        dynamicOptions += `<option value="${labType}">${labType}</option>`;
    });

    filterType.innerHTML = staticOptions + dynamicOptions;
    console.log(`🔽 Dropdown atualizado com ${labTypes.size} tipos de exames`);
}

// Update chart marker filter dropdown dynamically
function updateChartMarkerFilter() {
    const chartMarker = document.getElementById('chart-marker');
    if (!chartMarker) return;

    // Collect all unique markers from all labs
    const allMarkers = new Set();
    allLabs.forEach(lab => {
        Object.keys(lab.values).forEach(marker => {
            allMarkers.add(marker);
        });
    });

    // Sort markers alphabetically
    const sortedMarkers = Array.from(allMarkers).sort();

    // Build options
    let options = '';
    sortedMarkers.forEach(marker => {
        options += `<option value="${marker}">${marker}</option>`;
    });

    if (options) {
        chartMarker.innerHTML = options;
        console.log(`📊 Dropdown de marcadores atualizado com ${allMarkers.size} marcadores`);
    }
}

// Display labs in list view
function displayLabs(labs) {
    console.log('🎨 displayLabs chamada com', labs.length, 'labs');

    const labsList = document.getElementById('labs-list');
    const labsLoading = document.getElementById('labs-loading');
    const labsEmpty = document.getElementById('labs-empty');

    console.log('🎨 Elementos DOM:', {
        labsList: !!labsList,
        labsLoading: !!labsLoading,
        labsEmpty: !!labsEmpty
    });

    if (!labsList) {
        console.error('❌ Elemento labs-list não encontrado!');
        return;
    }

    labsList.innerHTML = '';

    if (labs.length === 0) {
        console.log('⚠️ Nenhum lab para exibir');
        labsLoading.style.display = 'none';
        labsEmpty.style.display = 'block';
        labsList.style.display = 'none';
        return;
    }

    console.log('✅ Exibindo', labs.length, 'labs');
    labsLoading.style.display = 'none';
    labsEmpty.style.display = 'none';
    labsList.style.display = 'flex';

    labs.forEach((lab, index) => {
        try {
            const labCard = createLabCard(lab);
            labsList.appendChild(labCard);
            if (index < 3) {
                console.log(`✓ Card ${index + 1} criado:`, lab.filename);
            }
        } catch (error) {
            console.error(`❌ Erro criando card para ${lab.filename}:`, error);
        }
    });

    console.log('🎨 displayLabs concluída - cards adicionados ao DOM');
}

// Create lab card HTML
function createLabCard(lab) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';

    const dateStr = lab.collectionDate ? lab.collectionDate.toLocaleDateString('pt-BR') : 'Data não disponível';

    // Translate format names to Portuguese
    let formatLabel = '';
    let badgeClass = 'lab-badge-default';

    if (lab.format) {
        badgeClass = `lab-badge-${lab.format.replace('-', '')}`;

        switch(lab.format) {
            case 'mychart-single':
                formatLabel = 'MyChart';
                break;
            case 'healow':
                formatLabel = 'Healow';
                break;
            case 'mychart-period':
                formatLabel = 'Período';
                break;
            case 'chart-ocr':
                formatLabel = 'Gráfico';
                break;
            default:
                formatLabel = 'Exame';
        }
    } else {
        formatLabel = 'Exame';
    }

    const labTypeName = lab.labType || 'Exame';

    col.innerHTML = `
        <div class="lab-card">
            ${lab.isPeriodLab ? '<div class="period-indicator">📅 Exame de Período</div>' : ''}
            <div class="lab-card-header">
                <div onclick="showLabDetail('${lab.id}')" style="cursor: pointer; flex: 1;">
                    <h5 class="lab-card-title">
                        ${labTypeName}
                    </h5>
                    <div class="lab-card-date">${dateStr}</div>
                </div>
                <div class="d-flex flex-column gap-1">
                    <span class="lab-badge ${badgeClass}">${formatLabel}</span>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteLabFile('${lab.storedFileId || lab.id}');" title="Deletar exame">
                        🗑️
                    </button>
                </div>
            </div>
            <div class="lab-card-body" onclick="showLabDetail('${lab.id}')" style="cursor: pointer;">
                <div class="lab-value-preview">
                    ${createValuePreview(lab.values)}
                </div>
            </div>
        </div>
    `;

    return col;
}

// Create value preview tags
function createValuePreview(values) {
    const valueKeys = Object.keys(values).slice(0, 4);
    return valueKeys.map(key => {
        const val = values[key];
        const abnormal = val.status && val.status !== 'normal';
        return `<span class="lab-value-tag ${abnormal ? 'abnormal' : 'normal'}">
            ${key}: ${val.value || val.dataPoints?.[0]?.value || '--'}
        </span>`;
    }).join('');
}

// Show lab detail modal
function showLabDetail(labId) {
    const lab = allLabs.find(l => l.id === labId);
    if (!lab) return;

    // Set modal title
    document.getElementById('labModalTitle').textContent = `${lab.labType || 'Lab'} - ${lab.filename}`;

    // Load PDF/image viewer using blob URL
    const viewerContainer = document.getElementById('pdf-viewer-container');
    const url = lab.blobUrl || lab.filepath;

    if (lab.filename.endsWith('.pdf')) {
        viewerContainer.innerHTML = `<iframe src="${url}" width="100%" height="600px"></iframe>`;
    } else {
        viewerContainer.innerHTML = `<img src="${url}" alt="${lab.filename}" class="img-fluid">`;
    }

    // Show extracted values
    displayExtractedValues(lab.values);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('labDetailModal'));
    modal.show();
}

// Display extracted values
function displayExtractedValues(values) {
    const container = document.getElementById('extracted-values');
    let html = '<table class="table table-sm">';

    for (const [name, data] of Object.entries(values)) {
        const abnormal = data.status && data.status !== 'normal';
        const statusClass = data.status || 'normal';

        html += `
            <tr>
                <td class="value-name">${name}</td>
                <td class="text-end">
                    <span class="value-number ${abnormal ? 'abnormal' : ''}">${data.value || '--'}</span>
                    ${data.unit ? `<small class="text-muted">${data.unit}</small>` : ''}
                    ${data.status ? `<span class="value-status ${statusClass}">${statusClass}</span>` : ''}
                </td>
            </tr>
        `;
    }

    html += '</table>';
    container.innerHTML = html;
}

// Filter labs
function filterLabs() {
    const typeFilter = document.getElementById('filter-type').value;
    const timeFilter = document.getElementById('filter-timerange').value;
    const sortBy = document.getElementById('sort-by').value;

    let filtered = [...allLabs];

    // Apply type filter
    if (typeFilter !== 'all') {
        if (typeFilter === 'period') {
            filtered = filtered.filter(lab => lab.isPeriodLab);
        } else if (typeFilter === 'chart') {
            filtered = filtered.filter(lab => lab.format === 'chart-ocr');
        } else {
            filtered = filtered.filter(lab => lab.labType === typeFilter);
        }
    }

    // Apply time filter
    const now = new Date();
    if (timeFilter !== 'all') {
        filtered = filtered.filter(lab => {
            if (!lab.collectionDate) return false;

            switch (timeFilter) {
                case 'year':
                    return (now - lab.collectionDate) < (365 * 24 * 60 * 60 * 1000);
                case '6months':
                    return (now - lab.collectionDate) < (180 * 24 * 60 * 60 * 1000);
                case '3months':
                    return (now - lab.collectionDate) < (90 * 24 * 60 * 60 * 1000);
                case 'prediet':
                    return lab.collectionDate < new Date('2023-01-01');
                case 'postdiet':
                    return lab.collectionDate >= new Date('2023-01-01');
                default:
                    return true;
            }
        });
    }

    // Sort
    if (sortBy === 'newest') {
        filtered.sort((a, b) => (b.collectionDate || 0) - (a.collectionDate || 0));
    } else if (sortBy === 'oldest') {
        filtered.sort((a, b) => (a.collectionDate || 0) - (b.collectionDate || 0));
    } else if (sortBy === 'type') {
        filtered.sort((a, b) => (a.labType || '').localeCompare(b.labType || ''));
    }

    displayLabs(filtered);
}

// View lab in chart
function viewInChart() {
    // Switch to charts tab
    const chartsTab = document.getElementById('charts-tab');
    chartsTab.click();

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('labDetailModal'));
    if (modal) modal.hide();
}

// Reprocess all labs (clear cache and re-parse)
async function reprocessAllLabs() {
    if (!confirm('Reprocessar todos os exames? Isso vai limpar o cache e aplicar os parsers mais recentes. Pode demorar alguns minutos.')) {
        return;
    }

    try {
        console.log('🔄 Iniciando reprocessamento...');

        // Clear OCR cache
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('lab_ocr_')) {
                localStorage.removeItem(key);
            }
        });

        // Get all files from IndexedDB
        const storedFiles = await labsStorage.getAll();
        console.log(`📦 ${storedFiles.length} arquivo(s) para reprocessar`);

        // Clear parsed data for all files
        for (const fileData of storedFiles) {
            await labsStorage.update(fileData.id, { parsedData: null });
        }

        console.log('✅ Cache limpo, iniciando re-parsing...');

        // Rescan (will force re-parsing)
        await scanLabFiles();

        alert('✅ Reprocessamento completo! Os exames foram analisados novamente.');
    } catch (error) {
        console.error('❌ Erro ao reprocessar:', error);
        alert('Erro ao reprocessar exames. Verifique o console.');
    }
}

// Clear OCR cache
function clearOCRCache() {
    if (confirm('Tem certeza que deseja limpar o cache do OCR? Os arquivos JPG precisarão ser reprocessados na próxima vez.')) {
        const keys = Object.keys(localStorage);
        let cleared = 0;

        keys.forEach(key => {
            if (key.startsWith('lab_ocr_')) {
                localStorage.removeItem(key);
                cleared++;
            }
        });

        console.log(`🗑️ ${cleared} resultados de OCR removidos do cache`);
        alert(`Cache do OCR limpo! ${cleared} exames precisarão ser reprocessados.`);
    }
}
