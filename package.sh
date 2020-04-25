#!/bin/bash
echo "-- Generate SHA256 checksums"
find ./last-updated.sketchplugin -type f -print0  | xargs -0 shasum --algorithm 256 >> SHA256SUMS
shasum --algorithm 256 LICENSE README.md >> SHA256SUMS

echo "-- Pack to zip archive"
zip -9 last-updated.zip last-updated.sketchplugin LICENSE README.md

echo "-- Show SHA265 checksum of package"
ZIPFILE=last-updated.zip
shasum --algorithm 256 ${ZIPFILE} > ${ZIPFILE}.sha256sums

rm -rf SHA256SUMS