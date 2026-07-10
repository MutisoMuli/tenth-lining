@extends('layouts.app')

@section('title', 'Editor - ' . $document->original_name)

@push('styles')
<style>
    body { overflow: hidden; background-color: #f8fafc; color: #1e293b; }
</style>
@endpush

@section('content')
<div id="editor-app" class="flex flex-col h-screen bg-slate-50">
    
    <!-- TOP BAR - Formatting Dashboard -->
    <header class="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-40 px-6 py-3 flex items-center justify-between gap-6 overflow-x-auto editor-panel">
        
        <!-- Brand / Logo -->
        <div class="flex items-center gap-2.5 flex-shrink-0">
            <a href="/" class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center font-black text-white text-sm">T</div>
                <div>
                    <span class="font-bold text-sm text-slate-800 block leading-tight">Tenth Lining</span>
                    <span class="text-[9px] block text-purple-600 tracking-wider uppercase font-semibold">Bizlyn Systems</span>
                </div>
            </a>
        </div>

        <div class="h-10 w-px bg-slate-200 flex-shrink-0"></div>

        <!-- Controls Container (Flexbox) -->
        @php
            $pn = $document->page_number_settings ?? [];
            $tl = $document->tenth_line_settings ?? [];
        @endphp
        <div class="flex items-center gap-8 flex-1 min-w-[900px]">
            
            <!-- SECTION 1: Tenth Line Settings -->
            <div class="flex items-center gap-4 border-r border-slate-200 pr-6 flex-shrink-0">
                <div class="flex items-center gap-2 border-r border-slate-200 pr-4">
                    <input type="checkbox" id="tl-enabled" {{ !empty($tl['enabled']) ? 'checked' : '' }} onchange="updatePreview()" class="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500">
                    <label for="tl-enabled" class="text-xs uppercase font-bold text-slate-400 tracking-wider cursor-pointer">Tenth Line</label>
                </div>
                
                <!-- Font Family -->
                <div class="flex flex-col">
                    <label class="text-[10px] text-slate-500 mb-0.5 font-medium">Font Family</label>
                    <select id="tl-font" onchange="updatePreview()" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:border-purple-500 focus:outline-none font-semibold">
                        <option value="Helvetica" {{ ($tl['font'] ?? 'Helvetica') === 'Helvetica' ? 'selected' : '' }}>Arial / Helvetica</option>
                        <option value="Times" {{ ($tl['font'] ?? '') === 'Times' ? 'selected' : '' }}>Times New Roman</option>
                        <option value="Courier" {{ ($tl['font'] ?? '') === 'Courier' ? 'selected' : '' }}>Courier</option>
                    </select>
                </div>

                <!-- Font Size -->
                <div class="flex flex-col">
                    <label class="text-[10px] text-slate-500 mb-0.5 font-medium">Font Size</label>
                    <div class="flex items-center">
                        <button onclick="stepDown('tl-size')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-l-lg hover:bg-slate-200 text-xs font-bold text-slate-600">-</button>
                        <input type="number" id="tl-size" value="{{ $tl['font_size'] ?? 12 }}" min="6" max="18" class="stepper-input w-10 text-center border-t border-b border-slate-200 bg-white text-xs font-semibold py-1 focus:outline-none" onchange="updatePreview()">
                        <button onclick="stepUp('tl-size')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-r-lg hover:bg-slate-200 text-xs font-bold text-slate-600">+</button>
                    </div>
                </div>

                <!-- Margin Right -->
                <div class="flex flex-col">
                    <label class="text-[10px] text-slate-500 mb-0.5 font-medium">Margin Right (mm)</label>
                    <div class="flex items-center">
                        <button onclick="stepDown('tl-margin')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-l-lg hover:bg-slate-200 text-xs font-bold text-slate-600">-</button>
                        <input type="number" id="tl-margin" value="{{ $tl['right_margin'] ?? 30 }}" min="5" max="100" class="stepper-input w-10 text-center border-t border-b border-slate-200 bg-white text-xs font-semibold py-1 focus:outline-none" onchange="updatePreview()">
                        <button onclick="stepUp('tl-margin')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-r-lg hover:bg-slate-200 text-xs font-bold text-slate-600">+</button>
                    </div>
                </div>

                <!-- Bold & Color -->
                <div class="flex items-center gap-2 mt-4">
                    <button id="tl-bold" onclick="this.classList.toggle('bg-purple-600'); this.classList.toggle('text-white'); this.classList.toggle('bg-slate-100'); this.classList.toggle('text-slate-700'); updatePreview()" class="w-7 h-7 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center transition-colors {{ !empty($tl['bold']) ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700' }}">B</button>
                    <input type="color" id="tl-color" value="{{ $tl['colour'] ?? '#000000' }}" onchange="updatePreview()" class="w-7 h-7 border border-slate-200 rounded-lg cursor-pointer">
                </div>

                <!-- Hidden / Helper inputs -->
                <input type="hidden" id="tl-offset" value="{{ $tl['top_offset'] ?? 0 }}">
            </div>

            <!-- SECTION 2: Page Number Settings -->
            <div class="flex items-center gap-4 flex-shrink-0">
                <div class="flex items-center gap-2 border-r border-slate-200 pr-4">
                    <input type="checkbox" id="pn-enabled" {{ !empty($pn['enabled']) ? 'checked' : '' }} onchange="updatePreview()" class="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500">
                    <label for="pn-enabled" class="text-xs uppercase font-bold text-slate-400 tracking-wider cursor-pointer">Page Number</label>
                </div>
                
                <!-- Font Family -->
                <div class="flex flex-col">
                    <label class="text-[10px] text-slate-500 mb-0.5 font-medium">Font Family</label>
                    <select id="pn-font" onchange="updatePreview()" class="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:border-purple-500 focus:outline-none font-semibold">
                        <option value="Helvetica" {{ ($pn['font'] ?? 'Helvetica') === 'Helvetica' ? 'selected' : '' }}>Arial / Helvetica</option>
                        <option value="Times" {{ ($pn['font'] ?? '') === 'Times' ? 'selected' : '' }}>Times New Roman</option>
                        <option value="Courier" {{ ($pn['font'] ?? '') === 'Courier' ? 'selected' : '' }}>Courier</option>
                    </select>
                </div>

                <!-- Start Page Number -->
                <div class="flex flex-col">
                    <label class="text-[10px] text-slate-500 mb-0.5 font-medium">Start Page Number</label>
                    <div class="flex items-center">
                        <button onclick="stepDown('pn-start')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-l-lg hover:bg-slate-200 text-xs font-bold text-slate-600">-</button>
                        <input type="number" id="pn-start" value="{{ $pn['starting_number'] ?? 1 }}" min="1" class="stepper-input w-10 text-center border-t border-b border-slate-200 bg-white text-xs font-semibold py-1 focus:outline-none" onchange="updatePreview()">
                        <button onclick="stepUp('pn-start')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-r-lg hover:bg-slate-200 text-xs font-bold text-slate-600">+</button>
                    </div>
                </div>

                <!-- Font Size -->
                <div class="flex flex-col">
                    <label class="text-[10px] text-slate-500 mb-0.5 font-medium">Font Size</label>
                    <div class="flex items-center">
                        <button onclick="stepDown('pn-size')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-l-lg hover:bg-slate-200 text-xs font-bold text-slate-600">-</button>
                        <input type="number" id="pn-size" value="{{ $pn['font_size'] ?? 30 }}" min="6" max="100" class="stepper-input w-10 text-center border-t border-b border-slate-200 bg-white text-xs font-semibold py-1 focus:outline-none" onchange="updatePreview()">
                        <button onclick="stepUp('pn-size')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-r-lg hover:bg-slate-200 text-xs font-bold text-slate-600">+</button>
                    </div>
                </div>

                <!-- Margin Top -->
                <div class="flex flex-col">
                    <label class="text-[10px] text-slate-500 mb-0.5 font-medium">Margin Top (mm)</label>
                    <div class="flex items-center">
                        <button onclick="stepDown('pn-margin-top')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-l-lg hover:bg-slate-200 text-xs font-bold text-slate-600">-</button>
                        <input type="number" id="pn-margin-top" value="{{ $pn['margin_top'] ?? 30 }}" min="5" max="100" class="stepper-input w-10 text-center border-t border-b border-slate-200 bg-white text-xs font-semibold py-1 focus:outline-none" onchange="updatePreview()">
                        <button onclick="stepUp('pn-margin-top')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-r-lg hover:bg-slate-200 text-xs font-bold text-slate-600">+</button>
                    </div>
                </div>

                <!-- Margin Right -->
                <div class="flex flex-col">
                    <label class="text-[10px] text-slate-500 mb-0.5 font-medium">Margin Right (mm)</label>
                    <div class="flex items-center">
                        <button onclick="stepDown('pn-margin-right')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-l-lg hover:bg-slate-200 text-xs font-bold text-slate-600">-</button>
                        <input type="number" id="pn-margin-right" value="{{ $pn['margin_right'] ?? 30 }}" min="5" max="100" class="stepper-input w-10 text-center border-t border-b border-slate-200 bg-white text-xs font-semibold py-1 focus:outline-none" onchange="updatePreview()">
                        <button onclick="stepUp('pn-margin-right')" class="px-2 py-1 bg-slate-100 border border-slate-200 rounded-r-lg hover:bg-slate-200 text-xs font-bold text-slate-600">+</button>
                    </div>
                </div>

                <!-- Bold / Italic / Color -->
                <div class="flex items-center gap-1.5 mt-4">
                    <button id="pn-bold" onclick="this.classList.toggle('bg-purple-600'); this.classList.toggle('text-white'); this.classList.toggle('bg-slate-100'); this.classList.toggle('text-slate-700'); updatePreview()" class="w-7 h-7 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center transition-colors {{ !empty($pn['bold']) ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700' }}">B</button>
                    <button id="pn-italic" onclick="this.classList.toggle('bg-purple-600'); this.classList.toggle('text-white'); this.classList.toggle('bg-slate-100'); this.classList.toggle('text-slate-700'); updatePreview()" class="w-7 h-7 border border-slate-200 rounded-lg text-xs italic flex items-center justify-center transition-colors {{ !empty($pn['italic']) ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700' }}">I</button>
                    <input type="color" id="pn-color" value="{{ $pn['colour'] ?? '#000000' }}" onchange="updatePreview()" class="w-7 h-7 border border-slate-200 rounded-lg cursor-pointer">
                </div>

                <!-- Hidden custom offsets -->
                <input type="hidden" id="pn-custom-x" value="">
                <input type="hidden" id="pn-custom-y" value="">
            </div>
        </div>

        <!-- Zoom & View Mode Switcher -->
        <div class="flex items-center gap-4 flex-shrink-0">
            <div class="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                <button onclick="zoomOut()" class="p-1 text-slate-500 hover:text-slate-800 transition-colors" title="Zoom Out">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                </button>
                <span id="zoom-level" class="text-xs text-slate-600 font-mono min-w-[40px] text-center font-bold">100%</span>
                <button onclick="zoomIn()" class="p-1 text-slate-500 hover:text-slate-800 transition-colors" title="Zoom In">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                </button>
            </div>

            <!-- View Mode Switcher -->
            <div class="flex border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button id="btn-mode-editor" onclick="setViewMode('editor')" class="px-3 py-1.5 flex flex-col items-center justify-center transition-all bg-amber-500 text-slate-900 font-black text-[10px] min-w-[64px] leading-tight">
                    <svg class="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
                    Editor
                </button>
                <button id="btn-mode-preview" onclick="setViewMode('preview')" class="px-3 py-1.5 flex flex-col items-center justify-center transition-all bg-white text-slate-500 hover:text-slate-800 font-black text-[10px] border-l border-slate-150 min-w-[64px] leading-tight">
                    <svg class="w-4 h-4 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Preview
                </button>
            </div>
        </div>


    </header>

    <!-- MAIN AREA (Thumbnails, Preview Canvas, Documents List) -->
    <div class="flex flex-1 overflow-hidden bg-slate-100">

        <!-- Left Sidebar - Thumbnails -->
        <aside class="w-40 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
            <div class="p-3 border-b border-slate-150">
                <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pages Thumbnail</h3>
            </div>
            <div id="thumbnail-list" class="flex-1 overflow-y-auto editor-panel p-3 space-y-3">
                <!-- Thumbnails rendered by JS -->
            </div>
        </aside>

        <!-- Center - PDF Preview Container (White Background Area) -->
        <main class="flex-1 overflow-y-auto editor-panel bg-slate-100 relative" id="pdf-viewport">
            <div class="flex flex-col items-center py-8 px-6 min-h-full" id="pdf-pages-container">
                <!-- PDF pages rendered by JS -->
                <div id="pdf-loading" class="flex items-center gap-3 text-slate-500 py-24">
                    <div class="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    Rendering Document Preview...
                </div>
            </div>
        </main>

        <!-- Right Sidebar - Document Files & Payment Actions -->
        <aside class="w-72 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
            
            <!-- Document List Section -->
            <div class="flex-1 p-4 overflow-y-auto editor-panel">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                        Documents
                    </h3>
                    <a href="/" class="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-600 text-[10px] font-bold rounded-lg border border-purple-100 transition-colors flex items-center gap-1">
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
                            <p class="text-xs font-bold text-slate-800 truncate" title="{{ $document->original_name }}">{{ $document->original_name }}</p>
                            <p class="text-[10px] text-slate-500 font-semibold mt-0.5">{{ number_format($document->file_size / (1024 * 1024), 2) }} MB · {{ $document->page_count }} Pages</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom Invoice & Payment Trigger (Fixed at bottom of sidebar) -->
            <div class="p-4 border-t border-slate-150 bg-slate-50 space-y-3">
                <!-- Page calculation -->
                <div class="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                    <span class="text-slate-500 font-medium">{{ $document->page_count }} Pages × KES 3.00</span>
                    <span class="text-slate-800 font-black text-sm">KES {{ number_format($document->page_count * 3) }}</span>
                </div>

                <!-- Actions -->
                <button onclick="saveSettings()" id="btn-save" class="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm">
                    Save Settings
                </button>

                <!-- Preview Document Button -->
                <button onclick="setViewMode('preview')" id="btn-preview-doc" class="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-900 text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/20 uppercase tracking-wider flex items-center justify-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Preview Document
                </button>

                <button onclick="openPaymentModal()" id="btn-pay" class="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-500/20 uppercase tracking-wider">
                    Pay & Download Document
                </button>
            </div>
        </aside>
    </div>
</div>

<!-- M-Pesa STK Payment Modal -->
<div id="payment-modal" class="fixed inset-0 z-50 hidden">
    <div class="modal-backdrop absolute inset-0" onclick="closePaymentModal()"></div>
    <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in text-slate-800">
            <button onclick="closePaymentModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-800">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>

            <div class="text-center mb-6">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-700/10 flex items-center justify-center mx-auto mb-3">
                    <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                </div>
                <h3 class="text-slate-800 font-bold text-lg">Pay KES {{ number_format($document->page_count * 3) }} via M-Pesa</h3>
                <p class="text-slate-500 text-xs mt-1">Please confirm payment details below</p>
            </div>

            <!-- Phone input step -->
            <div id="payment-step-phone">
                <label class="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-1">M-Pesa Mobile Number</label>
                <input type="tel" id="mpesa-phone" placeholder="0712345678" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-center text-xl font-bold tracking-widest focus:border-purple-500 focus:outline-none mb-4" maxlength="13">
                <button onclick="initiatePayment()" id="btn-initiate" class="w-full py-3.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-green-500/10">
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
                    <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                </div>
                <p class="text-slate-800 font-black text-lg mb-1">Receipt Generated!</p>
                <p class="text-slate-500 text-xs mb-5">Transaction Code: <span id="mpesa-receipt" class="text-purple-600 font-bold uppercase tracking-wider"></span></p>
                <button onclick="exportAndDownload()" id="btn-download" class="w-full py-3.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20">
                    Download Formatted PDF
                </button>
            </div>

            <!-- Failed step -->
            <div id="payment-step-failed" class="hidden text-center py-4">
                <div class="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-200">
                    <svg class="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </div>
                <p class="text-slate-800 font-bold text-base mb-1">STK Session Failed</p>
                <p id="payment-error-msg" class="text-slate-500 text-xs mb-5"></p>
                <button onclick="resetPaymentModal()" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">Retry Payment</button>
            </div>
        </div>
    </div>
</div>

@push('scripts')
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs" type="module"></script>
<script type="module">
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const DOCUMENT_ID = '{{ $document->id }}';
const PREVIEW_URL = '{{ route("document.preview", $document->id) }}';
const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]').content;
const PAGE_COUNT = {{ $document->page_count }};

let pdfDoc = null;
let currentZoom = 1.0;
let allLineCoordinates = []; // per-page line Y-positions (percentages)
let currentViewMode = 'editor'; // 'editor' or 'preview'

// ─── View Mode Switching ───────────────────────────────
window.setViewMode = function(mode) {
    currentViewMode = mode;
    const editorBtn = document.getElementById('btn-mode-editor');
    const previewBtn = document.getElementById('btn-mode-preview');

    if (mode === 'editor') {
        editorBtn.className = 'px-3 py-1.5 flex flex-col items-center justify-center transition-all bg-amber-500 text-slate-900 font-black text-[10px] min-w-[64px] leading-tight';
        previewBtn.className = 'px-3 py-1.5 flex flex-col items-center justify-center transition-all bg-white text-slate-500 hover:text-slate-800 font-black text-[10px] border-l border-slate-150 min-w-[64px] leading-tight';
    } else {
        previewBtn.className = 'px-3 py-1.5 flex flex-col items-center justify-center transition-all bg-purple-600 text-white font-black text-[10px] min-w-[64px] leading-tight';
        editorBtn.className = 'px-3 py-1.5 flex flex-col items-center justify-center transition-all bg-white text-slate-500 hover:text-slate-800 font-black text-[10px] border-r border-slate-150 min-w-[64px] leading-tight';
    }
    updatePreview();
};

// ─── Load PDF ──────────────────────────────────────────
async function loadPdf() {
    try {
        pdfDoc = await pdfjsLib.getDocument(PREVIEW_URL).promise;
        document.getElementById('pdf-loading').remove();
        renderAllPages();
    } catch (err) {
        document.getElementById('pdf-loading').innerHTML = '<span class="text-red-500 font-bold">Failed to load PDF: ' + err.message + '</span>';
    }
}

async function renderAllPages() {
    const container = document.getElementById('pdf-pages-container');
    const thumbContainer = document.getElementById('thumbnail-list');

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: currentZoom * 1.5 });

        // Main page
        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-page-container';
        wrapper.id = 'page-' + i;
        wrapper.dataset.pageNum = i;

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        wrapper.appendChild(canvas);

        // Overlay div for preview annotations
        const overlay = document.createElement('div');
        overlay.className = 'pdf-overlay';
        overlay.id = 'overlay-' + i;
        wrapper.appendChild(overlay);

        container.appendChild(wrapper);

        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        // Extract text layer for line detection
        const textContent = await page.getTextContent();
        const lines = detectLines(textContent, viewport);
        allLineCoordinates[i - 1] = lines;

        // Thumbnail
        const thumbCanvas = document.createElement('canvas');
        const thumbViewport = page.getViewport({ scale: 0.20 });
        thumbCanvas.width = thumbViewport.width;
        thumbCanvas.height = thumbViewport.height;
        const thumbCtx = thumbCanvas.getContext('2d');
        await page.render({ canvasContext: thumbCtx, viewport: thumbViewport }).promise;

        const thumbItem = document.createElement('div');
        thumbItem.className = 'thumbnail-item cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-500/50 transition-colors bg-white shadow-sm p-0.5';
        thumbItem.onclick = () => document.getElementById('page-' + i).scrollIntoView({ behavior: 'smooth', block: 'center' });
        thumbItem.appendChild(thumbCanvas);

        const thumbLabel = document.createElement('div');
        thumbLabel.className = 'text-center text-[10px] text-slate-500 mt-1 font-bold';
        thumbLabel.textContent = i;
        thumbItem.appendChild(thumbLabel);

        thumbContainer.appendChild(thumbItem);
    }

    updatePreview();
}

// ─── Line Detection ────────────────────────────────────
function detectLines(textContent, viewport) {
    const items = textContent.items.filter(item => item.str.trim().length > 0);
    if (items.length === 0) return [];

    const yMap = new Map();
    const tolerance = 3;

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

    const lineYs = Array.from(yMap.keys()).sort((a, b) => a - b);
    return lineYs.map(y => (y / viewport.height) * 100);
}

// ─── Font Family Helper ────────────────────────────────
function getFontFamily(font) {
    if (font === 'Times') return 'Times New Roman, serif';
    if (font === 'Courier') return 'Courier, monospace';
    return 'Helvetica, Arial, sans-serif';
}

// ─── Update Preview Overlays ───────────────────────────
window.updatePreview = function() {
    const pnEnabled = document.getElementById('pn-enabled').checked;
    const tlEnabled = document.getElementById('tl-enabled').checked;

    const pnSettings = {
        enabled: pnEnabled,
        fontSize: parseInt(document.getElementById('pn-size').value),
        color: document.getElementById('pn-color').value,
        bold: document.getElementById('pn-bold').classList.contains('bg-purple-600'),
        italic: document.getElementById('pn-italic').classList.contains('bg-purple-600'),
        startingNumber: parseInt(document.getElementById('pn-start').value) || 1,
        font: document.getElementById('pn-font').value,
        marginTop: parseInt(document.getElementById('pn-margin-top').value),
        marginRight: parseInt(document.getElementById('pn-margin-right').value),
    };

    const tlSettings = {
        enabled: tlEnabled,
        fontSize: parseInt(document.getElementById('tl-size').value),
        color: document.getElementById('tl-color').value,
        bold: document.getElementById('tl-bold').classList.contains('bg-purple-600'),
        rightMargin: parseInt(document.getElementById('tl-margin').value),
        topOffset: parseFloat(document.getElementById('tl-offset').value),
        font: document.getElementById('tl-font').value,
    };

    for (let i = 0; i < PAGE_COUNT; i++) {
        const overlay = document.getElementById('overlay-' + (i + 1));
        if (!overlay) continue;
        overlay.innerHTML = '';

        const overlayRect = overlay.getBoundingClientRect();
        const overlayW = overlayRect.width || 600;
        const overlayH = overlayRect.height || 800;

        // ── Page number overlay ──
        if (pnSettings.enabled) {
            const numEl = document.createElement('div');
            numEl.className = 'overlay-page-number';
            numEl.textContent = pnSettings.startingNumber + i;
            numEl.style.fontSize = pnSettings.fontSize + 'px';
            numEl.style.color = pnSettings.color;
            numEl.style.fontWeight = pnSettings.bold ? 'bold' : 'normal';
            numEl.style.fontStyle = pnSettings.italic ? 'italic' : 'normal';
            numEl.style.fontFamily = getFontFamily(pnSettings.font);

            // Position using margin percentages (mm mapped to %)
            // We map mm to % of the overlay; approximate A4 = 210x297mm
            const topPercent = (pnSettings.marginTop / 297) * 100;
            const rightPercent = (pnSettings.marginRight / 210) * 100;
            numEl.style.top = topPercent + '%';
            numEl.style.right = rightPercent + '%';

            // Make draggable
            makeDraggable(numEl, 'page-number', overlay);

            overlay.appendChild(numEl);
        }

        // ── Tenth lining overlay ──
        if (allLineCoordinates[i]) {
            const lines = allLineCoordinates[i];
            let lineNumber = 0;

            lines.forEach(yPercent => {
                lineNumber++;
                const isTenth = lineNumber % 10 === 0;

                if (isTenth && tlSettings.enabled) {
                    // Tenth line: horizontal rule + badge
                    const container = document.createElement('div');
                    container.className = 'overlay-tenth-line-container';
                    container.style.top = (yPercent + tlSettings.topOffset) + '%';

                    // The rule stretches from the text area to the right margin
                    // We position it from right side
                    const rightPx = tlSettings.rightMargin;
                    container.style.left = '55%'; // Start roughly after text
                    container.style.right = rightPx + 'px';

                    // Horizontal rule
                    const rule = document.createElement('div');
                    rule.className = 'overlay-tenth-line-rule';
                    rule.style.borderBottomColor = tlSettings.color;
                    container.appendChild(rule);

                    // Badge
                    const badge = document.createElement('div');
                    badge.className = 'overlay-tenth-line-badge';
                    badge.textContent = lineNumber;
                    badge.style.fontSize = tlSettings.fontSize + 'px';
                    badge.style.backgroundColor = tlSettings.color;
                    badge.style.fontWeight = tlSettings.bold ? 'bold' : 'normal';
                    badge.style.fontFamily = getFontFamily(tlSettings.font);

                    // Make badge draggable horizontally for adjusting margin
                    makeDraggable(badge, 'tenth-line', overlay);

                    container.appendChild(badge);
                    overlay.appendChild(container);
                } else if (currentViewMode === 'editor') {
                    // In editor mode: show yellow helper badges for non-tenth lines
                    const helperBadge = document.createElement('div');
                    helperBadge.className = 'overlay-helper-badge';
                    helperBadge.textContent = lineNumber;
                    helperBadge.style.top = (yPercent + (tlSettings.topOffset || 0)) + '%';
                    helperBadge.style.right = (tlSettings.rightMargin || 30) + 'px';
                    overlay.appendChild(helperBadge);
                }
            });
        }
    }
};

// ─── Draggable Elements ────────────────────────────────
function makeDraggable(element, type, overlay) {
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

            if (type === 'page-number') {
                // Move freely in 2D
                const newTop = startTop + dy;
                const newRight = rect.width - (startLeft + dx + elRect.width);

                // Convert px back to mm (approximate A4)
                const topMm = Math.max(5, Math.min(100, Math.round((newTop / rect.height) * 297)));
                const rightMm = Math.max(5, Math.min(100, Math.round((newRight / rect.width) * 210)));

                document.getElementById('pn-margin-top').value = topMm;
                document.getElementById('pn-margin-right').value = rightMm;

                // Update position immediately
                element.style.top = ((topMm / 297) * 100) + '%';
                element.style.right = ((rightMm / 210) * 100) + '%';

            } else if (type === 'tenth-line') {
                // Move only horizontally (adjust right margin)
                const parentContainer = element.parentElement;
                const newRight = rect.width - (startLeft + dx + elRect.width);
                const rightPx = Math.max(5, Math.min(200, Math.round(newRight)));

                document.getElementById('tl-margin').value = rightPx;

                // Update all tenth-line containers
                document.querySelectorAll('.overlay-tenth-line-container').forEach(c => {
                    c.style.right = rightPx + 'px';
                });
                // Also update helper badges
                document.querySelectorAll('.overlay-helper-badge').forEach(b => {
                    b.style.right = rightPx + 'px';
                });
            }
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            // Full re-render after drag ends
            updatePreview();
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

// ─── Stepper Input Helpers ─────────────────────────────
window.stepUp = function(id) {
    const input = document.getElementById(id);
    const max = input.hasAttribute('max') ? parseInt(input.getAttribute('max')) : Infinity;
    const current = parseInt(input.value) || 0;
    if (current < max) {
        input.value = current + 1;
        updatePreview();
    }
};

window.stepDown = function(id) {
    const input = document.getElementById(id);
    const min = input.hasAttribute('min') ? parseInt(input.getAttribute('min')) : -Infinity;
    const current = parseInt(input.value) || 0;
    if (current > min) {
        input.value = current - 1;
        updatePreview();
    }
};

// ─── Zoom Controls ─────────────────────────────────────
window.zoomIn = function() {
    if (currentZoom < 2.5) {
        currentZoom = Math.round((currentZoom + 0.25) * 100) / 100;
        document.getElementById('zoom-level').textContent = Math.round(currentZoom * 100) + '%';
        reRenderPages();
    }
};

window.zoomOut = function() {
    if (currentZoom > 0.5) {
        currentZoom = Math.round((currentZoom - 0.25) * 100) / 100;
        document.getElementById('zoom-level').textContent = Math.round(currentZoom * 100) + '%';
        reRenderPages();
    }
};

async function reRenderPages() {
    const container = document.getElementById('pdf-pages-container');
    const existingPages = container.querySelectorAll('.pdf-page-container');
    existingPages.forEach(p => p.remove());

    const thumbContainer = document.getElementById('thumbnail-list');
    thumbContainer.innerHTML = '';
    allLineCoordinates = [];
    await renderAllPages();
}

// ─── Save Settings ─────────────────────────────────────
window.saveSettings = async function() {
    const btn = document.getElementById('btn-save');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const data = {
        page_number_settings: {
            enabled: document.getElementById('pn-enabled').checked,
            font: document.getElementById('pn-font').value,
            font_size: document.getElementById('pn-size').value,
            colour: document.getElementById('pn-color').value,
            bold: document.getElementById('pn-bold').classList.contains('bg-purple-600'),
            italic: document.getElementById('pn-italic').classList.contains('bg-purple-600'),
            starting_number: document.getElementById('pn-start').value,
            margin_top: document.getElementById('pn-margin-top').value,
            margin_right: document.getElementById('pn-margin-right').value,
            custom_x: document.getElementById('pn-custom-x').value || null,
            custom_y: document.getElementById('pn-custom-y').value || null,
        },
        tenth_line_settings: {
            enabled: document.getElementById('tl-enabled').checked,
            font: document.getElementById('tl-font').value,
            font_size: document.getElementById('tl-size').value,
            colour: document.getElementById('tl-color').value,
            bold: document.getElementById('tl-bold').classList.contains('bg-purple-600'),
            right_margin: document.getElementById('tl-margin').value,
            top_offset: document.getElementById('tl-offset').value,
        },
    };

    try {
        const resp = await fetch('/document/' + DOCUMENT_ID + '/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': CSRF_TOKEN },
            body: JSON.stringify(data),
        });
        const result = await resp.json();
        btn.textContent = result.success ? '✓ Saved' : 'Error';
    } catch (e) {
        btn.textContent = 'Error';
    }

    setTimeout(() => { btn.textContent = 'Save Settings'; btn.disabled = false; }, 2000);
};

// ─── Payment Modal ─────────────────────────────────────
window.openPaymentModal = function() {
    document.getElementById('payment-modal').classList.remove('hidden');
};

window.closePaymentModal = function() {
    document.getElementById('payment-modal').classList.add('hidden');
};

window.resetPaymentModal = function() {
    document.getElementById('payment-step-phone').classList.remove('hidden');
    document.getElementById('payment-step-waiting').classList.add('hidden');
    document.getElementById('payment-step-success').classList.add('hidden');
    document.getElementById('payment-step-failed').classList.add('hidden');
};

window.initiatePayment = async function() {
    const phone = document.getElementById('mpesa-phone').value.trim();
    if (!phone || phone.length < 10) {
        alert('Please enter a valid M-Pesa phone number');
        return;
    }

    document.getElementById('payment-step-phone').classList.add('hidden');
    document.getElementById('payment-step-waiting').classList.remove('hidden');

    try {
        const resp = await fetch('/payment/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': CSRF_TOKEN },
            body: JSON.stringify({ document_id: DOCUMENT_ID, phone: phone }),
        });
        const result = await resp.json();

        if (result.success) {
            pollPaymentStatus(result.checkout_request_id);
        } else {
            showPaymentFailed(result.message || 'Failed to initiate STK push');
        }
    } catch (e) {
        showPaymentFailed('Network request error. Please try again.');
    }
};

async function pollPaymentStatus(checkoutRequestId) {
    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(async () => {
        attempts++;
        try {
            const resp = await fetch('/payment/status/' + checkoutRequestId);
            const result = await resp.json();

            if (result.status === 'completed') {
                clearInterval(interval);
                document.getElementById('mpesa-receipt').textContent = result.mpesa_receipt || '';
                document.getElementById('payment-step-waiting').classList.add('hidden');
                document.getElementById('payment-step-success').classList.remove('hidden');
            } else if (result.status === 'failed') {
                clearInterval(interval);
                showPaymentFailed('Payment transaction declined.');
            }
        } catch (e) { /* continue polling */ }

        if (attempts >= maxAttempts) {
            clearInterval(interval);
            showPaymentFailed('Session timed out. Please try again.');
        }
    }, 2000);
}

function showPaymentFailed(msg) {
    document.getElementById('payment-step-waiting').classList.add('hidden');
    document.getElementById('payment-step-failed').classList.remove('hidden');
    document.getElementById('payment-error-msg').textContent = msg;
}

// ─── Export & Download ─────────────────────────────────
window.exportAndDownload = async function() {
    const btn = document.getElementById('btn-download');
    btn.textContent = 'Formatting PDF...';
    btn.disabled = true;

    try {
        const resp = await fetch('/document/' + DOCUMENT_ID + '/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': CSRF_TOKEN },
            body: JSON.stringify({ line_coordinates: allLineCoordinates }),
        });
        const result = await resp.json();

        if (result.success && result.download_url) {
            window.location.href = result.download_url;
            closePaymentModal();
        } else {
            alert(result.error || 'Failed to process document overlay');
        }
    } catch (e) {
        alert('Network request error. Please try again.');
    }

    btn.textContent = 'Download Formatted PDF';
    btn.disabled = false;
};

// ─── Init ──────────────────────────────────────────────
loadPdf();
</script>
@endpush
@endsection
