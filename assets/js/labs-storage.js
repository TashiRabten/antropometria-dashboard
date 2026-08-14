// Labs Storage - IndexedDB for storing lab files
// Provides persistent storage for uploaded PDF and image files

const DB_NAME = 'LabsDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'labFiles';

let db = null;

// Initialize IndexedDB
async function initLabsDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('❌ Erro ao abrir IndexedDB:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('✅ IndexedDB inicializado');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Create object store for lab files
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('filename', 'filename', { unique: false });
                store.createIndex('uploadDate', 'uploadDate', { unique: false });
                store.createIndex('labType', 'labType', { unique: false });
                console.log('📦 Object store criado');
            }
        };
    });
}

// Save a file to IndexedDB
async function saveLabFile(file) {
    await initLabsDB();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            const fileData = {
                id: generateFileId(file.name),
                filename: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result, // ArrayBuffer or data URL
                uploadDate: new Date().toISOString(),
                labType: null, // Will be set after parsing
                parsedData: null // Will store extracted values
            };

            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(fileData);

            request.onsuccess = () => {
                console.log(`💾 Arquivo salvo: ${file.name}`);
                resolve(fileData);
            };

            request.onerror = (event) => {
                console.error('❌ Erro ao salvar arquivo:', event.target.error);
                reject(event.target.error);
            };
        };

        reader.onerror = () => {
            reject(new Error('Erro ao ler arquivo'));
        };

        // Read as ArrayBuffer for PDFs, DataURL for images
        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

// Get all lab files from IndexedDB
async function getAllLabFiles() {
    await initLabsDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result || []);
        };

        request.onerror = (event) => {
            console.error('❌ Erro ao buscar arquivos:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Get a single lab file by ID
async function getLabFile(id) {
    await initLabsDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Update parsed data for a file
async function updateLabFileParsedData(id, parsedData) {
    await initLabsDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const fileData = getRequest.result;
            if (fileData) {
                fileData.parsedData = parsedData;
                if (parsedData && parsedData.labType) {
                    fileData.labType = parsedData.labType;
                }
                const putRequest = store.put(fileData);

                putRequest.onsuccess = () => resolve(fileData);
                putRequest.onerror = (e) => reject(e.target.error);
            } else {
                reject(new Error('Arquivo não encontrado'));
            }
        };

        getRequest.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Delete a lab file
async function deleteLabFile(id) {
    await initLabsDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log(`🗑️ Arquivo deletado: ${id}`);
            resolve();
        };

        request.onerror = (event) => {
            console.error('❌ Erro ao deletar arquivo:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Delete all lab files
async function clearAllLabFiles() {
    await initLabsDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
            console.log('🗑️ Todos os arquivos deletados');
            resolve();
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Generate unique file ID
function generateFileId(filename) {
    const timestamp = Date.now();
    const cleanName = filename.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${cleanName}-${timestamp}`;
}

// Get file count
async function getLabFileCount() {
    await initLabsDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.count();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Export functions
window.labsStorage = {
    init: initLabsDB,
    save: saveLabFile,
    getAll: getAllLabFiles,
    get: getLabFile,
    update: updateLabFileParsedData,
    delete: deleteLabFile,
    clear: clearAllLabFiles,
    count: getLabFileCount
};

// Initialize on load
document.addEventListener('DOMContentLoaded', initLabsDB);
