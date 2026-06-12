# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path


block_cipher = None
project_dir = Path.cwd()
package_dir = project_dir / "youtube_summary_app"
icon_file = project_dir / "App Icons" / "YouTubeSummarizer_LightGlass.icns"

datas = [
    (str(package_dir / "templates"), "youtube_summary_app/templates"),
    (str(package_dir / "static"), "youtube_summary_app/static"),
]

a = Analysis(
    ["desktop_app.py"],
    pathex=[str(project_dir)],
    binaries=[],
    datas=datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="YouTube Summary App",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="YouTube Summary App",
)

app = BUNDLE(
    coll,
    name="YouTube Summary App.app",
    icon=str(icon_file),
    bundle_identifier="com.local.youtubesummaryapp",
    info_plist={
        "CFBundleName": "YouTube Summary App",
        "CFBundleDisplayName": "YouTube Summary App",
        "NSHighResolutionCapable": "True",
    },
)
