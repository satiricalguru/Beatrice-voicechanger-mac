'use strict';

// electron-builder afterPack hook: ad-hoc sign the whole app bundle.
//
// Without a Developer ID certificate electron-builder skips signing, leaving
// only Electron's own linker signature on the main binary. That signature no
// longer matches the bundle once our Info.plist and resources are added, so
// macOS reports a downloaded copy as "damaged" and offers no "Open Anyway".
// A valid ad-hoc signature turns that into the normal "Apple could not verify"
// prompt, which users can approve once in System Settings → Privacy & Security.

const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log(`  • ad-hoc signing  ${appPath}`);

  execFileSync('codesign', ['--force', '--deep', '--sign', '-', '--timestamp=none', appPath], { stdio: 'inherit' });
  // Fail the build rather than ship a bundle macOS will call damaged.
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' });
};
