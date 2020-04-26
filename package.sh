#!/bin/bash
echo "-- Generate SHA256 checksums"
find ./last-updated.sketchplugin -type f -print0  | xargs -0 shasum --algorithm 256 >> SHA256SUMS
shasum --algorithm 256 LICENSE README.md >> SHA256SUMS

echo "-- Pack to zip archive"
ZIPFILE=sketch-last-updated-${RELEASE_VERSION}.zip
zip --recurse-paths -9 ${ZIPFILE} last-updated.sketchplugin LICENSE README.md
echo "- File created: ${ZIPFILE}"

echo "-- Add SHA265 checksum of package"
shasum --algorithm 256 ${ZIPFILE}
shasum --algorithm 256 ${ZIPFILE} > ${ZIPFILE}.sha256sum
echo "- File created: ${ZIPFILE}.sha256sum"

rm -rf SHA256SUMS