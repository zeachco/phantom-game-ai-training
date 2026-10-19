#!/usr/bin/env bash
# Generate favicons from src/assets/car.png using ImageMagick
# Fit/contain (no stretch): scale to fit within square, then center on canvas (letterbox)

set -euo pipefail

SRC="/home/olivier/dev/phantom-game-ai-training/src/assets/car.png"
OUT_DIR="/home/olivier/dev/phantom-game-ai-training/public"
SIZES=(16 32 48 180 192 512)

mkdir -p "$OUT_DIR"

echo "Generating favicons (fit/contain - no stretch, no crop) from $SRC"

for size in "${SIZES[@]}"; do
  out="${OUT_DIR}/favicon-${size}.png"
  # -resize without "^" fits the image inside the square preserving aspect ratio,
  # then -extent centers it on a square canvas (contain/fit, letterboxing if needed)
  magick "$SRC" -resize "${size}x${size}" -background none -gravity center -extent "${size}x${size}" "$out"
  echo "  ${size}x${size} -> $out"
done

# Create ICO file with multiple sizes (16, 32, 48) - fit/contain, no stretch
magick "$SRC" \
  \( -clone 0 -resize "16x16" -background none -gravity center -extent "16x16" \) \
  \( -clone 0 -resize "32x32" -background none -gravity center -extent "32x32" \) \
  \( -clone 0 -resize "48x48" -background none -gravity center -extent "48x48" \) \
  -delete 0 \
  "${OUT_DIR}/favicon.ico"
echo "  favicon.ico (16,32,48) -> ${OUT_DIR}/favicon.ico"

# Apple touch icon (180x180)
cp "${OUT_DIR}/favicon-180.png" "${OUT_DIR}/apple-touch-icon.png"
echo "  apple-touch-icon.png -> ${OUT_DIR}/apple-touch-icon.png"

# Android/Chrome manifest icons
cp "${OUT_DIR}/favicon-192.png" "${OUT_DIR}/icon-192.png"
cp "${OUT_DIR}/favicon-512.png" "${OUT_DIR}/icon-512.png"
echo "  icon-192.png, icon-512.png -> ${OUT_DIR}/"

echo "Done. Favicons generated in $OUT_DIR"