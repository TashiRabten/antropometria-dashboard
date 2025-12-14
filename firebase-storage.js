// Firebase Cloud Storage Module
// Handles file uploads and downloads for lab PDFs and images

// Upload a lab file to Cloud Storage
async function uploadLabFileToStorage(file, userId, labId, onProgress) {
    const ext = file.name.split('.').pop().toLowerCase();
    const storagePath = `labs/${userId}/${labId}.${ext}`;

    console.log(`📤 Uploading file to: ${storagePath}`);

    // Create a reference to the file location
    const storageRef = storage.ref(storagePath);

    // Set metadata
    const metadata = {
        contentType: file.type,
        customMetadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            labId: labId
        }
    };

    // Start upload
    const uploadTask = storageRef.put(file, metadata);

    // Return a promise that resolves with the download URL
    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                // Progress tracking
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

                if (onProgress && typeof onProgress === 'function') {
                    onProgress(progress, snapshot);
                }

                if (progress % 20 === 0 || progress === 100) {
                    console.log(`📊 Upload progress: ${Math.round(progress)}%`);
                }
            },
            (error) => {
                // Error handling
                console.error('❌ Upload error:', error.code, error.message);

                let errorMessage = 'Erro ao fazer upload do arquivo.';

                if (error.code === 'storage/unauthorized') {
                    errorMessage = 'Sem permissão para upload. Faça login novamente.';
                } else if (error.code === 'storage/canceled') {
                    errorMessage = 'Upload cancelado.';
                } else if (error.code === 'storage/quota-exceeded') {
                    errorMessage = 'Cota de armazenamento excedida.';
                }

                reject(new Error(errorMessage));
            },
            async () => {
                // Upload completed successfully
                try {
                    const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log('✅ Upload completo:', file.name);
                    console.log('🔗 Download URL:', downloadUrl);

                    resolve({
                        storagePath: storagePath,
                        downloadUrl: downloadUrl,
                        size: uploadTask.snapshot.totalBytes,
                        contentType: file.type
                    });
                } catch (error) {
                    console.error('❌ Erro ao obter download URL:', error);
                    reject(error);
                }
            }
        );
    });
}

// Get download URL for an existing file
async function getLabFileDownloadUrl(userId, labId, extension) {
    try {
        const storagePath = `labs/${userId}/${labId}.${extension}`;
        const storageRef = storage.ref(storagePath);
        const downloadUrl = await storageRef.getDownloadURL();

        return downloadUrl;
    } catch (error) {
        console.error('❌ Erro ao obter URL de download:', error);

        if (error.code === 'storage/object-not-found') {
            throw new Error('Arquivo não encontrado no storage.');
        }

        throw error;
    }
}

// Delete a lab file from Cloud Storage
async function deleteLabFileFromStorage(userId, labId, extension) {
    try {
        const storagePath = `labs/${userId}/${labId}.${extension}`;
        const storageRef = storage.ref(storagePath);

        await storageRef.delete();
        console.log('🗑️ Arquivo deletado do storage:', storagePath);

        return true;
    } catch (error) {
        console.error('❌ Erro ao deletar arquivo:', error);

        if (error.code === 'storage/object-not-found') {
            console.warn('⚠️ Arquivo já não existe no storage');
            return true; // Consider it deleted
        }

        throw error;
    }
}

// Download a file as a blob (for parsing)
async function downloadLabFileAsBlob(downloadUrl) {
    try {
        const response = await fetch(downloadUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('❌ Erro ao baixar arquivo:', error);
        throw error;
    }
}

// Download a file as ArrayBuffer (for PDF parsing)
async function downloadLabFileAsArrayBuffer(downloadUrl) {
    try {
        const response = await fetch(downloadUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return arrayBuffer;
    } catch (error) {
        console.error('❌ Erro ao baixar arquivo como ArrayBuffer:', error);
        throw error;
    }
}

// Get file metadata
async function getLabFileMetadata(userId, labId, extension) {
    try {
        const storagePath = `labs/${userId}/${labId}.${extension}`;
        const storageRef = storage.ref(storagePath);
        const metadata = await storageRef.getMetadata();

        return {
            size: metadata.size,
            contentType: metadata.contentType,
            created: metadata.timeCreated,
            updated: metadata.updated,
            customMetadata: metadata.customMetadata
        };
    } catch (error) {
        console.error('❌ Erro ao obter metadados:', error);
        throw error;
    }
}

// List all files for a user (for debugging/admin)
async function listAllLabFilesForUser(userId) {
    try {
        const listRef = storage.ref(`labs/${userId}`);
        const result = await listRef.listAll();

        const files = await Promise.all(
            result.items.map(async (itemRef) => {
                const metadata = await itemRef.getMetadata();
                const downloadUrl = await itemRef.getDownloadURL();

                return {
                    name: itemRef.name,
                    fullPath: itemRef.fullPath,
                    downloadUrl: downloadUrl,
                    size: metadata.size,
                    contentType: metadata.contentType
                };
            })
        );

        console.log(`📋 ${files.length} arquivo(s) encontrado(s) no storage`);
        return files;
    } catch (error) {
        console.error('❌ Erro ao listar arquivos:', error);
        throw error;
    }
}

// Export functions for use in other files
window.firebaseStorage = {
    upload: uploadLabFileToStorage,
    getDownloadUrl: getLabFileDownloadUrl,
    delete: deleteLabFileFromStorage,
    downloadAsBlob: downloadLabFileAsBlob,
    downloadAsArrayBuffer: downloadLabFileAsArrayBuffer,
    getMetadata: getLabFileMetadata,
    listAll: listAllLabFilesForUser
};
