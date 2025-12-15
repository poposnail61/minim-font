# Minim Font Manager

A web-based tool for managing, splitting, and serving web fonts with optimized CSS generation.

## How to Use

The released fonts are served via GitHub and can be used directly through a CDN like **jsDelivr**.

### 1. HTML (Recommended)
Add this to your `<head>`:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/poposnail61/minim-font@main/dist/[FontName]/[FontName].css" />
```

### 2. CSS @import
```css
@import url("https://cdn.jsdelivr.net/gh/poposnail61/minim-font@main/dist/[FontName]/[FontName].css");
```

### 3. Apply Font Family
```css
body {
```

### Supported Fonts

| Font ID | Font Family | Example CDN URL |
| :--- | :--- | :--- |
| `MinimBaseVF` | `MinimBaseVF` | `.../dist/MinimBaseVF/MinimBaseVF.css` |
| `MinimSoftVF` | `MinimSoftVF` | `.../dist/MinimSoftVF/MinimSoftVF.css` |
| `ReadmeTest` | `ReadmeTest` | `.../dist/ReadmeTest/css/ReadmeTest.css` |

## Features
- **Automatic Subsetting**: Python script (using `fonttools`) splits fonts by unicode ranges (Hangul, Latin, etc.) for optimal loading.
- **Variable Font Safe**: Detects and preserves variable font axes.
- **Local CDN Proxy**: `dist/` folder structure mimics standard CDN paths.
- **Production Ready**: Optimized for distribution via Git-based CDNs (jsDelivr).rols.
- **Release Workflow**: Promote tested fonts to production with a single click (Confirmation Modal included).
- **Auto-deployment**: Automatically pushes changes to GitHub upon release.

## Run Locally

```bash
npm install
npm run dev
```
