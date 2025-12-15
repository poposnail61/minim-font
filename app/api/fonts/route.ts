import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dirType = searchParams.get("dir") === "release" ? "release" : "test";

        let targetDir = "";

        if (dirType === "release") {
            targetDir = path.join(process.cwd(), "dist");
        } else {
            targetDir = path.join(process.cwd(), "public", "test");
        }

        try {
            await fs.access(targetDir);
        } catch {
            // If checking release, and dist doesn't exist, try public/release for backward compatibility or just return empty
            // For now, let's just return empty if not found
            return NextResponse.json({ fonts: [] });
        }

        const entries = await fs.readdir(targetDir, { withFileTypes: true });
        const fontMap = new Map();

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const fontId = entry.name;
            const fontBaseDir = path.join(targetDir, fontId);

            // New structure has 'css' subdirectory
            // Check if 'css' dir exists, otherwise fallback to root (for old structure compatibility if needed, but we are refactoring)
            const cssDir = path.join(fontBaseDir, "css");
            let cssFileDir = cssDir;

            // If css dir doesn't exist, check base dir (backward compatibility or if manual copy)
            try {
                await fs.access(cssDir);
            } catch {
                cssFileDir = fontBaseDir;
            }

            try {
                const files = await fs.readdir(cssFileDir);
                const cssFile = files.find(f => f.endsWith('.css'));

                if (cssFile) {
                    const stats = await fs.stat(path.join(cssFileDir, cssFile));

                    let cssUrl = "";
                    if (dirType === "release") {
                        // Point to local CDN proxy: /api/cdn/Family/css/Family.css
                        // If it came from cssDir, include /css/ in path
                        const subPath = cssFileDir === cssDir ? "css/" : "";
                        cssUrl = `/api/cdn/${fontId}/${subPath}${cssFile}`;
                    } else {
                        // Point to public/test
                        // If it came from cssDir, include /css/ in path
                        const subPath = cssFileDir === cssDir ? "css/" : "";
                        cssUrl = `/test/${fontId}/${subPath}${cssFile}`;
                    }

                    fontMap.set(fontId, {
                        id: fontId,
                        fontFamily: path.parse(cssFile).name,
                        cssUrl: cssUrl,
                        createdAt: stats.birthtime
                    });
                }
            } catch (e) {
                console.error(`Error reading directory for font ${fontId}:`, e);
            }
        }

        const fonts = Array.from(fontMap.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ fonts });

    } catch (error) {
        console.error("Failed to list fonts:", error);
        return NextResponse.json({ error: "Failed to fetch fonts" }, { status: 500 });
    }
}
