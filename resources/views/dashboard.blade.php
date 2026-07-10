@extends('layouts.app')

@section('title', 'Dashboard - Tenth Lining')

@section('content')
<!-- Navigation -->
<nav class="bg-gray-900/80 backdrop-blur-xl border-b border-purple-500/10">
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/" class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center font-black text-white text-lg">T</div>
            <div>
                <span class="font-bold text-lg text-white tracking-tight">Tenth Lining</span>
                <span class="text-[10px] block text-purple-400 -mt-1 tracking-widest uppercase">by Bizlyn Systems</span>
            </div>
        </a>
        <div class="flex items-center gap-4">
            <span class="text-sm text-gray-400">{{ auth()->user()->name }}</span>
            <a href="/" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-all font-medium">New Document</a>
        </div>
    </div>
</nav>

<div class="max-w-6xl mx-auto px-6 py-10">
    <!-- Header -->
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">My Documents</h1>
        <p class="text-gray-400">View and manage your formatted court documents.</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div class="p-5 rounded-2xl bg-gray-900/50 border border-gray-800">
            <div class="text-sm text-gray-400 mb-1">Total Documents</div>
            <div class="text-2xl font-bold text-white">{{ $documents->count() }}</div>
        </div>
        <div class="p-5 rounded-2xl bg-gray-900/50 border border-gray-800">
            <div class="text-sm text-gray-400 mb-1">Completed</div>
            <div class="text-2xl font-bold text-green-400">{{ $documents->where('payment_status', 'paid')->count() }}</div>
        </div>
        <div class="p-5 rounded-2xl bg-gray-900/50 border border-gray-800">
            <div class="text-sm text-gray-400 mb-1">Total Pages</div>
            <div class="text-2xl font-bold text-purple-400">{{ $documents->sum('page_count') }}</div>
        </div>
    </div>

    <!-- Documents Table -->
    @if($documents->isEmpty())
    <div class="text-center py-20">
        <div class="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        </div>
        <p class="text-gray-400 text-lg mb-2">No documents yet</p>
        <p class="text-gray-500 text-sm mb-6">Upload your first document to get started.</p>
        <a href="/" class="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors inline-block">Upload Document</a>
    </div>
    @else
    <div class="overflow-hidden rounded-2xl border border-gray-800">
        <table class="w-full">
            <thead>
                <tr class="bg-gray-900/50 text-left text-xs text-gray-400 uppercase tracking-wider">
                    <th class="px-6 py-4">Document</th>
                    <th class="px-6 py-4">Pages</th>
                    <th class="px-6 py-4">Cost</th>
                    <th class="px-6 py-4">Status</th>
                    <th class="px-6 py-4">Date</th>
                    <th class="px-6 py-4">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
                @foreach($documents as $doc)
                <tr class="hover:bg-gray-900/30 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
                            </div>
                            <span class="text-sm text-white truncate max-w-[200px]" title="{{ $doc->original_name }}">{{ $doc->original_name }}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-300">{{ $doc->page_count }}</td>
                    <td class="px-6 py-4 text-sm text-gray-300">KES {{ $doc->page_count * 3 }}</td>
                    <td class="px-6 py-4">
                        @if($doc->payment_status === 'paid')
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                            Paid
                        </span>
                        @else
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                            Pending
                        </span>
                        @endif
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">{{ $doc->created_at->format('M d, Y') }}</td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                            <a href="{{ route('editor', $doc->id) }}" class="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700">Edit</a>
                            @if($doc->payment_status === 'paid' && $doc->formatted_path)
                            <a href="{{ route('document.download', $doc->id) }}" class="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors">Download</a>
                            @endif
                        </div>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif
</div>

<!-- Footer -->
<footer class="py-8 border-t border-gray-800 mt-10">
    <div class="max-w-6xl mx-auto px-6 text-center">
        <p class="text-gray-600 text-sm">&copy; {{ date('Y') }} Bizlyn Systems. All rights reserved.</p>
    </div>
</footer>
@endsection
