// Firebase Firestore Database Module
// Handles all database operations for lab metadata and parsed data

// Save lab metadata and parsed data to Firestore
async function saveLabToFirestore(userId, labId, labData) {
    try {
        const labRef = db.collection('users').doc(userId).collection('labs').doc(labId);

        // Convert Date objects to Firestore Timestamps
        const firestoreData = {
            filename: labData.filename,
            type: labData.type,
            size: labData.size,
            uploadDate: firebase.firestore.FieldValue.serverTimestamp(),
            labType: labData.labType || null,
            format: labData.format || null,
            collectionDate: labData.collectionDate ? firebase.firestore.Timestamp.fromDate(labData.collectionDate) : null,
            isPeriodLab: labData.isPeriodLab || false,
            storagePath: labData.storagePath,
            downloadUrl: labData.downloadUrl,
            parsedData: labData.parsedData || null
        };

        await labRef.set(firestoreData);
        console.log('💾 Lab salvo no Firestore:', labId);

        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar lab no Firestore:', error);
        throw error;
    }
}

// Update parsed data for an existing lab
async function updateLabParsedData(userId, labId, parsedData) {
    try {
        const labRef = db.collection('users').doc(userId).collection('labs').doc(labId);

        await labRef.update({
            parsedData: parsedData,
            labType: parsedData.labType || null,
            format: parsedData.format || null,
            collectionDate: parsedData.collectionDate ? firebase.firestore.Timestamp.fromDate(parsedData.collectionDate) : null,
            isPeriodLab: parsedData.isPeriodLab || false
        });

        console.log('✅ Dados parseados atualizados:', labId);
        return true;
    } catch (error) {
        console.error('❌ Erro ao atualizar dados parseados:', error);
        throw error;
    }
}

// Get a single lab by ID
async function getLabFromFirestore(userId, labId) {
    try {
        const labRef = db.collection('users').doc(userId).collection('labs').doc(labId);
        const doc = await labRef.get();

        if (!doc.exists) {
            console.warn('⚠️ Lab não encontrado:', labId);
            return null;
        }

        const data = doc.data();

        // Convert Firestore Timestamps back to Date objects
        return convertFirestoreLabToJS(doc.id, data);
    } catch (error) {
        console.error('❌ Erro ao buscar lab:', error);
        throw error;
    }
}

// Get all labs for a user with real-time listener
function listenToAllLabs(userId, onUpdate, onError) {
    try {
        const labsRef = db.collection('users').doc(userId).collection('labs')
            .orderBy('collectionDate', 'desc');

        // Set up real-time listener
        const unsubscribe = labsRef.onSnapshot(
            (snapshot) => {
                const labs = [];

                snapshot.forEach((doc) => {
                    const labData = convertFirestoreLabToJS(doc.id, doc.data());
                    labs.push(labData);
                });

                console.log(`📊 ${labs.length} lab(s) carregado(s) do Firestore`);

                if (onUpdate && typeof onUpdate === 'function') {
                    onUpdate(labs);
                }
            },
            (error) => {
                console.error('❌ Erro no listener de labs:', error);

                if (onError && typeof onError === 'function') {
                    onError(error);
                }
            }
        );

        return unsubscribe; // Return function to unsubscribe
    } catch (error) {
        console.error('❌ Erro ao configurar listener:', error);
        throw error;
    }
}

// Get all labs for a user (one-time fetch, no listener)
async function getAllLabsFromFirestore(userId) {
    try {
        const labsRef = db.collection('users').doc(userId).collection('labs')
            .orderBy('collectionDate', 'desc');

        const snapshot = await labsRef.get();
        const labs = [];

        snapshot.forEach((doc) => {
            const labData = convertFirestoreLabToJS(doc.id, doc.data());
            labs.push(labData);
        });

        console.log(`📊 ${labs.length} lab(s) carregado(s) do Firestore`);
        return labs;
    } catch (error) {
        console.error('❌ Erro ao buscar labs:', error);
        throw error;
    }
}

// Delete a lab from Firestore
async function deleteLabFromFirestore(userId, labId) {
    try {
        const labRef = db.collection('users').doc(userId).collection('labs').doc(labId);
        await labRef.delete();

        console.log('🗑️ Lab deletado do Firestore:', labId);
        return true;
    } catch (error) {
        console.error('❌ Erro ao deletar lab:', error);
        throw error;
    }
}

// Convert Firestore lab data to JavaScript object
function convertFirestoreLabToJS(docId, data) {
    return {
        id: docId,
        filename: data.filename,
        type: data.type,
        size: data.size,
        uploadDate: data.uploadDate ? data.uploadDate.toDate() : null,
        labType: data.labType,
        format: data.format,
        collectionDate: data.collectionDate ? data.collectionDate.toDate() : null,
        isPeriodLab: data.isPeriodLab || false,
        storagePath: data.storagePath,
        downloadUrl: data.downloadUrl,
        blobUrl: data.downloadUrl, // Use downloadUrl as blobUrl for compatibility
        parsedData: data.parsedData,
        storedFileId: docId, // For compatibility with existing code

        // If parsedData exists, merge its fields for easier access
        ...(data.parsedData && {
            values: data.parsedData.values || {},
            dates: data.parsedData.dates ? data.parsedData.dates.map(d =>
                d instanceof firebase.firestore.Timestamp ? d.toDate() : new Date(d)
            ) : [],
            rawText: data.parsedData.rawText || null
        })
    };
}

// Save OCR cache to Firestore
async function saveOCRCache(userId, labId, ocrResults) {
    try {
        const cacheRef = db.collection('users').doc(userId).collection('ocrCache').doc(labId);

        await cacheRef.set({
            format: ocrResults.format,
            labType: ocrResults.labType,
            results: ocrResults,
            cachedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('💾 Cache OCR salvo:', labId);
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar cache OCR:', error);
        throw error;
    }
}

// Get OCR cache from Firestore
async function getOCRCache(userId, labId) {
    try {
        const cacheRef = db.collection('users').doc(userId).collection('ocrCache').doc(labId);
        const doc = await cacheRef.get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data();
        console.log('📦 Cache OCR encontrado:', labId);

        return data.results;
    } catch (error) {
        console.error('❌ Erro ao buscar cache OCR:', error);
        return null; // Return null on error to trigger re-processing
    }
}

// Delete OCR cache
async function deleteOCRCache(userId, labId) {
    try {
        const cacheRef = db.collection('users').doc(userId).collection('ocrCache').doc(labId);
        await cacheRef.delete();

        console.log('🗑️ Cache OCR deletado:', labId);
        return true;
    } catch (error) {
        console.error('❌ Erro ao deletar cache OCR:', error);
        throw error;
    }
}

// Clear all OCR cache for a user
async function clearAllOCRCache(userId) {
    try {
        const cacheRef = db.collection('users').doc(userId).collection('ocrCache');
        const snapshot = await cacheRef.get();

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`🗑️ ${snapshot.size} cache(s) OCR deletado(s)`);

        return snapshot.size;
    } catch (error) {
        console.error('❌ Erro ao limpar cache OCR:', error);
        throw error;
    }
}

// Get lab count
async function getLabCount(userId) {
    try {
        const labsRef = db.collection('users').doc(userId).collection('labs');
        const snapshot = await labsRef.get();

        return snapshot.size;
    } catch (error) {
        console.error('❌ Erro ao contar labs:', error);
        throw error;
    }
}

// Export functions for use in other files
window.firebaseDB = {
    save: saveLabToFirestore,
    update: updateLabParsedData,
    get: getLabFromFirestore,
    getAll: getAllLabsFromFirestore,
    listen: listenToAllLabs,
    delete: deleteLabFromFirestore,
    count: getLabCount,

    // OCR cache
    saveOCRCache: saveOCRCache,
    getOCRCache: getOCRCache,
    deleteOCRCache: deleteOCRCache,
    clearAllOCRCache: clearAllOCRCache
};
