#!/bin/bash
# Generate PWA icons from an SVG
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/icons"
mkdir -p "$DIR"

# Create a simple SVG icon (wallet/expense theme)
cat > "$DIR/icon.svg" << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#171717"/>
  <text x="256" y="340" font-family="system-ui, sans-serif" font-size="280" font-weight="700" fill="#fff" text-anchor="middle">₹</text>
</svg>
SVG

# Generate PNG icons
for size in 192 512; do
  convert -background none "$DIR/icon.svg" -resize "${size}x${size}" "$DIR/icon-${size}.png"
  # Maskable icons need extra padding (safe zone is 80% of icon)
  convert -background "#171717" -gravity center "$DIR/icon.svg" -resize "$((size * 70 / 100))x$((size * 70 / 100))" -extent "${size}x${size}" "$DIR/icon-maskable-${size}.png"
done

# Generate apple-touch-icon (180x180)
convert -background none "$DIR/icon.svg" -resize "180x180" "$DIR/apple-touch-icon.png"

echo "Icons generated in $DIR"
ls -la "$DIR"/*.png
