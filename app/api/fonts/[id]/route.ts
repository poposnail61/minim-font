import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Font ID is required" }, { status: 400 });
        }

        const testDir = path.join(process.cwd(), "public", "test", id);

        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (e) {
            console.error("Error deleting directory:", e);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Failed to delete font" }, { status: 500 });
    }
}
