import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string[] }> }
) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    const filePath = path.join(process.cwd(), 'dist', ...slug);

    if (!fs.existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Simple MIME type handling
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === '.css') contentType = 'text/css';
    else if (ext === '.woff2') contentType = 'font/woff2';
    else if (ext === '.woff') contentType = 'font/woff';
    else if (ext === '.ttf') contentType = 'font/ttf';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.json') contentType = 'application/json';

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*', // CORS for using in other local projects
        },
    });
}
