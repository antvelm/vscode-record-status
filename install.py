"""Copies Record Status into this user's VS Code extensions folder.

    python install.py

VS Code loads any folder under ~/.vscode/extensions that has a package.json, so no packaging or
marketplace is needed. Run it again after editing the extension, then "Developer: Reload Window".
"""
import json
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
FILES = ("package.json", "extension.js", "README.md", "LICENSE", "CHANGELOG.md")


def main():
    with open(os.path.join(HERE, "package.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    root = os.path.join(os.path.expanduser("~"), ".vscode", "extensions")
    prefix = f"{manifest['publisher']}.{manifest['name']}-".lower()
    for old in os.listdir(root) if os.path.isdir(root) else []:
        if old.lower().startswith(prefix):
            shutil.rmtree(os.path.join(root, old))
    target = os.path.join(root, prefix + manifest["version"])
    os.makedirs(target)
    for name in FILES:
        if os.path.exists(os.path.join(HERE, name)):
            shutil.copy2(os.path.join(HERE, name), target)
    print("installed to", target)
    print('now run "Developer: Reload Window" in VS Code')


if __name__ == "__main__":
    main()
