// Labs Upload - Handle file uploads with drag & drop
// Firebase version - uploads to Cloud Storage and Firestore

// Initialize upload functionality
document.addEventListener('DOMContentLoaded', function() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    if (!uploadZone || !fileInput) return;

    // Drag and drop handlers
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);

    // File input handler
    fileInput.addEventListener('change', handleFileSelect);
});

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

// Handle drag leave
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

// Handle drop
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFiles(files);
    }
}

// Handle file select
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        processFiles(files);
    }
}

// Process uploaded files
async function processFiles(files) {
    console.log(`📤 Processando ${files.length} arquivo(s)...`);

    // Get current user
    const userId = firebaseAuth.getCurrentUserId();
    if (!userId) {
        alert('Você precisa estar autenticado para fazer upload de arquivos.');
        return;
    }

    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    const statusText = document.getElementById('upload-status');

    // Show progress and scroll to it
    progressDiv.style.display = 'block';
    progressDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    const totalFiles = files.length;
    let processedFiles = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!isValidFileType(file)) {
            console.warn(`⚠️ Tipo de arquivo inválido: ${file.name}`);
            continue;
        }

        try {
            // Generate unique lab ID
            const labId = generateLabId(file.name);

            // Update status - Upload phase
            const uploadProgress = Math.round((i / totalFiles) * 33);
            statusText.textContent = `📤 Fazendo upload de ${file.name}... (${i + 1}/${totalFiles})`;
            progressBar.style.width = uploadProgress + '%';
            progressBar.textContent = uploadProgress + '%';

            // Upload file to Cloud Storage
            const uploadResult = await firebaseStorage.upload(
                file,
                userId,
                labId,
                (progress) => {
                    // Update progress bar during upload
                    const currentFileProgress = Math.round((i / totalFiles) * 33 + (progress / totalFiles) * 0.33);
                    progressBar.style.width = currentFileProgress + '%';
                    progressBar.textContent = currentFileProgress + '%';
                }
            );

            console.log(`☁️ Arquivo enviado para Cloud Storage: ${file.name}`);

            // Update status - Parsing phase
            const parsingProgress = Math.round((i / totalFiles) * 33 + 33);
            statusText.textContent = `📊 Processando ${file.name}... (${i + 1}/${totalFiles})`;
            progressBar.style.width = parsingProgress + '%';
            progressBar.textContent = parsingProgress + '%';

            // Parse the file
            const parsedData = await parseFileForFirebase(file, labId);
            console.log(`📊 Arquivo parseado: ${file.name}`);

            // Update status - Saving phase
            const savingProgress = Math.round((i / totalFiles) * 33 + 66);
            statusText.textContent = `💾 Salvando metadados de ${file.name}... (${i + 1}/${totalFiles})`;
            progressBar.style.width = savingProgress + '%';
            progressBar.textContent = savingProgress + '%';

            // Save metadata and parsed data to Firestore
            await firebaseDB.save(userId, labId, {
                filename: file.name,
                type: file.type,
                size: file.size,
                labType: parsedData.labType,
                format: parsedData.format,
                collectionDate: parsedData.collectionDate,
                isPeriodLab: parsedData.isPeriodLab || false,
                storagePath: uploadResult.storagePath,
                downloadUrl: uploadResult.downloadUrl,
                parsedData: parsedData
            });

            console.log(`💾 Metadados salvos no Firestore: ${file.name}`);

            processedFiles++;
            const finalProgress = Math.round(((i + 1) / totalFiles) * 100);
            progressBar.style.width = finalProgress + '%';
            progressBar.textContent = finalProgress + '%';

        } catch (error) {
            console.error(`❌ Erro ao processar ${file.name}:`, error);
            alert(`Erro ao processar ${file.name}: ${error.message}`);
        }
    }

    // Complete
    progressBar.style.width = '100%';
    progressBar.textContent = '100%';
    statusText.textContent = `✅ ${processedFiles} arquivo(s) processado(s) com sucesso!`;
    statusText.style.color = '#28a745';
    statusText.style.fontWeight = 'bold';

    setTimeout(() => {
        progressDiv.style.display = 'none';
        progressBar.style.width = '0%';
        progressBar.textContent = '';
        statusText.style.color = '';
        statusText.style.fontWeight = '';
    }, 3000);

    // Reset file input
    document.getElementById('file-input').value = '';
}

// Validate file type
function isValidFileType(file) {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    return validTypes.includes(file.type);
}

// Parse file for Firebase (adapted from parseUploadedFile)
async function parseFileForFirebase(file, labId) {
    const fileExtension = file.name.split('.').pop().toLowerCase();

    let labInfo = {
        id: labId,
        filename: file.name,
        format: null,
        labType: identifyLabTypeFromFilename(file.name),
        collectionDate: null,
        isPeriodLab: false,
        values: {},
        dates: [],
        rawText: null
    };

    try {
        if (fileExtension === 'pdf') {
            // Parse PDF from File object
            const arrayBuffer = await readFileAsArrayBuffer(file);
            const text = await extractPDFTextFromArrayBuffer(arrayBuffer);

            labInfo.rawText = text;
            labInfo.format = identifyPDFFormat(text, file.name);
            labInfo = await parsePDF(labInfo, text);

        } else if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
            // Parse image with OCR
            labInfo.format = 'chart-ocr';
            labInfo.labType = 'Gráfico';

            // Check Firebase OCR cache first
            const userId = firebaseAuth.getCurrentUserId();
            const cachedData = await firebaseDB.getOCRCache(userId, labId);

            if (cachedData) {
                console.log(`📦 Usando cache OCR para ${file.name}`);
                labInfo.format = cachedData.format;
                labInfo.labType = cachedData.labType;
                labInfo.collectionDate = cachedData.collectionDate ? new Date(cachedData.collectionDate) : null;
                labInfo.values = cachedData.values;
                labInfo.dates = cachedData.dates ? cachedData.dates.map(d => new Date(d)) : [];
                labInfo.rawText = cachedData.rawText;
            } else {
                console.log(`⏳ Processando OCR: ${file.name}...`);

                const dataUrl = await readFileAsDataURL(file);
                labInfo = await parseImageOCRFromDataURL(labInfo, dataUrl);

                // Cache the results in Firestore
                await firebaseDB.saveOCRCache(userId, labId, {
                    format: labInfo.format,
                    labType: labInfo.labType,
                    collectionDate: labInfo.collectionDate,
                    values: labInfo.values,
                    dates: labInfo.dates,
                    rawText: labInfo.rawText
                });
            }
        }

        if (!labInfo.labType) {
            labInfo.labType = identifyLabTypeFromFilename(file.name);
        }

        return labInfo;

    } catch (error) {
        console.error(`Erro ao parsear ${file.name}:`, error);
        return labInfo;
    }
}

// Read file as ArrayBuffer
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsArrayBuffer(file);
    });
}

// Read file as Data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(file);
    });
}

// Extract PDF text from ArrayBuffer
// Preserves line breaks by detecting y-coordinate changes in text items
async function extractPDFTextFromArrayBuffer(arrayBuffer) {
    try {
        const loadingTask = pdfjsLib.getDocument({data: arrayBuffer});
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Sort items by y-coordinate (top to bottom), then x-coordinate (left to right)
            // transform[5] is y-coordinate, transform[4] is x-coordinate
            const items = textContent.items.slice().sort((a, b) => {
                const yDiff = b.transform[5] - a.transform[5]; // Higher y = higher on page
                if (Math.abs(yDiff) > 5) return yDiff; // Different lines
                return a.transform[4] - b.transform[4]; // Same line, sort by x
            });

            let pageText = '';
            let lastY = null;

            for (const item of items) {
                const currentY = item.transform[5];

                // If y-coordinate changed significantly, add newline
                if (lastY !== null && Math.abs(currentY - lastY) > 5) {
                    pageText += '\n';
                } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
                    pageText += ' ';
                }

                pageText += item.str;
                lastY = currentY;
            }

            fullText += pageText + '\n';
        }

        return fullText;
    } catch (error) {
        console.error('Erro ao extrair texto do PDF:', error);
        return '';
    }
}

// Parse image OCR from data URL
async function parseImageOCRFromDataURL(labInfo, dataUrl) {
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
    const timestamp = Date.now();
    const cleanName = filename.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${cleanName}-${timestamp}`;
}

// Clear all labs (Firebase version)
async function clearAllLabs() {
    if (!confirm('Tem certeza que deseja deletar TODOS os exames? Esta ação não pode ser desfeita.')) {
        return;
    }

    const userId = firebaseAuth.getCurrentUserId();
    if (!userId) {
        alert('Você precisa estar autenticado.');
        return;
    }

    try {
        // Get all labs
        const labs = await firebaseDB.getAll(userId);

        console.log(`🗑️ Deletando ${labs.length} exame(s)...`);

        // Delete each lab (both from Storage and Firestore)
        for (const lab of labs) {
            await deleteLabFile(lab.id);
        }

        // Clear OCR cache
        await firebaseDB.clearAllOCRCache(userId);

        console.log('✅ Todos os exames foram deletados');
        alert('Todos os exames foram deletados com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao deletar exames:', error);
        alert('Erro ao deletar exames. Verifique o console.');
    }
}

// Delete a single lab file (Firebase version)
async function deleteLabFile(labId) {
    if (!confirm('Tem certeza que deseja deletar este exame?')) {
        return;
    }

    const userId = firebaseAuth.getCurrentUserId();
    if (!userId) {
        alert('Você precisa estar autenticado.');
        return;
    }

    try {
        // Get lab metadata to find storage path
        const lab = await firebaseDB.get(userId, labId);

        if (lab) {
            // Extract extension from filename
            const ext = lab.filename.split('.').pop().toLowerCase();

            // Delete from Cloud Storage
            await firebaseStorage.delete(userId, labId, ext);
        }

        // Delete from Firestore
        await firebaseDB.delete(userId, labId);

        // Delete OCR cache
        await firebaseDB.deleteOCRCache(userId, labId);

        console.log(`✅ Exame deletado: ${labId}`);

    } catch (error) {
        console.error('❌ Erro ao deletar exame:', error);
        alert('Erro ao deletar exame. Verifique o console.');
    }
}

// Reprocess all labs (Firebase version)
async function reprocessAllLabs() {
    if (!confirm('Reprocessar todos os exames? Isso vai limpar o cache e aplicar os parsers mais recentes. Pode demorar alguns minutos.')) {
        return;
    }

    const userId = firebaseAuth.getCurrentUserId();
    if (!userId) {
        alert('Você precisa estar autenticado.');
        return;
    }

    // Show progress UI
    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    const statusText = document.getElementById('upload-status');

    try {
        console.log('🔄 Iniciando reprocessamento...');

        // Show progress and scroll to it
        progressDiv.style.display = 'block';
        progressDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        statusText.textContent = 'Preparando reprocessamento...';
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        // Clear all OCR cache
        await firebaseDB.clearAllOCRCache(userId);
        console.log('🗑️ Cache OCR limpo');

        // Get all labs
        const labs = await firebaseDB.getAll(userId);
        console.log(`📦 ${labs.length} exame(s) para reprocessar`);

        const totalLabs = labs.length;
        let processedCount = 0;
        let errorCount = 0;

        // For each lab, re-download and re-parse
        for (let i = 0; i < labs.length; i++) {
            const lab = labs[i];

            try {
                console.log(`🔄 [${i+1}/${totalLabs}] Reprocessando: ${lab.filename}`);

                // Update progress UI
                const currentProgress = Math.round((i / totalLabs) * 100);
                statusText.textContent = `🔄 Reprocessando ${lab.filename}... (${i+1}/${totalLabs})`;
                progressBar.style.width = currentProgress + '%';
                progressBar.textContent = currentProgress + '%';

                // Download file from Cloud Storage
                const arrayBuffer = await firebaseStorage.downloadAsArrayBuffer(lab.downloadUrl);

                // Create a File object from ArrayBuffer
                const blob = new Blob([arrayBuffer], { type: lab.type });
                const file = new File([blob], lab.filename, { type: lab.type });

                // Re-parse
                const parsedData = await parseFileForFirebase(file, lab.id);

                // Update Firestore
                await firebaseDB.update(userId, lab.id, parsedData);

                processedCount++;
                console.log(`✅ [${i+1}/${totalLabs}] ${lab.filename} reprocessado com sucesso`);

            } catch (error) {
                errorCount++;
                console.error(`❌ [${i+1}/${totalLabs}] Erro ao reprocessar ${lab.filename}:`, error);
            }
        }

        // Complete
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
        statusText.textContent = `✅ Reprocessamento completo! ${processedCount} sucesso, ${errorCount} erros`;
        statusText.style.color = '#28a745';
        statusText.style.fontWeight = 'bold';

        console.log('✅ Reprocessamento completo!');
        console.log(`📊 Resumo: ${processedCount} sucesso, ${errorCount} erros`);

        setTimeout(() => {
            progressDiv.style.display = 'none';
            statusText.style.color = '';
            statusText.style.fontWeight = '';
            alert(`✅ Reprocessamento completo!\n${processedCount} exames reprocessados\n${errorCount} erros`);
        }, 3000);

    } catch (error) {
        console.error('❌ Erro ao reprocessar:', error);
        progressBar.style.width = '100%';
        progressBar.textContent = 'Erro';
        statusText.textContent = '❌ Erro ao reprocessar exames';
        statusText.style.color = '#dc3545';
        statusText.style.fontWeight = 'bold';
        setTimeout(() => {
            progressDiv.style.display = 'none';
            statusText.style.color = '';
            statusText.style.fontWeight = '';
        }, 3000);
        alert('Erro ao reprocessar exames. Verifique o console.');
    }
}
