import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Font ID is required" }, { status: 400 });
        }

        const publicDir = path.join(process.cwd(), "public");
        const sourceDir = path.join(publicDir, "test", id);
        const targetDir = path.join(publicDir, "release", id);

        // Check source existence
        try {
            await fs.access(sourceDir);
        } catch {
            return NextResponse.json({ error: "Test font not found" }, { status: 404 });
        }

        // Clean target directory if exists
        await fs.rm(targetDir, { recursive: true, force: true });

        // Create target directory
        await fs.mkdir(targetDir, { recursive: true });

        // Copy all files recursively
        await fs.cp(sourceDir, targetDir, { recursive: true });

        // --- Auto Git Push Logic ---
        try {
            const fontName = id; // Use the ID as the font name for the commit message
            console.log(`Starting auto-push for release: ${fontName}`);

            // 1. Add changes
            await execPromise('git add .');

            // 2. Commit
            await execPromise(`git commit -m "release: update font ${fontName}"`);

            // 3. Push
            await execPromise('git push');

            console.log("Auto-push completed successfully.");
        } catch (gitError) {
            console.error("Auto-push failed:", gitError);
            // We don't fail the request if git push fails, but we verify it in logs.
            // Or we could return a warning. for now just log it.
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Release error:", error);
        return NextResponse.json({ error: "Failed to release font" }, { status: 500 });
    }
}
