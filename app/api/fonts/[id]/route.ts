import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import * as fsSync from "fs";
import path from "path";
import { execSync } from "child_process";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Font ID is required" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const dirType = searchParams.get("dir") === "release" ? "release" : "test";

        let targetDir = "";
        if (dirType === "release") {
            targetDir = path.join(process.cwd(), "dist", id);
        } else {
            targetDir = path.join(process.cwd(), "public", "test", id);
        }

        try {
            await fs.rm(targetDir, { recursive: true, force: true });

            // If deleting from release, sync with GitHub
            if (dirType === "release") {
                let readmeUpdated = false;
                try {
                    // Update README.md with detailed usage
                    const readmePath = path.join(process.cwd(), "README.md");
                    const distPath = path.join(process.cwd(), "dist");

                    // Use sync operations here for simplicity within the git sync block, 
                    // or consistent with Release API pattern.
                    if (fsSync.existsSync(readmePath) && fsSync.existsSync(distPath)) {
                        let readmeContent = fsSync.readFileSync(readmePath, 'utf-8');
                        const startMarker = "<!-- FONTS_USAGE_START -->";
                        const endMarker = "<!-- FONTS_USAGE_END -->";

                        if (readmeContent.includes(startMarker) && readmeContent.includes(endMarker)) {
                            // Filter out the deleted ID if it still exists in the listing (it shouldn't if we deleted it, but fs.rm is async await above)
                            // We deleted it above via `await fs.rm`.
                            const releasedFonts = fsSync.readdirSync(distPath).filter((file: string) => {
                                return fsSync.statSync(path.join(distPath, file)).isDirectory();
                            });
                            // releasedFonts will already NOT include 'id' because we deleted it.

                            let newUsageContent = "\n";
                            if (releasedFonts.length > 0) {
                                newUsageContent += "The released fonts are served via GitHub and can be used directly through a CDN like **jsDelivr**.\n\n";
                            }

                            releasedFonts.forEach((font: string) => {
                                const cssUrl = `https://cdn.jsdelivr.net/gh/poposnail61/minim-font@main/dist/${font}/css/${font}.css`;
                                newUsageContent += `### ${font}\n\n`;
                                newUsageContent += `**1. HTML (Recommended)**\n`;
                                newUsageContent += "```html\n";
                                newUsageContent += `<link rel="stylesheet" href="${cssUrl}" />\n`;
                                newUsageContent += "```\n\n";
                                newUsageContent += `**2. CSS @import**\n`;
                                newUsageContent += "```css\n";
                                newUsageContent += `@import url("${cssUrl}");\n`;
                                newUsageContent += "```\n\n";
                            });

                            const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
                            readmeContent = readmeContent.replace(regex, `${startMarker}${newUsageContent}${endMarker}`);

                            fsSync.writeFileSync(readmePath, readmeContent, 'utf-8');
                            readmeUpdated = true;
                        }
                    }
                } catch (e) {
                    console.error("Failed to update README during delete:", e);
                }

                try {
                    // Configure git user logic (optional but good safety)
                    try {
                        execSync('git config user.name "Minim Font Manager"', { cwd: process.cwd(), stdio: 'ignore' });
                        execSync('git config user.email "font-manager@minim.com"', { cwd: process.cwd(), stdio: 'ignore' });
                    } catch (e) { }

                    // Using 'git add -A' to catch the deletion of the folder
                    execSync(`git add dist`, { cwd: process.cwd() });
                    if (readmeUpdated) {
                        execSync(`git add README.md`, { cwd: process.cwd() });
                    }

                    const commitMsg = `release: delete font ${id}`;
                    execSync(`git commit -m "${commitMsg}"`, { cwd: process.cwd() });
                    execSync('git push', { cwd: process.cwd() });
                    console.log('Git push successful (delete)');
                } catch (gitError) {
                    console.error('Git operation failed during delete:', gitError);
                    // Proceed even if git fails, as fs delete is main goal
                }
            }
        } catch (e) {
            console.error("Error deleting directory:", e);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Failed to delete font" }, { status: 500 });
    }
}
