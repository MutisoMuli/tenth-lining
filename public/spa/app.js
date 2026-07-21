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
            <nav class="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
                <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <a href="#/" class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center font-black text-white text-lg">T</div>
                        <div>
                            <span class="font-bold text-lg text-slate-900 tracking-tight">Tenth Lining</span>
                            <span class="text-[10px] block text-purple-600 -mt-1 tracking-widest uppercase font-semibold">by Bizlyn Systems</span>
                        </div>
                    </a>
                    <div class="hidden md:flex items-center gap-6 text-sm">
                        <a href="#/" id="nav-features-link" class="text-slate-600 hover:text-purple-600 transition-colors font-medium">Features</a>
                        <a href="#/" id="nav-pricing-link" class="text-slate-600 hover:text-purple-600 transition-colors font-medium">Pricing</a>
                        <a href="#/" id="nav-how-link" class="text-slate-600 hover:text-purple-600 transition-colors font-medium">How It Works</a>
                        <a href="#/dashboard" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-all duration-200 font-medium">Dashboard</a>
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
        document.getElementById('nav-features-link').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
        });
        document.getElementById('nav-pricing-link').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
        });
        document.getElementById('nav-how-link').addEventListener('click', (e) => {
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
                .then(data => {
                    const docs = data.documents || [];
                    // Update IndexedDB cache
                    Promise.all(docs.map(doc => localStore.saveDocument(doc))).then(() => {
                        // Re-render dashboard using fresh API values
                        renderDocsList(docs, false);
                    });
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

                            <!-- Bold, Badge Color & Pointer Line Color -->
                            <div class="flex items-center gap-1 mt-2.5">
                                <button id="tl-bold" class="w-5 h-5 border border-slate-200 rounded text-[10px] font-bold flex items-center justify-center transition-colors bg-slate-100 text-slate-700" title="Bold Badge Text">B</button>
                                <input type="color" id="tl-color" value="#000000" title="Badge Text & Fill Color" class="w-5 h-5 border border-slate-200 rounded cursor-pointer">
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
                                <p class="text-slate-500 text-xs">Please check your phone and enter your M-Pesa PIN to complete payment.</p>
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
                                <p id="payment-failed-msg" class="text-slate-500 text-xs mb-5"></p>
                                <button id="btn-mpesa-retry" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Retry Payment</button>
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
                            badge.style.backgroundColor = tlSettings.color;
                            badge.style.fontWeight = tlSettings.bold ? 'bold' : 'normal';
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
            tlEnabledInput, tlFontSelect, tlSizeInput, tlMarginInput, tlLineLengthInput, tlLineThicknessInput, tlColorInput, tlLineColorInput,
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

        // ─── PAYMENT FLOW CONTROLLER ────────────────────────────
        btnPayAction.addEventListener('click', () => {
            // Reset payment step view
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
                    startPaymentPolling(result.checkout_request_id);
                } else {
                    showPaymentFailed(result.message || 'Failed to initiate STK push.');
                }
            } catch (e) {
                showPaymentFailed('Network error occurred. Please try again.');
            }
        });

        const startPaymentPolling = (checkoutRequestId) => {
            let pollAttempts = 0;
            const maxPollAttempts = 30; // 60 seconds total at 2s interval

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
}

new App();
