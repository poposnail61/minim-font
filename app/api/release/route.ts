import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, fontFamily } = body;

        if (!id) {
            return NextResponse.json({ error: "Font ID is required" }, { status: 400 });
        }

        // Use provided fontFamily or fallback to ID
        const targetFontName = fontFamily || id;

        const publicDir = path.join(process.cwd(), "public");
        const sourceBaseDir = path.join(publicDir, "test", id); // Source is using ID (which is now same as FamilyName usually)

        const sourceFontsDir = path.join(sourceBaseDir, "fonts");
        const sourceCssDir = path.join(sourceBaseDir, "css");

        // Check source existence
        if (!fs.existsSync(sourceBaseDir)) {
            return NextResponse.json({ error: "Test font not found" }, { status: 404 });
        }

        // Define the destination directory in root 'dist' folder
        const releaseBaseDir = path.join(process.cwd(), "dist", targetFontName);

        // Define release subdirectories
        // For dist, we want 'css' and 'fonts' separated? Or flattened?
        // User asked for: "Run domain but we provide CDN... release only uploaded to public/font... wait."
        // "3-1. release file only... test state in font manager"
        // "4. user domain vs local CDN"
        // Let's stick to the structured format: dist/FamilyName/css/ and dist/FamilyName/fonts/

        const releaseCssDir = path.join(releaseBaseDir, "css");
        const releaseFontsDir = path.join(releaseBaseDir, "fonts");

        // Cleanup & Create release directory
        if (fs.existsSync(releaseBaseDir)) {
            fs.rmSync(releaseBaseDir, { recursive: true, force: true });
        }
        fs.mkdirSync(releaseCssDir, { recursive: true });
        fs.mkdirSync(releaseFontsDir, { recursive: true });

        // Copy directories
        // dist/[Family]/fonts/
        fs.cpSync(sourceFontsDir, releaseFontsDir, { recursive: true });
        // dist/[Family]/css/
        fs.cpSync(sourceCssDir, releaseCssDir, { recursive: true });

        // Update README.md
        try {
            const readmePath = path.join(process.cwd(), "README.md");
            if (fs.existsSync(readmePath)) {
                let readmeContent = fs.readFileSync(readmePath, 'utf-8');
                const tableHeader = "| Font ID | Font Family | Example CDN URL |";
                const tableDivider = "| :--- | :--- | :--- |";

                // Check if table exists, if not, create it
                if (!readmeContent.includes(tableHeader)) {
                    // Find insertion point (e.g., before Features or at end)
                    const insertMarker = "## Features";
                    const newTable = `### Supported Fonts\n\n${tableHeader}\n${tableDivider}\n\n`;
                    if (readmeContent.includes(insertMarker)) {
                        readmeContent = readmeContent.replace(insertMarker, `${newTable}${insertMarker}`);
                    } else {
                        readmeContent += `\n${newTable}`;
                    }
                }

                // Check if font already exists in table
                const fontRowPart = `| \`${targetFontName}\` |`;
                if (!readmeContent.includes(fontRowPart)) {
                    const newRow = `| \`${targetFontName}\` | \`${targetFontName}\` | \`.../dist/${targetFontName}/css/${targetFontName}.css\` |`;
                    // Insert after the last pipe character of the table section
                    // We look for the divider and append after the last row in that block.
                    // Simplified regex approach: find the table block and append.
                    // Or simple replacement: find the divider and insert after it (top insertion) or find the end of table.
                    // Let's Insert at the bottom of the table. Finds the last line starting with `|` after `tableDivider`.

                    const lines = readmeContent.split('\n');
                    let lastTableIndex = -1;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].trim().startsWith('|')) {
                            lastTableIndex = i;
                        } else if (lastTableIndex !== -1 && lines[i].trim() === "") {
                            // End of table block found
                            break;
                        }
                    }

                    if (lastTableIndex !== -1) {
                        lines.splice(lastTableIndex + 1, 0, newRow);
                        readmeContent = lines.join('\n');
                        fs.writeFileSync(readmePath, readmeContent, 'utf-8');
                        execSync('git add README.md', { cwd: process.cwd() });
                    }
                }
            }
        } catch (readmeError) {
            console.error('Failed to update README:', readmeError);
        }

        // Git operations
        try {
            // Configure git user (if not already configured globally)
            try {
                execSync('git config user.name "Minim Font Manager"', { cwd: process.cwd(), stdio: 'ignore' });
                execSync('git config user.email "font-manager@minim.com"', { cwd: process.cwd(), stdio: 'ignore' });
            } catch (e) {
                // Ignore config errors
            }

            // Add changes in dist folder
            execSync(`git add dist/${targetFontName}`, { cwd: process.cwd() });

            // Commit
            const commitMsg = `release: update font ${targetFontName}`;
            execSync(`git commit -m "${commitMsg}"`, { cwd: process.cwd() });

            // Push
            execSync('git push', { cwd: process.cwd() });

            console.log('Git push successful');
        } catch (gitError) {
            console.error('Git operation failed:', gitError);
        }

        // Construct the CSS URL for local CDN usage
        // Note: New path structure is dist/Family/css/Family.css
        const cssUrl = `/api/cdn/${targetFontName}/css/${targetFontName}.css`;

        return NextResponse.json({ success: true, cssUrl });

    } catch (error) {
        console.error("Release error:", error);
        return NextResponse.json({ error: "Failed to release font" }, { status: 500 });
    }
}
