# Menu Bar Icon Setup

## Quick Setup (Recommended)

1. Use any existing 16x16 PNG image as iconTemplate.png
2. Or convert the provided SVG to PNG:

### Using online converter:
- Go to https://convertio.co/svg-png/
- Upload icon-template.svg
- Download as PNG
- Rename to iconTemplate.png

### Using ImageMagick (if installed):
```bash
convert icon-template.svg -resize 16x16 iconTemplate.png
convert icon-template.svg -resize 32x32 iconTemplate@2x.png
```

### Using macOS built-in tools:
```bash
# Convert SVG to PNG using qlmanage
qlmanage -t -s 16 -o . icon-template.svg
mv icon-template.svg.png iconTemplate.png
```

## Template Icon Requirements:
- 16x16 pixels for standard display
- 32x32 pixels for Retina display (@2x)
- Black color with transparency
- Will automatically adapt to system appearance

## Temporary Workaround:
If you don't have an icon, the app will use a default system icon.
The functionality will work without a custom icon.
