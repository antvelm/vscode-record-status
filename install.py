"""Builds Record Status into a .vsix and installs it into VS Code.

    python install.py            build the .vsix and install it
    python install.py --package  only build the .vsix (to share it, or install it by hand)

Needs Node.js (npm installs the pinned material-icon-theme the bundled icon theme is built from,
and `npx @vscode/vsce` packages) and VS Code's `code` command on PATH. The .vsix lands next
to this file; installing it by hand is "Extensions: Install from VSIX..." in VS Code, or
`code --install-extension record-status-<version>.vsix`. Run it again after editing the
extension, then "Developer: Reload Window".
"""
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def run(*args, check=True):
    exe = shutil.which(args[0])
    if not exe:
        sys.exit(f"{args[0]} not found on PATH")
    subprocess.run([exe, *args[1:]], cwd=HERE, check=check)


def remove_copied_installs(manifest):
    """Removes folders that the old copy-based install.py left in ~/.vscode/extensions.

    A .vsix install leaves a .vsixmanifest in its folder; a copied folder has none. VS Code may have
    registered the copy anyway, and then refuses the .vsix until it is uninstalled through `code`.
    """
    root = os.path.join(os.path.expanduser("~"), ".vscode", "extensions")
    prefix = f"{manifest['publisher']}.{manifest['name']}-".lower()
    copies = [os.path.join(root, old) for old in (os.listdir(root) if os.path.isdir(root) else [])
              if old.lower().startswith(prefix) and not os.path.exists(os.path.join(root, old, ".vsixmanifest"))]
    if not copies:
        return
    # Fails harmlessly when VS Code never registered the copy.
    run("code", "--uninstall-extension", f"{manifest['publisher']}.{manifest['name']}", check=False)
    for folder in copies:
        if os.path.exists(folder):
            shutil.rmtree(folder)
        print("removed copied install", folder)


def main():
    with open(os.path.join(HERE, "package.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    vsix = f"{manifest['name']}-{manifest['version']}.vsix"
    # The bundled icon theme is built from the pinned material-icon-theme devDependency.
    if not os.path.isdir(os.path.join(HERE, "node_modules", "material-icon-theme")):
        run("npm", "install", "--no-audit", "--no-fund")
    run("npx", "--yes", "@vscode/vsce", "package", "--out", vsix)
    print("built", os.path.join(HERE, vsix))
    if "--package" in sys.argv[1:]:
        return
    remove_copied_installs(manifest)
    run("code", "--install-extension", vsix, "--force")
    print('installed; now run "Developer: Reload Window" in VS Code')


if __name__ == "__main__":
    main()
