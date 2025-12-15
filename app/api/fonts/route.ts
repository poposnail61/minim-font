import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dirType = searchParams.get("dir") === "release" ? "release" : "test";

        const publicDir = path.join(process.cwd(), "public");
        const targetDir = path.join(publicDir, dirType);

        try {
            await fs.access(targetDir);
        } catch {
            return NextResponse.json({ fonts: [] });
        }

        const entries = await fs.readdir(targetDir, { withFileTypes: true });
        const fontMap = new Map();

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const fontId = entry.name;
            const fontDir = path.join(targetDir, fontId);

            try {
                const files = await fs.readdir(fontDir);
                const cssFile = files.find(f => f.endsWith('.css'));

                if (cssFile) {
                    const stats = await fs.stat(path.join(fontDir, cssFile));
                    fontMap.set(fontId, {
                        id: fontId,
                        fontFamily: path.parse(cssFile).name,
                        cssUrl: `/${dirType}/${fontId}/${cssFile}`,
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
