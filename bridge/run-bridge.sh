#!/usr/bin/env bash
# Keeps the bridge up: it exits after /api/logout or a QR timeout and comes
# back with a fresh pairing QR.
cd "$(dirname "$0")"
while true; do
  ./whatsapp-bridge
  echo "bridge exited, restarting in 2s"
  sleep 2
done
