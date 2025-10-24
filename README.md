# KDMS PDF Merger (Client‑side)
*Developed by KM Team*

A tiny web app to merge PDF files **100% client‑side** — no server uploads; everything runs in your browser.

## Features
- Select multiple PDFs and reorder (drag & drop)
- First‑page thumbnails via PDF.js
- Merge with [pdf‑lib](https://pdf-lib.js.org/) and download immediately
- ASEAN‑inspired color theme; KDMS  logo in header

> Note: For performance and browser memory, keep totals under ~100MB combined or ~500 pages (device‑dependent).

## Local Use
Open `index.html` directly in a modern browser (Chrome/Edge/Firefox). No build step required.

## File Structure
```
/ (root)
├── assets/
│   └── kdms-logo.png    # KDMS logo used in the header and favicon
├── index.html           # UI + loads libraries via CDN
├── script.js            # Merge logic + thumbnails + reordering
└── style.css            # Styles and color theme
```

## Privacy
No files are uploaded anywhere. All processing happens in the browser. Still, use trusted devices/networks for sensitive documents.

## License
MIT open source



