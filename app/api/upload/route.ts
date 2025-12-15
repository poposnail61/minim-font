import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const originalName = file.name;
        // Generate a clean ID from the filename
        const fontId = path.parse(originalName).name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const fontFamily = path.parse(originalName).name;

        // Define local paths
        const publicDir = path.join(process.cwd(), "public");
        const uploadDir = path.join(publicDir, "test", fontId);

        // Create directory (recursive)
        await fs.mkdir(uploadDir, { recursive: true });

        // Save uploaded file
        const filePath = path.join(uploadDir, originalName);
        await fs.writeFile(filePath, buffer);

        // Path to Python script
        const scriptPath = path.join(process.cwd(), "scripts", "split_font.py");
        // Path to Python executable in venv
        const pythonPath = path.join(process.cwd(), "venv", "bin", "python");

        // Path to reference CSS
        const refCssPath = path.join(process.cwd(), "scripts", "google_fonts_reference.css");

        // Execute Python script
        // Usage: python split_font.py <font_path> <reference_css_path> [output_dir]
        const command = `"${pythonPath}" "${scriptPath}" "${filePath}" "${refCssPath}" "${uploadDir}"`;
        console.log("Executing:", command);

        const { stdout, stderr } = await execPromise(command);
        console.log("Stdout:", stdout);
        if (stderr) console.error("Stderr:", stderr);

        // The script generates {filename}.css
        const cssFileName = fontFamily + ".css";
        const cssUrl = `/test/${fontId}/${cssFileName}`;

        return NextResponse.json({
            message: "Upload and processing complete",
            fontId,
            fontFamily,
            cssUrl,
            logs: stdout
        });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({
            error: `Upload failed: ${error.message || String(error)}\nSTDERR: ${error.stderr || ""}`
        }, { status: 500 });
    }
}

