import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
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
                try {
                    const readmePath = path.join(process.cwd(), "README.md");
                    let readmeUpdated = false;

                    // Check if README.md exists using fs.access for async check
                    try {
                        await fs.access(readmePath); // Check if file exists and is accessible
                        let readmeContent = await fs.readFile(readmePath, 'utf-8');
                        const lines = readmeContent.split('\n');
                        const fontRowPart = `| \`${id}\` |`;

                        const newLines = lines.filter(line => !line.includes(fontRowPart));

                        if (newLines.length !== lines.length) {
                            await fs.writeFile(readmePath, newLines.join('\n'), 'utf-8');
                            readmeUpdated = true;
                        }
                    } catch (e: any) {
                        if (e.code === 'ENOENT') {
                            console.log("README.md not found, skipping update.");
                        } else {
                            console.error("Failed to update README during delete:", e);
                        }
                    }

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
