# Build script for GDS Viewer VS Code Extension
# PowerShell script for Windows

Write-Host "=== Building GDS Viewer Extension ===" -ForegroundColor Green

# Check if Node.js is installed
Write-Host "`nChecking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if Python is installed
Write-Host "`nChecking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "✓ Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python from https://python.org/" -ForegroundColor Red
    exit 1
}

# Check if KLayout is installed
Write-Host "`nChecking KLayout installation..." -ForegroundColor Yellow
try {
    python -c "import klayout.db; import klayout.lay; print('KLayout OK')" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ KLayout Python module installed" -ForegroundColor Green
    } else {
        throw "KLayout not found"
    }
} catch {
    Write-Host "✗ KLayout not installed. Install with: pip install klayout" -ForegroundColor Red
    Write-Host "  Continuing anyway (install it before running the extension)..." -ForegroundColor Yellow
}

# Install Node.js dependencies
Write-Host "`nInstalling Node.js dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install Node.js dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js dependencies installed" -ForegroundColor Green

# Compile TypeScript
Write-Host "`nCompiling TypeScript..." -ForegroundColor Yellow
npm run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ TypeScript compilation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ TypeScript compiled successfully" -ForegroundColor Green

Write-Host "`n=== Build Complete ===" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Press F5 in VS Code to run the extension" -ForegroundColor White
Write-Host "2. Or run: npm run watch (to watch for changes)" -ForegroundColor White
Write-Host "3. In the Extension Development Host, open a .gds or .oas file" -ForegroundColor White

# Check if Python dependencies are installed
Write-Host "`nPython Dependencies Check:" -ForegroundColor Cyan
$requiredPackages = @("fastapi", "uvicorn", "jinja2", "pydantic_extra_types")
$missing = @()

foreach ($package in $requiredPackages) {
    try {
        python -c "import $package" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $package" -ForegroundColor Green
        } else {
            $missing += $package
            Write-Host "✗ $package" -ForegroundColor Red
        }
    } catch {
        $missing += $package
        Write-Host "✗ $package" -ForegroundColor Red
    }
}

if ($missing.Count -gt 0) {
    Write-Host "`nMissing Python packages. Install with:" -ForegroundColor Yellow
    Write-Host "pip install -e ." -ForegroundColor White
    Write-Host "Or individually:" -ForegroundColor White
    Write-Host "pip install $($missing -join ' ')" -ForegroundColor White
}
