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
<nav class="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center font-black text-white text-lg">T</div>
            <div>
                <span class="font-bold text-lg text-slate-900 tracking-tight">Tenth Lining</span>
                <span class="text-[10px] block text-purple-600 -mt-1 tracking-widest uppercase font-semibold">by Bizlyn Systems</span>
            </div>
        </a>
        <div class="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" class="text-slate-600 hover:text-purple-600 transition-colors font-medium">Features</a>
            <a href="#pricing" class="text-slate-600 hover:text-purple-600 transition-colors font-medium">Pricing</a>
            <a href="#how-it-works" class="text-slate-600 hover:text-purple-600 transition-colors font-medium">How It Works</a>
            <a href="/dashboard" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-all duration-200 font-medium">Dashboard</a>
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
    <div class="max-w-lg mx-auto px-6 text-center">
        <h2 class="text-3xl md:text-4xl font-bold mb-4 text-slate-900">Simple <span class="text-purple-600">Pricing</span></h2>
        <p class="text-slate-500 mb-10">No subscriptions. Pay only for what you use.</p>

        <div class="p-8 rounded-3xl bg-white border border-purple-100 shadow-xl shadow-purple-500/5 relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600"></div>
            <div class="text-6xl font-black text-slate-900 mb-2">KES 3</div>
            <div class="text-slate-500 text-sm mb-8 font-semibold">per page</div>

            <div class="space-y-3.5 text-left text-sm mb-8">
                @foreach(['Page numbering', 'Tenth lining', 'PDF compression', 'Live preview', 'M-Pesa payment', 'Instant download'] as $feature)
                <div class="flex items-center gap-3 text-slate-600 font-medium">
                    <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    {{ $feature }}
                </div>
                @endforeach
            </div>

            <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600">
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
