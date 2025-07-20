#!/bin/bash
# setup_certs.sh: Generate self-signed SSL certificates for Docker internal HTTPS (CN=fintrack-api, SAN=fintrack-api)

CERT_DIR="$(dirname "$0")/certs"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"

mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout "$KEY_FILE" -out "$CERT_FILE" \
  -subj "/CN=fintrack-api" \
  -addext "subjectAltName=DNS:fintrack-api"

if [[ $? -eq 0 ]]; then
  echo "Self-signed certificate and key with SAN=fintrack-api generated in $CERT_DIR."
else
  echo "Failed to generate certificates." >&2
  exit 1
fi
