#!/usr/bin/env python3
"""
Validation script for GDS Viewer VS Code Extension
Checks that all Python dependencies are correctly installed
"""

import sys
from pathlib import Path

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'
BOLD = '\033[1m'

def check_module(module_name, import_name=None):
    """Check if a Python module is installed and importable."""
    if import_name is None:
        import_name = module_name
    
    try:
        __import__(import_name)
        print(f"{GREEN}✓{RESET} {module_name}")
        return True
    except ImportError as e:
        print(f"{RED}✗{RESET} {module_name} - {e}")
        return False

def main():
    print(f"\n{BOLD}=== GDS Viewer Extension - Dependency Check ==={RESET}\n")
    
    # Check Python version
    print(f"{BOLD}Python Version:{RESET}")
    version = sys.version_info
    if version.major == 3 and version.minor >= 11:
        print(f"{GREEN}✓{RESET} Python {version.major}.{version.minor}.{version.micro}")
    else:
        print(f"{RED}✗{RESET} Python {version.major}.{version.minor}.{version.micro}")
        print(f"{YELLOW}  Warning: Python 3.11+ is recommended{RESET}")
    
    # Check required modules
    print(f"\n{BOLD}Required Python Packages:{RESET}")
    
    required_modules = [
        ('klayout', 'klayout.db'),
        ('klayout.lay', 'klayout.lay'),
        ('klayout.rdb', 'klayout.rdb'),
        ('fastapi', 'fastapi'),
        ('uvicorn', 'uvicorn'),
        ('jinja2', 'jinja2'),
        ('pydantic', 'pydantic'),
        ('pydantic_extra_types', 'pydantic_extra_types'),
    ]
    
    all_ok = True
    for display_name, import_name in required_modules:
        if not check_module(display_name, import_name):
            all_ok = False
    
    # Check project structure
    print(f"\n{BOLD}Project Structure:{RESET}")
    
    required_paths = [
        ('src/extension.ts', 'Extension entry point'),
        ('src/gdsEditorProvider.ts', 'Custom editor provider'),
        ('src/pythonServerManager.ts', 'Python server manager'),
        ('src/kweb/vscode_server.py', 'VS Code server script'),
        ('src/kweb/layout_server.py', 'Layout server'),
        ('src/kweb/static/viewer.js', 'Viewer JavaScript'),
        ('package.json', 'Extension manifest'),
        ('tsconfig.json', 'TypeScript config'),
    ]
    
    for path, description in required_paths:
        full_path = Path(__file__).parent / path
        if full_path.exists():
            print(f"{GREEN}✓{RESET} {description}")
        else:
            print(f"{RED}✗{RESET} {description} - Not found: {path}")
            all_ok = False
    
    # Check compiled output
    print(f"\n{BOLD}Compiled Output:{RESET}")
    
    out_files = [
        'out/extension.js',
        'out/gdsEditorProvider.js',
        'out/pythonServerManager.js',
    ]
    
    for path in out_files:
        full_path = Path(__file__).parent / path
        if full_path.exists():
            print(f"{GREEN}✓{RESET} {path}")
        else:
            print(f"{YELLOW}⚠{RESET} {path} - Not compiled yet")
            print("   Run: npm run compile")
    
    # Summary
    print(f"\n{BOLD}=== Summary ==={RESET}\n")
    
    if all_ok:
        print(f"{GREEN}{BOLD}✓ All dependencies are installed!{RESET}")
        print(f"\n{BOLD}Next steps:{RESET}")
        print("1. Open this folder in VS Code")
        print("2. Press F5 to launch Extension Development Host")
        print("3. Open a .gds or .oas file in the new window")
        print("4. The GDS Viewer should automatically open!")
    else:
        print(f"{RED}{BOLD}✗ Some dependencies are missing{RESET}")
        print(f"\n{BOLD}To install missing dependencies:{RESET}")
        print("  pip install -e .")
        print("  npm install")
        print("  npm run compile")
    
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
