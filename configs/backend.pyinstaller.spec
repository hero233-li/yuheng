# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules

ROOT = Path(SPECPATH).parent
BACKEND = ROOT / "apps" / "backend"
DJANGO_MIGRATIONS = (
    collect_submodules("core.migrations")
    + collect_submodules("jobs.migrations")
)

a = Analysis(
    [str(BACKEND / "manage.py")],
    pathex=[str(BACKEND)],
    binaries=[],
    datas=[],
    hiddenimports=[
        "automation_backend.settings",
        "automation_backend.urls",
        "core",
        "jobs",
        "workflows",
        "corsheaders",
        *DJANGO_MIGRATIONS,
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["agents", "packages"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
