#!/usr/bin/env bash
# Inicia o Vite escutando em todas interfaces e mostra o IP da LAN + QR code.
set -e

PORT="${PORT:-8080}"

# Detecta IP local (preferindo 192.168.* ou 10.*)
detect_ip() {
  if command -v ip >/dev/null 2>&1; then
    ip -4 addr show scope global | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1
  elif command -v ipconfig >/dev/null 2>&1; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null
  else
    hostname -I | awk '{print $1}'
  fi
}

LAN_IP="$(detect_ip)"
URL="http://${LAN_IP:-localhost}:${PORT}"

echo ""
echo "=========================================="
echo "  Acesso via Wi-Fi (mesma rede)"
echo "=========================================="
echo "  PC:      http://localhost:${PORT}"
echo "  Celular: ${URL}"
echo "=========================================="
echo ""

# QR Code (se qrcode-terminal estiver instalado)
if command -v npx >/dev/null 2>&1; then
  npx -y qrcode-terminal "${URL}" 2>/dev/null || true
fi

echo ""
echo "Dicas se o celular não conectar:"
echo "  1. PC e celular na MESMA rede Wi-Fi"
echo "  2. Desativar firewall do Windows na porta ${PORT}"
echo "  3. Use o IP, NUNCA o nome do PC (evita NXDOMAIN)"
echo ""

exec npx vite --host 0.0.0.0 --port "${PORT}"
