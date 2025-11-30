#!/bin/bash
# Build script for GDS Viewer VS Code Extension

echo "=== Building GDS Viewer Extension ==="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "\n${YELLOW}Checking Node.js installation...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js version: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

# Check if Python is installed
echo -e "\n${YELLOW}Checking Python installation...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Python version: $PYTHON_VERSION${NC}"
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    echo -e "${GREEN}✓ Python version: $PYTHON_VERSION${NC}"
    PYTHON_CMD="python"
else
    echo -e "${RED}✗ Python not found. Please install Python from https://python.org/${NC}"
    exit 1
fi

# Check if KLayout is installed
echo -e "\n${YELLOW}Checking KLayout installation...${NC}"
if $PYTHON_CMD -c "import klayout.db; import klayout.lay; print('KLayout OK')" 2>/dev/null; then
    echo -e "${GREEN}✓ KLayout Python module installed${NC}"
else
    echo -e "${RED}✗ KLayout not installed. Install with: pip install klayout${NC}"
    echo -e "${YELLOW}  Continuing anyway (install it before running the extension)...${NC}"
fi

# Install Node.js dependencies
echo -e "\n${YELLOW}Installing Node.js dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install Node.js dependencies${NC}"
    exit 1
fi

# Compile TypeScript
echo -e "\n${YELLOW}Compiling TypeScript...${NC}"
if npm run compile; then
    echo -e "${GREEN}✓ TypeScript compiled successfully${NC}"
else
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== Build Complete ===${NC}"
echo -e "\n${CYAN}Next steps:${NC}"
echo -e "${NC}1. Press F5 in VS Code to run the extension${NC}"
echo -e "${NC}2. Or run: npm run watch (to watch for changes)${NC}"
echo -e "${NC}3. In the Extension Development Host, open a .gds or .oas file${NC}"

# Check if Python dependencies are installed
echo -e "\n${CYAN}Python Dependencies Check:${NC}"
REQUIRED_PACKAGES=("fastapi" "uvicorn" "jinja2" "pydantic_extra_types")
MISSING_PACKAGES=()

for package in "${REQUIRED_PACKAGES[@]}"; do
    if $PYTHON_CMD -c "import $package" 2>/dev/null; then
        echo -e "${GREEN}✓ $package${NC}"
    else
        echo -e "${RED}✗ $package${NC}"
        MISSING_PACKAGES+=("$package")
    fi
done

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo -e "\n${YELLOW}Missing Python packages. Install with:${NC}"
    echo -e "${NC}pip install -e .${NC}"
    echo -e "${NC}Or individually:${NC}"
    echo -e "${NC}pip install ${MISSING_PACKAGES[*]}${NC}"
fi
