#!/bin/bash
# InferShield Manual Integration Installer
# Quick setup for CLI scanner and git hooks

set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}   InferShield Manual Integration Setup${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check dependencies
echo "Checking dependencies..."
MISSING=""
for cmd in curl jq git; do
  if ! command -v $cmd &> /dev/null; then
    MISSING="$MISSING $cmd"
  fi
done

if [ -n "$MISSING" ]; then
  echo -e "${YELLOW}⚠️  Missing dependencies:$MISSING${NC}"
  echo ""
  echo "Install them with:"
  echo "  Mac:    brew install$MISSING"
  echo "  Ubuntu: sudo apt install$MISSING"
  echo ""
  exit 1
fi
echo -e "${GREEN}✅ All dependencies found${NC}"
echo ""

# Install CLI scanner
echo "Installing CLI scanner..."
INSTALL_DIR="$HOME/bin"
mkdir -p "$INSTALL_DIR"

cp scripts/infershield-scan "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/infershield-scan"

echo -e "${GREEN}✅ Installed: $INSTALL_DIR/infershield-scan${NC}"
echo ""

# Check PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo -e "${YELLOW}⚠️  $INSTALL_DIR not in PATH${NC}"
  echo ""
  echo "Add this to your ~/.bashrc or ~/.zshrc:"
  echo "  export PATH=\"\$HOME/bin:\$PATH\""
  echo ""
fi

# Install git hook (optional)
if git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Git repository detected!"
  echo ""
  read -p "Install pre-commit hook for this repo? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    HOOK_PATH=".git/hooks/pre-commit"
    
    if [ -f "$HOOK_PATH" ]; then
      echo -e "${YELLOW}⚠️  Pre-commit hook already exists${NC}"
      read -p "Overwrite? (y/n) " -n 1 -r
      echo ""
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipped git hook installation."
        HOOK_PATH=""
      fi
    fi
    
    if [ -n "$HOOK_PATH" ]; then
      cp scripts/pre-commit-hook "$HOOK_PATH"
      chmod +x "$HOOK_PATH"
      echo -e "${GREEN}✅ Installed: $HOOK_PATH${NC}"
    fi
  else
    echo "Skipped git hook installation."
  fi
  echo ""
fi

# Configure environment
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}   Configuration${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -z "${INFERSHIELD_API_KEY:-}" ]; then
  echo -e "${YELLOW}⚠️  INFERSHIELD_API_KEY not set${NC}"
  echo ""
  echo "Get your API key:"
  echo "  1. Go to: http://localhost:8080/dashboard.html"
  echo "  2. Navigate to: API Keys"
  echo "  3. Create a new key"
  echo ""
  echo "Then add to ~/.bashrc or ~/.zshrc:"
  echo "  export INFERSHIELD_API_KEY='isk_live_...'"
  echo "  export INFERSHIELD_ENDPOINT='http://localhost:5000'"
  echo ""
else
  echo -e "${GREEN}✅ API key configured${NC}"
fi

if [ -z "${INFERSHIELD_ENDPOINT:-}" ]; then
  echo -e "${YELLOW}⚠️  INFERSHIELD_ENDPOINT not set (will use http://localhost:5000)${NC}"
  echo ""
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Installation complete!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Test it:"
echo "  echo 'const key=\"sk-test123\";' | infershield-scan"
echo ""
echo "Documentation:"
echo "  docs/MANUAL_INTEGRATION.md"
echo ""
