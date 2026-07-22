@extends('layouts.app')

@section('title', 'Tenth Lining – Professional Court Document Formatting for Kenyan Advocates')
@section('description', 'Upload your PDF or Word document and automatically apply page numbering and tenth lining per the Kenyan Court of Appeal Rules. Pay securely via M-Pesa.')

@push('styles')
<style>
    body {
        background-color: #f8fafc;
        color: #0f172a;
    }
</style>
@endpush

@section('content')
<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80">
    <div class="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <a href="/" class="flex items-center gap-3">
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
            <div class="relative group py-2">
                <button class="flex items-center gap-1 hover:text-purple-600 transition-colors uppercase font-bold focus:outline-none">
                    CONVERT PDF
                    <svg class="w-3.5 h-3.5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div class="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[480px] hidden group-hover:block hover:block z-50 before:content-[''] before:absolute before:-top-6 before:left-0 before:right-0 before:h-8 before:block">
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

            <!-- ALL PDF TOOLS Mega-Menu Dropdown -->
            <div class="relative group py-2">
                <button class="flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors uppercase font-extrabold focus:outline-none">
                    ALL PDF TOOLS
                    <svg class="w-3.5 h-3.5 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div class="absolute right-0 lg:left-1/2 lg:-translate-x-1/2 top-full pt-3 w-[1240px] max-w-[96vw] hidden group-hover:block hover:block z-50 before:content-[''] before:absolute before:-top-6 before:left-0 before:right-0 before:h-8 before:block">
                    <div class="bg-white border border-slate-200 rounded-3xl shadow-2xl p-7 max-h-[88vh] overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 text-left normal-case">
                        <!-- ORGANIZE PDF -->
                        <div>
                            <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                ORGANIZE PDF
                            </h4>
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
                            <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                OPTIMIZE PDF
                            </h4>
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
                            <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                CONVERT TO PDF
                            </h4>
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
                            <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                CONVERT FROM PDF
                            </h4>
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
                            <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                EDIT PDF
                            </h4>
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
                            <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                PDF SECURITY
                            </h4>
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
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>
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
            <form action="{{ route('document.upload') }}" method="POST" enctype="multipart/form-data" id="upload-form">
                @csrf
                <label for="file-input" class="group relative block cursor-pointer">
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
                        <span id="upload-filename" class="text-sm text-slate-700 truncate flex-1 font-medium"></span>
                        <span class="text-xs text-purple-600 font-semibold">Uploading...</span>
                    </div>
                </div>
            </form>

            @if ($errors->any())
            <div class="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-left">
                @foreach ($errors->all() as $error)
                    <p class="font-medium">• {{ $error }}</p>
                @endforeach
            </div>
            @endif
        </div>
    </div>
</section>

<!-- Features Section -->
<section id="features" class="py-24 relative bg-white border-t border-slate-100">
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
                <h3 class="text-slate-900 font-bold text-lg mb-2">Automatic Page Numbering</h3>
                <p class="text-slate-500 text-sm leading-relaxed">Every page gets a number in the top-right corner. Customize font, size, color, position, bold, and italic.</p>
            </div>

            <!-- Feature 2 -->
            <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                </div>
                <h3 class="text-slate-900 font-bold text-lg mb-2">Tenth Lining</h3>
                <p class="text-slate-500 text-sm leading-relaxed">Every 10th line is automatically numbered (10, 20, 30...) on the right margin, exactly as required by the Court.</p>
            </div>

            <!-- Feature 3 -->
            <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                </div>
                <h3 class="text-slate-900 font-bold text-lg mb-2">M-Pesa Payment</h3>
                <p class="text-slate-500 text-sm leading-relaxed">Pay securely via Safaricom M-Pesa STK Push. KES 3 per page. Instant confirmation and download.</p>
            </div>

            <!-- Feature 4 -->
            <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                </div>
                <h3 class="text-slate-900 font-bold text-lg mb-2">Live Preview</h3>
                <p class="text-slate-500 text-sm leading-relaxed">See exactly how your document will look before you pay. Adjust settings in real-time with instant visual feedback.</p>
            </div>

            <!-- Feature 5 -->
            <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                </div>
                <h3 class="text-slate-900 font-bold text-lg mb-2">PDF Compression</h3>
                <p class="text-slate-500 text-sm leading-relaxed">Automatically compress PDFs to meet the 25MB court filing limit while preserving document quality.</p>
            </div>

            <!-- Feature 6 -->
            <div class="group p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-purple-400 hover:bg-white hover:shadow-lg transition-all duration-300">
                <div class="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <h3 class="text-slate-900 font-bold text-lg mb-2">Word & PDF Support</h3>
                <p class="text-slate-500 text-sm leading-relaxed">Upload PDF, DOC, or DOCX files. Word documents are automatically converted to PDF for processing.</p>
            </div>
        </div>
    </div>
</section>

<!-- How It Works -->
<section id="how-it-works" class="py-24 bg-slate-50 border-y border-slate-100">
    <div class="max-w-4xl mx-auto px-6">
        <div class="text-center mb-16">
            <h2 class="text-3xl md:text-4xl font-bold mb-4 text-slate-900">How It <span class="text-purple-600">Works</span></h2>
            <p class="text-slate-500">Four simple steps to court-ready documents.</p>
        </div>

        <div class="space-y-8">
            @php $steps = [
                ['num' => '01', 'title' => 'Upload Your Document', 'desc' => 'Drag and drop or browse for your PDF, DOC, or DOCX file. We accept files up to 100MB.'],
                ['num' => '02', 'title' => 'Configure Formatting', 'desc' => 'Adjust page numbering position, font, and style. Configure tenth lining with live preview.'],
                ['num' => '03', 'title' => 'Pay via M-Pesa', 'desc' => 'KES 3 per page. Enter your phone number and confirm the STK Push on your phone.'],
                ['num' => '04', 'title' => 'Download', 'desc' => 'Your formatted, court-compliant PDF is ready for download immediately after payment.'],
            ]; @endphp

            @foreach($steps as $step)
            <div class="flex gap-6 items-start group">
                <div class="flex-shrink-0 w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">{{ $step['num'] }}</div>
                <div>
                    <h3 class="text-slate-800 font-bold text-lg mb-1">{{ $step['title'] }}</h3>
                    <p class="text-slate-500 text-sm leading-relaxed">{{ $step['desc'] }}</p>
                </div>
            </div>
            @endforeach
        </div>
    </div>
</section>

<!-- Pricing -->
<section id="pricing" class="py-24 bg-white">
    <div class="max-w-4xl mx-auto px-6 text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Simple, Transparent <span class="text-purple-600">Pricing</span></h2>
        <p class="text-slate-500 mb-12">No subscriptions. Pay securely per page via M-Pesa.</p>

        <div class="grid md:grid-cols-2 gap-8 text-left">
            <!-- Card 1: PDF Tools -->
            <div class="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <div>
                    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-4">
                        All PDF Tools
                    </div>
                    <div class="text-5xl font-black text-emerald-600 mb-1">FREE</div>
                    <p class="text-xs text-slate-500 mb-6 font-medium">100% Free for all PDF tools</p>

                    <div class="space-y-3 text-sm mb-8">
                        @foreach(['Convert PDF (Word, Excel, PPT, JPG, HTML)', 'Merge & Split PDF', 'Compress & Repair PDF', 'Edit, Rotate & Watermark PDF', 'Protect, Unlock & Sign PDF', 'Instant Direct Download'] as $feature)
                        <div class="flex items-center gap-3 text-slate-600 font-medium">
                            <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                            {{ $feature }}
                        </div>
                        @endforeach
                    </div>
                </div>
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 text-center">
                    <span class="text-slate-800 font-bold">Pricing:</span> <span class="text-emerald-600 font-black">Free for all</span>
                </div>
            </div>

            <!-- Card 2: Tenth Lining Court Formatting -->
            <div class="p-8 rounded-3xl bg-white border border-purple-200 shadow-xl shadow-purple-500/5 relative overflow-hidden flex flex-col justify-between">
                <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600"></div>
                <div>
                    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-4">
                        Court Formatting
                    </div>
                    <div class="text-5xl font-black text-slate-900 mb-1">KES 3 <span class="text-lg font-semibold text-slate-500">/ page</span></div>
                    <p class="text-xs text-slate-500 mb-6 font-medium">Kenyan Court of Appeal Rules Compliant</p>

                    <div class="space-y-3 text-sm mb-8">
                        @foreach(['Automatic Tenth Lining (every 10th line)', 'Court Compliant Page Numbering', 'Live Interactive Formatting Editor', 'Badge & Custom Margin Controls', 'PDF Auto Compression (< 25MB)', 'Instant M-Pesa Download'] as $feature)
                        <div class="flex items-center gap-3 text-slate-600 font-medium">
                            <svg class="w-4 h-4 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                            {{ $feature }}
                        </div>
                        @endforeach
                    </div>
                </div>
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 text-center">
                    <span class="text-slate-800 font-bold">Example:</span> 100 pages × KES 3 = <span class="text-purple-600 font-black">KES 300</span>
                </div>
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
        <p class="text-slate-500 text-sm">&copy; {{ date('Y') }} Bizlyn Systems. All rights reserved.</p>
    </div>
</footer>

@push('scripts')
<script>
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    const form = document.getElementById('upload-form');
    const progress = document.getElementById('upload-progress');
    const filenameEl = document.getElementById('upload-filename');
    const dropArea = document.querySelector('#upload-area label');

    // File input change
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            filenameEl.textContent = this.files[0].name;
            progress.classList.remove('hidden');
            form.submit();
        }
    });

    // Drag and drop
    ['dragenter', 'dragover'].forEach(evt => {
        dropArea.addEventListener(evt, function(e) {
            e.preventDefault();
            this.querySelector('div').classList.add('border-purple-400', 'bg-purple-50');
        });
    });

    ['dragleave', 'drop'].forEach(evt => {
        dropArea.addEventListener(evt, function(e) {
            e.preventDefault();
            this.querySelector('div').classList.remove('border-purple-400', 'bg-purple-50');
        });
    });

    dropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            filenameEl.textContent = files[0].name;
            progress.classList.remove('hidden');
            form.submit();
        }
    });
});
</script>
@endpush
@endsection
