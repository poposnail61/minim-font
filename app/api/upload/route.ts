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
        const baseDir = path.join(publicDir, "test", fontFamily); // Use Family Name directly

        // Define subdirectories
        const originalDir = path.join(baseDir, "original");
        const fontsDir = path.join(baseDir, "fonts");
        const cssDir = path.join(baseDir, "css");

        // Create directories (recursive)
        await fs.mkdir(originalDir, { recursive: true });
        await fs.mkdir(fontsDir, { recursive: true });
        await fs.mkdir(cssDir, { recursive: true });

        // Save uploaded file to 'original'
        const filePath = path.join(originalDir, originalName);
        await fs.writeFile(filePath, buffer);

        // Path to Python script
        const scriptPath = path.join(process.cwd(), "scripts", "split_font.py");
        const pythonPath = path.join(process.cwd(), "venv", "bin", "python");
        const refCssPath = path.join(process.cwd(), "scripts", "google_fonts_reference.css");

        // Execute Python script
        // Output to 'fonts' directory initially
        const command = `"${pythonPath}" "${scriptPath}" "${filePath}" "${refCssPath}" "${fontsDir}"`;
        console.log("Executing:", command);

        const { stdout, stderr } = await execPromise(command);
        console.log("Stdout:", stdout);
        if (stderr) console.error("Stderr:", stderr);

        // Move generated CSS file to 'css' directory
        // The script generates {FamilyName}.css in the output dir (fontsDir)
        const generatedCssName = fontFamily + ".css";
        const generatedCssPath = path.join(fontsDir, generatedCssName);
        const targetCssPath = path.join(cssDir, generatedCssName);

        if (await fs.stat(generatedCssPath).catch(() => false)) {
            // Read CSS content to update font paths
            let cssContent = await fs.readFile(generatedCssPath, 'utf-8');
            // Regex to replace url('...') with url('../fonts/...') because CSS is in css/ folder and fonts in fonts/ folder
            // Original CSS has just filenames like url('Subset.woff2')
            cssContent = cssContent.replace(/url\(['"]?([^'")]+)['"]?\)/g, "url('../fonts/$1')");

            await fs.writeFile(targetCssPath, cssContent);
            await fs.unlink(generatedCssPath); // Remove original from fonts dir
        }

        const cssUrl = `/test/${fontFamily}/css/${generatedCssName}`;

        return NextResponse.json({
            message: "Upload and processing complete",
            fontId: fontFamily, // Use Family Name as ID for simplicity in new structure
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

