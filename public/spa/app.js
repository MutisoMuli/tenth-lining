import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const config = window.__APP_CONFIG__ || { baseUrl: '/tenth-lining', csrfToken: '' };

class LocalDocumentStore {
    constructor() {
        this.dbName = 'TenthLiningDB';
        this.dbVersion = 1;
        this.storeName = 'documents';
    }

    _openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }

    async saveDocument(metadata, pdfBlob = null) {
        try {
            const db = await this._openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                const getReq = store.get(metadata.id);
                getReq.onsuccess = () => {
                    const existing = getReq.result || {};
                    const record = {
                        ...existing,
                        ...metadata,
                        updated_at: new Date().toISOString(),
                    };
                    if (pdfBlob) {
                        record.pdfBlob = pdfBlob;
                    }
                    
                    const putReq = store.put(record);
                    putReq.onsuccess = () => resolve(record);
                    putReq.onerror = () => reject(putReq.error);
                };
                getReq.onerror = () => reject(getReq.error);
            });
        } catch (e) {
            console.error('IndexedDB saveDocument error:', e);
        }
    }

    async getDocument(id) {
        try {
            const db = await this._openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const req = store.get(id);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.error('IndexedDB getDocument error:', e);
            return null;
        }
    }

    async getAllDocuments() {
        try {
            const db = await this._openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const req = store.getAll();
                req.onsuccess = () => {
                    const docs = req.result || [];
                    docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    resolve(docs);
                };
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.error('IndexedDB getAllDocuments error:', e);
            return [];
        }
    }

    async deleteDocument(id) {
        try {
            const db = await this._openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const req = store.delete(id);
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.error('IndexedDB deleteDocument error:', e);
            return false;
        }
    }

    async clearAll() {
        try {
            const db = await this._openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const req = store.clear();
                req.onsuccess = () => resolve(true);
                req.onerror = () => reject(req.error);
            });
        } catch (e) {
            console.error('IndexedDB clearAll error:', e);
            return false;
        }
    }
}
const localStore = new LocalDocumentStore();

class App {
    constructor() {
        this.appEl = document.getElementById('app');
        this.routes = {
            '#/': () => this.renderHome(),
            '#/dashboard': () => this.renderDashboard(),
            '#/editor/': (id) => this.renderEditor(id)
        };

        this.currentCleanup = null;
        window.addEventListener('hashchange', () => this.handleRouting());
        window.addEventListener('load', () => this.handleRouting());
    }

    handleRouting() {
        const hash = window.location.hash || '#/';
        
        // Run cleanup of the previous view if exists
        if (this.currentCleanup) {
            try {
                this.currentCleanup();
            } catch (e) {
                console.error('Cleanup error:', e);
            }
            this.currentCleanup = null;
        }

        if (hash.startsWith('#/editor/')) {
            const id = hash.replace('#/editor/', '');
            if (id) {
                this.routes['#/editor/'](id);
                return;
            }
        }

        if (hash === '#/tool/merge-pdf') {
            this.renderMergePdfTool();
            return;
        }

        if (hash === '#/tool/split-pdf') {
            this.renderSplitPdfTool();
            return;
        }

        if (hash === '#/tool/compress-pdf') {
            this.renderCompressPdfTool();
            return;
        }

        if (hash === '#/tool/repair-pdf' || hash === '#/tool/ocr-pdf') {
            const toolType = hash.replace('#/tool/', '').split('?')[0];
            this.renderOptimizeTool(toolType);
            return;
        }

        if (hash === '#/tool/rotate-pdf' || hash === '#/tool/add-page-numbers' ||
            hash === '#/tool/add-watermark' || hash === '#/tool/crop-pdf' ||
            hash === '#/tool/edit-pdf' || hash === '#/tool/pdf-forms') {
            const toolType = hash.replace('#/tool/', '').split('?')[0];
            this.renderEditTool(toolType);
            return;
        }

        if (hash === '#/tool/unlock-pdf' || hash === '#/tool/protect-pdf' ||
            hash === '#/tool/sign-pdf' || hash === '#/tool/redact-pdf' ||
            hash === '#/tool/compare-pdf') {
            const toolType = hash.replace('#/tool/', '').split('?')[0];
            this.renderSecurityTool(toolType);
            return;
        }

        if (hash === '#/tool/remove-pages' || hash === '#/tool/extract-pages' ||
            hash === '#/tool/organize-pdf' || hash === '#/tool/scan-to-pdf') {
            const toolType = hash.replace('#/tool/', '').split('?')[0];
            this.renderOrganizeTool(toolType);
            return;
        }

        if (hash.startsWith('#/tool/all-pdf-tools') || hash.startsWith('#/tool/convert-pdf') || 
            hash.startsWith('#/tool/jpg-to-pdf') || hash.startsWith('#/tool/word-to-pdf') ||
            hash.startsWith('#/tool/ppt-to-pdf') || hash.startsWith('#/tool/excel-to-pdf') ||
            hash.startsWith('#/tool/html-to-pdf') || hash.startsWith('#/tool/pdf-to-jpg') ||
            hash.startsWith('#/tool/pdf-to-word') || hash.startsWith('#/tool/pdf-to-ppt') ||
            hash.startsWith('#/tool/pdf-to-excel') || hash.startsWith('#/tool/pdf-to-pdfa')) {
            const toolType = hash.replace('#/tool/', '').split('?')[0];
            this.renderConvertPdfTool(toolType);
            return;
        }

        const routeHandler = this.routes[hash] || this.routes['#/'];
        routeHandler();
    }

    // Helper: Update active link in navbar
    updateActiveNavbarLink(hash) {
        document.querySelectorAll('.navbar-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === hash) {
                link.classList.add('navbar-link-active');
            } else {
                link.classList.remove('navbar-link-active');
            }
        });
    }

    // ─── VIEW 1: HOME/LANDING PAGE ──────────────────────────────
    renderHome() {
        this.appEl.innerHTML = `
            <!-- Navigation -->
            <nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80">
                <div class="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
                    <a href="#/" class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center font-black text-white text-lg shadow-md shadow-purple-500/20">T</div>
                        <div>
                            <span class="font-bold text-lg text-slate-900 tracking-tight block leading-tight">Tenth Lining</span>
                            <span class="text-[9px] block text-purple-600 tracking-widest uppercase font-bold">by Bizlyn Systems</span>
                        </div>
                    </a>

                    <div class="hidden lg:flex items-center gap-5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <a href="#/tool/merge-pdf" class="hover:text-purple-600 transition-colors py-2">MERGE PDF</a>
                        <a href="#/tool/split-pdf" class="hover:text-purple-600 transition-colors py-2">SPLIT PDF</a>
                        <a href="#/tool/compress-pdf" class="hover:text-purple-600 transition-colors py-2">COMPRESS PDF</a>

                        <!-- CONVERT PDF Dropdown -->
                        <div class="relative group">
                            <button class="flex items-center gap-1 py-2 hover:text-purple-600 transition-colors uppercase font-bold focus:outline-none">
                                CONVERT PDF
                                <svg class="w-3.5 h-3.5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                            </button>
                            <div class="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[480px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 hidden group-hover:block hover:block animate-fade-in z-50">
                                <div class="grid grid-cols-2 gap-6 text-left normal-case">
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">CONVERT TO PDF</h4>
                                        <div class="space-y-2">
                                            <a href="#/tool/jpg-to-pdf" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[10px]">JPG</span> JPG to PDF
                                            </a>
                                            <a href="#/tool/word-to-pdf" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">DOC</span> WORD to PDF
                                            </a>
                                            <a href="#/tool/powerpoint-to-pdf" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-[10px]">PPT</span> POWERPOINT to PDF
                                            </a>
                                            <a href="#/tool/excel-to-pdf" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px]">XLS</span> EXCEL to PDF
                                            </a>
                                            <a href="#/tool/html-to-pdf" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-[10px]">HTML</span> HTML to PDF
                                            </a>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">CONVERT FROM PDF</h4>
                                        <div class="space-y-2">
                                            <a href="#/tool/pdf-to-jpg" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[10px]">JPG</span> PDF to JPG
                                            </a>
                                            <a href="#/tool/pdf-to-word" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">DOC</span> PDF to WORD
                                            </a>
                                            <a href="#/tool/pdf-to-powerpoint" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-[10px]">PPT</span> PDF to POWERPOINT
                                            </a>
                                            <a href="#/tool/pdf-to-excel" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px]">XLS</span> PDF to EXCEL
                                            </a>
                                            <a href="#/tool/pdf-to-pdfa" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px]">PDFA</span> PDF to PDF/A
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ALL PDF TOOLS Mega-Menu Dropdown -->
                        <div class="relative group">
                            <button class="flex items-center gap-1 py-2 text-purple-600 hover:text-purple-700 transition-colors uppercase font-extrabold focus:outline-none">
                                ALL PDF TOOLS
                                <svg class="w-3.5 h-3.5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                            </button>
                            <div class="fixed left-1/2 -translate-x-1/2 top-16 w-[1100px] max-w-[95vw] bg-white border border-slate-200 rounded-3xl shadow-2xl p-8 hidden group-hover:block hover:block animate-fade-in z-50 max-h-[85vh] overflow-y-auto">
                                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-left normal-case">
                                    <!-- ORGANIZE PDF -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-red-500 uppercase tracking-wider mb-3">ORGANIZE PDF</h4>
                                        <div class="space-y-1.5">
                                            <a href="#/tool/merge-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Merge PDF</a>
                                            <a href="#/tool/split-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Split PDF</a>
                                            <a href="#/tool/remove-pages" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Remove pages</a>
                                            <a href="#/tool/extract-pages" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Extract pages</a>
                                            <a href="#/tool/organize-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Organize PDF</a>
                                            <a href="#/tool/scan-to-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Scan to PDF</a>
                                        </div>
                                    </div>

                                    <!-- OPTIMIZE PDF -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-green-600 uppercase tracking-wider mb-3">OPTIMIZE PDF</h4>
                                        <div class="space-y-1.5">
                                            <a href="#/tool/compress-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Compress PDF</a>
                                            <a href="#/tool/repair-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Repair PDF</a>
                                            <a href="#/tool/ocr-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">OCR PDF</a>
                                        </div>
                                    </div>

                                    <!-- CONVERT TO PDF -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider mb-3">CONVERT TO PDF</h4>
                                        <div class="space-y-1.5">
                                            <a href="#/tool/jpg-to-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">JPG to PDF</a>
                                            <a href="#/tool/word-to-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">WORD to PDF</a>
                                            <a href="#/tool/powerpoint-to-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">POWERPOINT to PDF</a>
                                            <a href="#/tool/excel-to-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">EXCEL to PDF</a>
                                            <a href="#/tool/html-to-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">HTML to PDF</a>
                                        </div>
                                    </div>

                                    <!-- CONVERT FROM PDF -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider mb-3">CONVERT FROM PDF</h4>
                                        <div class="space-y-1.5">
                                            <a href="#/tool/pdf-to-jpg" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">PDF to JPG</a>
                                            <a href="#/tool/pdf-to-word" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">PDF to WORD</a>
                                            <a href="#/tool/pdf-to-powerpoint" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">PDF to POWERPOINT</a>
                                            <a href="#/tool/pdf-to-excel" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">PDF to EXCEL</a>
                                            <a href="#/tool/pdf-to-pdfa" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">PDF to PDF/A</a>
                                        </div>
                                    </div>

                                    <!-- EDIT PDF -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-purple-600 uppercase tracking-wider mb-3">EDIT PDF</h4>
                                        <div class="space-y-1.5">
                                            <a href="#/tool/rotate-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Rotate PDF</a>
                                            <a href="#/tool/add-page-numbers" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Add page numbers</a>
                                            <a href="#/tool/add-watermark" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Add watermark</a>
                                            <a href="#/tool/crop-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Crop PDF</a>
                                            <a href="#/tool/edit-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Edit PDF</a>
                                            <a href="#/tool/pdf-forms" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">PDF Forms</a>
                                        </div>
                                    </div>

                                    <!-- PDF SECURITY -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider mb-3">PDF SECURITY</h4>
                                        <div class="space-y-1.5">
                                            <a href="#/tool/unlock-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Unlock PDF</a>
                                            <a href="#/tool/protect-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Protect PDF</a>
                                            <a href="#/tool/sign-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Sign PDF</a>
                                            <a href="#/tool/redact-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Redact PDF</a>
                                            <a href="#/tool/compare-pdf" class="block p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 hover:text-purple-600">Compare PDF</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <a href="#/dashboard" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-500/20">Dashboard</a>
                    </div>
                </div>
            </nav>

            <!-- Hero Section -->
            <section class="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
                <!-- Background effects (subtle glowing orbs on white background) -->
                <div class="absolute inset-0 overflow-hidden pointer-events-none">
                    <div class="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-purple-100/40 blur-[120px]"></div>
                    <div class="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-indigo-100/30 blur-[100px]"></div>
                </div>

                <div class="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <!-- Badge -->
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold mb-8 animate-fade-in">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style="width:14px; height:14px;"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>
                        Kenyan Court of Appeal Rules Compliant
                    </div>

                    <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6 text-slate-900">
                        Professional<br>
                        <span class="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 bg-clip-text text-transparent">Court Document</span><br>
                        Formatting
                    </h1>

                    <p class="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        Upload your PDF or Word document. We automatically add <strong class="text-purple-600">page numbering</strong> and <strong class="text-purple-600">tenth lining</strong> per the Court of Appeal Rules. Pay via M-Pesa and download instantly.
                    </p>

                    <!-- Upload Area -->
                    <div id="upload-area" class="max-w-xl mx-auto">
                        <form id="upload-form">
                            <label for="file-input" id="drop-area" class="group relative block cursor-pointer">
                                <div class="border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-2xl p-10 transition-all duration-300 bg-white hover:bg-slate-50/50 shadow-sm hover:shadow-md">
                                    <div class="flex flex-col items-center gap-4">
                                        <!-- Upload icon -->
                                        <div class="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                                        </div>
                                        <div>
                                            <p class="text-slate-800 font-semibold text-lg">Drop your document here</p>
                                            <p class="text-slate-500 text-sm mt-1">or click to browse · PDF, DOC, DOCX · Max 100MB</p>
                                        </div>
                                    </div>
                                    <input type="file" name="file" id="file-input" class="hidden" accept=".pdf,.doc,.docx">
                                </div>
                            </label>

                            <!-- Progress indicator (hidden by default) -->
                            <div id="upload-progress" class="hidden mt-4">
                                <div class="flex items-center gap-3 p-4 rounded-xl bg-white border border-purple-200 shadow-md">
                                    <div class="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span id="upload-filename" class="text-sm text-slate-700 truncate flex-1 font-medium text-left"></span>
                                    <div style="background: var(--slate-100); height: 4px; border-radius: 2px; width: 60px; overflow: hidden; margin-left: 8px; margin-right: 8px;">
                                        <div id="upload-progress-bar" style="background: var(--purple-600); height: 100%; width: 0%; transition: width 0.2s;"></div>
                                    </div>
                                    <span id="upload-percent" class="text-xs text-purple-600 font-semibold">0%</span>
                                </div>
                            </div>
                        </form>
                        <div id="upload-error" class="hidden error-box" style="margin-top: var(--space-4);"></div>
                    </div>
                </div>
            </section>

            <!-- Features Section -->
            <section id="features-section" class="py-24 relative bg-white border-t border-slate-100">
                <div class="max-w-6xl mx-auto px-6">
                    <div class="text-center mb-16">
                        <h2 class="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Everything You Need for <span class="text-purple-600">Court Compliance</span></h2>
                        <p class="text-slate-500 max-w-xl mx-auto">Format your legal documents exactly as required by the Kenyan Court of Appeal Rules.</p>
                    </div>

                    <div class="grid md:grid-cols-3 gap-6">
                        <!-- Feature 1 -->
                        <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                            <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-bold text-lg mb-2 text-left">Automatic Page Numbering</h3>
                            <p class="text-slate-500 text-sm leading-relaxed text-left">Every page gets a number in the top-right corner. Customize font, size, color, position, bold, and italic.</p>
                        </div>

                        <!-- Feature 2 -->
                        <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                            <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-bold text-lg mb-2 text-left">Tenth Lining</h3>
                            <p class="text-slate-500 text-sm leading-relaxed text-left">Every 10th line is automatically numbered (10, 20, 30...) on the right margin, exactly as required by the Court.</p>
                        </div>

                        <!-- Feature 3 -->
                        <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                            <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-bold text-lg mb-2 text-left">M-Pesa Payment</h3>
                            <p class="text-slate-500 text-sm leading-relaxed text-left">Pay securely via Safaricom M-Pesa STK Push. KES 3 per page. Instant confirmation and download.</p>
                        </div>

                        <!-- Feature 4 -->
                        <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                            <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-bold text-lg mb-2 text-left">Live Preview</h3>
                            <p class="text-slate-500 text-sm leading-relaxed text-left">See exactly how your document will look before you pay. Adjust settings in real-time with instant visual feedback.</p>
                        </div>

                        <!-- Feature 5 -->
                        <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                            <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-bold text-lg mb-2 text-left">PDF Compression</h3>
                            <p class="text-slate-500 text-sm leading-relaxed text-left">Automatically compress PDFs to meet the 25MB court filing limit while preserving document quality.</p>
                        </div>

                        <!-- Feature 6 -->
                        <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                            <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-bold text-lg mb-2 text-left">Word & PDF Support</h3>
                            <p class="text-slate-500 text-sm leading-relaxed text-left">Upload PDF, DOC, or DOCX files. Word documents are automatically converted to PDF for processing.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- How It Works -->
            <section id="how-it-works-section" class="py-24 bg-slate-50 border-y border-slate-100">
                <div class="max-w-4xl mx-auto px-6">
                    <div class="text-center mb-16">
                        <h2 class="text-3xl md:text-4xl font-bold mb-4 text-slate-900">How It <span class="text-purple-600">Works</span></h2>
                        <p class="text-slate-500">Four simple steps to court-ready documents.</p>
                    </div>

                    <div class="space-y-8">
                        <div class="flex gap-6 items-start group">
                            <div class="flex-shrink-0 w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">01</div>
                            <div>
                                <h3 class="text-slate-800 font-bold text-lg mb-1 text-left">Upload Your Document</h3>
                                <p class="text-slate-500 text-sm leading-relaxed text-left">Drag and drop or browse for your PDF, DOC, or DOCX file. We accept files up to 100MB.</p>
                            </div>
                        </div>

                        <div class="flex gap-6 items-start group">
                            <div class="flex-shrink-0 w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">02</div>
                            <div>
                                <h3 class="text-slate-800 font-bold text-lg mb-1 text-left">Configure Formatting</h3>
                                <p class="text-slate-500 text-sm leading-relaxed text-left">Adjust page numbering position, font, and style. Configure tenth lining with live preview.</p>
                            </div>
                        </div>

                        <div class="flex gap-6 items-start group">
                            <div class="flex-shrink-0 w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">03</div>
                            <div>
                                <h3 class="text-slate-800 font-bold text-lg mb-1 text-left">Pay via M-Pesa</h3>
                                <p class="text-slate-500 text-sm leading-relaxed text-left">KES 3 per page. Enter your phone number and confirm the STK Push on your phone.</p>
                            </div>
                        </div>

                        <div class="flex gap-6 items-start group">
                            <div class="flex-shrink-0 w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">04</div>
                            <div>
                                <h3 class="text-slate-800 font-bold text-lg mb-1 text-left">Download</h3>
                                <p class="text-slate-500 text-sm leading-relaxed text-left">Your formatted, court-compliant PDF is ready for download immediately after payment.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Pricing -->
            <section id="pricing-section" class="py-24 bg-white">
                <div class="max-w-lg mx-auto px-6 text-center">
                    <h2 class="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Simple <span class="text-purple-600">Pricing</span></h2>
                    <p class="text-slate-500 mb-10">No subscriptions. Pay only for what you use.</p>

                    <div class="p-8 rounded-3xl bg-white border border-purple-100 shadow-xl shadow-purple-500/5 relative overflow-hidden flex flex-col items-center">
                        <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600"></div>
                        <div class="text-6xl font-black text-slate-900 mb-2">KES 3</div>
                        <div class="text-slate-500 text-sm mb-8 font-semibold">per page</div>

                        <div class="space-y-3.5 text-left text-sm mb-8">
                            <div class="flex items-center gap-3 text-slate-600 font-medium">
                                <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                Page numbering
                            </div>
                            <div class="flex items-center gap-3 text-slate-600 font-medium">
                                <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                Tenth lining
                            </div>
                            <div class="flex items-center gap-3 text-slate-600 font-medium">
                                <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                PDF compression
                            </div>
                            <div class="flex items-center gap-3 text-slate-600 font-medium">
                                <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                Live preview
                            </div>
                            <div class="flex items-center gap-3 text-slate-600 font-medium">
                                <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                M-Pesa payment
                            </div>
                            <div class="flex items-center gap-3 text-slate-600 font-medium">
                                <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                Instant download
                            </div>
                        </div>

                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600 w-full">
                            <span class="text-slate-800 font-bold">Example:</span> 100 pages × KES 3 = <span class="text-purple-600 font-black">KES 300</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Footer -->
            <footer class="py-12 border-t border-slate-150 bg-slate-50/50">
                <div class="max-w-6xl mx-auto px-6 text-center">
                    <div class="flex items-center justify-center gap-3 mb-4">
                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center font-black text-white text-sm">T</div>
                        <span class="font-bold text-slate-700">Tenth Lining <span class="text-purple-600">by Bizlyn Systems</span></span>
                    </div>
                    <p class="text-slate-500 text-sm">&copy; ${new Date().getFullYear()} Bizlyn Systems. All rights reserved.</p>
                </div>
            </footer>
        `;

        this.initHomeListeners();
    }

    initHomeListeners() {
        const fileInput = document.getElementById('file-input');
        const dropArea = document.getElementById('drop-area');
        const progressContainer = document.getElementById('upload-progress');
        const progressBar = document.getElementById('upload-progress-bar');
        const filenameEl = document.getElementById('upload-filename');
        const percentEl = document.getElementById('upload-percent');
        const errorEl = document.getElementById('upload-error');

        if (!fileInput) return;

        // Smooth scroll bindings
        document.getElementById('nav-features-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
        });
        document.getElementById('nav-pricing-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
        });
        document.getElementById('nav-how-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' });
        });

        // Handle drop area events
        ['dragenter', 'dragover'].forEach(evtName => {
            dropArea.addEventListener(evtName, (e) => {
                e.preventDefault();
                dropArea.querySelector('div').classList.add('border-purple-400', 'bg-purple-50');
            }, false);
        });

        ['dragleave', 'drop'].forEach(evtName => {
            dropArea.addEventListener(evtName, (e) => {
                e.preventDefault();
                dropArea.querySelector('div').classList.remove('border-purple-400', 'bg-purple-50');
            }, false);
        });

        dropArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length) {
                fileInput.files = files;
                this.handleUpload(files[0], progressContainer, progressBar, filenameEl, percentEl, errorEl);
            }
        }, false);

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) {
                this.handleUpload(fileInput.files[0], progressContainer, progressBar, filenameEl, percentEl, errorEl);
            }
        });
    }

    async handleUpload(file, container, bar, filenameEl, percentEl, errorEl) {
        errorEl.classList.add('hidden');
        container.classList.remove('hidden');
        filenameEl.textContent = file.name;
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${config.baseUrl}/upload`, true);
            xhr.setRequestHeader('X-CSRF-TOKEN', config.csrfToken);
            xhr.setRequestHeader('Accept', 'application/json');

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    bar.style.width = percent + '%';
                    percentEl.textContent = percent + '%';
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        if (result.success && result.document_id) {
                            localStore.saveDocument({
                                id: result.document_id,
                                original_name: file.name,
                                file_size: file.size,
                                created_at: new Date().toISOString(),
                                payment_status: 'pending'
                            });
                            window.location.hash = `#/editor/${result.document_id}`;
                        } else {
                            throw new Error(result.message || 'Upload succeeded but failed to parse response.');
                        }
                    } catch (e) {
                        this.showUploadError(e.message, errorEl, container);
                    }
                } else {
                    let errMsg = 'Failed to upload document. Server returned ' + xhr.status;
                    try {
                        const resp = JSON.parse(xhr.responseText);
                        if (resp.message) errMsg = resp.message;
                    } catch (e) {}
                    this.showUploadError(errMsg, errorEl, container);
                }
            };

            xhr.onerror = () => {
                this.showUploadError('Network connection error. Please try again.', errorEl, container);
            };

            xhr.send(formData);
        } catch (e) {
            this.showUploadError(e.message, errorEl, container);
        }
    }

    showUploadError(msg, errorEl, progressContainer) {
        progressContainer.classList.add('hidden');
        errorEl.classList.remove('hidden');
        errorEl.textContent = msg;
    }

    // ─── VIEW 2: DASHBOARD PAGE ───────────────────────────────
    async renderDashboard() {
        this.appEl.innerHTML = `
            <nav class="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
                <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a href="#/" class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center font-black text-white text-lg">T</div>
                        <div>
                            <span class="font-bold text-lg text-slate-900 tracking-tight">Tenth Lining</span>
                            <span class="text-[10px] block text-purple-600 -mt-1 tracking-widest uppercase font-semibold">by Bizlyn Systems</span>
                        </div>
                    </a>
                    <div class="flex items-center gap-6 text-sm font-medium">
                        <a href="#/" class="text-slate-600 hover:text-purple-600 transition-colors">Home</a>
                        <a href="#/dashboard" class="text-purple-600 font-bold">Dashboard</a>
                        <a href="#/" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-all font-medium shadow-md shadow-purple-500/20">
                            + New Document
                        </a>
                    </div>
                </div>
            </nav>

            <div class="min-h-screen bg-slate-50 pt-24 pb-16 px-6">
                <div class="max-w-6xl mx-auto space-y-8">
                    
                    <!-- Header Title Row -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div class="flex items-center gap-3">
                                <h1 class="text-3xl font-black text-slate-900 tracking-tight">My Documents</h1>
                                <span id="db-status-badge" class="hidden px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">Offline (Cached)</span>
                            </div>
                            <p class="text-sm text-slate-500 font-medium mt-1">View, manage, edit, download and delete your court documents.</p>
                        </div>
                        <a href="#/" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-500/20">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                            Upload Document
                        </a>
                    </div>
                    
                    <!-- Loading Indicator -->
                    <div id="dashboard-loading" class="flex flex-col items-center justify-center py-20 text-slate-500">
                        <div class="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <span class="font-semibold text-sm">Fetching document history...</span>
                    </div>

                    <!-- Content (Stats & Table) -->
                    <div id="dashboard-content" class="hidden space-y-8">
                        <!-- Stats Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Documents</p>
                                    <p id="stat-total-docs" class="text-3xl font-black text-slate-900">0</p>
                                </div>
                                <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                </div>
                            </div>
                            <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Completed (Paid)</p>
                                    <p id="stat-paid-docs" class="text-3xl font-black text-green-600">0</p>
                                </div>
                                <div class="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                </div>
                            </div>
                            <div class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Pages Formatted</p>
                                    <p id="stat-total-pages" class="text-3xl font-black text-purple-600">0</p>
                                </div>
                                <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                </div>
                            </div>
                        </div>

                        <!-- Documents Table Card -->
                        <div class="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            <th class="px-6 py-4">Document</th>
                                            <th class="px-6 py-4">Pages</th>
                                            <th class="px-6 py-4">Cost</th>
                                            <th class="px-6 py-4">Status</th>
                                            <th class="px-6 py-4">Date Created</th>
                                            <th class="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody id="docs-table-body" class="divide-y divide-slate-100 text-sm">
                                        <!-- Populated dynamically -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div id="dashboard-empty" class="hidden bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm">
                        <div class="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4 border border-purple-100">
                            <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        </div>
                        <h2 class="text-xl font-bold text-slate-900 mb-1">No documents yet</h2>
                        <p class="text-sm text-slate-500 mb-6">Upload your first legal document to apply Tenth Lining and page numbers.</p>
                        <a href="#/" class="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-500/20">
                            Upload Document
                        </a>
                    </div>

                </div>
            </div>
        `;

        const renderDocsList = (docs, isCached = false) => {
            const loadingEl = document.getElementById('dashboard-loading');
            if (loadingEl) loadingEl.classList.add('hidden');

            const statusBadge = document.getElementById('db-status-badge');
            if (statusBadge) {
                if (isCached && docs.length > 0) {
                    statusBadge.classList.remove('hidden');
                } else {
                    statusBadge.classList.add('hidden');
                }
            }

            if (docs.length === 0) {
                document.getElementById('dashboard-empty').classList.remove('hidden');
                document.getElementById('dashboard-content').classList.add('hidden');
            } else {
                document.getElementById('dashboard-content').classList.remove('hidden');
                document.getElementById('dashboard-empty').classList.add('hidden');

                const total = docs.length;
                const paid = docs.filter(d => d.payment_status === 'paid').length;
                const totalPages = docs.reduce((acc, d) => acc + parseInt(d.page_count || 0), 0);

                document.getElementById('stat-total-docs').textContent = total;
                document.getElementById('stat-paid-docs').textContent = paid;
                document.getElementById('stat-total-pages').textContent = totalPages;

                const tbody = document.getElementById('docs-table-body');
                tbody.innerHTML = '';

                docs.forEach(doc => {
                    const isPaid = doc.payment_status === 'paid';
                    const statusBadgeClass = isPaid
                        ? `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200">Paid</span>`
                        : `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>`;

                    const formattedDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }) : 'N/A';

                    const downloadButton = isPaid
                        ? `<a href="${config.baseUrl}/document/${doc.id}/download" class="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1">Download</a>`
                        : '';

                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-50/60 transition-colors';
                    tr.innerHTML = `
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                                    <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
                                </div>
                                <span class="font-bold text-slate-800 text-sm truncate max-w-xs block" title="${doc.original_name}">${doc.original_name}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 font-semibold text-slate-700">${doc.page_count || 0}</td>
                        <td class="px-6 py-4 font-bold text-slate-900">KES ${(doc.page_count || 0) * 3}</td>
                        <td class="px-6 py-4">${statusBadgeClass}</td>
                        <td class="px-6 py-4 text-slate-500 text-xs font-medium">${formattedDate}</td>
                        <td class="px-6 py-4 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <a href="#/editor/${doc.id}" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1">Edit</a>
                                ${downloadButton}
                                <button data-doc-id="${doc.id}" data-doc-name="${doc.original_name}" class="btn-delete-doc px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                    Delete
                                </button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Attach delete button listeners
                document.querySelectorAll('.btn-delete-doc').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const docId = btn.dataset.docId;
                        const docName = btn.dataset.docName;

                        if (confirm(`Are you sure you want to delete "${docName}"?`)) {
                            try {
                                btn.disabled = true;
                                btn.textContent = 'Deleting...';

                                // Delete from backend API
                                fetch(`${config.baseUrl}/api/document/${docId}`, {
                                    method: 'DELETE',
                                    headers: { 'X-CSRF-TOKEN': config.csrfToken }
                                }).catch(() => {});

                                // Delete from local IndexedDB
                                await localStore.deleteDocument(docId);

                                // Refresh UI
                                const updatedDocs = docs.filter(d => d.id !== docId);
                                renderDocsList(updatedDocs, isCached);
                            } catch (err) {
                                alert('Failed to delete document: ' + err.message);
                            }
                        }
                    });
                });
            }
        };

        // 1. Instantly load cached documents
        localStore.getAllDocuments().then(cachedDocs => {
            renderDocsList(cachedDocs, true);

            // 2. Fetch fresh documents from API & update cache
            fetch(`${config.baseUrl}/api/documents/history`)
                .then(resp => {
                    if (!resp.ok) throw new Error('API server returned error status.');
                    return resp.json();
                })
                .then(async data => {
                    const docs = data.documents || [];
                    // Sync IndexedDB cache with current user's document set
                    await localStore.clearAll();
                    await Promise.all(docs.map(doc => localStore.saveDocument(doc)));
                    renderDocsList(docs, false);
                })
                .catch(e => {
                    console.warn('Failed to sync history from API, showing local cache:', e);
                    const loadingEl = document.getElementById('dashboard-loading');
                    if (loadingEl && (!cachedDocs || cachedDocs.length === 0)) {
                        loadingEl.innerHTML = `<div class="error-box">Failed to retrieve documents and no offline cache available: ${e.message}</div>`;
                    }
                });
        });
    }

    // ─── VIEW 3: EDITOR PAGE ──────────────────────────────────
    async renderEditor(id) {
        // Initial clean state of editor variables
        let docData = null;
        let pdfDoc = null;
        let currentZoom = 1.0;
        let allLineCoordinates = [];
        let currentViewMode = 'editor';
        let isToolbarCollapsed = false;

        this.appEl.innerHTML = `
            <div id="editor-app" class="flex flex-col h-screen bg-slate-50 animate-fade-in">
                
                <!-- TOP BAR - Formatting Dashboard -->
                <header class="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-40 px-3 py-2">
                    <div class="flex items-center gap-2">
                    
                        <!-- Brand / Logo -->
                        <div class="flex items-center gap-1.5 flex-shrink-0">
                            <a href="#/" class="flex items-center gap-1.5">
                                <div class="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center font-black text-white text-xs">T</div>
                                <div>
                                    <span class="font-bold text-[11px] text-slate-800 block leading-tight">Tenth Lining</span>
                                    <span class="text-[7.5px] block text-purple-600 tracking-wider uppercase font-semibold leading-none">Bizlyn Systems</span>
                                </div>
                            </a>
                        </div>

                        <div class="h-6 w-px bg-slate-200 flex-shrink-0 mx-1"></div>

                        <!-- SECTION 1: Tenth Line Settings -->
                        <div class="flex items-center gap-2 border-r border-slate-200 pr-3 flex-shrink-0">
                            <div class="flex items-center gap-1 border-r border-slate-200 pr-2">
                                <input type="checkbox" id="tl-enabled" checked class="w-3.5 h-3.5 text-purple-600 border-slate-300 rounded focus:ring-purple-500">
                                <label for="tl-enabled" class="text-[9px] uppercase font-bold text-slate-400 tracking-wider cursor-pointer whitespace-nowrap">Tenth Line</label>
                            </div>
                            
                            <!-- Font Family -->
                            <div class="flex flex-col">
                                <label class="text-[8px] text-slate-500 mb-0.5 font-medium">Font</label>
                                <select id="tl-font" class="w-18 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] text-slate-800 focus:border-purple-500 focus:outline-none font-semibold">
                                    <optgroup label="System Fonts">
                                        <option value="Helvetica">Arial</option>
                                        <option value="Times">Times</option>
                                        <option value="Courier">Courier</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Verdana">Verdana</option>
                                        <option value="Trebuchet">Trebuchet</option>
                                    </optgroup>
                                    <optgroup label="Google Fonts">
                                        <option value="Inter">Inter</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="OpenSans">Open Sans</option>
                                        <option value="Lato">Lato</option>
                                        <option value="Montserrat">Montserrat</option>
                                        <option value="Merriweather">Merriweather</option>
                                        <option value="Playfair">Playfair</option>
                                        <option value="FiraCode">Fira Code</option>
                                    </optgroup>
                                </select>
                            </div>

                            <!-- Font Size -->
                            <div class="flex flex-col">
                                <label class="text-[8px] text-slate-500 mb-0.5 font-medium">Size</label>
                                <div class="flex items-center">
                                    <button id="tl-size-down" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-l hover:bg-slate-200 text-[10px] font-bold text-slate-600">-</button>
                                    <input type="number" id="tl-size" value="12" min="6" max="18" class="stepper-input w-7 text-center border-t border-b border-slate-200 bg-white text-[10px] font-semibold py-0.5 focus:outline-none">
                                    <button id="tl-size-up" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-r hover:bg-slate-200 text-[10px] font-bold text-slate-600">+</button>
                                </div>
                            </div>

                            <!-- Margin Right -->
                            <div class="flex flex-col">
                                <label class="text-[8px] text-slate-500 mb-0.5 font-medium whitespace-nowrap">Margin R</label>
                                <div class="flex items-center">
                                    <button id="tl-margin-down" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-l hover:bg-slate-200 text-[10px] font-bold text-slate-600">-</button>
                                    <input type="number" id="tl-margin" value="30" min="5" max="100" class="stepper-input w-7 text-center border-t border-b border-slate-200 bg-white text-[10px] font-semibold py-0.5 focus:outline-none">
                                    <button id="tl-margin-up" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-r hover:bg-slate-200 text-[10px] font-bold text-slate-600">+</button>
                                </div>
                            </div>

                            <!-- Pointer Line Length (mm) -->
                            <div class="flex flex-col">
                                <label class="text-[8px] text-slate-500 mb-0.5 font-medium whitespace-nowrap">Line L</label>
                                <div class="flex items-center">
                                    <button id="tl-line-len-down" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-l hover:bg-slate-200 text-[10px] font-bold text-slate-600">-</button>
                                    <input type="number" id="tl-line-length" value="50" min="5" max="150" class="stepper-input w-7 text-center border-t border-b border-slate-200 bg-white text-[10px] font-semibold py-0.5 focus:outline-none">
                                    <button id="tl-line-len-up" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-r hover:bg-slate-200 text-[10px] font-bold text-slate-600">+</button>
                                </div>
                            </div>

                            <!-- Pointer Line Thickness (px) -->
                            <div class="flex flex-col">
                                <label class="text-[8px] text-slate-500 mb-0.5 font-medium whitespace-nowrap">Line W</label>
                                <div class="flex items-center">
                                    <button id="tl-line-thk-down" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-l hover:bg-slate-200 text-[10px] font-bold text-slate-600">-</button>
                                    <input type="number" id="tl-line-thickness" value="1" min="1" max="10" class="stepper-input w-7 text-center border-t border-b border-slate-200 bg-white text-[10px] font-semibold py-0.5 focus:outline-none">
                                    <button id="tl-line-thk-up" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-r hover:bg-slate-200 text-[10px] font-bold text-slate-600">+</button>
                                </div>
                            </div>

                            <!-- Bold, Badge Toggle, Badge Color & Pointer Line Color -->
                            <div class="flex items-center gap-1.5 mt-2.5">
                                <button id="tl-bold" class="w-5 h-5 border border-slate-200 rounded text-[10px] font-bold flex items-center justify-center transition-colors bg-slate-100 text-slate-700" title="Bold Badge Text">B</button>
                                <label class="flex items-center gap-0.5 cursor-pointer" title="Show/hide background badge behind line numbers">
                                    <input type="checkbox" id="tl-badge" checked class="w-3 h-3 text-purple-600 border-slate-300 rounded focus:ring-purple-500">
                                    <span class="text-[8px] text-slate-500 font-bold uppercase">Badge</span>
                                </label>
                                <input type="color" id="tl-color" value="#000000" title="Badge / Number Color" class="w-5 h-5 border border-slate-200 rounded cursor-pointer">
                                <input type="color" id="tl-line-color" value="#000000" title="Pointer Line Mark Color" class="w-5 h-5 border border-slate-200 rounded cursor-pointer">
                            </div>

                            <!-- Hidden / Helper inputs -->
                            <input type="hidden" id="tl-offset" value="0">
                        </div>

                        <!-- SECTION 2: Page Number Settings -->
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <div class="flex items-center gap-1 border-r border-slate-200 pr-2">
                                <input type="checkbox" id="pn-enabled" checked class="w-3.5 h-3.5 text-purple-600 border-slate-300 rounded focus:ring-purple-500">
                                <label for="pn-enabled" class="text-[9px] uppercase font-bold text-slate-400 tracking-wider cursor-pointer whitespace-nowrap">Page Number</label>
                            </div>
                            
                            <!-- Font Family -->
                            <div class="flex flex-col">
                                <label class="text-[8px] text-slate-500 mb-0.5 font-medium">Font</label>
                                <select id="pn-font" class="w-18 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] text-slate-800 focus:border-purple-500 focus:outline-none font-semibold">
                                    <optgroup label="System Fonts">
                                        <option value="Helvetica">Arial</option>
                                        <option value="Times">Times</option>
                                        <option value="Courier">Courier</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Verdana">Verdana</option>
                                        <option value="Trebuchet">Trebuchet</option>
                                    </optgroup>
                                    <optgroup label="Google Fonts">
                                        <option value="Inter">Inter</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="OpenSans">Open Sans</option>
                                        <option value="Lato">Lato</option>
                                        <option value="Montserrat">Montserrat</option>
                                        <option value="Merriweather">Merriweather</option>
                                        <option value="Playfair">Playfair</option>
                                        <option value="FiraCode">Fira Code</option>
                                    </optgroup>
                                </select>
                            </div>

                            <!-- Start Page Number -->
                            <div class="flex flex-col">
                                <label class="text-[8px] text-slate-500 mb-0.5 font-medium whitespace-nowrap">Start</label>
                                <div class="flex items-center">
                                    <button id="pn-start-down" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-l hover:bg-slate-200 text-[10px] font-bold text-slate-600">-</button>
                                    <input type="number" id="pn-start" value="1" min="1" class="stepper-input w-7 text-center border-t border-b border-slate-200 bg-white text-[10px] font-semibold py-0.5 focus:outline-none">
                                    <button id="pn-start-up" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-r hover:bg-slate-200 text-[10px] font-bold text-slate-600">+</button>
                                </div>
                            </div>

                            <!-- Font Size -->
                            <div class="flex flex-col">
                                <label class="text-[8px] text-slate-500 mb-0.5 font-medium">Size</label>
                                <div class="flex items-center">
                                    <button id="pn-size-down" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-l hover:bg-slate-200 text-[10px] font-bold text-slate-600">-</button>
                                    <input type="number" id="pn-size" value="12" min="6" max="100" class="stepper-input w-7 text-center border-t border-b border-slate-200 bg-white text-[10px] font-semibold py-0.5 focus:outline-none">
                                    <button id="pn-size-up" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-r hover:bg-slate-200 text-[10px] font-bold text-slate-600">+</button>
                                </div>
                            </div>

                            <!-- Margin Top -->
                            <div class="flex flex-col">
                                <label class="text-[8px] text-slate-500 mb-0.5 font-medium whitespace-nowrap">Margin T</label>
                                <div class="flex items-center">
                                    <button id="pn-margin-top-down" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-l hover:bg-slate-200 text-[10px] font-bold text-slate-600">-</button>
                                    <input type="number" id="pn-margin-top" value="15" min="5" max="100" class="stepper-input w-7 text-center border-t border-b border-slate-200 bg-white text-[10px] font-semibold py-0.5 focus:outline-none">
                                    <button id="pn-margin-top-up" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-r hover:bg-slate-200 text-[10px] font-bold text-slate-600">+</button>
                                </div>
                            </div>

                            <!-- Margin Right -->
                            <div class="flex flex-col">
                                <label class="text-[8px] text-slate-500 mb-0.5 font-medium whitespace-nowrap">Margin R</label>
                                <div class="flex items-center">
                                    <button id="pn-margin-right-down" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-l hover:bg-slate-200 text-[10px] font-bold text-slate-600">-</button>
                                    <input type="number" id="pn-margin-right" value="15" min="5" max="100" class="stepper-input w-7 text-center border-t border-b border-slate-200 bg-white text-[10px] font-semibold py-0.5 focus:outline-none">
                                    <button id="pn-margin-right-up" class="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded-r hover:bg-slate-200 text-[10px] font-bold text-slate-600">+</button>
                                </div>
                            </div>

                            <!-- Bold / Italic / Color -->
                            <div class="flex items-center gap-1 mt-2.5">
                                <button id="pn-bold" class="w-5 h-5 border border-slate-200 rounded text-[10px] font-bold flex items-center justify-center transition-colors bg-slate-100 text-slate-700">B</button>
                                <button id="pn-italic" class="w-5 h-5 border border-slate-200 rounded text-[10px] italic flex items-center justify-center transition-colors bg-slate-100 text-slate-700">I</button>
                                <input type="color" id="pn-color" value="#000000" class="w-5 h-5 border border-slate-200 rounded cursor-pointer">
                            </div>

                            <!-- Hidden custom offsets -->
                            <input type="hidden" id="pn-custom-x" value="">
                            <input type="hidden" id="pn-custom-y" value="">
                        </div>

                        <div class="h-6 w-px bg-slate-200 flex-shrink-0 mx-1"></div>

                        <!-- Zoom Controls -->
                        <div class="flex items-center gap-2 flex-shrink-0">
                            <div class="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                                <button id="zoom-out-btn" class="p-0.5 text-slate-500 hover:text-slate-800 transition-colors" title="Zoom Out">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                                </button>
                                <span id="zoom-level-el" class="text-[10px] text-slate-600 font-mono min-w-[30px] text-center font-bold">100%</span>
                                <button id="zoom-in-btn" class="p-0.5 text-slate-500 hover:text-slate-800 transition-colors" title="Zoom In">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                </button>
                            </div>
                        </div>

                    </div>
                </header>

                <!-- MAIN AREA -->
                <div class="flex flex-1 overflow-hidden bg-slate-100">

                    <!-- Left Sidebar - Thumbnails -->
                    <aside class="w-40 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                        <div class="p-3 border-b border-slate-150 flex-shrink-0">
                            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pages Thumbnail</h3>
                        </div>
                        <div id="thumbnail-list-el" class="flex-1 overflow-y-auto editor-panel p-3 space-y-3">
                            <!-- Thumbnails rendered by JS -->
                        </div>
                    </aside>

                    <!-- Center - PDF Preview Container (White Background Area) -->
                    <main class="flex-1 overflow-y-auto editor-panel bg-slate-100 relative" id="viewport-el">
                        <div class="flex flex-col items-center py-8 px-6 min-h-full" id="pdf-pages-container-el">
                            <!-- PDF pages rendered by JS -->
                            <div id="pdf-loading-el" class="flex items-center gap-3 text-slate-500 py-24">
                                <div class="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                Rendering Document Preview...
                            </div>
                        </div>
                    </main>

                    <!-- Right Sidebar - Document Files & Payment Actions -->
                    <aside class="w-72 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
                        
                        <!-- Document List Section -->
                        <div class="flex-1 p-4 overflow-y-auto editor-panel flex flex-col gap-4">
                            
                            <!-- View Mode Switcher (Editor / Preview Radio Buttons) -->
                            <div class="flex border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex-shrink-0">
                                <button id="btn-mode-editor" class="flex-1 py-2 flex items-center justify-center gap-2 transition-all bg-amber-500 text-slate-900 font-bold text-xs leading-tight">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
                                    Editor
                                </button>
                                <button id="btn-mode-preview" class="flex-1 py-2 flex items-center justify-center gap-2 transition-all bg-white text-slate-500 hover:text-slate-800 font-bold text-xs border-l border-slate-150 leading-tight">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                    Preview
                                </button>
                            </div>

                            <div class="flex items-center justify-between mt-2">
                                <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                                    Documents
                                </h3>
                                <a href="#/" class="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 text-[10px] font-bold rounded-lg border border-purple-100 transition-colors flex items-center gap-1">
                                    <span>+ Import Files</span>
                                </a>
                            </div>
                            <!-- Single File List Card -->
                            <div class="p-3.5 rounded-xl border-2 border-purple-400/80 bg-purple-50/20 flex flex-col gap-2 shadow-sm shadow-purple-500/5">
                                <div class="flex items-start gap-3">
                                    <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 border border-red-100">
                                        <svg class="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p class="text-xs font-bold text-slate-800 truncate" id="doc-title" title=""></p>
                                        <p class="text-[10px] text-slate-500 font-semibold mt-0.5" id="doc-meta">0.00 MB · 0 Pages</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Document Size Manager -->
                            <div id="size-manager-container">
                                <!-- Populated dynamically by size manager -->
                            </div>
                        </div>

                        <!-- Bottom Invoice & Payment Trigger -->
                        <div class="p-4 border-t border-slate-150 bg-slate-50 space-y-3 flex-shrink-0">
                            <!-- Page calculation -->
                            <div class="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                                <span id="invoice-details" class="text-slate-500 font-medium">0 Pages × KES 3.00</span>
                                <span id="invoice-total" class="text-slate-800 font-black text-sm">KES 0</span>
                            </div>

                            <!-- Actions -->
                            <button id="btn-save-settings" class="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm">
                                Save Settings
                            </button>

                            <!-- Preview Document Button -->
                            <button id="btn-preview-action" class="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-900 text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/20 uppercase tracking-wider flex items-center justify-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                Preview Document
                            </button>

                            <button id="btn-pay-action" class="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-500/20 uppercase tracking-wider">
                                Pay & Download Document
                            </button>
                        </div>
                    </aside>

                </div>

                <!-- PAYMENT MODAL -->
                <div id="payment-modal-el" class="fixed inset-0 z-50 hidden">
                    <div class="modal-backdrop absolute inset-0 bg-slate-900/60 backdrop-blur-sm" id="modal-backdrop-el"></div>
                    <div class="absolute inset-0 flex items-center justify-center p-4">
                        <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in text-slate-800">
                            <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-800" id="modal-close-el">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>

                            <div class="text-center mb-6">
                                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-700/10 flex items-center justify-center mx-auto mb-3">
                                    <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                                </div>
                                <h3 class="text-slate-800 font-bold text-lg" id="mpesa-modal-title">Pay via M-Pesa</h3>
                                <p class="text-slate-500 text-xs mt-1">Please confirm payment details below</p>
                            </div>

                            <!-- Phone input step -->
                            <div id="payment-step-phone">
                                <label class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">M-Pesa Mobile Number</label>
                                <input type="tel" id="mpesa-phone-input" placeholder="0712345678" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-center text-xl font-bold tracking-widest focus:border-purple-500 focus:outline-none mb-4" maxlength="13">
                                <button id="btn-mpesa-submit" class="w-full py-3.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-green-500/10">
                                    Initiate STK Push
                                </button>
                            </div>

                            <!-- Waiting step -->
                            <div id="payment-step-waiting" class="hidden text-center py-6">
                                <div class="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p class="text-slate-800 font-bold mb-1">Sending STK Push Prompt...</p>
                                <p class="text-slate-500 text-xs mb-4">Please check your phone and enter your M-Pesa PIN to complete payment.</p>
                                <button id="btn-mpesa-verify-waiting" class="w-full py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-colors border border-purple-200">
                                    Already Paid? Click to Verify & Continue
                                </button>
                            </div>

                            <!-- Success step -->
                            <div id="payment-step-success" class="hidden text-center py-4">
                                <div class="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 border border-green-200">
                                    <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                                </div>
                                <p class="text-slate-800 font-black text-lg mb-1">Receipt Generated!</p>
                                <p class="text-slate-500 text-xs mb-5">Transaction Code: <span id="mpesa-receipt-code" class="text-purple-600 font-bold uppercase tracking-wider"></span></p>
                                <button id="btn-export-download" class="w-full py-3.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20">
                                    Download Formatted PDF
                                </button>
                            </div>

                            <!-- Failed step -->
                            <div id="payment-step-failed" class="hidden text-center py-4">
                                <div class="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200">
                                    <svg class="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                </div>
                                <p class="text-slate-800 font-bold text-base mb-1">STK Session Failed</p>
                                <p id="payment-failed-msg" class="text-slate-500 text-xs mb-4"></p>
                                <div class="space-y-2">
                                    <button id="btn-mpesa-verify-failed" class="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-purple-500/20">
                                        Already Paid M-Pesa? Verify & Download
                                    </button>
                                    <button id="btn-mpesa-retry" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Retry STK Push</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SAVE & CONFIRM MODAL -->
                <div id="confirm-settings-modal" class="fixed inset-0 z-[60] hidden">
                    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" id="confirm-modal-backdrop"></div>
                    <div class="absolute inset-0 flex items-center justify-center p-4">
                        <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in text-slate-800">
                            <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-800" id="confirm-modal-close">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>

                            <div class="text-center mb-5">
                                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-700/10 flex items-center justify-center mx-auto mb-3">
                                    <svg class="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                </div>
                                <h3 class="text-slate-800 font-bold text-lg">Confirm Your Settings</h3>
                                <p class="text-slate-500 text-xs mt-1">Review your formatting settings before payment</p>
                            </div>

                            <!-- Settings Summary -->
                            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3 text-left">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">Page Numbering</span>
                                    <span id="confirm-pn-status" class="text-xs font-bold px-2 py-0.5 rounded-md"></span>
                                </div>
                                <div id="confirm-pn-details" class="text-xs text-slate-500 space-y-1 pl-2 border-l-2 border-slate-200"></div>

                                <div class="border-t border-slate-200 pt-3 flex items-center justify-between">
                                    <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">Tenth Lining</span>
                                    <span id="confirm-tl-status" class="text-xs font-bold px-2 py-0.5 rounded-md"></span>
                                </div>
                                <div id="confirm-tl-details" class="text-xs text-slate-500 space-y-1 pl-2 border-l-2 border-slate-200"></div>
                            </div>

                            <!-- Save status -->
                            <div id="confirm-save-status" class="text-center text-xs text-slate-500 mb-3 h-5"></div>

                            <!-- Warning if nothing enabled -->
                            <div id="confirm-warning" class="hidden bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
                                <p class="text-amber-700 text-xs font-bold">⚠️ No formatting is enabled. You will receive the original document without any changes.</p>
                            </div>

                            <div class="flex gap-3">
                                <button id="btn-confirm-back" class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Go Back & Edit</button>
                                <button id="btn-confirm-proceed" class="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-500/20">Confirm & Pay</button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        `;

        // ─── EDITOR LOCAL VARIABLES ───────────────────────────
        const tlEnabledInput = document.getElementById('tl-enabled');
        const tlFontSelect = document.getElementById('tl-font');
        const tlSizeInput = document.getElementById('tl-size');
        const tlMarginInput = document.getElementById('tl-margin');
        const tlLineLengthInput = document.getElementById('tl-line-length');
        const tlLineThicknessInput = document.getElementById('tl-line-thickness');
        const tlBoldBtn = document.getElementById('tl-bold');
        const tlColorInput = document.getElementById('tl-color');
        const tlLineColorInput = document.getElementById('tl-line-color');
        const tlBadgeInput = document.getElementById('tl-badge');

        const pnEnabledInput = document.getElementById('pn-enabled');
        const pnFontSelect = document.getElementById('pn-font');
        const pnStartInput = document.getElementById('pn-start');
        const pnSizeInput = document.getElementById('pn-size');
        const pnMarginTopInput = document.getElementById('pn-margin-top');
        const pnMarginRightInput = document.getElementById('pn-margin-right');
        const pnBoldBtn = document.getElementById('pn-bold');
        const pnItalicBtn = document.getElementById('pn-italic');
        const pnColorInput = document.getElementById('pn-color');

        const btnSaveSettings = document.getElementById('btn-save-settings');
        const btnPreviewAction = document.getElementById('btn-preview-action');
        const btnPayAction = document.getElementById('btn-pay-action');

        const paymentModal = document.getElementById('payment-modal-el');
        const mpesaPhoneInput = document.getElementById('mpesa-phone-input');
        const btnMpesaSubmit = document.getElementById('btn-mpesa-submit');
        const btnExportDownload = document.getElementById('btn-export-download');
        const btnMpesaRetry = document.getElementById('btn-mpesa-retry');

        const sizeManagerContainer = document.getElementById('size-manager-container');
        
        let paymentPollingInterval = null;

        // Cleanup interval on hash change
        this.currentCleanup = () => {
            if (paymentPollingInterval) {
                clearInterval(paymentPollingInterval);
            }
        };

        // ─── LOAD DATA AND INITIALIZE PREVIEW ───────────────────
        try {
            // Check IndexedDB first
            const cachedDoc = await localStore.getDocument(id);
            let offlineMode = false;

            if (cachedDoc && cachedDoc.pdfBlob) {
                docData = cachedDoc;
                // Try to fetch latest online metadata in background, but don't block
                fetch(`${config.baseUrl}/api/document/${id}`)
                    .then(resp => resp.json())
                    .then(fresh => {
                        localStore.saveDocument(fresh);
                    })
                    .catch(() => {});
            } else {
                try {
                    const docResp = await fetch(`${config.baseUrl}/api/document/${id}`);
                    if (!docResp.ok) throw new Error('Document details request failed.');
                    docData = await docResp.json();

                    // Fetch PDF file as blob to cache it
                    const pdfFileResp = await fetch(docData.preview_url);
                    if (pdfFileResp.ok) {
                        const pdfBlob = await pdfFileResp.blob();
                        await localStore.saveDocument(docData, pdfBlob);
                    } else {
                        await localStore.saveDocument(docData);
                    }
                } catch (err) {
                    if (cachedDoc) {
                        docData = cachedDoc;
                        offlineMode = true;
                    } else {
                        throw err;
                    }
                }
            }

            // Populate document sidebar metadata
            document.getElementById('doc-title').textContent = docData.original_name;
            const fileSizeMb = docData.file_size / (1024 * 1024);
            document.getElementById('doc-meta').textContent = `${fileSizeMb.toFixed(2)} MB · ${docData.page_count} Pages`;
            if (offlineMode || !navigator.onLine) {
                document.getElementById('doc-meta').innerHTML += ` <span class="badge badge-yellow" style="font-size: 8px; padding: 2px 4px;">Offline</span>`;
            }

            // Document Size Manager Rendering
            this.renderSizeManager(fileSizeMb);

            // Populate invoice footer
            document.getElementById('invoice-details').textContent = `${docData.page_count} Pages × KES 3.00`;
            document.getElementById('invoice-total').textContent = `KES ${docData.page_count * 3}`;
            document.getElementById('mpesa-modal-title').textContent = `Pay KES ${docData.page_count * 3} via M-Pesa`;

            // Apply existing settings values from database if present
            const pnSet = docData.page_number_settings || {};
            const tlSet = docData.tenth_line_settings || {};

            if (pnSet.enabled !== undefined) pnEnabledInput.checked = !!pnSet.enabled;
            if (pnSet.font) pnFontSelect.value = pnSet.font;
            if (pnSet.starting_number) pnStartInput.value = pnSet.starting_number;
            if (pnSet.font_size) pnSizeInput.value = pnSet.font_size;
            if (pnSet.margin_top) pnMarginTopInput.value = pnSet.margin_top;
            if (pnSet.margin_right) pnMarginRightInput.value = pnSet.margin_right;
            if (pnSet.colour) pnColorInput.value = pnSet.colour;
            if (pnSet.bold) {
                pnBoldBtn.classList.add('bg-purple-600', 'text-white');
                pnBoldBtn.classList.remove('bg-slate-100', 'text-slate-700');
            }
            if (pnSet.italic) {
                pnItalicBtn.classList.add('bg-purple-600', 'text-white');
                pnItalicBtn.classList.remove('bg-slate-100', 'text-slate-700');
            }

            if (tlSet.enabled !== undefined) tlEnabledInput.checked = !!tlSet.enabled;
            if (tlSet.font) tlFontSelect.value = tlSet.font;
            if (tlSet.font_size) tlSizeInput.value = tlSet.font_size;
            if (tlSet.right_margin) tlMarginInput.value = tlSet.right_margin;
            if (tlSet.line_length) tlLineLengthInput.value = tlSet.line_length;
            if (tlSet.line_thickness) tlLineThicknessInput.value = tlSet.line_thickness;
            if (tlSet.colour) tlColorInput.value = tlSet.colour;
            if (tlSet.line_colour) tlLineColorInput.value = tlSet.line_colour;
            if (tlSet.show_badge !== undefined) tlBadgeInput.checked = tlSet.show_badge !== false;
            if (tlSet.bold) {
                tlBoldBtn.classList.add('bg-purple-600', 'text-white');
                tlBoldBtn.classList.remove('bg-slate-100', 'text-slate-700');
            }

            // Render PDF inside viewport
            let pdfUrl = docData.preview_url;
            if (docData.pdfBlob) {
                pdfUrl = URL.createObjectURL(docData.pdfBlob);
            }
            pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
            document.getElementById('pdf-loading-el').remove();
            await renderAllPages();

        } catch (e) {
            console.error('Editor loading failed:', e);
            document.getElementById('pdf-pages-container-el').innerHTML = `
                <div class="error-box">Failed to load document: ${e.message}</div>
            `;
            return;
        }

        // ─── RENDER ALL PDF PAGES ─────────────────────────────
        async function renderAllPages() {
            const container = document.getElementById('pdf-pages-container-el');
            const thumbContainer = document.getElementById('thumbnail-list-el');

            container.innerHTML = '';
            thumbContainer.innerHTML = '';
            allLineCoordinates = [];

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: currentZoom * 1.5 });

                // Page wrapper
                const wrapper = document.createElement('div');
                wrapper.className = 'pdf-page-container';
                wrapper.id = 'page-' + i;
                wrapper.dataset.pageNum = i;

                // Canvas
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                wrapper.appendChild(canvas);

                // Overlay
                const overlay = document.createElement('div');
                overlay.className = 'pdf-overlay';
                overlay.id = 'overlay-' + i;
                wrapper.appendChild(overlay);

                container.appendChild(wrapper);

                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                // Extract text for line detection
                const textContent = await page.getTextContent();
                const lines = detectLines(textContent, viewport);
                allLineCoordinates[i - 1] = lines;

                // Thumbnail Canvas
                const thumbItem = document.createElement('div');
                thumbItem.className = 'thumbnail-item';
                thumbItem.dataset.page = i;
                
                const thumbCanvas = document.createElement('canvas');
                const thumbViewport = page.getViewport({ scale: 0.18 });
                thumbCanvas.width = thumbViewport.width;
                thumbCanvas.height = thumbViewport.height;
                thumbItem.appendChild(thumbCanvas);

                const thumbLabel = document.createElement('div');
                thumbLabel.className = 'thumbnail-label';
                thumbLabel.textContent = i;
                thumbItem.appendChild(thumbLabel);

                thumbContainer.appendChild(thumbItem);

                const thumbCtx = thumbCanvas.getContext('2d');
                await page.render({ canvasContext: thumbCtx, viewport: thumbViewport }).promise;

                thumbItem.addEventListener('click', () => {
                    document.querySelectorAll('.thumbnail-item').forEach(item => item.classList.remove('active'));
                    thumbItem.classList.add('active');
                    wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
            }

            // Sync active page in left thumbnail when scrolling
            setupIntersectionObserver();

            // Render overlays initially
            updateOverlays();
        }

        function setupIntersectionObserver() {
            const options = {
                root: document.getElementById('viewport-el'),
                threshold: 0.4
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const pageNum = entry.target.dataset.pageNum;
                        document.querySelectorAll('.thumbnail-item').forEach(item => {
                            if (item.dataset.page === pageNum) {
                                item.classList.add('active');
                                // Scroll thumbnail item slightly into view if needed
                                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            } else {
                                item.classList.remove('active');
                            }
                        });
                    }
                });
            }, options);

            document.querySelectorAll('.pdf-page-container').forEach(p => observer.observe(p));
        }

        // ─── LINE DETECTION METHOD ─────────────────────────────
        function detectLines(textContent, viewport) {
            const items = textContent.items.filter(item => item.str.trim().length > 0);
            if (items.length === 0) return [];

            const yMap = new Map();
            const tolerance = 4; // pixels

            items.forEach(item => {
                const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                const y = Math.round(tx[5]);

                let matched = false;
                for (const [key] of yMap) {
                    if (Math.abs(key - y) <= tolerance) {
                        yMap.get(key).push(y);
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    yMap.set(y, [y]);
                }
            });

            // Y is pixel coordinate from the top of the canvas viewport
            const lineYs = Array.from(yMap.keys()).sort((a, b) => a - b);
            return lineYs.map(y => (y / viewport.height) * 100);
        }

        function getFontFamily(font) {
            switch (font) {
                case 'Times': return "'Times New Roman', Times, serif";
                case 'Courier': return "'Courier New', Courier, monospace";
                case 'Georgia': return "Georgia, serif";
                case 'Verdana': return "Verdana, sans-serif";
                case 'Trebuchet': return "'Trebuchet MS', sans-serif";
                case 'Inter': return "'Inter', sans-serif";
                case 'Roboto': return "'Roboto', sans-serif";
                case 'OpenSans': return "'Open Sans', sans-serif";
                case 'Lato': return "'Lato', sans-serif";
                case 'Montserrat': return "'Montserrat', sans-serif";
                case 'Merriweather': return "'Merriweather', serif";
                case 'Playfair': return "'Playfair Display', serif";
                case 'FiraCode': return "'Fira Code', monospace";
                default: return "Helvetica, Arial, sans-serif";
            }
        }

        // ─── REDRAW PREVIEW OVERLAYS ───────────────────────────
        function updateOverlays() {
            const pnEnabled = pnEnabledInput.checked;
            const tlEnabled = tlEnabledInput.checked;

            const pnSettings = {
                enabled: pnEnabled,
                fontSize: parseInt(pnSizeInput.value) || 12,
                color: pnColorInput.value,
                bold: pnBoldBtn.classList.contains('bg-purple-600'),
                italic: pnItalicBtn.classList.contains('bg-purple-600'),
                startingNumber: parseInt(pnStartInput.value) || 1,
                font: pnFontSelect.value,
                marginTop: parseInt(pnMarginTopInput.value) || 15,
                marginRight: parseInt(pnMarginRightInput.value) || 15,
            };

            const tlSettings = {
                enabled: tlEnabled,
                fontSize: parseInt(tlSizeInput.value) || 12,
                color: tlColorInput.value,
                bold: tlBoldBtn.classList.contains('bg-purple-600'),
                showBadge: tlBadgeInput.checked,
                rightMargin: parseInt(tlMarginInput.value) || 30,
                font: tlFontSelect.value,
                lineLength: parseInt(tlLineLengthInput.value) || 50,
                lineThickness: parseFloat(tlLineThicknessInput.value) || 1,
                lineColor: tlLineColorInput.value || tlColorInput.value,
            };

            for (let i = 0; i < docData.page_count; i++) {
                const overlay = document.getElementById('overlay-' + (i + 1));
                if (!overlay) continue;
                overlay.innerHTML = '';

                // Render page numbers
                if (pnSettings.enabled) {
                    const numEl = document.createElement('div');
                    numEl.className = 'overlay-page-number';
                    numEl.textContent = pnSettings.startingNumber + i;
                    numEl.style.fontSize = pnSettings.fontSize + 'px';
                    numEl.style.color = pnSettings.color;
                    numEl.style.fontWeight = pnSettings.bold ? 'bold' : 'normal';
                    numEl.style.fontStyle = pnSettings.italic ? 'italic' : 'normal';
                    numEl.style.fontFamily = getFontFamily(pnSettings.font);

                    // Position (A4 aspect ratio approximately 210mm x 297mm)
                    const topPercent = (pnSettings.marginTop / 297) * 100;
                    const rightPercent = (pnSettings.marginRight / 210) * 100;
                    numEl.style.top = topPercent + '%';
                    numEl.style.right = rightPercent + '%';

                    makeDraggable2D(numEl, overlay);
                    overlay.appendChild(numEl);
                }

                // Render tenth lining
                if (allLineCoordinates[i]) {
                    const lines = allLineCoordinates[i];
                    let lineNumber = 0;

                    lines.forEach(yPercent => {
                        lineNumber++;
                        const isTenth = lineNumber % 10 === 0;

                        if (isTenth && tlSettings.enabled) {
                            const container = document.createElement('div');
                            container.className = 'overlay-tenth-line-container';
                            container.style.top = yPercent + '%';
                            
                            const lineLenPercent = (tlSettings.lineLength / 210) * 100;
                            container.style.width = lineLenPercent + '%';
                            container.style.left = `calc(100% - ${tlSettings.rightMargin}px - ${lineLenPercent}%)`;
                            container.style.right = 'auto';

                            // The line rule
                            const rule = document.createElement('div');
                            rule.className = 'overlay-tenth-line-rule';
                            rule.style.borderBottomColor = tlSettings.lineColor;
                            rule.style.borderBottomWidth = tlSettings.lineThickness + 'px';
                            container.appendChild(rule);

                            // The line number badge
                            const badge = document.createElement('div');
                            badge.className = 'overlay-tenth-line-badge';
                            badge.textContent = lineNumber;
                            badge.style.fontSize = tlSettings.fontSize + 'px';
                            badge.style.fontWeight = tlSettings.bold ? 'bold' : 'normal';

                            if (tlSettings.showBadge) {
                                badge.style.backgroundColor = tlSettings.color;
                                badge.style.color = '#ffffff';
                            } else {
                                badge.style.backgroundColor = 'transparent';
                                badge.style.color = tlSettings.color;
                                badge.style.padding = '0';
                            }
                            badge.style.fontFamily = getFontFamily(tlSettings.font);

                            makeDraggableHorizontal(badge, overlay);

                            container.appendChild(badge);
                            overlay.appendChild(container);
                        } else if (currentViewMode === 'editor') {
                            // Show small helper badge in editor mode for all lines
                            const helper = document.createElement('div');
                            helper.className = 'overlay-helper-badge';
                            helper.textContent = lineNumber;
                            helper.style.top = yPercent + '%';
                            helper.style.right = tlSettings.rightMargin + 'px';
                            overlay.appendChild(helper);
                        }
                    });
                }
            }
        }

        // ─── DRAGGABLE MARGIN CALCULATORS ─────────────────────
        function makeDraggable2D(element, overlay) {
            let startX, startY, startLeft, startTop;

            element.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const rect = overlay.getBoundingClientRect();
                startX = e.clientX;
                startY = e.clientY;

                const elRect = element.getBoundingClientRect();
                startLeft = elRect.left - rect.left;
                startTop = elRect.top - rect.top;

                function onMouseMove(e) {
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;

                    const newTop = startTop + dy;
                    const newRight = rect.width - (startLeft + dx + elRect.width);

                    // Map px back to mm margins (A4 approx. 210mm x 297mm)
                    const topMm = Math.max(5, Math.min(100, Math.round((newTop / rect.height) * 297)));
                    const rightMm = Math.max(5, Math.min(100, Math.round((newRight / rect.width) * 210)));

                    pnMarginTopInput.value = topMm;
                    pnMarginRightInput.value = rightMm;

                    element.style.top = ((topMm / 297) * 100) + '%';
                    element.style.right = ((rightMm / 210) * 100) + '%';
                }

                function onMouseUp() {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    updateOverlays();
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        function makeDraggableHorizontal(element, overlay) {
            let startX, startLeft;

            element.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const rect = overlay.getBoundingClientRect();
                startX = e.clientX;

                const elRect = element.getBoundingClientRect();
                startLeft = elRect.left - rect.left;

                function onMouseMove(e) {
                    const dx = e.clientX - startX;
                    const newRight = rect.width - (startLeft + dx + elRect.width);
                    const rightPx = Math.max(5, Math.min(250, Math.round(newRight)));

                    tlMarginInput.value = rightPx;

                    // Immediately reposition all containers on page for performance
                    const lineLen = parseInt(tlLineLengthInput.value) || 50;
                    const lineLenPercent = (lineLen / 210) * 100;
                    document.querySelectorAll('.overlay-tenth-line-container').forEach(c => {
                        c.style.left = `calc(100% - ${rightPx}px - ${lineLenPercent}%)`;
                    });
                    document.querySelectorAll('.overlay-helper-badge').forEach(h => {
                        h.style.right = rightPx + 'px';
                    });
                }

                function onMouseUp() {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    updateOverlays();
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }

        // ─── CONTROL CONTROLLER LISTENERS ───────────────────────
        const inputsToListen = [
            tlEnabledInput, tlFontSelect, tlSizeInput, tlMarginInput, tlLineLengthInput, tlLineThicknessInput, tlColorInput, tlLineColorInput, tlBadgeInput,
            pnEnabledInput, pnFontSelect, pnStartInput, pnSizeInput, pnMarginTopInput, pnMarginRightInput, pnColorInput
        ];

        inputsToListen.forEach(input => {
            input.addEventListener('change', () => updateOverlays());
        });

        // Bold and Italic togglers
        const toggleStyleBtn = (btn) => {
            btn.classList.toggle('btn-primary-active');
            btn.classList.toggle('bg-purple-600');
            btn.classList.toggle('text-white');
            btn.classList.toggle('bg-slate-100');
            btn.classList.toggle('text-slate-700');
            updateOverlays();
        };

        tlBoldBtn.addEventListener('click', () => toggleStyleBtn(tlBoldBtn));
        pnBoldBtn.addEventListener('click', () => toggleStyleBtn(pnBoldBtn));
        pnItalicBtn.addEventListener('click', () => toggleStyleBtn(pnItalicBtn));

        // Stepper up/down logic
        const setupStepper = (idDown, idUp, idInput, minVal, maxVal) => {
            const down = document.getElementById(idDown);
            const up = document.getElementById(idUp);
            const input = document.getElementById(idInput);

            down.addEventListener('click', () => {
                const current = parseInt(input.value) || 0;
                if (current > minVal) {
                    input.value = current - 1;
                    updateOverlays();
                }
            });

            up.addEventListener('click', () => {
                const current = parseInt(input.value) || 0;
                if (current < maxVal) {
                    input.value = current + 1;
                    updateOverlays();
                }
            });
        };

        setupStepper('tl-size-down', 'tl-size-up', 'tl-size', 6, 18);
        setupStepper('tl-margin-down', 'tl-margin-up', 'tl-margin', 5, 100);
        setupStepper('tl-line-len-down', 'tl-line-len-up', 'tl-line-length', 5, 150);
        setupStepper('tl-line-thk-down', 'tl-line-thk-up', 'tl-line-thickness', 1, 10);
        setupStepper('pn-start-down', 'pn-start-up', 'pn-start', 1, 1000);
        setupStepper('pn-size-down', 'pn-size-up', 'pn-size', 6, 36);
        setupStepper('pn-margin-top-down', 'pn-margin-top-up', 'pn-margin-top', 5, 100);
        setupStepper('pn-margin-right-down', 'pn-margin-right-up', 'pn-margin-right', 5, 100);

        // Zoom controls
        const zoomLevelEl = document.getElementById('zoom-level-el');
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            if (currentZoom < 2.5) {
                currentZoom = Math.round((currentZoom + 0.25) * 100) / 100;
                zoomLevelEl.textContent = Math.round(currentZoom * 100) + '%';
                renderAllPages();
            }
        });

        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            if (currentZoom > 0.5) {
                currentZoom = Math.round((currentZoom - 0.25) * 100) / 100;
                zoomLevelEl.textContent = Math.round(currentZoom * 100) + '%';
                renderAllPages();
            }
        });

        // View Mode toggling
        const modeEditorBtn = document.getElementById('btn-mode-editor');
        const modePreviewBtn = document.getElementById('btn-mode-preview');

        const switchViewMode = (mode) => {
            currentViewMode = mode;
            if (mode === 'editor') {
                modeEditorBtn.className = 'flex-1 py-2 flex items-center justify-center gap-2 transition-all bg-amber-500 text-slate-900 font-bold text-xs leading-tight';
                modePreviewBtn.className = 'flex-1 py-2 flex items-center justify-center gap-2 transition-all bg-white text-slate-500 hover:text-slate-800 font-bold text-xs border-l border-slate-150 leading-tight';
            } else {
                modePreviewBtn.className = 'flex-1 py-2 flex items-center justify-center gap-2 transition-all bg-purple-600 text-white font-bold text-xs border-l border-slate-150 leading-tight';
                modeEditorBtn.className = 'flex-1 py-2 flex items-center justify-center gap-2 transition-all bg-white text-slate-500 hover:text-slate-800 font-bold text-xs leading-tight';
            }
            updateOverlays();
        };

        modeEditorBtn.addEventListener('click', () => switchViewMode('editor'));
        modePreviewBtn.addEventListener('click', () => switchViewMode('preview'));
        btnPreviewAction.addEventListener('click', () => switchViewMode('preview'));

        // ─── SAVE SETTINGS CONTROLLER ──────────────────────────
        const saveSettingsHandler = async () => {
            btnSaveSettings.textContent = 'Saving...';
            btnSaveSettings.disabled = true;

            const payload = {
                page_number_settings: {
                    enabled: pnEnabledInput.checked,
                    font: pnFontSelect.value,
                    font_size: parseInt(pnSizeInput.value),
                    colour: pnColorInput.value,
                    bold: pnBoldBtn.classList.contains('bg-purple-600'),
                    italic: pnItalicBtn.classList.contains('bg-purple-600'),
                    starting_number: parseInt(pnStartInput.value) || 1,
                    margin_top: parseInt(pnMarginTopInput.value) || 15,
                    margin_right: parseInt(pnMarginRightInput.value) || 15,
                },
                tenth_line_settings: {
                    enabled: tlEnabledInput.checked,
                    font: tlFontSelect.value,
                    font_size: parseInt(tlSizeInput.value),
                    colour: tlColorInput.value,
                    bold: tlBoldBtn.classList.contains('bg-purple-600'),
                    show_badge: tlBadgeInput.checked,
                    right_margin: parseInt(tlMarginInput.value) || 30,
                    line_length: parseInt(tlLineLengthInput.value) || 50,
                    line_thickness: parseFloat(tlLineThicknessInput.value) || 1,
                    line_colour: tlLineColorInput.value,
                }
            };

            try {
                const resp = await fetch(`${config.baseUrl}/document/${id}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: JSON.stringify(payload)
                });
                const result = await resp.json();
                if (result.success) {
                    btnSaveSettings.textContent = '✓ Saved';
                } else {
                    btnSaveSettings.textContent = 'Error';
                }
            } catch (e) {
                btnSaveSettings.textContent = 'Error';
            }

            setTimeout(() => {
                btnSaveSettings.textContent = 'Save Settings';
                btnSaveSettings.disabled = false;
            }, 2000);
        };

        btnSaveSettings.addEventListener('click', saveSettingsHandler);

        // ─── CONFIRM SETTINGS BEFORE PAYMENT ────────────────────
        const confirmModal = document.getElementById('confirm-settings-modal');
        const confirmPnStatus = document.getElementById('confirm-pn-status');
        const confirmPnDetails = document.getElementById('confirm-pn-details');
        const confirmTlStatus = document.getElementById('confirm-tl-status');
        const confirmTlDetails = document.getElementById('confirm-tl-details');
        const confirmSaveStatus = document.getElementById('confirm-save-status');
        const confirmWarning = document.getElementById('confirm-warning');
        const btnConfirmBack = document.getElementById('btn-confirm-back');
        const btnConfirmProceed = document.getElementById('btn-confirm-proceed');

        function populateConfirmModal() {
            const pnEnabled = pnEnabledInput.checked;
            const tlEnabled = tlEnabledInput.checked;

            // Page Numbering summary
            if (pnEnabled) {
                confirmPnStatus.textContent = 'Enabled';
                confirmPnStatus.className = 'text-xs font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200';
                confirmPnDetails.innerHTML = `
                    <p>Font: <strong>${pnFontSelect.value}</strong> · Size: <strong>${pnSizeInput.value}pt</strong></p>
                    <p>Starting number: <strong>${pnStartInput.value || 1}</strong> · Color: <span style="color:${pnColorInput.value};font-weight:bold;">■</span> ${pnColorInput.value}</p>
                    <p>Position: Top <strong>${pnMarginTopInput.value || 15}mm</strong>, Right <strong>${pnMarginRightInput.value || 15}mm</strong></p>
                `;
            } else {
                confirmPnStatus.textContent = 'Disabled';
                confirmPnStatus.className = 'text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200';
                confirmPnDetails.innerHTML = '<p class="text-slate-400 italic">No page numbers will be added</p>';
            }

            // Tenth Lining summary
            if (tlEnabled) {
                confirmTlStatus.textContent = 'Enabled';
                confirmTlStatus.className = 'text-xs font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200';
                confirmTlDetails.innerHTML = `
                    <p>Font: <strong>${tlFontSelect.value}</strong> · Size: <strong>${tlSizeInput.value}pt</strong> · Badge: <strong>${tlBadgeInput.checked ? 'On' : 'Off'}</strong></p>
                    <p>Color: <span style="color:${tlColorInput.value};font-weight:bold;">■</span> ${tlColorInput.value} · Line color: <span style="color:${tlLineColorInput.value};font-weight:bold;">■</span> ${tlLineColorInput.value}</p>
                    <p>Line length: <strong>${tlLineLengthInput.value || 50}mm</strong> · Thickness: <strong>${tlLineThicknessInput.value || 1}pt</strong></p>
                `;
            } else {
                confirmTlStatus.textContent = 'Disabled';
                confirmTlStatus.className = 'text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200';
                confirmTlDetails.innerHTML = '<p class="text-slate-400 italic">No tenth lining will be added</p>';
            }

            // Warning if nothing is enabled
            if (!pnEnabled && !tlEnabled) {
                confirmWarning.classList.remove('hidden');
            } else {
                confirmWarning.classList.add('hidden');
            }

            confirmSaveStatus.textContent = '';
        }

        async function autoSaveSettings() {
            confirmSaveStatus.textContent = '💾 Saving settings...';
            confirmSaveStatus.className = 'text-center text-xs text-slate-500 mb-3 h-5';

            const payload = {
                page_number_settings: {
                    enabled: pnEnabledInput.checked,
                    font: pnFontSelect.value,
                    font_size: parseInt(pnSizeInput.value),
                    colour: pnColorInput.value,
                    bold: pnBoldBtn.classList.contains('bg-purple-600'),
                    italic: pnItalicBtn.classList.contains('bg-purple-600'),
                    starting_number: parseInt(pnStartInput.value) || 1,
                    margin_top: parseInt(pnMarginTopInput.value) || 15,
                    margin_right: parseInt(pnMarginRightInput.value) || 15,
                },
                tenth_line_settings: {
                    enabled: tlEnabledInput.checked,
                    font: tlFontSelect.value,
                    font_size: parseInt(tlSizeInput.value),
                    colour: tlColorInput.value,
                    bold: tlBoldBtn.classList.contains('bg-purple-600'),
                    show_badge: tlBadgeInput.checked,
                    right_margin: parseInt(tlMarginInput.value) || 30,
                    line_length: parseInt(tlLineLengthInput.value) || 50,
                    line_thickness: parseFloat(tlLineThicknessInput.value) || 1,
                    line_colour: tlLineColorInput.value,
                }
            };

            try {
                const resp = await fetch(`${config.baseUrl}/document/${id}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: JSON.stringify(payload)
                });
                const result = await resp.json();
                if (result.success) {
                    confirmSaveStatus.textContent = '✓ Settings saved successfully';
                    confirmSaveStatus.className = 'text-center text-xs text-green-600 font-bold mb-3 h-5';
                    return true;
                } else {
                    confirmSaveStatus.textContent = '✗ Failed to save settings';
                    confirmSaveStatus.className = 'text-center text-xs text-red-600 font-bold mb-3 h-5';
                    return false;
                }
            } catch (e) {
                confirmSaveStatus.textContent = '✗ Network error saving settings';
                confirmSaveStatus.className = 'text-center text-xs text-red-600 font-bold mb-3 h-5';
                return false;
            }
        }

        // ─── PAYMENT FLOW CONTROLLER ────────────────────────────
        btnPayAction.addEventListener('click', async () => {
            // Show confirm modal with settings summary
            populateConfirmModal();
            confirmModal.classList.remove('hidden');

            // Auto-save settings in the background
            await autoSaveSettings();
        });

        btnConfirmBack.addEventListener('click', () => {
            confirmModal.classList.add('hidden');
        });

        document.getElementById('confirm-modal-backdrop').addEventListener('click', () => {
            confirmModal.classList.add('hidden');
        });

        document.getElementById('confirm-modal-close').addEventListener('click', () => {
            confirmModal.classList.add('hidden');
        });

        btnConfirmProceed.addEventListener('click', () => {
            confirmModal.classList.add('hidden');
            // Open payment modal
            document.getElementById('payment-step-phone').classList.remove('hidden');
            document.getElementById('payment-step-waiting').classList.add('hidden');
            document.getElementById('payment-step-success').classList.add('hidden');
            document.getElementById('payment-step-failed').classList.add('hidden');
            paymentModal.classList.remove('hidden');
        });

        document.getElementById('modal-close-el').addEventListener('click', () => {
            paymentModal.classList.add('hidden');
            if (paymentPollingInterval) {
                clearInterval(paymentPollingInterval);
            }
        });

        document.getElementById('modal-backdrop-el').addEventListener('click', () => {
            paymentModal.classList.add('hidden');
            if (paymentPollingInterval) {
                clearInterval(paymentPollingInterval);
            }
        });

        // Initiate payment
        btnMpesaSubmit.addEventListener('click', async () => {
            const phone = mpesaPhoneInput.value.trim();
            if (!phone || phone.length < 10) {
                alert('Please enter a valid M-Pesa phone number (e.g. 0712345678 or 254712345678).');
                return;
            }

            document.getElementById('payment-step-phone').classList.add('hidden');
            document.getElementById('payment-step-waiting').classList.remove('hidden');

            try {
                const resp = await fetch(`${config.baseUrl}/payment/initiate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: JSON.stringify({ document_id: id, phone: phone }),
                });
                const result = await resp.json();

                if (result.success && result.checkout_request_id) {
                    activeCheckoutRequestId = result.checkout_request_id;
                    startPaymentPolling(result.checkout_request_id);
                } else {
                    showPaymentFailed(result.message || 'Failed to initiate STK push.');
                }
            } catch (e) {
                showPaymentFailed('Network error occurred. Please try again.');
            }
        });

        let activeCheckoutRequestId = null;

        const verifyCurrentPayment = async () => {
            if (!activeCheckoutRequestId) return;
            try {
                const resp = await fetch(`${config.baseUrl}/payment/verify/${activeCheckoutRequestId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken }
                });
                const result = await resp.json();
                if (result.status === 'completed' || result.success) {
                    if (paymentPollingInterval) clearInterval(paymentPollingInterval);
                    document.getElementById('mpesa-receipt-code').textContent = result.mpesa_receipt || 'N/A';
                    document.getElementById('payment-step-waiting').classList.add('hidden');
                    document.getElementById('payment-step-failed').classList.add('hidden');
                    document.getElementById('payment-step-success').classList.remove('hidden');
                } else {
                    alert(result.message || 'Verification failed. Please try again.');
                }
            } catch (e) {
                alert('Verification error. Please try again.');
            }
        };

        document.getElementById('btn-mpesa-verify-waiting')?.addEventListener('click', verifyCurrentPayment);
        document.getElementById('btn-mpesa-verify-failed')?.addEventListener('click', verifyCurrentPayment);

        const startPaymentPolling = (checkoutRequestId) => {
            activeCheckoutRequestId = checkoutRequestId;
            let pollAttempts = 0;
            const maxPollAttempts = 75; // 150 seconds total at 2s interval

            if (paymentPollingInterval) clearInterval(paymentPollingInterval);

            paymentPollingInterval = setInterval(async () => {
                pollAttempts++;
                try {
                    const resp = await fetch(`${config.baseUrl}/payment/status/${checkoutRequestId}`);
                    const result = await resp.json();

                    if (result.status === 'completed') {
                        clearInterval(paymentPollingInterval);
                        document.getElementById('mpesa-receipt-code').textContent = result.mpesa_receipt || 'N/A';
                        document.getElementById('payment-step-waiting').classList.add('hidden');
                        document.getElementById('payment-step-success').classList.remove('hidden');
                    } else if (result.status === 'failed') {
                        clearInterval(paymentPollingInterval);
                        showPaymentFailed(result.error || 'Payment transaction failed or was cancelled by user.');
                    }
                } catch (e) {
                    // Fail silently and retry polling
                }

                if (pollAttempts >= maxPollAttempts) {
                    clearInterval(paymentPollingInterval);
                    showPaymentFailed('STK push timed out. Please retry if you didn\'t receive the prompt.');
                }
            }, 2000);
        };

        const showPaymentFailed = (msg) => {
            document.getElementById('payment-step-waiting').classList.add('hidden');
            document.getElementById('payment-step-failed').classList.remove('hidden');
            document.getElementById('payment-failed-msg').textContent = msg;
        };

        btnMpesaRetry.addEventListener('click', () => {
            document.getElementById('payment-step-failed').classList.add('hidden');
            document.getElementById('payment-step-phone').classList.remove('hidden');
        });

        // Export and download
        btnExportDownload.addEventListener('click', async () => {
            btnExportDownload.textContent = 'Formatting PDF...';
            btnExportDownload.disabled = true;

            try {
                const resp = await fetch(`${config.baseUrl}/document/${id}/export`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: JSON.stringify({
                        line_coordinates: allLineCoordinates,
                        page_number_settings: {
                            enabled: pnEnabledInput.checked,
                            font: pnFontSelect.value,
                            font_size: parseInt(pnSizeInput.value),
                            colour: pnColorInput.value,
                            bold: pnBoldBtn.classList.contains('bg-purple-600'),
                            italic: pnItalicBtn.classList.contains('bg-purple-600'),
                            starting_number: parseInt(pnStartInput.value) || 1,
                            margin_top: parseInt(pnMarginTopInput.value) || 15,
                            margin_right: parseInt(pnMarginRightInput.value) || 15,
                        },
                        tenth_line_settings: {
                            enabled: tlEnabledInput.checked,
                            font: tlFontSelect.value,
                            font_size: parseInt(tlSizeInput.value),
                            colour: tlColorInput.value,
                            bold: tlBoldBtn.classList.contains('bg-purple-600'),
                            show_badge: tlBadgeInput.checked,
                            right_margin: parseInt(tlMarginInput.value) || 30,
                            line_length: parseInt(tlLineLengthInput.value) || 50,
                            line_thickness: parseFloat(tlLineThicknessInput.value) || 1,
                            line_colour: tlLineColorInput.value,
                        },
                    }),
                });
                const result = await resp.json();

                if (result.success && result.download_url) {
                    window.location.href = result.download_url;
                    paymentModal.classList.add('hidden');
                } else {
                    alert(result.error || 'Failed to process document overlay.');
                }
            } catch (e) {
                alert('Export network connection error. Please try again.');
            }

            btnExportDownload.textContent = 'Download Formatted PDF';
            btnExportDownload.disabled = false;
        });
    }

    // Size Manager Logic
    renderSizeManager(fileSizeMb) {
        const percent = Math.min(100, (fileSizeMb / 25) * 100);
        let barClass = 'size-bar-green';
        let warningHtml = '';

        if (fileSizeMb > 25) {
            barClass = 'size-bar-red';
            warningHtml = `
                <div class="size-warning size-warning-red">
                    ⚠️ Document exceeds 25MB limit. Please compress it before filing.
                </div>
            `;
        } else if (fileSizeMb >= 15) {
            barClass = 'size-bar-amber';
            warningHtml = `
                <div class="size-warning size-warning-amber">
                    ⚠️ Document is approaching 25MB court limit.
                </div>
            `;
        }

        const sizeManagerContainer = document.getElementById('size-manager-container');
        sizeManagerContainer.innerHTML = `
            <div class="size-manager">
                <div class="flex items-center justify-between" style="margin-bottom: 4px;">
                    <span class="size-label">Document Size</span>
                    <span class="size-value">${fileSizeMb.toFixed(2)} MB</span>
                </div>
                <div class="size-bar-track">
                    <div class="size-bar-fill ${barClass}" style="width: ${percent}%;"></div>
                </div>
                ${warningHtml}
            </div>
        `;
    }

    getNavbarHtml(activeRoute = '') {
        return `
            <nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80">
                <div class="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
                    <a href="#/" class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center font-black text-white text-lg shadow-md shadow-purple-500/20">T</div>
                        <div>
                            <span class="font-bold text-lg text-slate-900 tracking-tight block leading-tight">Tenth Lining</span>
                            <span class="text-[9px] block text-purple-600 tracking-widest uppercase font-bold">by Bizlyn Systems</span>
                        </div>
                    </a>

                    <div class="hidden lg:flex items-center gap-5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <a href="#/tool/merge-pdf" class="${activeRoute === 'merge-pdf' ? 'text-purple-600 font-black' : 'hover:text-purple-600'} transition-colors py-2">MERGE PDF</a>
                        <a href="#/tool/split-pdf" class="${activeRoute === 'split-pdf' ? 'text-purple-600 font-black' : 'hover:text-purple-600'} transition-colors py-2">SPLIT PDF</a>
                        <a href="#/tool/compress-pdf" class="${activeRoute === 'compress-pdf' ? 'text-purple-600 font-black' : 'hover:text-purple-600'} transition-colors py-2">COMPRESS PDF</a>

                        <!-- CONVERT PDF Dropdown -->
                        <div class="relative group py-2">
                            <a href="#/tool/convert-pdf" class="flex items-center gap-1 ${activeRoute.includes('convert') ? 'text-purple-600 font-black' : 'hover:text-purple-600'} transition-colors uppercase font-bold focus:outline-none">
                                CONVERT PDF
                                <svg class="w-3.5 h-3.5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                            </a>
                            <div class="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-[480px] hidden group-hover:block hover:block animate-fade-in z-50">
                                <div class="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 grid grid-cols-2 gap-6 text-left normal-case">
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">CONVERT TO PDF</h4>
                                        <div class="space-y-2">
                                            <a href="#/tool/jpg-to-pdf" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[10px]">JPG</span> JPG to PDF
                                            </a>
                                            <a href="#/tool/word-to-pdf" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">DOC</span> WORD to PDF
                                            </a>
                                            <a href="#/tool/ppt-to-pdf" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-[10px]">PPT</span> POWERPOINT to PDF
                                            </a>
                                            <a href="#/tool/excel-to-pdf" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px]">XLS</span> EXCEL to PDF
                                            </a>
                                            <a href="#/tool/html-to-pdf" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-[10px]">HTML</span> HTML to PDF
                                            </a>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">CONVERT FROM PDF</h4>
                                        <div class="space-y-2">
                                            <a href="#/tool/pdf-to-jpg" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[10px]">JPG</span> PDF to JPG
                                            </a>
                                            <a href="#/tool/pdf-to-word" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">DOC</span> PDF to WORD
                                            </a>
                                            <a href="#/tool/pdf-to-ppt" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-[10px]">PPT</span> PDF to POWERPOINT
                                            </a>
                                            <a href="#/tool/pdf-to-excel" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[10px]">XLS</span> PDF to EXCEL
                                            </a>
                                            <a href="#/tool/pdf-to-pdfa" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px]">PDFA</span> PDF to PDF/A
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ALL PDF TOOLS Dropdown -->
                        <div class="relative group py-2">
                            <a href="#/tool/convert-pdf" class="flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors uppercase font-extrabold focus:outline-none">
                                ALL PDF TOOLS
                                <svg class="w-3.5 h-3.5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                            </a>
                            <div class="absolute right-0 lg:left-1/2 lg:-translate-x-1/2 top-full pt-2 w-[1240px] max-w-[96vw] hidden group-hover:block hover:block animate-fade-in z-50 before:absolute before:-top-4 before:left-0 before:right-0 before:h-4">
                                <div class="bg-white border border-slate-200 rounded-3xl shadow-2xl p-7 max-h-[88vh] overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 text-left normal-case">
                                    <!-- ORGANIZE PDF -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">ORGANIZE PDF</h4>
                                        <div class="space-y-1">
                                            <a href="#/tool/merge-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-red-50 text-red-500 flex items-center justify-center font-bold text-[9px]">🧩</span> Merge PDF
                                            </a>
                                            <a href="#/tool/split-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[9px]">✂️</span> Split PDF
                                            </a>
                                            <a href="#/tool/remove-pages" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-[9px]">❌</span> Remove pages
                                            </a>
                                            <a href="#/tool/extract-pages" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-[9px]">📤</span> Extract pages
                                            </a>
                                            <a href="#/tool/organize-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-[9px]">🗂️</span> Organize PDF
                                            </a>
                                            <a href="#/tool/scan-to-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-[9px]">📷</span> Scan to PDF
                                            </a>
                                        </div>
                                    </div>

                                    <!-- OPTIMIZE PDF -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">OPTIMIZE PDF</h4>
                                        <div class="space-y-1">
                                            <a href="#/tool/compress-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[9px]">📉</span> Compress PDF
                                            </a>
                                            <a href="#/tool/repair-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold text-[9px]">🛠️</span> Repair PDF
                                            </a>
                                            <a href="#/tool/ocr-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-lime-50 text-lime-700 flex items-center justify-center font-bold text-[9px]">🔍</span> OCR PDF
                                            </a>
                                        </div>
                                    </div>

                                    <!-- CONVERT TO PDF -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">CONVERT TO PDF</h4>
                                        <div class="space-y-1">
                                            <a href="#/tool/jpg-to-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[9px]">🖼️</span> JPG to PDF
                                            </a>
                                            <a href="#/tool/word-to-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[9px]">DOC</span> WORD to PDF
                                            </a>
                                            <a href="#/tool/ppt-to-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-[9px]">PPT</span> POWERPOINT to PDF
                                            </a>
                                            <a href="#/tool/excel-to-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[9px]">XLS</span> EXCEL to PDF
                                            </a>
                                            <a href="#/tool/html-to-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-[9px]">🌐</span> HTML to PDF
                                            </a>
                                        </div>
                                    </div>

                                    <!-- CONVERT FROM PDF -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">CONVERT FROM PDF</h4>
                                        <div class="space-y-1">
                                            <a href="#/tool/pdf-to-jpg" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[9px]">🖼️</span> PDF to JPG
                                            </a>
                                            <a href="#/tool/pdf-to-word" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[9px]">DOC</span> PDF to WORD
                                            </a>
                                            <a href="#/tool/pdf-to-ppt" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-[9px]">PPT</span> PDF to POWERPOINT
                                            </a>
                                            <a href="#/tool/pdf-to-excel" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[9px]">XLS</span> PDF to EXCEL
                                            </a>
                                            <a href="#/tool/pdf-to-pdfa" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[9px]">PDFA</span> PDF to PDF/A
                                            </a>
                                        </div>
                                    </div>

                                    <!-- EDIT PDF -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">EDIT PDF</h4>
                                        <div class="space-y-1">
                                            <a href="#/tool/rotate-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-[9px]">🔄</span> Rotate PDF
                                            </a>
                                            <a href="#/tool/add-page-numbers" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-[9px]">🔢</span> Add page numbers
                                            </a>
                                            <a href="#/tool/add-watermark" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center font-bold text-[9px]">💧</span> Add watermark
                                            </a>
                                            <a href="#/tool/crop-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-[9px]">✂️</span> Crop PDF
                                            </a>
                                            <a href="#/tool/edit-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-[9px]">✏️</span> Edit PDF
                                            </a>
                                            <a href="#/tool/pdf-forms" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-[9px]">📋</span> PDF Forms
                                            </a>
                                        </div>
                                    </div>

                                    <!-- PDF SECURITY -->
                                    <div>
                                        <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">PDF SECURITY</h4>
                                        <div class="space-y-1">
                                            <a href="#/tool/unlock-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[9px]">🔓</span> Unlock PDF
                                            </a>
                                            <a href="#/tool/protect-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[9px]">🛡️</span> Protect PDF
                                            </a>
                                            <a href="#/tool/sign-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-[9px]">✍️</span> Sign PDF
                                            </a>
                                            <a href="#/tool/redact-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[9px]">⬛</span> Redact PDF
                                            </a>
                                            <a href="#/tool/compare-pdf" class="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-purple-600">
                                                <span class="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-[9px]">📊</span> Compare PDF
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <a href="#/dashboard" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-500/20">Dashboard</a>
                    </div>
                </div>
            </nav>
        `;
    }

    // ─── VIEW 4: MERGE PDF TOOL ─────────────────────────────────
    renderMergePdfTool() {
        this.appEl.innerHTML = `
            ${this.getNavbarHtml('merge-pdf')}

            <!-- Main Content Container -->
            <main class="min-h-screen pt-28 pb-20 bg-slate-50 flex flex-col justify-center">
                <div class="max-w-4xl mx-auto px-6 w-full text-center">
                    
                    <!-- Header Title -->
                    <div class="mb-10 animate-fade-in">
                        <div class="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586A2 2 0 0116 3.586L19.414 7A2 2 0 0120 8.414V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
                        </div>
                        <h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">Merge PDF Files</h1>
                        <p class="text-slate-500 text-base max-w-xl mx-auto">Combine multiple PDFs into a single unified document in the order you want. KES 1 per page via M-Pesa.</p>
                    </div>

                    <!-- STEP 1: Upload Zone (Visible when no files uploaded) -->
                    <div id="merge-upload-zone" class="max-w-xl mx-auto">
                        <label id="merge-drop-area" class="group relative block cursor-pointer">
                            <div class="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-3xl p-12 transition-all duration-300 bg-white hover:bg-red-50/20 shadow-sm hover:shadow-xl">
                                <div class="flex flex-col items-center gap-4">
                                    <div class="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-red-500">
                                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
                                    </div>
                                    <div>
                                        <p class="text-slate-800 font-bold text-xl mb-1">Select PDF files to merge</p>
                                        <p class="text-slate-500 text-sm">or drop PDFs here · Select 2 or more files</p>
                                    </div>
                                </div>
                                <input type="file" id="merge-file-input" class="hidden" accept=".pdf,.doc,.docx" multiple>
                            </div>
                        </label>

                        <!-- Upload loading indicator -->
                        <div id="merge-upload-loading" class="hidden mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg text-center">
                            <div class="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p class="text-slate-800 font-bold text-sm">Uploading and analyzing files...</p>
                            <p class="text-slate-500 text-xs mt-1">Extracting page counts for pricing calculation</p>
                        </div>
                    </div>

                    <!-- STEP 2: File Queue & Ordering List (Visible after files uploaded) -->
                    <div id="merge-queue-zone" class="hidden max-w-3xl mx-auto text-left animate-fade-in">
                        <div class="grid md:grid-cols-3 gap-6 items-start">
                            
                            <!-- Left: Selected Files List -->
                            <div class="md:col-span-2 space-y-4">
                                <div class="flex items-center justify-between">
                                    <h3 class="text-slate-900 font-extrabold text-base flex items-center gap-2">
                                        Files to Merge (<span id="merge-file-count">0</span>)
                                    </h3>
                                    <label class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                                        Add More Files
                                        <input type="file" id="merge-add-file-input" class="hidden" accept=".pdf,.doc,.docx" multiple>
                                    </label>
                                </div>

                                <div id="merge-file-items" class="space-y-3">
                                    <!-- File items rendered dynamically -->
                                </div>
                            </div>

                            <!-- Right: Order Summary -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 sticky top-28">
                                <h4 class="font-extrabold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">Merge Summary</h4>

                                <div class="space-y-2.5 text-xs text-slate-600">
                                    <div class="flex justify-between">
                                        <span>Total Documents</span>
                                        <strong id="summary-doc-count" class="text-slate-900">0</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Total Page Count</span>
                                        <strong id="summary-page-count" class="text-slate-900">0 pages</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Price</span>
                                        <strong class="text-emerald-600">FREE</strong>
                                    </div>
                                </div>

                                <button id="btn-merge-pay" class="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                    Merge PDF & Download
                                </button>
                            </div>

                        </div>
                    </div>

                    <!-- STEP 3: Success Download Zone (Visible after payment & merge complete) -->
                    <div id="merge-success-zone" class="hidden max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
                        <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 mb-1">PDF Files Merged!</h3>
                        <p class="text-slate-500 text-xs mb-6">Your combined PDF document is formatted and ready for download.</p>
                        
                        <a id="btn-download-merged" href="#" class="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mb-4">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Download Merged PDF
                        </a>

                        <button id="btn-merge-another" class="text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors">Merge Another Document</button>
                    </div>

                </div>
            </main>

            <!-- PAYMENT MODAL (removed - free tool) -->
            <div id="merge-payment-modal" class="fixed inset-0 z-50 hidden" style="display:none!important">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" id="merge-modal-backdrop"></div>
                <div class="absolute inset-0 flex items-center justify-center p-4">
                    <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800">
                        <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-800" id="merge-modal-close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>

                        <div class="text-center mb-6">
                            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-700/10 flex items-center justify-center mx-auto mb-3 text-red-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-extrabold text-lg">M-Pesa Payment</h3>
                            <p class="text-slate-500 text-xs mt-1">Merge PDF Tool · <span id="merge-modal-amount" class="font-bold text-slate-800">KES 0</span></p>
                        </div>

                        <!-- Step 1: Phone input -->
                        <div id="merge-step-phone">
                            <label class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Enter Phone Number</label>
                            <input type="tel" id="merge-phone-input" placeholder="0712345678" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-center text-xl font-bold tracking-widest focus:border-red-500 focus:outline-none mb-4" maxlength="13">
                            <button id="btn-merge-stk-submit" class="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-red-500/10">
                                Initiate M-Pesa Payment
                            </button>
                        </div>

                        <!-- Step 2: Waiting -->
                        <div id="merge-step-waiting" class="hidden text-center py-6">
                            <div class="w-12 h-12 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p class="text-slate-800 font-bold mb-1">Sending STK Push Prompt...</p>
                            <p class="text-slate-500 text-xs">Please check your phone and enter your M-Pesa PIN to complete payment.</p>
                        </div>

                        <!-- Step 3: Failed -->
                        <div id="merge-step-failed" class="hidden text-center py-4">
                            <div class="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200 text-red-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </div>
                            <p class="text-slate-800 font-bold text-base mb-1">Payment Failed</p>
                            <p id="merge-failed-msg" class="text-slate-500 text-xs mb-5"></p>
                            <button id="btn-merge-retry" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Retry Payment</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // ─── MERGE TOOL CONTROLLER LOGIC ───────────────────────
        let currentMergeState = {
            documentId: null,
            files: [],
            totalPages: 0,
            totalCost: 0,
            paymentPollingInterval: null,
        };

        const fileInput = document.getElementById('merge-file-input');
        const addFileInput = document.getElementById('merge-add-file-input');
        const uploadZone = document.getElementById('merge-upload-zone');
        const uploadLoading = document.getElementById('merge-upload-loading');
        const queueZone = document.getElementById('merge-queue-zone');
        const successZone = document.getElementById('merge-success-zone');
        const fileItemsContainer = document.getElementById('merge-file-items');

        const paymentModal = document.getElementById('merge-payment-modal');
        const btnPay = document.getElementById('btn-merge-pay');
        const btnStkSubmit = document.getElementById('btn-merge-stk-submit');

        const handleFileSelect = async (files) => {
            if (!files || files.length < 2) {
                alert('Please select at least 2 PDF or Word documents to merge.');
                return;
            }

            uploadLoading.classList.remove('hidden');

            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files[]', files[i]);
            }

            try {
                const resp = await fetch(`${config.baseUrl}/api/tool/merge/upload`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': config.csrfToken },
                    body: formData,
                });
                let result = {};
                try {
                    result = await resp.json();
                } catch (jsonErr) {}

                uploadLoading.classList.add('hidden');

                if (resp.ok && result.success) {
                    currentMergeState.documentId = result.document_id;
                    currentMergeState.files = result.files;
                    currentMergeState.totalPages = result.total_pages;
                    currentMergeState.totalCost = result.cost;

                    renderQueueState();
                } else {
                    alert(result.error || result.message || 'Failed to upload files for merging.');
                }
            } catch (e) {
                uploadLoading.classList.add('hidden');
                alert('Upload request failed: ' + e.message);
            }
        };

        fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files));
        addFileInput.addEventListener('change', async (e) => {
            const newFiles = Array.from(e.target.files);
            if (newFiles.length > 0) {
                // Combine existing and new files
                await handleFileSelect(newFiles);
            }
        });

        // Drag & Drop handlers
        const dropArea = document.getElementById('merge-drop-area');
        ['dragenter', 'dragover'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.add('border-red-500', 'bg-red-50/20');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.remove('border-red-500', 'bg-red-50/20');
            });
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                handleFileSelect(e.dataTransfer.files);
            }
        });

        const renderQueueState = () => {
            if (uploadZone) uploadZone.classList.add('hidden');
            if (queueZone) queueZone.classList.remove('hidden');

            const elFileCount = document.getElementById('merge-file-count');
            if (elFileCount) elFileCount.textContent = currentMergeState.files.length;

            const elDocCount = document.getElementById('summary-doc-count');
            if (elDocCount) elDocCount.textContent = currentMergeState.files.length;

            const elPageCount = document.getElementById('summary-page-count');
            if (elPageCount) elPageCount.textContent = `${currentMergeState.totalPages} pages`;

            const elTotalCost = document.getElementById('summary-total-cost');
            if (elTotalCost) elTotalCost.textContent = `KES ${currentMergeState.totalCost}`;

            const elModalAmount = document.getElementById('merge-modal-amount');
            if (elModalAmount) elModalAmount.textContent = `KES ${currentMergeState.totalCost}`;

            if (fileItemsContainer) fileItemsContainer.innerHTML = '';

            currentMergeState.files.forEach((file, idx) => {
                const itemEl = document.createElement('div');
                itemEl.className = 'flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow';
                itemEl.innerHTML = `
                    <div class="flex items-center gap-3 truncate">
                        <div class="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-black text-xs flex-shrink-0">
                            ${idx + 1}
                        </div>
                        <div class="truncate">
                            <h5 class="text-sm font-bold text-slate-800 truncate" title="${file.original_name}">${file.original_name}</h5>
                            <p class="text-xs text-slate-500 font-medium">${file.page_count} pages · ${(file.file_size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-1.5 flex-shrink-0">
                        <button data-action="up" data-index="${idx}" class="btn-order-up p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/></svg>
                        </button>
                        <button data-action="down" data-index="${idx}" class="btn-order-down p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors ${idx === currentMergeState.files.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        <button data-action="delete" data-index="${idx}" class="btn-order-del p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                `;
                fileItemsContainer.appendChild(itemEl);
            });

            // Add button listeners for reordering and deleting
            fileItemsContainer.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const button = e.currentTarget;
                    const action = button.dataset.action;
                    const index = parseInt(button.dataset.index);

                    if (action === 'up' && index > 0) {
                        const temp = currentMergeState.files[index];
                        currentMergeState.files[index] = currentMergeState.files[index - 1];
                        currentMergeState.files[index - 1] = temp;
                        renderQueueState();
                    } else if (action === 'down' && index < currentMergeState.files.length - 1) {
                        const temp = currentMergeState.files[index];
                        currentMergeState.files[index] = currentMergeState.files[index + 1];
                        currentMergeState.files[index + 1] = temp;
                        renderQueueState();
                    } else if (action === 'delete') {
                        currentMergeState.files.splice(index, 1);
                        if (currentMergeState.files.length < 2) {
                            queueZone.classList.add('hidden');
                            uploadZone.classList.remove('hidden');
                            return;
                        }
                        // Recalculate total pages
                        currentMergeState.totalPages = currentMergeState.files.reduce((acc, f) => acc + f.page_count, 0);
                        currentMergeState.totalCost = currentMergeState.totalPages * 1;
                        renderQueueState();
                    }
                });
            });
        };

        // Free tool - directly process on click
        btnPay.addEventListener('click', () => {
            executeMergeProcess();
        });

        const executeMergeProcess = async () => {
            try {
                const resp = await fetch(`${config.baseUrl}/api/tool/merge/process/${currentMergeState.documentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: JSON.stringify({ files: currentMergeState.files }),
                });
                const result = await resp.json();

                paymentModal.classList.add('hidden');

                if (result.success && result.download_url) {
                    queueZone.classList.add('hidden');
                    successZone.classList.remove('hidden');
                    document.getElementById('btn-download-merged').href = result.download_url;
                } else {
                    alert(result.error || 'Failed to generate merged PDF.');
                }
            } catch (e) {
                paymentModal.classList.add('hidden');
                alert('Error processing merge. Please try again.');
            }
        };

        document.getElementById('btn-merge-another').addEventListener('click', () => {
            currentMergeState = { documentId: null, files: [], totalPages: 0, totalCost: 0, paymentPollingInterval: null };
            successZone.classList.add('hidden');
            uploadZone.classList.remove('hidden');
        });
    }

    // ─── VIEW 5: SPLIT PDF TOOL ─────────────────────────────────
    renderSplitPdfTool() {
        this.appEl.innerHTML = `
            ${this.getNavbarHtml('split-pdf')}

            <!-- Main Content Container -->
            <main class="min-h-screen pt-28 pb-20 bg-slate-50 flex flex-col justify-center">
                <div class="max-w-4xl mx-auto px-6 w-full text-center">
                    
                    <!-- Header Title -->
                    <div class="mb-10 animate-fade-in">
                        <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-sm">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                        </div>
                        <h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">Split PDF Document</h1>
                        <p class="text-slate-500 text-base max-w-xl mx-auto">Extract specific pages or split your PDF into custom page range segments. KES 1 per page via M-Pesa.</p>
                    </div>

                    <!-- STEP 1: Upload Zone -->
                    <div id="split-upload-zone" class="max-w-xl mx-auto">
                        <label id="split-drop-area" class="group relative block cursor-pointer">
                            <div class="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-3xl p-12 transition-all duration-300 bg-white hover:bg-amber-50/20 shadow-sm hover:shadow-xl">
                                <div class="flex flex-col items-center gap-4">
                                    <div class="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-amber-600">
                                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                                    </div>
                                    <div>
                                        <p class="text-slate-800 font-bold text-xl mb-1">Select PDF file to split</p>
                                        <p class="text-slate-500 text-sm">or drop PDF here · PDF, DOC, DOCX up to 100MB</p>
                                    </div>
                                </div>
                                <input type="file" id="split-file-input" class="hidden" accept=".pdf,.doc,.docx">
                            </div>
                        </label>

                        <div id="split-upload-loading" class="hidden mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg text-center">
                            <div class="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p class="text-slate-800 font-bold text-sm">Analyzing PDF structure...</p>
                            <p class="text-slate-500 text-xs mt-1">Extracting total page count for split configuration</p>
                        </div>
                    </div>

                    <!-- STEP 2: Split Options & Summary Zone -->
                    <div id="split-config-zone" class="hidden max-w-3xl mx-auto text-left animate-fade-in">
                        <div class="grid md:grid-cols-3 gap-6 items-start">
                            
                            <!-- Left: Options Panel -->
                            <div class="md:col-span-2 space-y-5">
                                
                                <!-- Mode Selector Tabs -->
                                <div class="bg-slate-200/70 p-1 rounded-2xl flex text-xs font-extrabold text-slate-600">
                                    <button id="tab-split-ranges" class="flex-1 py-2.5 rounded-xl bg-white text-slate-900 shadow-sm transition-all text-center">
                                        Custom Ranges
                                    </button>
                                    <button id="tab-split-all" class="flex-1 py-2.5 rounded-xl hover:text-slate-900 transition-all text-center">
                                        Extract All Pages
                                    </button>
                                    <button id="tab-split-extract" class="flex-1 py-2.5 rounded-xl hover:text-slate-900 transition-all text-center">
                                        Select Pages
                                    </button>
                                </div>

                                <!-- Option Panel 1: Custom Ranges -->
                                <div id="panel-split-ranges" class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-bold text-slate-800 text-sm">Range Segments</h4>
                                        <button id="btn-add-range" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1">
                                            + Add Range
                                        </button>
                                    </div>
                                    <div id="range-items-container" class="space-y-3">
                                        <!-- Dynamic range items -->
                                    </div>
                                </div>

                                <!-- Option Panel 2: Extract All Pages -->
                                <div id="panel-split-all" class="hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
                                    <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                    </div>
                                    <h4 class="font-bold text-slate-900 text-sm mb-1">Extract Every Page</h4>
                                    <p class="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto">Every page of your document will be separated into an individual 1-page PDF file and packaged in a ZIP archive.</p>
                                </div>

                                <!-- Option Panel 3: Select Specific Pages -->
                                <div id="panel-split-extract" class="hidden bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
                                    <h4 class="font-bold text-slate-800 text-sm">Pages to Extract</h4>
                                    <p class="text-xs text-slate-500">Enter individual page numbers or ranges separated by commas (e.g. <code class="bg-slate-100 px-1.5 py-0.5 rounded text-amber-700 font-mono">1, 3, 5-8</code>):</p>
                                    <input type="text" id="split-pages-input" placeholder="e.g. 1, 3, 5-8" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-amber-500 focus:outline-none">
                                </div>

                            </div>

                            <!-- Right: Summary Card -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 sticky top-28">
                                <h4 class="font-extrabold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">Split Summary</h4>

                                <div class="space-y-2.5 text-xs text-slate-600">
                                    <div>
                                        <span class="block text-slate-400 font-medium text-[10px] uppercase">Document</span>
                                        <strong id="split-filename" class="text-slate-900 font-bold block truncate">Document.pdf</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Total Pages</span>
                                        <strong id="split-total-pages" class="text-slate-900">0 pages</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Price</span>
                                        <strong class="text-emerald-600">FREE</strong>
                                    </div>
                                </div>

                                <button id="btn-split-pay" class="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                    Split PDF & Download
                                </button>
                            </div>

                        </div>
                    </div>

                    <!-- STEP 3: Success Download Zone -->
                    <div id="split-success-zone" class="hidden max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
                        <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 mb-1">PDF Split Completed!</h3>
                        <p class="text-slate-500 text-xs mb-6">Your split documents are ready for download as a ZIP archive.</p>
                        
                        <a id="btn-download-split" href="#" class="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mb-4">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Download Split PDF Archive
                        </a>

                        <button id="btn-split-another" class="text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors">Split Another Document</button>
                    </div>

                </div>
            </main>

            <!-- PAYMENT MODAL (removed - free tool) -->
            <div id="split-payment-modal" class="fixed inset-0 z-50 hidden" style="display:none!important">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" id="split-modal-backdrop"></div>
                <div class="absolute inset-0 flex items-center justify-center p-4">
                    <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800">
                        <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-800" id="split-modal-close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>

                        <div class="text-center mb-6">
                            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-700/10 flex items-center justify-center mx-auto mb-3 text-amber-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-extrabold text-lg">M-Pesa Payment</h3>
                            <p class="text-slate-500 text-xs mt-1">Split PDF Tool · <span id="split-modal-amount" class="font-bold text-slate-800">KES 0</span></p>
                        </div>

                        <!-- Step 1: Phone input -->
                        <div id="split-step-phone">
                            <label class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Enter Phone Number</label>
                            <input type="tel" id="split-phone-input" placeholder="0712345678" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-center text-xl font-bold tracking-widest focus:border-amber-500 focus:outline-none mb-4" maxlength="13">
                            <button id="btn-split-stk-submit" class="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-sm font-bold rounded-xl transition-all shadow-md shadow-amber-500/10">
                                Initiate M-Pesa Payment
                            </button>
                        </div>

                        <!-- Step 2: Waiting -->
                        <div id="split-step-waiting" class="hidden text-center py-6">
                            <div class="w-12 h-12 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p class="text-slate-800 font-bold mb-1">Sending STK Push Prompt...</p>
                            <p class="text-slate-500 text-xs">Please check your phone and enter your M-Pesa PIN to complete payment.</p>
                        </div>

                        <!-- Step 3: Failed -->
                        <div id="split-step-failed" class="hidden text-center py-4">
                            <div class="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200 text-red-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </div>
                            <p class="text-slate-800 font-bold text-base mb-1">Payment Failed</p>
                            <p id="split-failed-msg" class="text-slate-500 text-xs mb-5"></p>
                            <button id="btn-split-retry" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Retry Payment</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // ─── SPLIT CONTROLLER LOGIC ─────────────────────────────
        let currentSplitState = {
            documentId: null,
            originalName: '',
            totalPages: 0,
            totalCost: 0,
            mode: 'ranges', // 'ranges', 'all', 'extract'
            ranges: [{ from: 1, to: 1 }],
            paymentPollingInterval: null,
        };

        const fileInput = document.getElementById('split-file-input');
        const uploadZone = document.getElementById('split-upload-zone');
        const uploadLoading = document.getElementById('split-upload-loading');
        const configZone = document.getElementById('split-config-zone');
        const successZone = document.getElementById('split-success-zone');
        const rangeContainer = document.getElementById('range-items-container');

        const tabRanges = document.getElementById('tab-split-ranges');
        const tabAll = document.getElementById('tab-split-all');
        const tabExtract = document.getElementById('tab-split-extract');

        const panelRanges = document.getElementById('panel-split-ranges');
        const panelAll = document.getElementById('panel-split-all');
        const panelExtract = document.getElementById('panel-split-extract');

        const paymentModal = document.getElementById('split-payment-modal');
        const btnPay = document.getElementById('btn-split-pay');
        const btnStkSubmit = document.getElementById('btn-split-stk-submit');

        const handleSplitFileUpload = async (file) => {
            if (!file) return;

            uploadLoading.classList.remove('hidden');

            const formData = new FormData();
            formData.append('file', file);

            try {
                const resp = await fetch(`${config.baseUrl}/api/tool/split/upload`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': config.csrfToken },
                    body: formData,
                });

                let result = {};
                try { result = await resp.json(); } catch(e) {}

                uploadLoading.classList.add('hidden');

                if (resp.ok && result.success) {
                    currentSplitState.documentId = result.document_id;
                    currentSplitState.originalName = result.original_name;
                    currentSplitState.totalPages = result.page_count;
                    currentSplitState.totalCost = result.cost;

                    // Initialize default split range
                    const mid = max(1, Math.ceil(result.page_count / 2));
                    currentSplitState.ranges = [
                        { from: 1, to: mid },
                        { from: Math.min(result.page_count, mid + 1), to: result.page_count }
                    ];

                    renderSplitConfigState();
                } else {
                    alert(result.error || 'Failed to upload PDF for splitting.');
                }
            } catch (e) {
                uploadLoading.classList.add('hidden');
                alert('Upload request failed: ' + e.message);
            }
        };

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleSplitFileUpload(e.target.files[0]);
            }
        });

        // Drag & Drop
        const dropArea = document.getElementById('split-drop-area');
        ['dragenter', 'dragover'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.add('border-amber-500', 'bg-amber-50/20');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.remove('border-amber-500', 'bg-amber-50/20');
            });
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                handleSplitFileUpload(e.dataTransfer.files[0]);
            }
        });

        // Mode Tab Switching
        const switchMode = (mode) => {
            currentSplitState.mode = mode;
            [tabRanges, tabAll, tabExtract].forEach(t => t.className = 'flex-1 py-2.5 rounded-xl hover:text-slate-900 transition-all text-center');
            [panelRanges, panelAll, panelExtract].forEach(p => p.classList.add('hidden'));

            if (mode === 'ranges') {
                tabRanges.className = 'flex-1 py-2.5 rounded-xl bg-white text-slate-900 shadow-sm transition-all text-center font-black';
                panelRanges.classList.remove('hidden');
            } else if (mode === 'all') {
                tabAll.className = 'flex-1 py-2.5 rounded-xl bg-white text-slate-900 shadow-sm transition-all text-center font-black';
                panelAll.classList.remove('hidden');
            } else if (mode === 'extract') {
                tabExtract.className = 'flex-1 py-2.5 rounded-xl bg-white text-slate-900 shadow-sm transition-all text-center font-black';
                panelExtract.classList.remove('hidden');
            }
        };

        tabRanges.addEventListener('click', () => switchMode('ranges'));
        tabAll.addEventListener('click', () => switchMode('all'));
        tabExtract.addEventListener('click', () => switchMode('extract'));

        const renderSplitConfigState = () => {
            if (uploadZone) uploadZone.classList.add('hidden');
            if (configZone) configZone.classList.remove('hidden');

            const elFilename = document.getElementById('split-filename');
            if (elFilename) elFilename.textContent = currentSplitState.originalName;

            const elTotalPages = document.getElementById('split-total-pages');
            if (elTotalPages) elTotalPages.textContent = `${currentSplitState.totalPages} pages`;

            const elTotalCost = document.getElementById('split-total-cost');
            if (elTotalCost) elTotalCost.textContent = `KES ${currentSplitState.totalCost}`;

            const elModalAmount = document.getElementById('split-modal-amount');
            if (elModalAmount) elModalAmount.textContent = `KES ${currentSplitState.totalCost}`;

            renderRangesList();
        };

        const renderRangesList = () => {
            rangeContainer.innerHTML = '';

            currentSplitState.ranges.forEach((r, idx) => {
                const item = document.createElement('div');
                item.className = 'flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl';
                item.innerHTML = `
                    <span class="text-xs font-bold text-slate-400 w-16">Range ${idx + 1}</span>
                    <div class="flex items-center gap-2 flex-1">
                        <span class="text-xs text-slate-500 font-medium">From</span>
                        <input type="number" min="1" max="${currentSplitState.totalPages}" value="${r.from}" data-index="${idx}" data-field="from" class="range-input w-16 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center py-1">
                        <span class="text-xs text-slate-500 font-medium">To</span>
                        <input type="number" min="1" max="${currentSplitState.totalPages}" value="${r.to}" data-index="${idx}" data-field="to" class="range-input w-16 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center py-1">
                    </div>
                    <button data-index="${idx}" class="btn-remove-range p-1 text-slate-400 hover:text-red-500 transition-colors ${currentSplitState.ranges.length === 1 ? 'hidden' : ''}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                `;
                rangeContainer.appendChild(item);
            });

            rangeContainer.querySelectorAll('.range-input').forEach(input => {
                input.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    const field = e.target.dataset.field;
                    const val = parseInt(e.target.value) || 1;
                    currentSplitState.ranges[idx][field] = val;
                });
            });

            rangeContainer.querySelectorAll('.btn-remove-range').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.currentTarget.dataset.index);
                    currentSplitState.ranges.splice(idx, 1);
                    renderRangesList();
                });
            });
        };

        document.getElementById('btn-add-range').addEventListener('click', () => {
            const lastRange = currentSplitState.ranges[currentSplitState.ranges.length - 1] || { to: 0 };
            const nextFrom = Math.min(currentSplitState.totalPages, (lastRange.to || 1) + 1);
            currentSplitState.ranges.push({ from: nextFrom, to: currentSplitState.totalPages });
            renderRangesList();
        });

        // Helper max
        function max(a, b) { return a > b ? a : b; }

        // Free tool - directly process on click
        btnPay.addEventListener('click', () => {
            executeSplitProcess();
        });

        const executeSplitProcess = async () => {
            try {
                let payloadPages = [];
                if (currentSplitState.mode === 'extract') {
                    const pageText = document.getElementById('split-pages-input').value.trim();
                    if (pageText) {
                        pageText.split(',').forEach(p => {
                            p = p.trim();
                            if (p.includes('-')) {
                                const parts = p.split('-').map(x => parseInt(x.trim()));
                                if (parts[0] && parts[1]) {
                                    for (let i = parts[0]; i <= parts[1]; i++) payloadPages.push(i);
                                }
                            } else if (parseInt(p)) {
                                payloadPages.push(parseInt(p));
                            }
                        });
                    }
                }

                const resp = await fetch(`${config.baseUrl}/api/tool/split/process/${currentSplitState.documentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: JSON.stringify({
                        mode: currentSplitState.mode,
                        ranges: currentSplitState.ranges,
                        pages: payloadPages,
                    }),
                });
                const result = await resp.json();

                paymentModal.classList.add('hidden');

                if (result.success && result.download_url) {
                    configZone.classList.add('hidden');
                    successZone.classList.remove('hidden');
                    document.getElementById('btn-download-split').href = result.download_url;
                } else {
                    alert(result.error || 'Failed to generate split PDF.');
                }
            } catch (e) {
                paymentModal.classList.add('hidden');
                alert('Error processing split. Please try again.');
            }
        };

        document.getElementById('btn-split-another').addEventListener('click', () => {
            currentSplitState = { documentId: null, originalName: '', totalPages: 0, totalCost: 0, mode: 'ranges', ranges: [{ from: 1, to: 1 }], paymentPollingInterval: null };
            successZone.classList.add('hidden');
            uploadZone.classList.remove('hidden');
        });
    }

    // ─── VIEW 6: COMPRESS PDF TOOL ──────────────────────────────
    renderCompressPdfTool() {
        this.appEl.innerHTML = `
            ${this.getNavbarHtml('compress-pdf')}

            <!-- Main Content Container -->
            <main class="min-h-screen pt-28 pb-20 bg-slate-50 flex flex-col justify-center">
                <div class="max-w-4xl mx-auto px-6 w-full text-center">
                    
                    <!-- Header Title -->
                    <div class="mb-10 animate-fade-in">
                        <div class="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4 border border-green-100 shadow-sm">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
                        </div>
                        <h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">Compress PDF File</h1>
                        <p class="text-slate-500 text-base max-w-xl mx-auto">Reduce file size while optimizing for maximal quality. Ideal for court filing compliance (25MB limit). KES 1 per page via M-Pesa.</p>
                    </div>

                    <!-- STEP 1: Upload Zone -->
                    <div id="compress-upload-zone" class="max-w-xl mx-auto">
                        <label id="compress-drop-area" class="group relative block cursor-pointer">
                            <div class="border-2 border-dashed border-slate-300 hover:border-green-500 rounded-3xl p-12 transition-all duration-300 bg-white hover:bg-green-50/20 shadow-sm hover:shadow-xl">
                                <div class="flex flex-col items-center gap-4">
                                    <div class="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-green-600">
                                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                                    </div>
                                    <div>
                                        <p class="text-slate-800 font-bold text-xl mb-1">Select PDF file to compress</p>
                                        <p class="text-slate-500 text-sm">or drop PDF here · PDF, DOC, DOCX up to 100MB</p>
                                    </div>
                                </div>
                                <input type="file" id="compress-file-input" class="hidden" accept=".pdf,.doc,.docx">
                            </div>
                        </label>

                        <div id="compress-upload-loading" class="hidden mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg text-center">
                            <div class="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p class="text-slate-800 font-bold text-sm">Uploading and inspecting file...</p>
                            <p class="text-slate-500 text-xs mt-1">Analyzing pages and file size</p>
                        </div>
                    </div>

                    <!-- STEP 2: Compression Settings & Summary Zone -->
                    <div id="compress-config-zone" class="hidden max-w-3xl mx-auto text-left animate-fade-in">
                        <div class="grid md:grid-cols-3 gap-6 items-start">
                            
                            <!-- Left: Quality Selection Cards -->
                            <div class="md:col-span-2 space-y-4">
                                <h3 class="text-slate-900 font-extrabold text-base">Select Compression Level</h3>

                                <div class="space-y-3">
                                    <!-- Recommended -->
                                    <label class="block cursor-pointer">
                                        <input type="radio" name="compress-quality" value="medium" checked class="peer hidden">
                                        <div class="p-5 bg-white border-2 border-slate-200 peer-checked:border-green-500 peer-checked:bg-green-50/10 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center justify-between">
                                            <div>
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class="font-extrabold text-slate-900 text-sm">Recommended Compression</span>
                                                    <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">Optimal</span>
                                                </div>
                                                <p class="text-xs text-slate-500">Good quality, optimal file size reduction. Best for most court filings.</p>
                                            </div>
                                            <div class="w-5 h-5 rounded-full border-2 border-slate-300 peer-checked:border-green-500 peer-checked:bg-green-500 flex-shrink-0"></div>
                                        </div>
                                    </label>

                                    <!-- Extreme -->
                                    <label class="block cursor-pointer">
                                        <input type="radio" name="compress-quality" value="low" class="peer hidden">
                                        <div class="p-5 bg-white border-2 border-slate-200 peer-checked:border-green-500 peer-checked:bg-green-50/10 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center justify-between">
                                            <div>
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class="font-extrabold text-slate-900 text-sm">Extreme Compression</span>
                                                    <span class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">Max Reduction</span>
                                                </div>
                                                <p class="text-xs text-slate-500">Maximum size reduction, lower image resolution. Ideal for files > 25MB.</p>
                                            </div>
                                            <div class="w-5 h-5 rounded-full border-2 border-slate-300 peer-checked:border-green-500 peer-checked:bg-green-500 flex-shrink-0"></div>
                                        </div>
                                    </label>

                                    <!-- Less Compression -->
                                    <label class="block cursor-pointer">
                                        <input type="radio" name="compress-quality" value="high" class="peer hidden">
                                        <div class="p-5 bg-white border-2 border-slate-200 peer-checked:border-green-500 peer-checked:bg-green-50/10 rounded-2xl transition-all shadow-sm hover:shadow-md flex items-center justify-between">
                                            <div>
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class="font-extrabold text-slate-900 text-sm">Less Compression</span>
                                                    <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">High Quality</span>
                                                </div>
                                                <p class="text-xs text-slate-500">High visual quality, minor file size reduction.</p>
                                            </div>
                                            <div class="w-5 h-5 rounded-full border-2 border-slate-300 peer-checked:border-green-500 peer-checked:bg-green-500 flex-shrink-0"></div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- Right: Summary Card -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 sticky top-28">
                                <h4 class="font-extrabold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">Compression Summary</h4>

                                <div class="space-y-2.5 text-xs text-slate-600">
                                    <div>
                                        <span class="block text-slate-400 font-medium text-[10px] uppercase">Document</span>
                                        <strong id="compress-filename" class="text-slate-900 font-bold block truncate">Document.pdf</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Original Size</span>
                                        <strong id="compress-orig-size" class="text-slate-900">0 MB</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Total Pages</span>
                                        <strong id="compress-total-pages" class="text-slate-900">0 pages</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Price</span>
                                        <strong class="text-emerald-600">FREE</strong>
                                    </div>
                                </div>

                                <button id="btn-compress-pay" class="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                    Compress PDF & Download
                                </button>
                            </div>

                        </div>
                    </div>

                    <!-- STEP 3: Success Download Zone -->
                    <div id="compress-success-zone" class="hidden max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
                        <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-3 border border-emerald-200">
                            🎉 Your PDF is <span id="compress-badge-percent">0%</span> smaller!
                        </div>

                        <h3 class="text-2xl font-black text-slate-900 mb-1">Compression Complete</h3>
                        <p class="text-slate-500 text-xs mb-6">Reduced from <span id="compress-stat-orig" class="font-bold text-slate-700">0 MB</span> to <span id="compress-stat-new" class="font-bold text-emerald-600">0 MB</span>.</p>
                        
                        <a id="btn-download-compressed" href="#" class="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mb-4">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Download Compressed PDF
                        </a>

                        <button id="btn-compress-another" class="text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors">Compress Another Document</button>
                    </div>

                </div>
            </main>

            <!-- PAYMENT MODAL (removed - free tool) -->
            <div id="compress-payment-modal" class="fixed inset-0 z-50 hidden" style="display:none!important">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" id="compress-modal-backdrop"></div>
                <div class="absolute inset-0 flex items-center justify-center p-4">
                    <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800">
                        <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-800" id="compress-modal-close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>

                        <div class="text-center mb-6">
                            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-700/10 flex items-center justify-center mx-auto mb-3 text-green-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-extrabold text-lg">M-Pesa Payment</h3>
                            <p class="text-slate-500 text-xs mt-1">Compress PDF Tool · <span id="compress-modal-amount" class="font-bold text-slate-800">KES 0</span></p>
                        </div>

                        <!-- Step 1: Phone input -->
                        <div id="compress-step-phone">
                            <label class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Enter Phone Number</label>
                            <input type="tel" id="compress-phone-input" placeholder="0712345678" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-center text-xl font-bold tracking-widest focus:border-green-500 focus:outline-none mb-4" maxlength="13">
                            <button id="btn-compress-stk-submit" class="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-green-500/10">
                                Initiate M-Pesa Payment
                            </button>
                        </div>

                        <!-- Step 2: Waiting -->
                        <div id="compress-step-waiting" class="hidden text-center py-6">
                            <div class="w-12 h-12 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p class="text-slate-800 font-bold mb-1">Sending STK Push Prompt...</p>
                            <p class="text-slate-500 text-xs">Please check your phone and enter your M-Pesa PIN to complete payment.</p>
                        </div>

                        <!-- Step 3: Failed -->
                        <div id="compress-step-failed" class="hidden text-center py-4">
                            <div class="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200 text-red-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </div>
                            <p class="text-slate-800 font-bold text-base mb-1">Payment Failed</p>
                            <p id="compress-failed-msg" class="text-slate-500 text-xs mb-5"></p>
                            <button id="btn-compress-retry" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Retry Payment</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // ─── COMPRESS CONTROLLER LOGIC ──────────────────────────
        let currentCompressState = {
            documentId: null,
            originalName: '',
            fileSize: 0,
            totalPages: 0,
            totalCost: 0,
            paymentPollingInterval: null,
        };

        const fileInput = document.getElementById('compress-file-input');
        const uploadZone = document.getElementById('compress-upload-zone');
        const uploadLoading = document.getElementById('compress-upload-loading');
        const configZone = document.getElementById('compress-config-zone');
        const successZone = document.getElementById('compress-success-zone');

        const paymentModal = document.getElementById('compress-payment-modal');
        const btnPay = document.getElementById('btn-compress-pay');
        const btnStkSubmit = document.getElementById('btn-compress-stk-submit');

        const handleCompressFileUpload = async (file) => {
            if (!file) return;

            uploadLoading.classList.remove('hidden');

            const formData = new FormData();
            formData.append('file', file);

            try {
                const resp = await fetch(`${config.baseUrl}/api/tool/compress/upload`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': config.csrfToken },
                    body: formData,
                });

                let result = {};
                try { result = await resp.json(); } catch(e) {}

                uploadLoading.classList.add('hidden');

                if (resp.ok && result.success) {
                    currentCompressState.documentId = result.document_id;
                    currentCompressState.originalName = result.original_name;
                    currentCompressState.fileSize = result.file_size;
                    currentCompressState.totalPages = result.page_count;
                    currentCompressState.totalCost = result.cost;

                    renderCompressConfigState();
                } else {
                    alert(result.error || 'Failed to upload PDF for compression.');
                }
            } catch (e) {
                uploadLoading.classList.add('hidden');
                alert('Upload request failed: ' + e.message);
            }
        };

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleCompressFileUpload(e.target.files[0]);
            }
        });

        // Drag & Drop
        const dropArea = document.getElementById('compress-drop-area');
        ['dragenter', 'dragover'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.add('border-green-500', 'bg-green-50/20');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.remove('border-green-500', 'bg-green-50/20');
            });
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                handleCompressFileUpload(e.dataTransfer.files[0]);
            }
        });

        const renderCompressConfigState = () => {
            if (uploadZone) uploadZone.classList.add('hidden');
            if (configZone) configZone.classList.remove('hidden');

            const mbSize = (currentCompressState.fileSize / (1024 * 1024)).toFixed(2);
            const elFilename = document.getElementById('compress-filename');
            if (elFilename) elFilename.textContent = currentCompressState.originalName;

            const elOrigSize = document.getElementById('compress-orig-size');
            if (elOrigSize) elOrigSize.textContent = `${mbSize} MB`;

            const elTotalPages = document.getElementById('compress-total-pages');
            if (elTotalPages) elTotalPages.textContent = `${currentCompressState.totalPages} pages`;

            const elTotalCost = document.getElementById('compress-total-cost');
            if (elTotalCost) elTotalCost.textContent = `KES ${currentCompressState.totalCost}`;

            const elModalAmount = document.getElementById('compress-modal-amount');
            if (elModalAmount) elModalAmount.textContent = `KES ${currentCompressState.totalCost}`;
        };

        // Free tool - directly process on click
        btnPay.addEventListener('click', () => {
            executeCompressProcess();
        });

        const executeCompressProcess = async () => {
            try {
                const selectedQuality = document.querySelector('input[name="compress-quality"]:checked')?.value || 'medium';

                const resp = await fetch(`${config.baseUrl}/api/tool/compress/process/${currentCompressState.documentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: JSON.stringify({ quality: selectedQuality }),
                });
                const result = await resp.json();

                paymentModal.classList.add('hidden');

                if (result.success && result.download_url) {
                    configZone.classList.add('hidden');
                    successZone.classList.remove('hidden');

                    const origMb = (result.original_size / (1024 * 1024)).toFixed(2);
                    const newMb = (result.compressed_size / (1024 * 1024)).toFixed(2);
                    document.getElementById('compress-badge-percent').textContent = `${result.saved_percent}%`;
                    document.getElementById('compress-stat-orig').textContent = `${origMb} MB`;
                    document.getElementById('compress-stat-new').textContent = `${newMb} MB`;
                    document.getElementById('btn-download-compressed').href = result.download_url;
                } else {
                    alert(result.error || 'Failed to compress PDF.');
                }
            } catch (e) {
                paymentModal.classList.add('hidden');
                alert('Error processing compression. Please try again.');
            }
        };

        document.getElementById('btn-compress-another').addEventListener('click', () => {
            currentCompressState = { documentId: null, originalName: '', fileSize: 0, totalPages: 0, totalCost: 0, paymentPollingInterval: null };
            successZone.classList.add('hidden');
            uploadZone.classList.remove('hidden');
        });
    }

    // ─── VIEW 7: CONVERT PDF TOOL SUITE ─────────────────────────
    renderConvertPdfTool(toolType = 'convert-pdf') {
        const toolsMap = {
            'jpg-to-pdf': { title: 'JPG to PDF Converter', desc: 'Convert JPG, JPEG, or PNG images to PDF document.', accept: '.jpg,.jpeg,.png,.webp', label: 'Select Image File' },
            'word-to-pdf': { title: 'WORD to PDF Converter', desc: 'Convert DOC and DOCX documents to PDF format.', accept: '.doc,.docx', label: 'Select Word Document' },
            'ppt-to-pdf': { title: 'POWERPOINT to PDF Converter', desc: 'Convert PPT and PPTX presentations to PDF.', accept: '.ppt,.pptx', label: 'Select PowerPoint File' },
            'excel-to-pdf': { title: 'EXCEL to PDF Converter', desc: 'Convert XLS and XLSX spreadsheets to PDF.', accept: '.xls,.xlsx', label: 'Select Excel Spreadsheet' },
            'html-to-pdf': { title: 'HTML to PDF Converter', desc: 'Convert web pages or HTML files to PDF.', accept: '.html,.htm', label: 'Select HTML File' },
            'pdf-to-jpg': { title: 'PDF to JPG Converter', desc: 'Extract pages or convert entire PDF into JPG images.', accept: '.pdf', label: 'Select PDF File' },
            'pdf-to-word': { title: 'PDF to WORD Converter', desc: 'Convert PDF document into editable Word DOCX.', accept: '.pdf', label: 'Select PDF File' },
            'pdf-to-ppt': { title: 'PDF to POWERPOINT Converter', desc: 'Convert PDF document into editable PowerPoint slides.', accept: '.pdf', label: 'Select PDF File' },
            'pdf-to-excel': { title: 'PDF to EXCEL Converter', desc: 'Convert PDF tables into Excel XLSX spreadsheets.', accept: '.pdf', label: 'Select PDF File' },
            'pdf-to-pdfa': { title: 'PDF to PDF/A Converter', desc: 'Convert standard PDF to ISO PDF/A compliance format.', accept: '.pdf', label: 'Select PDF File' },
        };

        const isHub = (toolType === 'convert-pdf' || !toolsMap[toolType]);
        const activeTool = toolsMap[toolType] || { title: 'Convert PDF Tools', desc: 'Convert files to and from PDF format', accept: '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.png', label: 'Select Document' };

        this.appEl.innerHTML = `
            ${this.getNavbarHtml(toolType)}

            <!-- Main Content Container -->
            <main class="min-h-screen pt-28 pb-20 bg-slate-50 flex flex-col justify-center">
                <div class="max-w-5xl mx-auto px-6 w-full text-center">
                    
                    ${isHub ? `
                        <!-- HUB VIEW: Grid of all PDF Tools (6 Categories) -->
                        <div class="mb-10 animate-fade-in">
                            <div class="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 border border-purple-100 shadow-sm">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                            </div>
                            <h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">Every tool you need to work with PDFs in one place</h1>
                            <p class="text-slate-500 text-base max-w-2xl mx-auto">Every tool 100% free & easy to use! Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks. KES 1 per page via M-Pesa.</p>
                        </div>

                        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left max-w-6xl mx-auto">
                            <!-- Category 1: ORGANIZE PDF -->
                            <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
                                <h3 class="text-xs font-extrabold uppercase tracking-wider text-red-500 border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-red-500"></span> ORGANIZE PDF
                                </h3>
                                <div class="space-y-1.5">
                                    <a href="#/tool/merge-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-red-50 text-red-500 font-bold text-sm flex items-center justify-center">🧩</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Merge PDF</h4><p class="text-[11px] text-slate-400">Combine multiple PDFs into one</p></div>
                                    </a>
                                    <a href="#/tool/split-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 font-bold text-sm flex items-center justify-center">✂️</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Split PDF</h4><p class="text-[11px] text-slate-400">Separate pages into single files</p></div>
                                    </a>
                                    <a href="#/tool/remove-pages" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm flex items-center justify-center">❌</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Remove pages</h4><p class="text-[11px] text-slate-400">Delete unwanted PDF pages</p></div>
                                    </a>
                                    <a href="#/tool/extract-pages" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm flex items-center justify-center">📤</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Extract pages</h4><p class="text-[11px] text-slate-400">Save specific pages as new PDF</p></div>
                                    </a>
                                </div>
                            </div>

                            <!-- Category 2: OPTIMIZE PDF -->
                            <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
                                <h3 class="text-xs font-extrabold uppercase tracking-wider text-emerald-600 border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span> OPTIMIZE PDF
                                </h3>
                                <div class="space-y-1.5">
                                    <a href="#/tool/compress-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm flex items-center justify-center">📉</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Compress PDF</h4><p class="text-[11px] text-slate-400">Reduce file size (< 25MB court limit)</p></div>
                                    </a>
                                    <a href="#/tool/repair-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-green-50 text-green-600 font-bold text-sm flex items-center justify-center">🛠️</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Repair PDF</h4><p class="text-[11px] text-slate-400">Fix damaged & corrupt PDF files</p></div>
                                    </a>
                                    <a href="#/tool/ocr-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-lime-50 text-lime-700 font-bold text-sm flex items-center justify-center">🔍</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">OCR PDF</h4><p class="text-[11px] text-slate-400">Convert scanned PDF to searchable text</p></div>
                                    </a>
                                </div>
                            </div>

                            <!-- Category 3: CONVERT TO PDF -->
                            <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
                                <h3 class="text-xs font-extrabold uppercase tracking-wider text-amber-600 border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-amber-500"></span> CONVERT TO PDF
                                </h3>
                                <div class="space-y-1.5">
                                    <a href="#/tool/jpg-to-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 font-bold text-xs flex items-center justify-center">JPG</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">JPG to PDF</h4><p class="text-[11px] text-slate-400">Convert JPG, PNG, WEBP to PDF</p></div>
                                    </a>
                                    <a href="#/tool/word-to-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">DOC</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">WORD to PDF</h4><p class="text-[11px] text-slate-400">Convert DOC and DOCX to PDF</p></div>
                                    </a>
                                    <a href="#/tool/ppt-to-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 font-bold text-xs flex items-center justify-center">PPT</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">POWERPOINT to PDF</h4><p class="text-[11px] text-slate-400">Convert PPT and PPTX to PDF</p></div>
                                    </a>
                                    <a href="#/tool/excel-to-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center">XLS</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">EXCEL to PDF</h4><p class="text-[11px] text-slate-400">Convert XLS and XLSX to PDF</p></div>
                                    </a>
                                </div>
                            </div>

                            <!-- Category 4: CONVERT FROM PDF -->
                            <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
                                <h3 class="text-xs font-extrabold uppercase tracking-wider text-blue-600 border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-blue-500"></span> CONVERT FROM PDF
                                </h3>
                                <div class="space-y-1.5">
                                    <a href="#/tool/pdf-to-jpg" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 font-bold text-xs flex items-center justify-center">JPG</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">PDF to JPG</h4><p class="text-[11px] text-slate-400">Extract PDF pages as JPG images</p></div>
                                    </a>
                                    <a href="#/tool/pdf-to-word" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">DOC</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">PDF to WORD</h4><p class="text-[11px] text-slate-400">Convert PDF to editable Word DOCX</p></div>
                                    </a>
                                    <a href="#/tool/pdf-to-ppt" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 font-bold text-xs flex items-center justify-center">PPT</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">PDF to POWERPOINT</h4><p class="text-[11px] text-slate-400">Convert PDF to PowerPoint presentation</p></div>
                                    </a>
                                    <a href="#/tool/pdf-to-excel" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center">XLS</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">PDF to EXCEL</h4><p class="text-[11px] text-slate-400">Extract tables to Excel spreadsheet</p></div>
                                    </a>
                                </div>
                            </div>

                            <!-- Category 5: EDIT PDF -->
                            <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
                                <h3 class="text-xs font-extrabold uppercase tracking-wider text-purple-600 border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-purple-500"></span> EDIT PDF
                                </h3>
                                <div class="space-y-1.5">
                                    <a href="#/tool/rotate-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 font-bold text-sm flex items-center justify-center">🔄</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Rotate PDF</h4><p class="text-[11px] text-slate-400">Rotate pages to portrait or landscape</p></div>
                                    </a>
                                    <a href="#/tool/add-page-numbers" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 font-bold text-sm flex items-center justify-center">🔢</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Add page numbers</h4><p class="text-[11px] text-slate-400">Insert court-compliant page numbers</p></div>
                                    </a>
                                    <a href="#/tool/add-watermark" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-fuchsia-50 text-fuchsia-600 font-bold text-sm flex items-center justify-center">💧</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Add watermark</h4><p class="text-[11px] text-slate-400">Stamp text or image on pages</p></div>
                                    </a>
                                    <a href="#/tool/edit-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm flex items-center justify-center">✏️</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Edit PDF</h4><p class="text-[11px] text-slate-400">Add text, shapes & annotations</p></div>
                                    </a>
                                </div>
                            </div>

                            <!-- Category 6: PDF SECURITY -->
                            <div class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
                                <h3 class="text-xs font-extrabold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-indigo-500"></span> PDF SECURITY
                                </h3>
                                <div class="space-y-1.5">
                                    <a href="#/tool/unlock-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm flex items-center justify-center">🔓</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Unlock PDF</h4><p class="text-[11px] text-slate-400">Remove PDF passwords & security</p></div>
                                    </a>
                                    <a href="#/tool/protect-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-bold text-sm flex items-center justify-center">🛡️</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Protect PDF</h4><p class="text-[11px] text-slate-400">Encrypt PDF with password</p></div>
                                    </a>
                                    <a href="#/tool/sign-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 font-bold text-sm flex items-center justify-center">✍️</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Sign PDF</h4><p class="text-[11px] text-slate-400">Sign document with digital signature</p></div>
                                    </a>
                                    <a href="#/tool/redact-pdf" class="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                                        <span class="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center">⬛</span>
                                        <div><h4 class="font-bold text-slate-800 text-sm group-hover:text-purple-600">Redact PDF</h4><p class="text-[11px] text-slate-400">Permanently black out sensitive text</p></div>
                                    </a>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <!-- WORKSPACE VIEW: Single Converter Workspace -->
                        <div class="mb-10 animate-fade-in">
                            <a href="#/tool/convert-pdf" class="inline-flex items-center gap-1.5 text-xs text-purple-600 font-bold hover:underline mb-4">
                                ← Back to all convert tools
                            </a>
                            <h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">${activeTool.title}</h1>
                            <p class="text-slate-500 text-base max-w-xl mx-auto">${activeTool.desc}. KES 1 per page via M-Pesa.</p>
                        </div>

                        <!-- STEP 1: Upload Zone -->
                        <div id="convert-upload-zone" class="max-w-xl mx-auto">
                            <label id="convert-drop-area" class="group relative block cursor-pointer">
                                <div class="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-3xl p-12 transition-all duration-300 bg-white hover:bg-purple-50/20 shadow-sm hover:shadow-xl">
                                    <div class="flex flex-col items-center gap-4">
                                        <div class="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-purple-600">
                                            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                                        </div>
                                        <div>
                                            <p class="text-slate-800 font-bold text-xl mb-1">${activeTool.label}</p>
                                            <p class="text-slate-500 text-sm">or drop file here · Formats (${activeTool.accept})</p>
                                        </div>
                                    </div>
                                    <input type="file" id="convert-file-input" class="hidden" accept="${activeTool.accept}">
                                </div>
                            </label>

                            <div id="convert-upload-loading" class="hidden mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg text-center">
                                <div class="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                <p class="text-slate-800 font-bold text-sm">Analyzing file structure...</p>
                                <p class="text-slate-500 text-xs mt-1">Preparing conversion layout</p>
                            </div>
                        </div>

                        <!-- STEP 2: Summary Zone -->
                        <div id="convert-config-zone" class="hidden max-w-lg mx-auto text-left animate-fade-in">
                            <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-6">
                                <h4 class="font-extrabold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">Conversion Details</h4>

                                <div class="space-y-3 text-xs text-slate-600">
                                    <div>
                                        <span class="block text-slate-400 font-medium text-[10px] uppercase">File Name</span>
                                        <strong id="convert-filename" class="text-slate-900 font-bold block truncate">Document.pdf</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Conversion Tool</span>
                                        <strong class="text-purple-600 font-bold uppercase">${toolType}</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Total Pages</span>
                                        <strong id="convert-total-pages" class="text-slate-900">0 pages</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Price</span>
                                        <strong class="text-emerald-600">FREE</strong>
                                    </div>
                                </div>

                                <button id="btn-convert-pay" class="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                    Convert Document & Download
                                </button>
                            </div>
                        </div>

                        <!-- STEP 3: Success Download Zone -->
                        <div id="convert-success-zone" class="hidden max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
                            <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                            </div>
                            <h3 class="text-2xl font-black text-slate-900 mb-1">Conversion Completed!</h3>
                            <p class="text-slate-500 text-xs mb-6">Your converted file is ready for download.</p>
                            
                            <a id="btn-download-converted" href="#" class="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 mb-4">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Download Converted Document
                            </a>

                            <button id="btn-convert-another" class="text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors">Convert Another Document</button>
                        </div>
                    `}

                </div>
            </main>

            <!-- PAYMENT MODAL (removed - free tool) -->
            <div id="convert-payment-modal" class="fixed inset-0 z-50 hidden" style="display:none!important">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" id="convert-modal-backdrop"></div>
                <div class="absolute inset-0 flex items-center justify-center p-4">
                    <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800">
                        <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-800" id="convert-modal-close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>

                        <div class="text-center mb-6">
                            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-700/10 flex items-center justify-center mx-auto mb-3 text-purple-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-extrabold text-lg">M-Pesa Payment</h3>
                            <p class="text-slate-500 text-xs mt-1">Convert PDF Tool · <span id="convert-modal-amount" class="font-bold text-slate-800">KES 0</span></p>
                        </div>

                        <!-- Step 1: Phone input -->
                        <div id="convert-step-phone">
                            <label class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Enter Phone Number</label>
                            <input type="tel" id="convert-phone-input" placeholder="0712345678" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-center text-xl font-bold tracking-widest focus:border-purple-500 focus:outline-none mb-4" maxlength="13">
                            <button id="btn-convert-stk-submit" class="w-full py-3.5 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-purple-500/10">
                                Initiate M-Pesa Payment
                            </button>
                        </div>

                        <!-- Step 2: Waiting -->
                        <div id="convert-step-waiting" class="hidden text-center py-6">
                            <div class="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p class="text-slate-800 font-bold mb-1">Sending STK Push Prompt...</p>
                            <p class="text-slate-500 text-xs">Please check your phone and enter your M-Pesa PIN to complete payment.</p>
                        </div>

                        <!-- Step 3: Failed -->
                        <div id="convert-step-failed" class="hidden text-center py-4">
                            <div class="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200 text-red-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </div>
                            <p class="text-slate-800 font-bold text-base mb-1">Payment Failed</p>
                            <p id="convert-failed-msg" class="text-slate-500 text-xs mb-5"></p>
                            <button id="btn-convert-retry" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Retry Payment</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (isHub) return; // Hub view complete

        // ─── CONVERT WORKSPACE LOGIC ─────────────────────────────
        let currentConvertState = {
            documentId: null,
            originalName: '',
            totalPages: 0,
            totalCost: 0,
            conversionType: toolType,
            paymentPollingInterval: null,
        };

        const fileInput = document.getElementById('convert-file-input');
        const uploadZone = document.getElementById('convert-upload-zone');
        const uploadLoading = document.getElementById('convert-upload-loading');
        const configZone = document.getElementById('convert-config-zone');
        const successZone = document.getElementById('convert-success-zone');

        const paymentModal = document.getElementById('convert-payment-modal');
        const btnPay = document.getElementById('btn-convert-pay');
        const btnStkSubmit = document.getElementById('btn-convert-stk-submit');

        const handleConvertFileUpload = async (file) => {
            if (!file) return;

            uploadLoading.classList.remove('hidden');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('conversion_type', toolType);

            try {
                const resp = await fetch(`${config.baseUrl}/api/tool/convert/upload`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': config.csrfToken },
                    body: formData,
                });

                let result = {};
                try { result = await resp.json(); } catch(e) {}

                uploadLoading.classList.add('hidden');

                if (resp.ok && result.success) {
                    currentConvertState.documentId = result.document_id;
                    currentConvertState.originalName = result.original_name;
                    currentConvertState.totalPages = result.page_count;
                    currentConvertState.totalCost = result.cost;

                    renderConvertConfigState();
                } else {
                    alert(result.error || 'Failed to upload document for conversion.');
                }
            } catch (e) {
                uploadLoading.classList.add('hidden');
                alert('Upload request failed: ' + e.message);
            }
        };

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleConvertFileUpload(e.target.files[0]);
            }
        });

        // Drag & Drop
        const dropArea = document.getElementById('convert-drop-area');
        ['dragenter', 'dragover'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.add('border-purple-500', 'bg-purple-50/20');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.remove('border-purple-500', 'bg-purple-50/20');
            });
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                handleConvertFileUpload(e.dataTransfer.files[0]);
            }
        });

        const renderConvertConfigState = () => {
            if (uploadZone) uploadZone.classList.add('hidden');
            if (configZone) configZone.classList.remove('hidden');

            const elFilename = document.getElementById('convert-filename');
            if (elFilename) elFilename.textContent = currentConvertState.originalName;

            const elTotalPages = document.getElementById('convert-total-pages');
            if (elTotalPages) elTotalPages.textContent = `${currentConvertState.totalPages} pages`;

            const elTotalCost = document.getElementById('convert-total-cost');
            if (elTotalCost) elTotalCost.textContent = `KES ${currentConvertState.totalCost}`;

            const elModalAmount = document.getElementById('convert-modal-amount');
            if (elModalAmount) elModalAmount.textContent = `KES ${currentConvertState.totalCost}`;
        };

        // Free tool - directly process on click
        btnPay.addEventListener('click', () => {
            executeConvertProcess();
        });

        const executeConvertProcess = async () => {
            try {
                const resp = await fetch(`${config.baseUrl}/api/tool/convert/process/${currentConvertState.documentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                });
                const result = await resp.json();

                paymentModal.classList.add('hidden');

                if (result.success && result.download_url) {
                    configZone.classList.add('hidden');
                    successZone.classList.remove('hidden');
                    document.getElementById('btn-download-converted').href = result.download_url;
                } else {
                    alert(result.error || 'Failed to convert document.');
                }
            } catch (e) {
                paymentModal.classList.add('hidden');
                alert('Error processing conversion. Please try again.');
            }
        };

        document.getElementById('btn-convert-another').addEventListener('click', () => {
            currentConvertState = { documentId: null, originalName: '', totalPages: 0, totalCost: 0, conversionType: toolType, paymentPollingInterval: null };
            successZone.classList.add('hidden');
            uploadZone.classList.remove('hidden');
        });
    }

    // ─── VIEW 8: ORGANIZE PDF SUITE (Remove, Extract, Organize, Scan) ──────
    renderOrganizeTool(toolType = 'organize-pdf') {
        const toolsMap = {
            'remove-pages': {
                title: 'Remove PDF Pages',
                desc: 'Select and delete unwanted pages from your PDF document.',
                mode: 'remove',
                accept: '.pdf',
                label: 'Select PDF file',
                icon: '❌'
            },
            'extract-pages': {
                title: 'Extract PDF Pages',
                desc: 'Extract specific pages from your PDF into a new PDF document.',
                mode: 'extract',
                accept: '.pdf',
                label: 'Select PDF file',
                icon: '📤'
            },
            'organize-pdf': {
                title: 'Organize PDF Pages',
                desc: 'Sort, reorder, and rotate pages in your PDF document.',
                mode: 'organize',
                accept: '.pdf',
                label: 'Select PDF file',
                icon: '🗂️'
            },
            'scan-to-pdf': {
                title: 'Scan to PDF',
                desc: 'Convert photos, receipts, and scanned images into a PDF document.',
                mode: 'scan',
                accept: '.jpg,.jpeg,.png,.webp',
                label: 'Select scanned images',
                icon: '📷'
            }
        };

        const activeTool = toolsMap[toolType] || toolsMap['organize-pdf'];

        this.appEl.innerHTML = `
            ${this.getNavbarHtml(toolType)}

            <!-- Main Content Container -->
            <main class="min-h-screen pt-28 pb-20 bg-slate-50 flex flex-col justify-center">
                <div class="max-w-4xl mx-auto px-6 w-full text-center">
                    
                    <!-- Header Title -->
                    <div class="mb-10 animate-fade-in">
                        <a href="#/tool/all-pdf-tools" class="inline-flex items-center gap-1.5 text-xs text-purple-600 font-bold hover:underline mb-4">
                            ← Back to all PDF tools
                        </a>
                        <div class="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 border border-purple-100 shadow-sm text-2xl">
                            ${activeTool.icon}
                        </div>
                        <h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">${activeTool.title}</h1>
                        <p class="text-slate-500 text-base max-w-xl mx-auto">${activeTool.desc} KES 1 per page via M-Pesa.</p>
                    </div>

                    <!-- STEP 1: Upload Zone -->
                    <div id="org-upload-zone" class="max-w-xl mx-auto">
                        <label id="org-drop-area" class="group relative block cursor-pointer">
                            <div class="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-3xl p-12 transition-all duration-300 bg-white hover:bg-purple-50/20 shadow-sm hover:shadow-xl">
                                <div class="flex flex-col items-center gap-4">
                                    <div class="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-purple-600">
                                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"/></svg>
                                    </div>
                                    <div>
                                        <p class="text-slate-800 font-bold text-xl mb-1">${activeTool.label}</p>
                                        <p class="text-slate-500 text-sm">or drop files here · Up to 100MB</p>
                                    </div>
                                </div>
                                <input type="file" id="org-file-input" class="hidden" accept="${activeTool.accept}" ${toolType === 'scan-to-pdf' ? 'multiple' : ''}>
                            </div>
                        </label>

                        <!-- Upload loading indicator -->
                        <div id="org-upload-loading" class="hidden mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg text-center">
                            <div class="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p class="text-slate-800 font-bold text-sm">Uploading and preparing pages...</p>
                        </div>
                    </div>

                    <!-- STEP 2: Configure Zone -->
                    <div id="org-config-zone" class="hidden max-w-3xl mx-auto text-left animate-fade-in">
                        <div class="grid md:grid-cols-3 gap-6 items-start">
                            
                            <!-- Left: Page Selection / Reorder Panel -->
                            <div class="md:col-span-2 space-y-4">
                                <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <h3 id="org-filename" class="font-bold text-slate-800 text-sm truncate">Document.pdf</h3>
                                        <span id="org-total-pages" class="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg flex-shrink-0">0 pages</span>
                                    </div>

                                    ${(toolType === 'remove-pages' || toolType === 'extract-pages') ? `
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                                ${toolType === 'remove-pages' ? 'Enter Page Numbers to Remove:' : 'Enter Page Numbers to Extract:'}
                                            </label>
                                            <input type="text" id="org-pages-input" placeholder="e.g. 1, 3, 5-8" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-bold focus:border-purple-500 focus:outline-none mb-2">
                                            <p class="text-xs text-slate-400">Separate page numbers with commas or specify ranges (e.g., 1, 3, 5-8).</p>
                                        </div>
                                    ` : ''}

                                    ${(toolType === 'organize-pdf' || toolType === 'scan-to-pdf') ? `
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                                Page Order & Orientation:
                                            </label>
                                            <p class="text-xs text-slate-400 mb-3">Re-order pages by clicking UP/DOWN or rotate pages.</p>
                                            <div id="org-items-list" class="space-y-2">
                                                <!-- Dynamic items list -->
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>

                            <!-- Right: Order Summary -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 sticky top-28">
                                <h4 class="font-extrabold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">Order Summary</h4>

                                <div class="space-y-2.5 text-xs text-slate-600">
                                    <div class="flex justify-between">
                                        <span>Total Pages</span>
                                        <strong id="org-summary-pages" class="text-slate-900">0 pages</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Price</span>
                                        <strong class="text-emerald-600">FREE</strong>
                                    </div>
                                </div>

                                <button id="btn-org-pay" class="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                    Process & Download
                                </button>
                            </div>

                        </div>
                    </div>

                    <!-- STEP 3: Success Download Zone -->
                    <div id="org-success-zone" class="hidden max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
                        <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 mb-1">Document Ready!</h3>
                        <p class="text-slate-500 text-xs mb-6">Your organized PDF document has been generated and is ready for download.</p>
                        
                        <a id="btn-download-org" href="#" class="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mb-4">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Download PDF File
                        </a>

                        <button id="btn-org-another" class="text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors">Process Another Document</button>
                    </div>

                </div>
            </main>

            <!-- PAYMENT MODAL (removed - free tool) -->
            <div id="org-payment-modal" class="fixed inset-0 z-50 hidden" style="display:none!important">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" id="org-modal-backdrop"></div>
                <div class="absolute inset-0 flex items-center justify-center p-4">
                    <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800">
                        <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-800" id="org-modal-close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>

                        <div class="text-center mb-6">
                            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-700/10 flex items-center justify-center mx-auto mb-3 text-purple-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-extrabold text-lg">M-Pesa Payment</h3>
                            <p class="text-slate-500 text-xs mt-1">${activeTool.title} · <span id="org-modal-amount" class="font-bold text-slate-800">KES 0</span></p>
                        </div>

                        <!-- Step 1: Phone input -->
                        <div id="org-step-phone">
                            <label class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Enter Phone Number</label>
                            <input type="tel" id="org-phone-input" placeholder="0712345678" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-center text-xl font-bold tracking-widest focus:border-purple-500 focus:outline-none mb-4" maxlength="13">
                            <button id="btn-org-stk-submit" class="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-purple-500/10">
                                Initiate M-Pesa Payment
                            </button>
                        </div>

                        <!-- Step 2: Waiting -->
                        <div id="org-step-waiting" class="hidden text-center py-6">
                            <div class="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p class="text-slate-800 font-bold mb-1">Sending STK Push Prompt...</p>
                            <p class="text-slate-500 text-xs">Please check your phone and enter your M-Pesa PIN to complete payment.</p>
                        </div>

                        <!-- Step 3: Failed -->
                        <div id="org-step-failed" class="hidden text-center py-4">
                            <div class="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200 text-red-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </div>
                            <p class="text-slate-800 font-bold text-base mb-1">Payment Failed</p>
                            <p id="org-failed-msg" class="text-slate-500 text-xs mb-5"></p>
                            <button id="btn-org-retry" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Retry Payment</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Controller State
        let state = {
            documentId: null,
            originalName: '',
            totalPages: 0,
            totalCost: 0,
            pageOperations: [],
            paymentPollingInterval: null
        };

        const fileInput = document.getElementById('org-file-input');
        const uploadZone = document.getElementById('org-upload-zone');
        const uploadLoading = document.getElementById('org-upload-loading');
        const configZone = document.getElementById('org-config-zone');
        const successZone = document.getElementById('org-success-zone');

        const paymentModal = document.getElementById('org-payment-modal');
        const btnPay = document.getElementById('btn-org-pay');
        const btnStkSubmit = document.getElementById('btn-org-stk-submit');

        const handleFileUpload = async (files) => {
            if (!files || files.length === 0) return;

            uploadLoading.classList.remove('hidden');

            const formData = new FormData();
            formData.append('tool_type', toolType);

            if (toolType === 'scan-to-pdf') {
                for (let i = 0; i < files.length; i++) {
                    formData.append('files[]', files[i]);
                }
            } else {
                formData.append('file', files[0]);
            }

            try {
                const resp = await fetch(`${config.baseUrl}/api/tool/organize/upload`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': config.csrfToken },
                    body: formData,
                });
                let result = {};
                try { result = await resp.json(); } catch(e) {}

                uploadLoading.classList.add('hidden');

                if (resp.ok && result.success) {
                    state.documentId = result.document_id;
                    state.originalName = result.original_name;
                    state.totalPages = result.total_pages || result.page_count;
                    state.totalCost = result.cost;

                    // Initialize page operations array for reordering / rotating
                    state.pageOperations = [];
                    for (let p = 1; p <= state.totalPages; p++) {
                        state.pageOperations.push({ page: p, rotate: 0 });
                    }

                    renderConfigState();
                } else {
                    alert(result.error || 'Failed to upload document.');
                }
            } catch (e) {
                uploadLoading.classList.add('hidden');
                alert('Upload request failed: ' + e.message);
            }
        };

        fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files));

        const dropArea = document.getElementById('org-drop-area');
        ['dragenter', 'dragover'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.add('border-purple-500', 'bg-purple-50/20');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.remove('border-purple-500', 'bg-purple-50/20');
            });
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files);
            }
        });

        const renderConfigState = () => {
            if (uploadZone) uploadZone.classList.add('hidden');
            if (configZone) configZone.classList.remove('hidden');

            const elFilename = document.getElementById('org-filename');
            if (elFilename) elFilename.textContent = state.originalName;

            const elTotalPages = document.getElementById('org-total-pages');
            if (elTotalPages) elTotalPages.textContent = `${state.totalPages} pages`;

            const elSummaryPages = document.getElementById('org-summary-pages');
            if (elSummaryPages) elSummaryPages.textContent = `${state.totalPages} pages`;

            const elTotalCost = document.getElementById('org-total-cost');
            if (elTotalCost) elTotalCost.textContent = `KES ${state.totalCost}`;

            const elModalAmount = document.getElementById('org-modal-amount');
            if (elModalAmount) elModalAmount.textContent = `KES ${state.totalCost}`;

            if (toolType === 'organize-pdf' || toolType === 'scan-to-pdf') {
                renderItemsList();
            }
        };

        const renderItemsList = () => {
            const listEl = document.getElementById('org-items-list');
            if (!listEl) return;
            listEl.innerHTML = '';

            state.pageOperations.forEach((op, idx) => {
                const card = document.createElement('div');
                card.className = 'flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl';
                card.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">${idx + 1}</span>
                        <span class="text-xs font-bold text-slate-800">Page ${op.page}</span>
                        <span class="text-[10px] text-slate-400 font-medium">Rotation: ${op.rotate}°</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button data-action="rotate" data-index="${idx}" class="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-slate-200/60 rounded-lg transition-colors text-xs font-bold" title="Rotate 90°">🔄 Rotate</button>
                        <button data-action="up" data-index="${idx}" class="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}">⬆️</button>
                        <button data-action="down" data-index="${idx}" class="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors ${idx === state.pageOperations.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}">⬇️</button>
                    </div>
                `;
                listEl.appendChild(card);
            });

            listEl.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    const index = parseInt(e.currentTarget.dataset.index);

                    if (action === 'rotate') {
                        state.pageOperations[index].rotate = (state.pageOperations[index].rotate + 90) % 360;
                        renderItemsList();
                    } else if (action === 'up' && index > 0) {
                        const temp = state.pageOperations[index];
                        state.pageOperations[index] = state.pageOperations[index - 1];
                        state.pageOperations[index - 1] = temp;
                        renderItemsList();
                    } else if (action === 'down' && index < state.pageOperations.length - 1) {
                        const temp = state.pageOperations[index];
                        state.pageOperations[index] = state.pageOperations[index + 1];
                        state.pageOperations[index + 1] = temp;
                        renderItemsList();
                    }
                });
            });
        };

        // Free tool - directly process on click
        btnPay.addEventListener('click', () => {
            executeProcess();
        });

        const parsePageInput = (str) => {
            if (!str) return [];
            const result = new Set();
            const parts = str.split(',');
            parts.forEach(part => {
                const trimmed = part.trim();
                if (trimmed.includes('-')) {
                    const range = trimmed.split('-').map(n => parseInt(n.trim()));
                    if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
                        for (let p = Math.min(range[0], range[1]); p <= Math.max(range[0], range[1]); p++) {
                            result.add(p);
                        }
                    }
                } else {
                    const page = parseInt(trimmed);
                    if (!isNaN(page)) result.add(page);
                }
            });
            return Array.from(result);
        };

        const executeProcess = async () => {
            try {
                let bodyData = { mode: activeTool.mode };

                if (activeTool.mode === 'remove' || activeTool.mode === 'extract') {
                    const rawInput = document.getElementById('org-pages-input')?.value || '';
                    const pages = parsePageInput(rawInput);
                    if (pages.length === 0) {
                        alert('Please specify valid page numbers (e.g. 1, 3, 5-8).');
                        paymentModal.classList.add('hidden');
                        return;
                    }
                    bodyData.pages = pages;
                } else if (activeTool.mode === 'organize') {
                    bodyData.operations = state.pageOperations;
                }

                const resp = await fetch(`${config.baseUrl}/api/tool/organize/process/${state.documentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: JSON.stringify(bodyData),
                });
                const result = await resp.json();

                paymentModal.classList.add('hidden');

                if (result.success && result.download_url) {
                    configZone.classList.add('hidden');
                    successZone.classList.remove('hidden');
                    document.getElementById('btn-download-org').href = result.download_url;
                } else {
                    alert(result.error || 'Failed to process document.');
                }
            } catch (e) {
                paymentModal.classList.add('hidden');
                alert('Error processing document. Please try again.');
            }
        };

        document.getElementById('btn-org-another').addEventListener('click', () => {
            state = { documentId: null, originalName: '', totalPages: 0, totalCost: 0, pageOperations: [], paymentPollingInterval: null };
            successZone.classList.add('hidden');
            uploadZone.classList.remove('hidden');
        });
    }

    // ─── VIEW 9: OPTIMIZE PDF SUITE (Repair PDF, OCR PDF) ─────────────────
    renderOptimizeTool(toolType = 'repair-pdf') {
        const toolsMap = {
            'repair-pdf': {
                title: 'Repair PDF',
                desc: 'Fix corrupted, damaged, or unreadable PDF documents.',
                endpoint: 'repair',
                accept: '.pdf,.doc,.docx',
                label: 'Select corrupted PDF file',
                icon: '🛠️'
            },
            'ocr-pdf': {
                title: 'OCR PDF',
                desc: 'Recognize text in scanned PDFs and make documents searchable.',
                endpoint: 'ocr',
                accept: '.pdf,.jpg,.jpeg,.png',
                label: 'Select scanned PDF file',
                icon: '🔍'
            }
        };

        const activeTool = toolsMap[toolType] || toolsMap['repair-pdf'];

        this.appEl.innerHTML = `
            ${this.getNavbarHtml(toolType)}

            <!-- Main Content Container -->
            <main class="min-h-screen pt-28 pb-20 bg-slate-50 flex flex-col justify-center">
                <div class="max-w-4xl mx-auto px-6 w-full text-center">
                    
                    <!-- Header Title -->
                    <div class="mb-10 animate-fade-in">
                        <a href="#/tool/all-pdf-tools" class="inline-flex items-center gap-1.5 text-xs text-green-600 font-bold hover:underline mb-4">
                            ← Back to all PDF tools
                        </a>
                        <div class="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4 border border-green-100 shadow-sm text-2xl">
                            ${activeTool.icon}
                        </div>
                        <h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">${activeTool.title}</h1>
                        <p class="text-slate-500 text-base max-w-xl mx-auto">${activeTool.desc} KES 1 per page via M-Pesa.</p>
                    </div>

                    <!-- STEP 1: Upload Zone -->
                    <div id="opt-upload-zone" class="max-w-xl mx-auto">
                        <label id="opt-drop-area" class="group relative block cursor-pointer">
                            <div class="border-2 border-dashed border-slate-300 hover:border-green-500 rounded-3xl p-12 transition-all duration-300 bg-white hover:bg-green-50/20 shadow-sm hover:shadow-xl">
                                <div class="flex flex-col items-center gap-4">
                                    <div class="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-green-600">
                                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"/></svg>
                                    </div>
                                    <div>
                                        <p class="text-slate-800 font-bold text-xl mb-1">${activeTool.label}</p>
                                        <p class="text-slate-500 text-sm">or drop file here · Up to 100MB</p>
                                    </div>
                                </div>
                                <input type="file" id="opt-file-input" class="hidden" accept="${activeTool.accept}">
                            </div>
                        </label>

                        <!-- Upload loading indicator -->
                        <div id="opt-upload-loading" class="hidden mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg text-center">
                            <div class="w-10 h-10 border-3 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p class="text-slate-800 font-bold text-sm">Analyzing document structure...</p>
                        </div>
                    </div>

                    <!-- STEP 2: Configure Zone -->
                    <div id="opt-config-zone" class="hidden max-w-2xl mx-auto text-left animate-fade-in">
                        <div class="grid md:grid-cols-3 gap-6 items-start">
                            
                            <!-- Left Details Panel -->
                            <div class="md:col-span-2 space-y-4">
                                <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <h3 id="opt-filename" class="font-bold text-slate-800 text-sm truncate">Document.pdf</h3>
                                        <span id="opt-total-pages" class="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg flex-shrink-0">0 pages</span>
                                    </div>

                                    ${toolType === 'ocr-pdf' ? `
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">OCR Document Language:</label>
                                            <select id="opt-ocr-lang" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-bold focus:border-green-500 focus:outline-none">
                                                <option value="eng">English</option>
                                                <option value="swa">Swahili</option>
                                                <option value="fra">French</option>
                                                <option value="spa">Spanish</option>
                                                <option value="deu">German</option>
                                            </select>
                                        </div>
                                    ` : `
                                        <div class="bg-green-50/50 border border-green-100 rounded-xl p-4 text-xs text-green-900 space-y-1">
                                            <strong class="font-bold block">✓ Structural Analysis Complete</strong>
                                            <p class="text-slate-600">Rebuilding cross-reference tables, standardizing stream objects, and repairing corrupted font maps.</p>
                                        </div>
                                    `}
                                </div>
                            </div>

                            <!-- Right: Order Summary -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 sticky top-28">
                                <h4 class="font-extrabold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">Order Summary</h4>

                                <div class="space-y-2.5 text-xs text-slate-600">
                                    <div class="flex justify-between">
                                        <span>Total Pages</span>
                                        <strong id="opt-summary-pages" class="text-slate-900">0 pages</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Price</span>
                                        <strong class="text-emerald-600">FREE</strong>
                                    </div>
                                </div>

                                <button id="btn-opt-pay" class="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-green-500/25 flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                    Process & Download
                                </button>
                            </div>

                        </div>
                    </div>

                    <!-- STEP 3: Success Download Zone -->
                    <div id="opt-success-zone" class="hidden max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
                        <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 mb-1">Optimization Complete!</h3>
                        <p class="text-slate-500 text-xs mb-6">Your optimized PDF document has been successfully processed and is ready for download.</p>
                        
                        <a id="btn-download-opt" href="#" class="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mb-4">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Download Optimized PDF
                        </a>

                        <button id="btn-opt-another" class="text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors">Process Another Document</button>
                    </div>

                </div>
            </main>

            <!-- PAYMENT MODAL (removed - free tool) -->
            <div id="opt-payment-modal" class="fixed inset-0 z-50 hidden" style="display:none!important">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" id="opt-modal-backdrop"></div>
                <div class="absolute inset-0 flex items-center justify-center p-4">
                    <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800">
                        <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-800" id="opt-modal-close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>

                        <div class="text-center mb-6">
                            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-700/10 flex items-center justify-center mx-auto mb-3 text-green-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-extrabold text-lg">M-Pesa Payment</h3>
                            <p class="text-slate-500 text-xs mt-1">${activeTool.title} · <span id="opt-modal-amount" class="font-bold text-slate-800">KES 0</span></p>
                        </div>

                        <!-- Step 1: Phone input -->
                        <div id="opt-step-phone">
                            <label class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Enter Phone Number</label>
                            <input type="tel" id="opt-phone-input" placeholder="0712345678" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-center text-xl font-bold tracking-widest focus:border-green-500 focus:outline-none mb-4" maxlength="13">
                            <button id="btn-opt-stk-submit" class="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-green-500/10">
                                Initiate M-Pesa Payment
                            </button>
                        </div>

                        <!-- Step 2: Waiting -->
                        <div id="opt-step-waiting" class="hidden text-center py-6">
                            <div class="w-12 h-12 border-3 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p class="text-slate-800 font-bold mb-1">Sending STK Push Prompt...</p>
                            <p class="text-slate-500 text-xs">Please check your phone and enter your M-Pesa PIN to complete payment.</p>
                        </div>

                        <!-- Step 3: Failed -->
                        <div id="opt-step-failed" class="hidden text-center py-4">
                            <div class="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200 text-red-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </div>
                            <p class="text-slate-800 font-bold text-base mb-1">Payment Failed</p>
                            <p id="opt-failed-msg" class="text-slate-500 text-xs mb-5"></p>
                            <button id="btn-opt-retry" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Retry Payment</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Controller State
        let state = {
            documentId: null,
            originalName: '',
            totalPages: 0,
            totalCost: 0,
            paymentPollingInterval: null
        };

        const fileInput = document.getElementById('opt-file-input');
        const uploadZone = document.getElementById('opt-upload-zone');
        const uploadLoading = document.getElementById('opt-upload-loading');
        const configZone = document.getElementById('opt-config-zone');
        const successZone = document.getElementById('opt-success-zone');

        const paymentModal = document.getElementById('opt-payment-modal');
        const btnPay = document.getElementById('btn-opt-pay');
        const btnStkSubmit = document.getElementById('btn-opt-stk-submit');

        const handleFileUpload = async (file) => {
            if (!file) return;

            uploadLoading.classList.remove('hidden');

            const formData = new FormData();
            formData.append('tool_type', toolType);
            formData.append('file', file);

            try {
                const resp = await fetch(`${config.baseUrl}/api/tool/optimize/upload`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': config.csrfToken },
                    body: formData,
                });
                let result = {};
                try { result = await resp.json(); } catch(e) {}

                uploadLoading.classList.add('hidden');

                if (resp.ok && result.success) {
                    state.documentId = result.document_id;
                    state.originalName = result.original_name;
                    state.totalPages = result.page_count;
                    state.totalCost = result.cost;

                    renderConfigState();
                } else {
                    alert(result.error || 'Failed to upload document.');
                }
            } catch (e) {
                uploadLoading.classList.add('hidden');
                alert('Upload request failed: ' + e.message);
            }
        };

        fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));

        const dropArea = document.getElementById('opt-drop-area');
        ['dragenter', 'dragover'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.add('border-green-500', 'bg-green-50/20');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.remove('border-green-500', 'bg-green-50/20');
            });
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        const renderConfigState = () => {
            if (uploadZone) uploadZone.classList.add('hidden');
            if (configZone) configZone.classList.remove('hidden');

            const elFilename = document.getElementById('opt-filename');
            if (elFilename) elFilename.textContent = state.originalName;

            const elTotalPages = document.getElementById('opt-total-pages');
            if (elTotalPages) elTotalPages.textContent = `${state.totalPages} pages`;

            const elSummaryPages = document.getElementById('opt-summary-pages');
            if (elSummaryPages) elSummaryPages.textContent = `${state.totalPages} pages`;

            const elTotalCost = document.getElementById('opt-total-cost');
            if (elTotalCost) elTotalCost.textContent = `KES ${state.totalCost}`;

            const elModalAmount = document.getElementById('opt-modal-amount');
            if (elModalAmount) elModalAmount.textContent = `KES ${state.totalCost}`;
        };

        // Free tool - directly process on click
        btnPay.addEventListener('click', () => {
            executeProcess();
        });

        const executeProcess = async () => {
            try {
                let bodyData = {};
                if (toolType === 'ocr-pdf') {
                    bodyData.language = document.getElementById('opt-ocr-lang')?.value || 'eng';
                }

                const resp = await fetch(`${config.baseUrl}/api/tool/optimize/process/${state.documentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: JSON.stringify(bodyData),
                });
                const result = await resp.json();

                paymentModal.classList.add('hidden');

                if (result.success && result.download_url) {
                    configZone.classList.add('hidden');
                    successZone.classList.remove('hidden');
                    document.getElementById('btn-download-opt').href = result.download_url;
                } else {
                    alert(result.error || 'Failed to process document optimization.');
                }
            } catch (e) {
                paymentModal.classList.add('hidden');
                alert('Error optimizing document. Please try again.');
            }
        };

        document.getElementById('btn-opt-another').addEventListener('click', () => {
            state = { documentId: null, originalName: '', totalPages: 0, totalCost: 0, paymentPollingInterval: null };
            successZone.classList.add('hidden');
            uploadZone.classList.remove('hidden');
        });
    }

    // ─── VIEW 10: EDIT PDF SUITE (Rotate, Page Numbers, Watermark, Crop, Edit, Forms) ───
    renderEditTool(toolType = 'rotate-pdf') {
        const toolsMap = {
            'rotate-pdf': {
                title: 'Rotate PDF',
                desc: 'Rotate PDF pages 90, 180, or 270 degrees clockwise.',
                accept: '.pdf,.doc,.docx',
                label: 'Select PDF file to rotate',
                icon: '🔄'
            },
            'add-page-numbers': {
                title: 'Add Page Numbers',
                desc: 'Add page numbers to your PDF with custom position and font styling.',
                accept: '.pdf,.doc,.docx',
                label: 'Select PDF file',
                icon: '🔢'
            },
            'add-watermark': {
                title: 'Add Watermark',
                desc: 'Stamp text watermarks (e.g. CONFIDENTIAL) on every page of your PDF.',
                accept: '.pdf,.doc,.docx',
                label: 'Select PDF file',
                icon: '💧'
            },
            'crop-pdf': {
                title: 'Crop PDF',
                desc: 'Trim page margins and adjust bounding box of your PDF file.',
                accept: '.pdf,.doc,.docx',
                label: 'Select PDF file to crop',
                icon: '✂️'
            },
            'edit-pdf': {
                title: 'Edit PDF',
                desc: 'Add text annotations, comments, and overlays directly on PDF pages.',
                accept: '.pdf,.doc,.docx',
                label: 'Select PDF file to edit',
                icon: '✏️'
            },
            'pdf-forms': {
                title: 'PDF Forms',
                desc: 'Fill interactive PDF forms and sign digital form fields.',
                accept: '.pdf',
                label: 'Select PDF form file',
                icon: '📝'
            }
        };

        const activeTool = toolsMap[toolType] || toolsMap['rotate-pdf'];

        this.appEl.innerHTML = `
            ${this.getNavbarHtml(toolType)}

            <!-- Main Content Container -->
            <main class="min-h-screen pt-28 pb-20 bg-slate-50 flex flex-col justify-center">
                <div class="max-w-4xl mx-auto px-6 w-full text-center">
                    
                    <!-- Header Title -->
                    <div class="mb-10 animate-fade-in">
                        <a href="#/tool/all-pdf-tools" class="inline-flex items-center gap-1.5 text-xs text-purple-600 font-bold hover:underline mb-4">
                            ← Back to all PDF tools
                        </a>
                        <div class="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 border border-purple-100 shadow-sm text-2xl">
                            ${activeTool.icon}
                        </div>
                        <h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">${activeTool.title}</h1>
                        <p class="text-slate-500 text-base max-w-xl mx-auto">${activeTool.desc} KES 1 per page via M-Pesa.</p>
                    </div>

                    <!-- STEP 1: Upload Zone -->
                    <div id="edit-upload-zone" class="max-w-xl mx-auto">
                        <label id="edit-drop-area" class="group relative block cursor-pointer">
                            <div class="border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-3xl p-12 transition-all duration-300 bg-white hover:bg-purple-50/20 shadow-sm hover:shadow-xl">
                                <div class="flex flex-col items-center gap-4">
                                    <div class="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-purple-600">
                                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"/></svg>
                                    </div>
                                    <div>
                                        <p class="text-slate-800 font-bold text-xl mb-1">${activeTool.label}</p>
                                        <p class="text-slate-500 text-sm">or drop file here · Up to 100MB</p>
                                    </div>
                                </div>
                                <input type="file" id="edit-file-input" class="hidden" accept="${activeTool.accept}">
                            </div>
                        </label>

                        <!-- Upload loading indicator -->
                        <div id="edit-upload-loading" class="hidden mt-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-lg text-center">
                            <div class="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p class="text-slate-800 font-bold text-sm">Preparing document for editing...</p>
                        </div>
                    </div>

                    <!-- STEP 2: Configure Zone -->
                    <div id="edit-config-zone" class="hidden max-w-2xl mx-auto text-left animate-fade-in">
                        <div class="grid md:grid-cols-3 gap-6 items-start">
                            
                            <!-- Left Controls & Live Preview Panel -->
                            <div class="md:col-span-2 space-y-4">
                                
                                <!-- Live Document Preview Window -->
                                <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div class="flex items-center gap-2">
                                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Live Document Preview</span>
                                        </div>
                                        <div class="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                            <button id="btn-edit-prev-page" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-bold disabled:opacity-30">←</button>
                                            <span id="edit-page-indicator">Page 1 of 1</span>
                                            <button id="btn-edit-next-page" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-bold disabled:opacity-30">→</button>
                                        </div>
                                    </div>

                                    <!-- Canvas & Live Overlays Container -->
                                    <div class="relative min-h-[320px] max-h-[500px] overflow-hidden bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-center p-4">
                                        <!-- Loading spinner for preview -->
                                        <div id="edit-preview-loading" class="flex flex-col items-center gap-2 text-slate-400">
                                            <div class="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span class="text-xs font-semibold">Loading live preview...</span>
                                        </div>

                                        <div id="edit-preview-wrapper" class="relative max-w-full hidden transition-transform duration-300">
                                            <canvas id="edit-preview-canvas" class="rounded shadow-md max-w-full max-h-[440px] block border border-slate-200 bg-white"></canvas>

                                            <!-- Live Overlay Layer -->
                                            <div id="edit-preview-overlay" class="absolute inset-0 pointer-events-none overflow-hidden rounded">
                                                <!-- Dynamic live overlays generated via JS -->
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Tool Options Panel -->
                                <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <h3 id="edit-filename" class="font-bold text-slate-800 text-sm truncate">Document.pdf</h3>
                                        <span id="edit-total-pages" class="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg flex-shrink-0">0 pages</span>
                                    </div>

                                    ${toolType === 'rotate-pdf' ? `
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Rotation Angle:</label>
                                            <div class="grid grid-cols-3 gap-3">
                                                <button data-angle="90" class="btn-rotate-opt py-3 px-4 bg-purple-50 border-2 border-purple-600 text-purple-700 font-bold text-xs rounded-xl hover:bg-purple-100 transition-all text-center">90° Right</button>
                                                <button data-angle="180" class="btn-rotate-opt py-3 px-4 bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-all text-center">180° Flip</button>
                                                <button data-angle="270" class="btn-rotate-opt py-3 px-4 bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-all text-center">90° Left</button>
                                            </div>
                                        </div>
                                    ` : ''}

                                    ${toolType === 'add-watermark' ? `
                                        <div class="space-y-3">
                                            <div>
                                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Watermark Text:</label>
                                                <input type="text" id="edit-watermark-text" value="CONFIDENTIAL" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-bold focus:border-purple-500 focus:outline-none">
                                            </div>
                                            <div class="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Rotation Angle:</label>
                                                    <select id="edit-watermark-rotation" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold">
                                                        <option value="45" selected>45° Diagonal</option>
                                                        <option value="0">0° Horizontal</option>
                                                        <option value="90">90° Vertical</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Opacity:</label>
                                                    <select id="edit-watermark-opacity" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold">
                                                        <option value="0.3" selected>30% Faded</option>
                                                        <option value="0.5">50% Medium</option>
                                                        <option value="0.8">80% Dark</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ` : ''}

                                    ${toolType === 'add-page-numbers' ? `
                                        <div class="space-y-3">
                                            <div>
                                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Position on Page:</label>
                                                <select id="edit-pn-position" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-bold">
                                                    <option value="bottom-center" selected>Bottom Center</option>
                                                    <option value="top-right">Top Right</option>
                                                    <option value="bottom-right">Bottom Right</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Starting Page Number:</label>
                                                <input type="number" id="edit-pn-start" value="1" min="1" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold">
                                            </div>
                                        </div>
                                    ` : ''}

                                    ${toolType === 'crop-pdf' ? `
                                        <div class="space-y-3">
                                            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Crop Margins (mm):</label>
                                            <div class="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <label class="text-slate-500 font-semibold block mb-1">Top Margin:</label>
                                                    <input type="number" id="edit-crop-top" value="10" min="0" max="100" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold">
                                                </div>
                                                <div>
                                                    <label class="text-slate-500 font-semibold block mb-1">Bottom Margin:</label>
                                                    <input type="number" id="edit-crop-bottom" value="10" min="0" max="100" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold">
                                                </div>
                                                <div>
                                                    <label class="text-slate-500 font-semibold block mb-1">Left Margin:</label>
                                                    <input type="number" id="edit-crop-left" value="10" min="0" max="100" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold">
                                                </div>
                                                <div>
                                                    <label class="text-slate-500 font-semibold block mb-1">Right Margin:</label>
                                                    <input type="number" id="edit-crop-right" value="10" min="0" max="100" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold">
                                                </div>
                                            </div>
                                        </div>
                                    ` : ''}

                                    ${(toolType === 'edit-pdf' || toolType === 'pdf-forms') ? `
                                        <div class="space-y-3">
                                            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Add Text Annotation / Note:</label>
                                            <input type="text" id="edit-annotation-text" placeholder="Type text to overlay on document..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-bold focus:border-purple-500 focus:outline-none">
                                        </div>
                                    ` : ''}

                                </div>
                            </div>

                            <!-- Right: Order Summary -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-5 sticky top-28">
                                <h4 class="font-extrabold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">Order Summary</h4>

                                <div class="space-y-2.5 text-xs text-slate-600">
                                    <div class="flex justify-between">
                                        <span>Total Pages</span>
                                        <strong id="edit-summary-pages" class="text-slate-900">0 pages</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Price</span>
                                        <strong class="text-emerald-600">FREE</strong>
                                    </div>
                                </div>

                                <button id="btn-edit-pay" class="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                    Process & Download
                                </button>
                            </div>

                        </div>
                    </div>

                    <!-- STEP 3: Success Download Zone -->
                    <div id="edit-success-zone" class="hidden max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
                        <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 mb-1">Document Edited!</h3>
                        <p class="text-slate-500 text-xs mb-6">Your edited PDF document has been successfully generated and is ready for download.</p>
                        
                        <a id="btn-download-edit" href="#" class="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mb-4">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            Download Edited PDF
                        </a>

                        <button id="btn-edit-another" class="text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors">Process Another Document</button>
                    </div>

                </div>
            </main>

            <!-- PAYMENT MODAL (removed - free tool) -->
            <div id="edit-payment-modal" class="fixed inset-0 z-50 hidden" style="display:none!important">
                <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" id="edit-modal-backdrop"></div>
                <div class="absolute inset-0 flex items-center justify-center p-4">
                    <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-800">
                        <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-800" id="edit-modal-close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>

                        <div class="text-center mb-6">
                            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-700/10 flex items-center justify-center mx-auto mb-3 text-purple-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            </div>
                            <h3 class="text-slate-900 font-extrabold text-lg">M-Pesa Payment</h3>
                            <p class="text-slate-500 text-xs mt-1">${activeTool.title} · <span id="edit-modal-amount" class="font-bold text-slate-800">KES 0</span></p>
                        </div>

                        <!-- Step 1: Phone input -->
                        <div id="edit-step-phone">
                            <label class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">Enter Phone Number</label>
                            <input type="tel" id="edit-phone-input" placeholder="0712345678" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-center text-xl font-bold tracking-widest focus:border-purple-500 focus:outline-none mb-4" maxlength="13">
                            <button id="btn-edit-stk-submit" class="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-purple-500/10">
                                Initiate M-Pesa Payment
                            </button>
                        </div>

                        <!-- Step 2: Waiting -->
                        <div id="edit-step-waiting" class="hidden text-center py-6">
                            <div class="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p class="text-slate-800 font-bold mb-1">Sending STK Push Prompt...</p>
                            <p class="text-slate-500 text-xs">Please check your phone and enter your M-Pesa PIN to complete payment.</p>
                        </div>

                        <!-- Step 3: Failed -->
                        <div id="edit-step-failed" class="hidden text-center py-4">
                            <div class="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200 text-red-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </div>
                            <p class="text-slate-800 font-bold text-base mb-1">Payment Failed</p>
                            <p id="edit-failed-msg" class="text-slate-500 text-xs mb-5"></p>
                            <button id="btn-edit-retry" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Retry Payment</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Controller State
        let state = {
            documentId: null,
            originalName: '',
            totalPages: 0,
            totalCost: 0,
            selectedRotation: 90,
            paymentPollingInterval: null
        };

        const fileInput = document.getElementById('edit-file-input');
        const uploadZone = document.getElementById('edit-upload-zone');
        const uploadLoading = document.getElementById('edit-upload-loading');
        const configZone = document.getElementById('edit-config-zone');
        const successZone = document.getElementById('edit-success-zone');

        const paymentModal = document.getElementById('edit-payment-modal');
        const btnPay = document.getElementById('btn-edit-pay');
        const btnStkSubmit = document.getElementById('btn-edit-stk-submit');

        const handleFileUpload = async (file) => {
            if (!file) return;

            uploadLoading.classList.remove('hidden');

            const formData = new FormData();
            formData.append('tool_type', toolType);
            formData.append('file', file);

            try {
                const resp = await fetch(`${config.baseUrl}/api/tool/edit/upload`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': config.csrfToken },
                    body: formData,
                });
                let result = {};
                try { result = await resp.json(); } catch(e) {}

                uploadLoading.classList.add('hidden');

                if (resp.ok && result.success) {
                    state.documentId = result.document_id;
                    state.originalName = result.original_name;
                    state.totalPages = result.page_count;
                    state.totalCost = result.cost;

                    renderConfigState();
                } else {
                    alert(result.error || 'Failed to upload document.');
                }
            } catch (e) {
                uploadLoading.classList.add('hidden');
                alert('Upload request failed: ' + e.message);
            }
        };

        fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));

        const dropArea = document.getElementById('edit-drop-area');
        ['dragenter', 'dragover'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.add('border-purple-500', 'bg-purple-50/20');
            });
        });
        ['dragleave', 'drop'].forEach(evt => {
            dropArea.addEventListener(evt, (e) => {
                e.preventDefault();
                dropArea.firstElementChild.classList.remove('border-purple-500', 'bg-purple-50/20');
            });
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        let previewPdfDoc = null;
        let previewCurrentPage = 1;

        const renderConfigState = async () => {
            if (uploadZone) uploadZone.classList.add('hidden');
            if (configZone) configZone.classList.remove('hidden');

            const elFilename = document.getElementById('edit-filename');
            if (elFilename) elFilename.textContent = state.originalName;

            const elTotalPages = document.getElementById('edit-total-pages');
            if (elTotalPages) elTotalPages.textContent = `${state.totalPages} pages`;

            const elSummaryPages = document.getElementById('edit-summary-pages');
            if (elSummaryPages) elSummaryPages.textContent = `${state.totalPages} pages`;

            const elTotalCost = document.getElementById('edit-total-cost');
            if (elTotalCost) elTotalCost.textContent = `KES ${state.totalCost}`;

            const elModalAmount = document.getElementById('edit-modal-amount');
            if (elModalAmount) elModalAmount.textContent = `KES ${state.totalCost}`;

            // Rotation button toggles
            document.querySelectorAll('.btn-rotate-opt').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.btn-rotate-opt').forEach(b => {
                        b.classList.remove('border-2', 'border-purple-600', 'bg-purple-50', 'text-purple-700');
                        b.classList.add('border', 'border-slate-200', 'bg-slate-50', 'text-slate-700');
                    });
                    e.currentTarget.classList.add('border-2', 'border-purple-600', 'bg-purple-50', 'text-purple-700');
                    state.selectedRotation = parseInt(e.currentTarget.dataset.angle);
                    updateLiveOverlay();
                });
            });

            // Live Input Listeners for Watermark, Page Numbers, Crop, Annotations
            ['edit-watermark-text', 'edit-watermark-rotation', 'edit-watermark-opacity',
             'edit-pn-position', 'edit-pn-start', 'edit-crop-top', 'edit-crop-bottom',
             'edit-crop-left', 'edit-crop-right', 'edit-annotation-text'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('input', () => updateLiveOverlay());
                    el.addEventListener('change', () => updateLiveOverlay());
                }
            });

            // Load Preview PDF via PDF.js
            try {
                const previewLoading = document.getElementById('edit-preview-loading');
                const previewWrapper = document.getElementById('edit-preview-wrapper');
                
                const previewUrl = `${config.baseUrl}/preview/${state.documentId}`;
                previewPdfDoc = await pdfjsLib.getDocument(previewUrl).promise;

                if (previewLoading) previewLoading.classList.add('hidden');
                if (previewWrapper) previewWrapper.classList.remove('hidden');

                renderPreviewPage(1);
            } catch (e) {
                console.warn('Live preview canvas error:', e);
                const previewLoading = document.getElementById('edit-preview-loading');
                if (previewLoading) previewLoading.innerHTML = `<span class="text-xs text-slate-400 font-bold">Document Ready (Preview Unavailable)</span>`;
            }
        };

        const renderPreviewPage = async (pageNo) => {
            if (!previewPdfDoc) return;
            previewCurrentPage = Math.max(1, Math.min(previewPdfDoc.numPages, pageNo));

            const pageIndicator = document.getElementById('edit-page-indicator');
            if (pageIndicator) pageIndicator.textContent = `Page ${previewCurrentPage} of ${previewPdfDoc.numPages}`;

            const btnPrev = document.getElementById('btn-edit-prev-page');
            const btnNext = document.getElementById('btn-edit-next-page');
            if (btnPrev) btnPrev.disabled = (previewCurrentPage === 1);
            if (btnNext) btnNext.disabled = (previewCurrentPage === previewPdfDoc.numPages);

            const page = await previewPdfDoc.getPage(previewCurrentPage);
            const canvas = document.getElementById('edit-preview-canvas');
            if (!canvas) return;

            const viewport = page.getViewport({ scale: 0.8 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const context = canvas.getContext('2d');
            await page.render({ canvasContext: context, viewport: viewport }).promise;

            updateLiveOverlay();
        };

        document.getElementById('btn-edit-prev-page')?.addEventListener('click', () => {
            if (previewCurrentPage > 1) renderPreviewPage(previewCurrentPage - 1);
        });
        document.getElementById('btn-edit-next-page')?.addEventListener('click', () => {
            if (previewPdfDoc && previewCurrentPage < previewPdfDoc.numPages) renderPreviewPage(previewCurrentPage + 1);
        });

        const updateLiveOverlay = () => {
            const wrapper = document.getElementById('edit-preview-wrapper');
            const overlay = document.getElementById('edit-preview-overlay');
            if (!wrapper || !overlay) return;

            overlay.innerHTML = '';

            if (toolType === 'rotate-pdf') {
                wrapper.style.transform = `rotate(${state.selectedRotation}deg)`;
            } else {
                wrapper.style.transform = 'none';
            }

            if (toolType === 'add-watermark') {
                const text = document.getElementById('edit-watermark-text')?.value || 'CONFIDENTIAL';
                const rotation = document.getElementById('edit-watermark-rotation')?.value || '45';
                const opacity = document.getElementById('edit-watermark-opacity')?.value || '0.3';

                const wmEl = document.createElement('div');
                wmEl.className = 'absolute inset-0 flex items-center justify-center font-black text-slate-800 text-3xl uppercase tracking-widest pointer-events-none select-none';
                wmEl.style.transform = `rotate(${rotation}deg)`;
                wmEl.style.opacity = opacity;
                wmEl.textContent = text;
                overlay.appendChild(wmEl);
            }

            if (toolType === 'add-page-numbers') {
                const pos = document.getElementById('edit-pn-position')?.value || 'bottom-center';
                const start = parseInt(document.getElementById('edit-pn-start')?.value || '1');
                const displayNum = start + (previewCurrentPage - 1);

                const pnEl = document.createElement('div');
                pnEl.className = 'absolute px-2 py-0.5 bg-slate-900/80 text-white font-mono text-[10px] font-bold rounded shadow pointer-events-none';

                if (pos === 'top-right') {
                    pnEl.style.top = '12px';
                    pnEl.style.right = '12px';
                } else if (pos === 'bottom-right') {
                    pnEl.style.bottom = '12px';
                    pnEl.style.right = '12px';
                } else {
                    // bottom-center
                    pnEl.style.bottom = '12px';
                    pnEl.style.left = '50%';
                    pnEl.style.transform = 'translateX(-50%)';
                }

                pnEl.textContent = `Page ${displayNum} of ${state.totalPages}`;
                overlay.appendChild(pnEl);
            }

            if (toolType === 'crop-pdf') {
                const top = parseFloat(document.getElementById('edit-crop-top')?.value || '10');
                const bottom = parseFloat(document.getElementById('edit-crop-bottom')?.value || '10');
                const left = parseFloat(document.getElementById('edit-crop-left')?.value || '10');
                const right = parseFloat(document.getElementById('edit-crop-right')?.value || '10');

                const cropBox = document.createElement('div');
                cropBox.className = 'absolute border-2 border-dashed border-red-500 bg-red-500/10 pointer-events-none';
                cropBox.style.top = `${top}px`;
                cropBox.style.bottom = `${bottom}px`;
                cropBox.style.left = `${left}px`;
                cropBox.style.right = `${right}px`;
                overlay.appendChild(cropBox);
            }

            if (toolType === 'edit-pdf' || toolType === 'pdf-forms') {
                const note = document.getElementById('edit-annotation-text')?.value || '';
                if (note) {
                    const noteEl = document.createElement('div');
                    noteEl.className = 'absolute top-6 left-6 px-3 py-1.5 bg-purple-600 text-white font-bold text-xs rounded-lg shadow-lg pointer-events-none';
                    noteEl.textContent = note;
                    overlay.appendChild(noteEl);
                }
            }
        };

        // Free tool - directly process on click
        btnPay.addEventListener('click', () => {
            executeProcess();
        });

        const executeProcess = async () => {
            try {
                let bodyData = {};

                if (toolType === 'rotate-pdf') {
                    bodyData.rotation = state.selectedRotation;
                } else if (toolType === 'add-watermark') {
                    bodyData.watermark_text = document.getElementById('edit-watermark-text')?.value || 'CONFIDENTIAL';
                    bodyData.rotation = parseInt(document.getElementById('edit-watermark-rotation')?.value || '45');
                    bodyData.opacity = parseFloat(document.getElementById('edit-watermark-opacity')?.value || '0.3');
                } else if (toolType === 'add-page-numbers') {
                    bodyData.position = document.getElementById('edit-pn-position')?.value || 'bottom-center';
                    bodyData.start_number = parseInt(document.getElementById('edit-pn-start')?.value || '1');
                } else if (toolType === 'crop-pdf') {
                    bodyData.margin_top = parseFloat(document.getElementById('edit-crop-top')?.value || '10');
                    bodyData.margin_bottom = parseFloat(document.getElementById('edit-crop-bottom')?.value || '10');
                    bodyData.margin_left = parseFloat(document.getElementById('edit-crop-left')?.value || '10');
                    bodyData.margin_right = parseFloat(document.getElementById('edit-crop-right')?.value || '10');
                } else if (toolType === 'edit-pdf' || toolType === 'pdf-forms') {
                    const text = document.getElementById('edit-annotation-text')?.value || '';
                    bodyData.annotations = [{ page: 1, text: text, x: 20, y: 20, size: 12 }];
                }

                const resp = await fetch(`${config.baseUrl}/api/tool/edit/process/${state.documentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: JSON.stringify(bodyData),
                });
                const result = await resp.json();

                paymentModal.classList.add('hidden');

                if (result.success && result.download_url) {
                    configZone.classList.add('hidden');
                    successZone.classList.remove('hidden');
                    document.getElementById('btn-download-edit').href = result.download_url;
                } else {
                    alert(result.error || 'Failed to process document editing.');
                }
            } catch (e) {
                paymentModal.classList.add('hidden');
                alert('Error editing document. Please try again.');
            }
        };

        document.getElementById('btn-edit-another').addEventListener('click', () => {
            state = { documentId: null, originalName: '', totalPages: 0, totalCost: 0, selectedRotation: 90, paymentPollingInterval: null };
            successZone.classList.add('hidden');
            uploadZone.classList.remove('hidden');
        });
    }

    renderSecurityTool(toolType = 'unlock-pdf') {
        const toolsMap = {
            'unlock-pdf': {
                title: 'Unlock PDF',
                desc: 'Remove passwords, encryption, and restrictions from your PDF file.',
                accept: '.pdf',
                label: 'Select PDF file to unlock',
                icon: '🔓'
            },
            'protect-pdf': {
                title: 'Protect PDF',
                desc: 'Encrypt your PDF with a strong password to prevent unauthorized access.',
                accept: '.pdf',
                label: 'Select PDF file to protect',
                icon: '🛡️'
            },
            'sign-pdf': {
                title: 'Sign PDF',
                desc: 'Sign your PDF with a digital signature name or drawn signature.',
                accept: '.pdf',
                label: 'Select PDF file to sign',
                icon: '✍️'
            },
            'redact-pdf': {
                title: 'Redact PDF',
                desc: 'Blackout confidential text and sensitive content from your PDF pages.',
                accept: '.pdf',
                label: 'Select PDF file to redact',
                icon: '🚫'
            },
            'compare-pdf': {
                title: 'Compare PDF',
                desc: 'Compare two PDF documents side-by-side to review changes.',
                accept: '.pdf',
                label: 'Select primary PDF file to compare',
                icon: '⚖️'
            }
        };

        const activeTool = toolsMap[toolType] || toolsMap['unlock-pdf'];

        this.appEl.innerHTML = `
            ${this.getNavbarHtml(toolType)}

            <!-- Main Content Container -->
            <main class="min-h-screen pt-28 pb-20 bg-slate-50 flex flex-col justify-center">
                <div class="max-w-4xl mx-auto px-6 w-full text-center">
                    
                    <!-- Header Title -->
                    <div class="mb-10 animate-fade-in">
                        <a href="#/tool/all-pdf-tools" class="inline-flex items-center gap-1.5 text-xs text-purple-600 font-bold hover:underline mb-4">
                            ← Back to all PDF tools
                        </a>
                        <div class="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100 shadow-sm text-2xl">
                            ${activeTool.icon}
                        </div>
                        <h1 class="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                            ${activeTool.title}
                        </h1>
                        <p class="text-slate-500 text-base max-w-xl mx-auto">
                            ${activeTool.desc}
                        </p>
                    </div>

                    <!-- STEP 1: Upload Zone -->
                    <div id="sec-upload-zone" class="bg-white border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-3xl p-10 md:p-14 shadow-xl hover:shadow-2xl transition-all cursor-pointer relative group max-w-2xl mx-auto" id="sec-drop-area">
                        <input type="file" id="sec-file-input" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="${activeTool.accept}">
                        
                        <div class="space-y-4 pointer-events-none">
                            <div class="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
                            </div>
                            <div>
                                <span class="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/25 transition-all">
                                    ${activeTool.label}
                                </span>
                            </div>
                            <p class="text-xs text-slate-400">or drop PDF file here</p>
                        </div>
                    </div>

                    <!-- Loading Spinner -->
                    <div id="sec-upload-loading" class="hidden py-12 text-center">
                        <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p class="text-slate-600 font-bold text-sm">Uploading and analyzing document...</p>
                    </div>

                    <!-- STEP 2: Configure Security Options -->
                    <div id="sec-config-zone" class="hidden animate-fade-in text-left">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            
                            <!-- Left: Interactive PDF Preview Canvas -->
                            <div class="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-4">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                        Interactive Document Preview
                                    </h4>
                                    <span id="sec-preview-page-indicator" class="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">Page 1</span>
                                </div>

                                <div class="relative bg-slate-100 rounded-xl overflow-hidden min-h-[420px] flex items-center justify-center border border-slate-200">
                                    <canvas id="sec-pdf-canvas" class="max-w-full h-auto shadow-md rounded"></canvas>
                                    <div id="sec-canvas-loader" class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                        <div class="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right: Security Tool Controls & Summary -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6 sticky top-28">
                                <h4 class="font-extrabold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-100 pb-3">${activeTool.title} Settings</h4>

                                <!-- Unlock PDF Controls -->
                                ${toolType === 'unlock-pdf' ? `
                                    <div class="space-y-3">
                                        <label class="block text-xs font-bold text-slate-700">Document Password (if required)</label>
                                        <input type="password" id="sec-unlock-pass" placeholder="Enter password to unlock" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none">
                                        <p class="text-[11px] text-slate-400">If the PDF is password-protected, enter the password above to remove restrictions.</p>
                                    </div>
                                ` : ''}

                                <!-- Protect PDF Controls -->
                                ${toolType === 'protect-pdf' ? `
                                    <div class="space-y-3">
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 mb-1">Set PDF Password</label>
                                            <input type="password" id="sec-protect-pass" placeholder="Enter new password" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none" value="123456">
                                        </div>
                                        <p class="text-[11px] text-slate-400">Recipient will be required to enter this password to open the document.</p>
                                    </div>
                                ` : ''}

                                <!-- Sign PDF Controls -->
                                ${toolType === 'sign-pdf' ? `
                                    <div class="space-y-3">
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 mb-1">Signer Name / Text</label>
                                            <input type="text" id="sec-sign-name" placeholder="John Doe" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none" value="Authorized Signature">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-slate-700 mb-1">Signature Position</label>
                                            <select id="sec-sign-page" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none">
                                                <option value="last">Bottom of Last Page</option>
                                                <option value="1">Bottom of First Page</option>
                                            </select>
                                        </div>
                                    </div>
                                ` : ''}

                                <!-- Redact PDF Controls -->
                                ${toolType === 'redact-pdf' ? `
                                    <div class="space-y-3">
                                        <label class="block text-xs font-bold text-slate-700 mb-1">Redaction Region</label>
                                        <select id="sec-redact-preset" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none">
                                            <option value="header">Top Page Header Area</option>
                                            <option value="footer">Bottom Page Footer Area</option>
                                            <option value="middle">Middle Content Region</option>
                                        </select>
                                        <p class="text-[11px] text-slate-400">Selected confidential area will be permanently blacked out.</p>
                                    </div>
                                ` : ''}

                                <!-- Compare PDF Controls -->
                                ${toolType === 'compare-pdf' ? `
                                    <div class="space-y-3">
                                        <label class="block text-xs font-bold text-slate-700 mb-1">Upload Second PDF to Compare</label>
                                        <input type="file" id="sec-compare-file" accept=".pdf" class="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer">
                                        <p class="text-[11px] text-slate-400">Select another PDF file to compare side-by-side.</p>
                                    </div>
                                ` : ''}

                                <div class="border-t border-slate-150 pt-3 space-y-2 text-xs text-slate-600">
                                    <div class="flex justify-between">
                                        <span>Total Pages</span>
                                        <strong id="sec-summary-pages" class="text-slate-900">0 pages</strong>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Price</span>
                                        <strong class="text-emerald-600">FREE</strong>
                                    </div>
                                </div>

                                <button id="btn-sec-process" class="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                    Process & Download PDF
                                </button>
                            </div>

                        </div>
                    </div>

                    <!-- STEP 3: Success Download Zone -->
                    <div id="sec-success-zone" class="hidden max-w-lg mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl animate-fade-in text-center">
                        <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        <h3 class="text-2xl font-extrabold text-slate-900 mb-2">Processing Complete!</h3>
                        <p class="text-slate-500 text-xs mb-6">Your PDF security task has been processed successfully.</p>
                        
                        <div class="space-y-3">
                            <a id="btn-download-sec" href="#" class="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                Download Processed PDF
                            </a>
                            <button id="btn-sec-another" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors">
                                Process Another Document
                            </button>
                        </div>
                    </div>

                </div>
            </main>
        `;

        // ─── LOCAL STATE ───────────────────────────
        let state = {
            documentId: null,
            originalName: '',
            totalPages: 0,
            previewUrl: '',
            pdfDoc: null,
        };

        const uploadZone = document.getElementById('sec-upload-zone');
        const uploadLoading = document.getElementById('sec-upload-loading');
        const configZone = document.getElementById('sec-config-zone');
        const successZone = document.getElementById('sec-success-zone');
        const fileInput = document.getElementById('sec-file-input');

        const renderPdfPreviewPage = async (pageNumber = 1) => {
            if (!state.pdfDoc) return;
            const loader = document.getElementById('sec-canvas-loader');
            if (loader) loader.classList.remove('hidden');

            try {
                const page = await state.pdfDoc.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 1.2 });

                const canvas = document.getElementById('sec-pdf-canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            } catch (e) {
                console.error('PDF Preview render error', e);
            } finally {
                if (loader) loader.classList.add('hidden');
            }
        };

        const handleFileUpload = async (file) => {
            if (!file) return;

            uploadZone.classList.add('hidden');
            uploadLoading.classList.remove('hidden');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('tool_type', toolType);

            try {
                const resp = await fetch(`${config.baseUrl}/api/tool/security/upload`, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': config.csrfToken },
                    body: formData,
                });
                const result = await resp.json();

                if (!result.success || !result.document_id) {
                    alert(result.error || 'Failed to upload document.');
                    uploadLoading.classList.add('hidden');
                    uploadZone.classList.remove('hidden');
                    return;
                }

                state.documentId = result.document_id;
                state.originalName = result.original_name;
                state.totalPages = result.page_count;
                state.previewUrl = result.preview_url;

                document.getElementById('sec-summary-pages').textContent = `${state.totalPages} pages`;

                uploadLoading.classList.add('hidden');
                configZone.classList.remove('hidden');

                if (typeof pdfjsLib !== 'undefined' && state.previewUrl) {
                    try {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                        state.pdfDoc = await pdfjsLib.getDocument(state.previewUrl).promise;
                        renderPdfPreviewPage(1);
                    } catch (err) {
                        const loader = document.getElementById('sec-canvas-loader');
                        if (loader) loader.classList.add('hidden');
                    }
                }
            } catch (e) {
                uploadLoading.classList.add('hidden');
                uploadZone.classList.remove('hidden');
                alert('Upload request failed: ' + e.message);
            }
        };

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });

        document.getElementById('btn-sec-process').addEventListener('click', async () => {
            const btn = document.getElementById('btn-sec-process');
            btn.disabled = true;
            btn.textContent = 'Processing PDF...';

            try {
                const formData = new FormData();
                formData.append('tool_type', toolType);

                if (toolType === 'unlock-pdf') {
                    formData.append('password', document.getElementById('sec-unlock-pass')?.value || '');
                } else if (toolType === 'protect-pdf') {
                    formData.append('password', document.getElementById('sec-protect-pass')?.value || '123456');
                } else if (toolType === 'sign-pdf') {
                    formData.append('signature[content]', document.getElementById('sec-sign-name')?.value || 'Authorized Signature');
                    formData.append('signature[page]', document.getElementById('sec-sign-page')?.value === '1' ? 1 : state.totalPages);
                } else if (toolType === 'redact-pdf') {
                    const preset = document.getElementById('sec-redact-preset')?.value || 'header';
                    let y = 15;
                    if (preset === 'footer') y = 250;
                    if (preset === 'middle') y = 120;
                    formData.append('redactions[0][page]', 1);
                    formData.append('redactions[0][x]', 20);
                    formData.append('redactions[0][y]', y);
                    formData.append('redactions[0][w]', 170);
                    formData.append('redactions[0][h]', 20);
                } else if (toolType === 'compare-pdf') {
                    const secondFile = document.getElementById('sec-compare-file')?.files[0];
                    if (secondFile) {
                        formData.append('second_file', secondFile);
                    }
                }

                const resp = await fetch(`${config.baseUrl}/api/tool/security/process/${state.documentId}`, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': config.csrfToken },
                    body: formData,
                });
                const result = await resp.json();

                if (result.success && result.download_url) {
                    configZone.classList.add('hidden');
                    successZone.classList.remove('hidden');
                    document.getElementById('btn-download-sec').href = result.download_url;
                } else {
                    alert(result.error || 'Failed to process security action.');
                    btn.disabled = false;
                    btn.textContent = 'Process & Download PDF';
                }
            } catch (e) {
                alert('Error processing PDF: ' + e.message);
                btn.disabled = false;
                btn.textContent = 'Process & Download PDF';
            }
        });

        document.getElementById('btn-sec-another').addEventListener('click', () => {
            state = { documentId: null, originalName: '', totalPages: 0, previewUrl: '', pdfDoc: null };
            successZone.classList.add('hidden');
            uploadZone.classList.remove('hidden');
        });
    }
}

new App();




