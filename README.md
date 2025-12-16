# Minim Font Manager

A web-based tool for managing, splitting, and serving web fonts with optimized CSS generation.

## How to Use

<!-- FONTS_USAGE_START -->
The released fonts are served via GitHub and can be used directly through a CDN like **jsDelivr**.

### MinimBaseVF

**1. HTML (Recommended)**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/poposnail61/minim-font@main/dist/MinimBaseVF/css/MinimBaseVF.css" />
```

**2. CSS @import**
```css
@import url("https://cdn.jsdelivr.net/gh/poposnail61/minim-font@main/dist/MinimBaseVF/css/MinimBaseVF.css");
```

### MinimSoftVF

**1. HTML (Recommended)**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/poposnail61/minim-font@main/dist/MinimSoftVF/css/MinimSoftVF.css" />
```

**2. CSS @import**
```css
@import url("https://cdn.jsdelivr.net/gh/poposnail61/minim-font@main/dist/MinimSoftVF/css/MinimSoftVF.css");
```

<!-- FONTS_USAGE_END -->
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
