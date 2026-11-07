# G-Green AutoEdit

Browser-based photo editing workspace for G-Green Productions.

## Current build (v0.6)
- Orange/white G-Green-branded interface
- Local photo import, before/after preview and thumbnails
- Premium Natural, Bright Indoor, Outdoor Shade and Neutral presets
- Brightness, contrast, saturation, warmth, highlights and shadows
- Individual and batch JPEG export

Photos are processed in the browser. No image uploads or server-side AI processing are implemented. Foreground/background masking, RAW conversion, Windows watch-folder automation and selective edits are not yet implemented.

## Deployment safety
GitHub Actions workflow: `.github/workflows/deploy.yml` (manual trigger only).

**Do not run deployment until the FTP account is confirmed to access the actual document root for `edit.g-green.co.za`.** The cPanel screenshot shows the `autoedit` FTP account under `/home/ggreebnx/g-green.co.za/autoedit`, while the website files are in `/home/ggreebnx/edit.g-green.co.za`. Those are not the same location. `FTP_TARGET_DIR=/edit.g-green.co.za/` is only correct if the FTP user's root is `/home/ggreebnx` and that directory is accessible.

The workflow uses FTPS, does not clean the destination and excludes `.htaccess` and PHP configuration files. Verify the correct FTP user root and server directory before triggering deployment.