// Builds the bundled icon theme, "MD Status Icons", from the pinned material-icon-theme
// devDependency (MIT; its licence is copied next to the icons):
//
//   theme/icons/*.svg               Material Icon Theme's icons
//   theme/material-icons.base.json  its manifest, icon paths made relative to theme/
//   theme/md-status-icons.json  the manifest VS Code loads; the extension rewrites it at
//                                   runtime with the status icons, this is its starting point
//   theme/MATERIAL-LICENSE.txt
//
// Run by `vsce package` (vscode:prepublish) and by `npm run build-theme`. theme/ is generated and
// not committed.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const THEME = path.join(ROOT, "theme");

function main() {
    let pkgDir;
    try {
        pkgDir = path.dirname(require.resolve("material-icon-theme/package.json", { paths: [ROOT] }));
    } catch {
        console.error("material-icon-theme is not installed; run `npm install` first.");
        process.exit(1);
    }
    const version = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8")).version;

    fs.rmSync(THEME, { recursive: true, force: true });
    fs.mkdirSync(path.join(THEME, "icons"), { recursive: true });

    const icons = fs.readdirSync(path.join(pkgDir, "icons")).filter((f) => f.endsWith(".svg"));
    for (const f of icons) {
        fs.copyFileSync(path.join(pkgDir, "icons", f), path.join(THEME, "icons", f));
    }

    const manifest = JSON.parse(fs.readFileSync(path.join(pkgDir, "dist", "material-icons.json"), "utf8"));
    for (const def of Object.values(manifest.iconDefinitions)) {
        // "./../icons/x.svg" (relative to dist/) becomes "./icons/x.svg" (relative to theme/).
        def.iconPath = "./icons/" + path.posix.basename(def.iconPath);
    }
    const text = JSON.stringify(manifest);
    fs.writeFileSync(path.join(THEME, "material-icons.base.json"), text);
    fs.writeFileSync(path.join(THEME, "md-status-icons.json"), text);
    fs.copyFileSync(path.join(pkgDir, "LICENSE"), path.join(THEME, "MATERIAL-LICENSE.txt"));

    console.log(`theme: ${icons.length} icons from material-icon-theme ${version}`);
}

main();
