module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[project]/src/firebase-admin.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "FIREBASE_CREDENTIAL_HELP",
    ()=>FIREBASE_CREDENTIAL_HELP,
    "adminApp",
    ()=>adminApp,
    "adminAuth",
    ()=>adminAuth,
    "adminStorage",
    ()=>adminStorage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__ = __turbopack_context__.i("[externals]/firebase-admin/app [external] (firebase-admin/app, esm_import, [project]/node_modules/firebase-admin)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__ = __turbopack_context__.i("[externals]/firebase-admin/auth [external] (firebase-admin/auth, esm_import, [project]/node_modules/firebase-admin)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$storage__$5b$external$5d$__$28$firebase$2d$admin$2f$storage$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__ = __turbopack_context__.i("[externals]/firebase-admin/storage [external] (firebase-admin/storage, esm_import, [project]/node_modules/firebase-admin)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$storage__$5b$external$5d$__$28$firebase$2d$admin$2f$storage$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$storage__$5b$external$5d$__$28$firebase$2d$admin$2f$storage$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "lait-video-editor";
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET?.trim() || "lait-video-editor.firebasestorage.app";
const FIREBASE_CREDENTIAL_HELP = "Si ves 'Invalid JWT Signature' o 'UNAUTHENTICATED': (1) Sincroniza la hora del sistema. (2) Regenera la clave en Firebase Console → Configuración → Cuentas de servicio → Generar nueva clave privada.";
function getCredential() {
    const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    // 1. GOOGLE_APPLICATION_CREDENTIALS como JSON inline (App Hosting / Secret Manager)
    if (adc?.trimStart().startsWith("{")) {
        try {
            const parsed = JSON.parse(adc);
            return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["cert"])(parsed);
        } catch  {
            throw new Error("GOOGLE_APPLICATION_CREDENTIALS contiene JSON inválido.");
        }
    }
    // 2. GOOGLE_APPLICATION_CREDENTIALS como ruta a un archivo (desarrollo local)
    const adcPath = adc ?? "lait-video-editor-firebase-adminsdk-fbsvc-423ef0596b.json";
    const resolvedPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].isAbsolute(adcPath) ? adcPath : __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].resolve(process.cwd(), adcPath);
    if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(resolvedPath)) {
        return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["cert"])(resolvedPath);
    }
    if (adc) {
        throw new Error(`GOOGLE_APPLICATION_CREDENTIALS apunta a un archivo inexistente: ${resolvedPath}`);
    }
    // 3. Archivos *-adminsdk-*.json en la raíz del proyecto (fallback local)
    const candidates = [
        "lait-video-editor-firebase-adminsdk-fbsvc-423ef0596b.json",
        "lait-video-editor-firebase-adminsdk-fbsvc-feeabf3dcd.json"
    ];
    for (const name of candidates){
        const p = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), name);
        if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(p)) {
            try {
                return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["cert"])(p);
            } catch  {
                continue;
            }
        }
    }
    // 4. Variables de entorno individuales (FIREBASE_PRIVATE_KEY, etc.)
    const raw = process.env.FIREBASE_PRIVATE_KEY;
    if (!raw) {
        throw new Error("Configura Firebase Admin: GOOGLE_APPLICATION_CREDENTIALS (ruta o JSON), el archivo JSON del service account, o FIREBASE_PRIVATE_KEY en .env");
    }
    const privateKey = raw.replace(/\\n/g, "\n").trim();
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["cert"])({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
    });
}
const adminApp = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["getApps"])().length === 0 ? (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["initializeApp"])({
    credential: getCredential(),
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET
}) : (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$app__$5b$external$5d$__$28$firebase$2d$admin$2f$app$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["getApps"])()[0];
const adminAuth = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$auth__$5b$external$5d$__$28$firebase$2d$admin$2f$auth$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["getAuth"])(adminApp);
const adminStorage = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$storage__$5b$external$5d$__$28$firebase$2d$admin$2f$storage$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["getStorage"])(adminApp);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/utils/duration.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calcTotalDuration",
    ()=>calcTotalDuration
]);
function calcTotalDuration(sequences) {
    if (sequences.length === 0) return 0;
    const hasExplicitFrom = sequences.some((s)=>s.from !== undefined);
    if (hasExplicitFrom) {
        return Math.max(0, ...sequences.map((s)=>(s.from ?? 0) + s.durationInFrames));
    }
    // Only visual sequences determine the composition length.
    const visualSeqs = sequences.filter((s)=>s.sceneType !== "audio").sort((a, b)=>a.order - b.order);
    if (visualSeqs.length === 0) return 0;
    return visualSeqs.reduce((total, seq, i)=>{
        const isLast = i === visualSeqs.length - 1;
        const overlap = !isLast && seq.transition ? seq.transition.durationInFrames : 0;
        return total + seq.durationInFrames - overlap;
    }, 0);
}
}),
"[project]/src/lib/db.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "COLLECTIONS",
    ()=>COLLECTIONS,
    "assetRef",
    ()=>assetRef,
    "assetToDTO",
    ()=>assetToDTO,
    "assetsRef",
    ()=>assetsRef,
    "compositionRef",
    ()=>compositionRef,
    "compositionToDTO",
    ()=>compositionToDTO,
    "compositionsRef",
    ()=>compositionsRef,
    "createAsset",
    ()=>createAsset,
    "createComposition",
    ()=>createComposition,
    "deleteAsset",
    ()=>deleteAsset,
    "deleteComposition",
    ()=>deleteComposition,
    "getComposition",
    ()=>getComposition,
    "linkAssetsToComposition",
    ()=>linkAssetsToComposition,
    "listAssets",
    ()=>listAssets,
    "listAssetsBySession",
    ()=>listAssetsBySession,
    "listCompositions",
    ()=>listCompositions,
    "updateAsset",
    ()=>updateAsset,
    "updateComposition",
    ()=>updateComposition,
    "upsertUserProfile",
    ()=>upsertUserProfile,
    "userRef",
    ()=>userRef
]);
/**
 * server-only — importar solo desde rutas de API o Server Components.
 *
 * Colecciones Firestore:
 *   users/{uid}                              → perfil del usuario
 *   users/{uid}/compositions/{compositionId} → composiciones de video
 *   users/{uid}/assets/{assetId}             → assets multimedia
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__ = __turbopack_context__.i("[externals]/firebase-admin/firestore [external] (firebase-admin/firestore, esm_import, [project]/node_modules/firebase-admin)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2d$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/firebase-admin.ts [app-rsc] (ecmascript)");
// ─────────────────────────────────────────────────────────────────────────────
// Calculadora de duración total para TransitionSeries
// ─────────────────────────────────────────────────────────────────────────────
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$duration$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/duration.ts [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2d$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2d$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
const db = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["getFirestore"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$firebase$2d$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["adminApp"]);
const COLLECTIONS = {
    /** `users/{uid}` */ user: (uid)=>`users/${uid}`,
    /** `users/{uid}/compositions` */ compositions: (uid)=>`users/${uid}/compositions`,
    /** `users/{uid}/compositions/{compositionId}` */ composition: (uid, compositionId)=>`users/${uid}/compositions/${compositionId}`,
    /** `users/{uid}/assets` */ assets: (uid)=>`users/${uid}/assets`,
    /** `users/{uid}/assets/{assetId}` */ asset: (uid, assetId)=>`users/${uid}/assets/${assetId}`
};
;
function compositionToDTO(id, doc) {
    return {
        id,
        ownerId: doc.ownerId,
        title: doc.title,
        description: doc.description,
        status: doc.status,
        thumbnailUrl: doc.thumbnailUrl,
        fps: doc.fps,
        width: doc.width,
        height: doc.height,
        sequences: doc.sequences,
        totalDurationInFrames: doc.totalDurationInFrames,
        createdAt: doc.createdAt.toDate().toISOString(),
        updatedAt: doc.updatedAt.toDate().toISOString()
    };
}
function assetToDTO(id, doc) {
    return {
        id,
        ownerId: doc.ownerId,
        name: doc.name,
        type: doc.type,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        storagePath: doc.storagePath,
        downloadUrl: doc.downloadUrl,
        description: doc.description,
        sessionId: doc.sessionId,
        compositionId: doc.compositionId,
        width: doc.width,
        height: doc.height,
        durationSeconds: doc.durationSeconds,
        createdAt: doc.createdAt.toDate().toISOString(),
        updatedAt: doc.updatedAt.toDate().toISOString()
    };
}
const compositionsRef = (uid)=>db.collection(COLLECTIONS.compositions(uid));
const compositionRef = (uid, compositionId)=>db.doc(COLLECTIONS.composition(uid, compositionId));
const assetsRef = (uid)=>db.collection(COLLECTIONS.assets(uid));
const assetRef = (uid, assetId)=>db.doc(COLLECTIONS.asset(uid, assetId));
const userRef = (uid)=>db.doc(COLLECTIONS.user(uid));
async function listCompositions(uid) {
    const snap = await compositionsRef(uid).orderBy("updatedAt", "desc").get();
    return snap.docs.map((doc)=>compositionToDTO(doc.id, doc.data()));
}
async function getComposition(uid, compositionId) {
    const snap = await compositionRef(uid, compositionId).get();
    if (!snap.exists) return null;
    return compositionToDTO(snap.id, snap.data());
}
async function createComposition(uid, input, id) {
    const now = __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["FieldValue"].serverTimestamp();
    const docData = {
        ...input,
        ownerId: uid,
        createdAt: now,
        updatedAt: now
    };
    let ref;
    if (id) {
        ref = compositionRef(uid, id);
        await ref.set(docData);
    } else {
        const newRef = await compositionsRef(uid).add(docData);
        ref = compositionRef(uid, newRef.id);
    }
    const snap = await ref.get();
    return compositionToDTO(snap.id, snap.data());
}
async function updateComposition(uid, compositionId, patch) {
    const ref = compositionRef(uid, compositionId);
    if (!(await ref.get()).exists) return null;
    await ref.update({
        ...patch,
        updatedAt: __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["FieldValue"].serverTimestamp()
    });
    const updated = await ref.get();
    return compositionToDTO(updated.id, updated.data());
}
async function deleteComposition(uid, compositionId) {
    const ref = compositionRef(uid, compositionId);
    if (!(await ref.get()).exists) return false;
    await ref.delete();
    return true;
}
async function listAssets(uid) {
    const snap = await assetsRef(uid).orderBy("createdAt", "desc").get();
    return snap.docs.map((doc)=>assetToDTO(doc.id, doc.data()));
}
async function listAssetsBySession(uid, sessionId) {
    const snap = await assetsRef(uid).where("sessionId", "==", sessionId).orderBy("createdAt", "asc").get();
    return snap.docs.map((doc)=>assetToDTO(doc.id, doc.data()));
}
async function linkAssetsToComposition(uid, sessionId, compositionId) {
    const snap = await assetsRef(uid).where("sessionId", "==", sessionId).get();
    if (snap.empty) return;
    const batch = db.batch();
    for (const doc of snap.docs){
        batch.update(doc.ref, {
            compositionId,
            updatedAt: __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["FieldValue"].serverTimestamp()
        });
    }
    await batch.commit();
}
/** Firestore no acepta valores `undefined` en .add() / .set() sin ignoreUndefinedProperties. */ function dropUndefined(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v])=>v !== undefined));
}
async function createAsset(uid, input) {
    const now = __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["FieldValue"].serverTimestamp();
    const docData = dropUndefined({
        ...input,
        ownerId: uid,
        createdAt: now,
        updatedAt: now
    });
    const ref = await assetsRef(uid).add(docData);
    const snap = await ref.get();
    return assetToDTO(snap.id, snap.data());
}
async function updateAsset(uid, assetId, patch) {
    const ref = assetRef(uid, assetId);
    if (!(await ref.get()).exists) return null;
    await ref.update({
        ...patch,
        updatedAt: __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["FieldValue"].serverTimestamp()
    });
    const updated = await ref.get();
    return assetToDTO(updated.id, updated.data());
}
async function deleteAsset(uid, assetId) {
    const ref = assetRef(uid, assetId);
    if (!(await ref.get()).exists) return false;
    await ref.delete();
    return true;
}
async function upsertUserProfile(uid, data) {
    const ref = userRef(uid);
    const snap = await ref.get();
    if (!snap.exists) {
        await ref.set({
            ...data,
            plan: "free",
            compositionsCount: 0,
            storageUsedBytes: 0,
            createdAt: __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["FieldValue"].serverTimestamp(),
            updatedAt: __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["FieldValue"].serverTimestamp()
        });
    } else {
        await ref.update({
            ...data,
            updatedAt: __TURBOPACK__imported__module__$5b$externals$5d2f$firebase$2d$admin$2f$firestore__$5b$external$5d$__$28$firebase$2d$admin$2f$firestore$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$firebase$2d$admin$29$__["FieldValue"].serverTimestamp()
        });
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/app/editor/components/EditorClient.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EditorClient",
    ()=>EditorClient
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const EditorClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call EditorClient() from the server but EditorClient is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/app/editor/components/EditorClient.tsx <module evaluation>", "EditorClient");
}),
"[project]/app/editor/components/EditorClient.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EditorClient",
    ()=>EditorClient
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const EditorClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call EditorClient() from the server but EditorClient is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/app/editor/components/EditorClient.tsx", "EditorClient");
}),
"[project]/app/editor/components/EditorClient.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$editor$2f$components$2f$EditorClient$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/app/editor/components/EditorClient.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$editor$2f$components$2f$EditorClient$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/app/editor/components/EditorClient.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$editor$2f$components$2f$EditorClient$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/app/editor/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "default",
    ()=>EditorPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/webapi/jwt/verify.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$editor$2f$components$2f$EditorClient$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/editor/components/EditorClient.tsx [app-rsc] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);
async function getUser() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    const sessionToken = cookieStore.get("session")?.value;
    if (!sessionToken) return null;
    try {
        const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jwtVerify"])(sessionToken, SESSION_SECRET);
        return payload;
    } catch  {
        return null;
    }
}
async function EditorPage({ searchParams }) {
    const user = await getUser();
    if (!user) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login");
    let composition = null;
    try {
        const { id } = await searchParams;
        if (id) {
            composition = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getComposition"])(user.uid, id);
        }
        if (!composition) {
            const compositions = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["listCompositions"])(user.uid);
            composition = compositions[0] ?? null;
        }
    } catch  {
    // ignore
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        style: {
            height: "100vh"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$editor$2f$components$2f$EditorClient$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["EditorClient"], {
            composition: composition
        }, void 0, false, {
            fileName: "[project]/app/editor/page.tsx",
            lineNumber: 46,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/editor/page.tsx",
        lineNumber: 45,
        columnNumber: 5
    }, this);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/app/editor/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/editor/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7fca3a80._.js.map