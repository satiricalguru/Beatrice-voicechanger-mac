#!/usr/bin/env bash
# Builds a self-contained Python runtime (with the audio backend's packages)
# for each Mac architecture, so the packaged app never depends on the user's
# system Python. Output: build/python/arm64 and build/python/x64, which
# electron-builder copies into the app as Contents/Resources/python.
#
# Usage: scripts/bundle-python.sh [arm64|x64 ...]   (default: both)
set -euo pipefail

PBS_TAG="20261013"
PY_VERSION="3.12.15"
PY_MINOR="3.12"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/build/python"
CACHE="$ROOT/build/python-cache"
BASE_URL="https://github.com/astral-sh/python-build-standalone/releases/download/$PBS_TAG"

mkdir -p "$OUT" "$CACHE"

if [ ! -f "$CACHE/SHA256SUMS-$PBS_TAG" ]; then
  curl -fsSL "$BASE_URL/SHA256SUMS" -o "$CACHE/SHA256SUMS-$PBS_TAG"
fi

build_arch() {
  local arch="$1" triple run
  case "$arch" in
    arm64) triple="aarch64-apple-darwin"; run="arch -arm64" ;;
    x64)   triple="x86_64-apple-darwin";  run="arch -x86_64" ;;  # needs Rosetta on Apple Silicon
    *) echo "unknown arch: $arch" >&2; exit 1 ;;
  esac

  local tarball="cpython-$PY_VERSION+$PBS_TAG-$triple-install_only.tar.gz"
  if [ ! -f "$CACHE/$tarball" ]; then
    echo "[bundle-python] downloading $tarball"
    curl -fsSL "$BASE_URL/${tarball//+/%2B}" -o "$CACHE/$tarball.part"
    mv "$CACHE/$tarball.part" "$CACHE/$tarball"
  fi

  local expected actual
  expected="$(grep " $tarball\$" "$CACHE/SHA256SUMS-$PBS_TAG" | awk '{print $1}')"
  actual="$(shasum -a 256 "$CACHE/$tarball" | awk '{print $1}')"
  if [ -z "$expected" ] || [ "$expected" != "$actual" ]; then
    echo "[bundle-python] checksum mismatch for $tarball" >&2
    exit 1
  fi

  local dest="$OUT/$arch"
  rm -rf "$dest" "$OUT/python"
  tar -xzf "$CACHE/$tarball" -C "$OUT"   # extracts to $OUT/python
  mv "$OUT/python" "$dest"

  local py="$dest/bin/python3"
  echo "[bundle-python] installing requirements for $arch"
  $run "$py" -m pip install --quiet --no-cache-dir --disable-pip-version-check \
    --only-binary=:all: -r "$ROOT/requirements.txt"

  # Fail the build now rather than on a user's Mac.
  $run "$py" -c "import sounddevice, numpy, soundfile; print('[bundle-python] $arch ok: numpy', numpy.__version__, 'sounddevice', sounddevice.__version__)"

  # Drop parts the backend never uses (GUI toolkits, test suite, pip itself).
  local lib="$dest/lib/python$PY_MINOR"
  rm -rf "$lib/test" "$lib/idlelib" "$lib/tkinter" "$lib/turtledemo" "$lib/ensurepip" \
         "$lib/site-packages/pip" "$lib/site-packages"/pip-*.dist-info \
         "$lib"/lib-dynload/_tkinter*.so \
         "$dest"/lib/tcl* "$dest"/lib/tk* "$dest"/lib/itcl* "$dest"/lib/thread* \
         "$dest"/lib/libtcl* "$dest"/lib/libtk* "$dest/share" "$dest/include"
  find "$dest" -name '*.a' -delete

  # Precompile so Python never needs to write .pyc files inside the signed app.
  $run "$py" -m compileall -q "$lib" >/dev/null || true
  echo "[bundle-python] $arch -> $dest ($(du -sh "$dest" | awk '{print $1}'))"
}

ARCHES=("$@")
[ ${#ARCHES[@]} -eq 0 ] && ARCHES=(arm64 x64)
for a in "${ARCHES[@]}"; do build_arch "$a"; done
