"use client";

import { useState, useEffect } from "react";
import { Upload, FileType, CheckCircle, Loader2, Download, Trash2, X } from "lucide-react";

export default function Home() {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; cssUrl: string; fontId: string; cssContent: string; fontFamily: string; logs?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [savedFonts, setSavedFonts] = useState<Array<{ id: string, fontFamily: string, cssUrl: string, createdAt: string }>>([]);
    const [releaseFonts, setReleaseFonts] = useState<Array<{ id: string, fontFamily: string, cssUrl: string, createdAt: string }>>([]);
    const [previewFontSize, setPreviewFontSize] = useState(24);
    const [previewFontWeight, setPreviewFontWeight] = useState(400);
    const [releaseTargetFont, setReleaseTargetFont] = useState<{ id: string, fontFamily: string } | null>(null);
    const [deleteTargetFont, setDeleteTargetFont] = useState<{ id: string, fontFamily: string, isRelease: boolean } | null>(null);

    useEffect(() => {
        fetchFonts();
    }, []);

    const fetchFonts = async () => {
        try {
            // Fetch Test Fonts
            const testRes = await fetch("/api/fonts?dir=test");
            if (testRes.ok) {
                const data = await testRes.json();
                setSavedFonts(data.fonts || []);
            }
            // Fetch Release Fonts
            const releaseRes = await fetch("/api/fonts?dir=release");
            if (releaseRes.ok) {
                const data = await releaseRes.json();
                setReleaseFonts(data.fonts || []);
            }
        } catch (e) {
            console.error("Failed to fetch fonts", e);
        }
    };

    const deleteFont = (e: React.MouseEvent, fontId: string, fontFamily: string, isRelease: boolean = false) => {
        e.stopPropagation();
        setDeleteTargetFont({ id: fontId, fontFamily, isRelease });
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetFont) return;

        try {
            const apiEndpoint = `/api/fonts/${deleteTargetFont.id}?dir=${deleteTargetFont.isRelease ? 'release' : 'test'}`;
            const res = await fetch(apiEndpoint, { method: 'DELETE' });

            if (res.ok) {
                // Refresh lists
                fetchFonts();

                // If the deleted font was active, clear result
                if (result?.fontId === deleteTargetFont.id) {
                    setResult(null);
                }
            } else {
                alert("Failed to delete font.");
            }
        } catch (e) {
            console.error("Delete failed", e);
        } finally {
            setDeleteTargetFont(null);
        }
    };

    const triggerRelease = (e: React.MouseEvent, font: { id: string, fontFamily: string }) => {
        e.stopPropagation();
        setReleaseTargetFont(font);
    };

    const handleConfirmRelease = async () => {
        if (!releaseTargetFont) return;
        const fontId = releaseTargetFont.id;

        try {
            const res = await fetch("/api/release", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: fontId })
            });

            if (res.ok) {
                alert("Font successfully released!");
                fetchFonts();
            } else {
                alert("Failed to release font.");
            }
        } catch (e) {
            console.error("Release failed", e);
        } finally {
            setReleaseTargetFont(null);
        }
    };

    const loadSavedFont = async (font: { id: string, fontFamily: string, cssUrl: string }) => {
        try {
            const res = await fetch(font.cssUrl);
            const cssText = await res.text();
            setResult({
                success: true,
                fontId: font.id,
                fontFamily: font.fontFamily,
                cssUrl: font.cssUrl,
                cssContent: cssText,
                logs: "Loaded from history."
            });
            setTimeout(() => {
                window.scrollTo({ top: 500, behavior: 'smooth' });
            }, 100);
        } catch (e) {
            setError("Failed to load CSS content for this font.");
            console.error("Failed to load css content", e);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            uploadFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file: File) => {
        if (!file.name.endsWith(".ttf") && !file.name.endsWith(".otf")) {
            setError("Please upload a .ttf or .otf file.");
            return;
        }

        setIsUploading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Upload failed");
            }

            setResult(data);
            fetchFonts();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred during upload processing.");
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-black text-gray-200 selection:bg-gray-800">
            {deleteTargetFont && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-md w-full space-y-4 m-4 animate-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Delete Font?</h3>
                            <p className="text-gray-400 text-sm">
                                Are you sure you want to delete <b>{deleteTargetFont.fontFamily}</b>?
                                <br />
                                <span className="text-red-400 text-xs mt-1 block">This action cannot be undone.</span>
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => setDeleteTargetFont(null)}
                                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {deleteTargetFont && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-md w-full space-y-4 m-4 animate-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Delete Font?</h3>
                            <p className="text-gray-400 text-sm">
                                Are you sure you want to delete <b>{deleteTargetFont.fontFamily}</b>?
                                <br />
                                <span className="text-red-400 text-xs mt-1 block">This action cannot be undone.</span>
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => setDeleteTargetFont(null)}
                                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {releaseTargetFont && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-md w-full space-y-4 m-4 animate-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Confirm Release</h3>
                            <p className="text-gray-400 text-sm">
                                Are you sure you want to release <b>{releaseTargetFont.fontFamily}</b> to production?
                                <br />
                                <span className="text-red-400 text-xs mt-1 block">This will overwrite any existing release with the same name.</span>
                            </p>
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                onClick={() => setReleaseTargetFont(null)}
                                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRelease}
                                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
                            >
                                Confirm Release
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-5xl space-y-12">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-white">Minim Font Manager</h1>
                    <p className="text-gray-400">Upload your font file to automatically split and subset it for web optimization.</p>
                </div>

                {/* Usage Guide */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                        How to Use
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div className="space-y-2">
                            <p className="text-gray-400 font-medium">1. HTML (CDN)</p>
                            <div className="bg-black/50 p-3 rounded-lg border border-white/10 font-mono text-gray-300 break-all select-all">
                                &lt;link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/poposnail61/minim-font@main/dist/[FontName]/[FontName].css" /&gt;
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-gray-400 font-medium">2. CSS Import (CDN)</p>
                            <div className="bg-black/50 p-3 rounded-lg border border-white/10 font-mono text-gray-300 break-all select-all">
                                @import url("https://cdn.jsdelivr.net/gh/poposnail61/minim-font@main/dist/[FontName]/[FontName].css");
                            </div>
                        </div>
                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <p className="text-gray-400 font-medium">3. Apply Font Family</p>
                            <div className="bg-black/50 p-3 rounded-lg border border-white/10 font-mono text-gray-300 select-all">
                                font-family: "[FontName]";
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upload Section */}
                <div
                    className={`
            relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ease-in-out
            flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden
            ${isDragOver ? "border-white bg-gray-900/50 scale-[1.02]" : "border-gray-800 hover:border-gray-700 bg-gray-900/20"}
            ${isUploading ? "pointer-events-none opacity-50" : ""}
          `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("fileInput")?.click()}
                >
                    <input
                        id="fileInput"
                        type="file"
                        className="hidden"
                        accept=".ttf,.otf"
                        onChange={handleFileChange}
                    />

                    <div className="p-4 rounded-full bg-gray-800/50 ring-1 ring-white/10 shadow-xl">
                        {isUploading ? (
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        ) : (
                            <Upload className="w-8 h-8 text-white" />
                        )}
                    </div>

                    <div className="text-center space-y-1">
                        <p className="text-lg font-medium text-white">
                            {isUploading ? "Processing Font..." : "Click or Drag file to upload"}
                        </p>
                        <p className="text-sm text-gray-500">Supports .ttf, .otf</p>
                        {isUploading && <p className="text-xs text-gray-500 animate-pulse">This may take up to a minute...</p>}
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-xl bg-red-900/20 border border-red-900/50 text-red-200 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Fonts Lists Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Test Build Column */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-white px-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            Test Build
                        </h2>
                        <div className="space-y-3">
                            {savedFonts.map((font) => (
                                <div
                                    key={font.id}
                                    onClick={() => loadSavedFont(font)}
                                    className={`group relative p-4 rounded-xl bg-gray-900/20 border transition-all cursor-pointer ${result?.fontId === font.id ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-gray-800 hover:border-gray-600 hover:bg-gray-900/40'}`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="font-medium text-white truncate pr-16">{font.fontFamily}</div>
                                        <div className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">TEST</div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(font.createdAt).toLocaleDateString()}
                                    </div>

                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => triggerRelease(e, font)}
                                            className="px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30"
                                            title="Release to Production"
                                        >
                                            Release
                                        </button>
                                        <button
                                            onClick={(e) => deleteFont(e, font.id, font.fontFamily, false)}
                                            className="p-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {savedFonts.length === 0 && <p className="text-sm text-gray-600 italic px-2">No test fonts.</p>}
                        </div>
                    </div>

                    {/* Release Build Column */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-white px-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Release Build
                        </h2>
                        <div className="space-y-3">
                            {releaseFonts.map((font) => (
                                <div
                                    key={font.id}
                                    onClick={() => loadSavedFont(font)}
                                    className={`group relative p-4 rounded-xl bg-gray-900/20 border transition-all cursor-pointer ${result?.fontId === font.id && result.cssUrl.includes('release') ? 'border-green-500/50 bg-green-500/5' : 'border-gray-800 hover:border-gray-600 hover:bg-gray-900/40'}`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="font-medium text-white truncate pr-16">{font.fontFamily}</div>
                                        <div className="text-[10px] text-green-500 bg-green-900/30 border border-green-900/50 px-1.5 py-0.5 rounded">PROD</div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Release: {new Date(font.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => deleteFont(e, font.id, font.fontFamily, true)}
                                            className="p-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {releaseFonts.length === 0 && <p className="text-sm text-gray-600 italic px-2">No released fonts.</p>}
                        </div>
                    </div>
                </div>

                {/* Result Viewer */}
                {result && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 border-t border-gray-800">
                        <div className="p-6 rounded-2xl bg-gray-900/40 border border-gray-800 space-y-6">

                            {/* Header Status */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-green-400">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-medium">Active Font: {result.fontFamily}</span>
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                    ID: {result.fontId}
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5">
                                <span className="text-sm text-gray-400">Generated CSS URL</span>
                                <div className="flex gap-2">
                                    <a
                                        href={result.cssUrl}
                                        target="_blank"
                                        className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    >
                                        <Download className="w-3 h-3" />
                                        Download CSS
                                    </a>
                                </div>
                            </div>

                            {/* Functional Preview with Controls */}
                            <div className="pt-2 space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Live Preview (Editable)</p>

                                    {/* Controls */}
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">Size</span>
                                            <input
                                                type="range"
                                                min="12"
                                                max="128"
                                                value={previewFontSize}
                                                onChange={(e) => setPreviewFontSize(Number(e.target.value))}
                                                className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
                                            />
                                            <span className="text-xs text-gray-500 w-6 text-right">{previewFontSize}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">Weight</span>
                                            <input
                                                type="range"
                                                min="100"
                                                max="900"
                                                step="100"
                                                value={previewFontWeight}
                                                onChange={(e) => setPreviewFontWeight(Number(e.target.value))}
                                                className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
                                            />
                                            <span className="text-xs text-gray-500 w-6 text-right">{previewFontWeight}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamically inject CSS for preview */}
                                <link rel="stylesheet" href={result.cssUrl} />

                                <div
                                    className="p-8 rounded-lg bg-white/5 border border-white/5 leading-relaxed break-words min-h-[200px] outline-none focus:ring-1 focus:ring-white/20 transition-all"
                                    contentEditable={true}
                                    suppressContentEditableWarning={true}
                                    style={{
                                        fontFamily: `"${result.fontFamily}", sans-serif`,
                                        fontSize: `${previewFontSize}px`,
                                        fontWeight: previewFontWeight
                                    }}
                                >
                                    <p>다람쥐 헌 쳇바퀴에 타고파.</p>
                                    <p className="mt-2">The quick brown fox jumps over the lazy dog.</p>
                                    <p className="mt-2">1234567890 !@#$%^&*()</p>
                                </div>
                                <div className="text-xs text-gray-600 mt-2 flex justify-between">
                                    <span>Font Family applied: <span className="font-mono text-gray-400">{result.fontFamily}</span></span>
                                    <span className="text-gray-500">Edit text above to test</span>
                                </div>
                            </div>

                            {/* Code Viewer */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Generated CSS Content</p>
                                    <div className="relative group">
                                        <textarea
                                            className="w-full h-64 p-4 rounded-lg bg-black border border-white/10 text-xs font-mono text-gray-400 focus:outline-none focus:border-white/20 resize-none"
                                            value={result.cssContent || ""}
                                            readOnly
                                        />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Processing Logs</p>
                                    <textarea
                                        className="w-full h-64 p-4 rounded-lg bg-black border border-white/10 text-xs font-mono text-gray-500 focus:outline-none resize-none"
                                        value={result.logs || "No logs available."}
                                        readOnly
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
