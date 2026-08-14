# Extension Icons Setup

## Quick Way (Generate via Browser)

1. Open `create-icons.html` in Chrome:
   ```
   chrome://file://m:/USAMKO/chrome-extension/create-icons.html
   ```

2. It will automatically generate and download:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

3. Move the downloaded files to `chrome-extension/icons/` folder

## Manual Way (Use Placeholder)

If you prefer simple placeholders, create these manually:

### Using Paint / Photoshop / GIMP

Create 3 PNG files with these sizes:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels  
- `icon128.png` - 128x128 pixels

Suggested design:
- Purple/blue gradient background
- White map pin icon in center
- "U" letter at bottom

### Using Online Tool

1. Go to https://www.favicon-generator.org/
2. Upload any image (logo, map icon, etc.)
3. Download the generated icons
4. Rename and move to `chrome-extension/icons/`

## Current Status

✅ SVG source file created (`icon.svg`)
✅ HTML generator created (`create-icons.html`)
⏳ PNG files need to be generated

**Next step:** Open `create-icons.html` in browser to generate PNGs automatically.
