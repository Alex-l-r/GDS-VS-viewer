import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as net from 'net';

interface ServerInfo {
    port: number;
    process: cp.ChildProcess;
}

interface PythonCheckResult {
    valid: boolean;
    pythonPath: string;
    error?: string;
}

export class PythonServerManager {
    private servers: Map<string, ServerInfo> = new Map();
    private basePort = 8765;

    constructor(private readonly outputChannel: vscode.OutputChannel) {}

    async startServer(filePath: string): Promise<ServerInfo> {
        // Check if server already exists for this file
        const existing = this.servers.get(filePath);
        if (existing) {
            this.outputChannel.appendLine(`Reusing existing server for ${filePath}`);
            return existing;
        }

        // Find available port
        const port = await this.findAvailablePort(this.basePort);
        this.outputChannel.appendLine(`Found available port: ${port}`);

        // Get extension path
        const extensionPath = path.dirname(path.dirname(__filename));
        const pythonScriptPath = path.join(extensionPath, 'src', 'kweb', 'vscode_server.py');
        
        this.outputChannel.appendLine(`Extension path: ${extensionPath}`);
        this.outputChannel.appendLine(`Python script path: ${pythonScriptPath}`);
        this.outputChannel.appendLine(`File to view: ${filePath}`);

        // Start Python server
        const pythonCommand = this.getPythonCommand();
        this.outputChannel.appendLine(`Using Python command: ${pythonCommand}`);
        
        const serverProcess = cp.spawn(pythonCommand, [
            pythonScriptPath,
            '--file', filePath,
            '--port', port.toString()
        ], {
            cwd: extensionPath,
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1'
            }
        });

        // Handle server output
        serverProcess.stdout?.on('data', (data: Buffer) => {
            this.outputChannel.appendLine(`[Python Server] ${data.toString()}`);
        });

        serverProcess.stderr?.on('data', (data: Buffer) => {
            this.outputChannel.appendLine(`[Python Server Error] ${data.toString()}`);
        });

        serverProcess.on('error', (error: Error) => {
            this.outputChannel.appendLine(`[Python Server Error] Failed to start: ${error.message}`);
            this.servers.delete(filePath);
        });

        serverProcess.on('exit', (code: number | null, signal: string | null) => {
            this.outputChannel.appendLine(`[Python Server] Process exited with code ${code}, signal ${signal}`);
            this.servers.delete(filePath);
        });

        // Wait for server to be ready
        await this.waitForServer(port);

        const serverInfo: ServerInfo = {
            port,
            process: serverProcess
        };

        this.servers.set(filePath, serverInfo);
        return serverInfo;
    }

    stopServer(filePath: string): void {
        const serverInfo = this.servers.get(filePath);
        if (serverInfo) {
            this.outputChannel.appendLine(`Stopping server for ${filePath}`);
            serverInfo.process.kill();
            this.servers.delete(filePath);
        }
    }

    stopAllServers(): void {
        this.outputChannel.appendLine('Stopping all servers');
        for (const [filePath, serverInfo] of this.servers.entries()) {
            serverInfo.process.kill();
        }
        this.servers.clear();
    }

    private getPythonCommand(): string {
        // Check if user has configured a specific Python path
        const config = vscode.workspace.getConfiguration('gdsViewer');
        const configuredPython = config.get<string>('pythonPath');
        if (configuredPython) {
            return configuredPython;
        }

        // Try to use Python extension's interpreter path
        const pythonExtConfig = vscode.workspace.getConfiguration('python');
        const pythonExtPath = pythonExtConfig.get<string>('defaultInterpreterPath');
        if (pythonExtPath) {
            return pythonExtPath;
        }

        // Default based on platform
        return process.platform === 'win32' ? 'python' : 'python3';
    }

    /**
     * Verify Python installation and required packages
     */
    async verifyPythonSetup(): Promise<PythonCheckResult> {
        const pythonCommand = this.getPythonCommand();
        
        return new Promise((resolve) => {
            const checkScript = `
import sys
try:
    import klayout.db
    import klayout.lay
    import fastapi
    import uvicorn
    print("OK")
except ImportError as e:
    print(f"MISSING:{e.name}")
    sys.exit(1)
`;
            const proc = cp.spawn(pythonCommand, ['-c', checkScript], {
                timeout: 10000
            });

            let stdout = '';
            let stderr = '';

            proc.stdout?.on('data', (data: Buffer) => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', (data: Buffer) => {
                stderr += data.toString();
            });

            proc.on('error', (error: Error) => {
                resolve({
                    valid: false,
                    pythonPath: pythonCommand,
                    error: `Python not found: ${error.message}. Please install Python 3.11+ and ensure it's in your PATH.`
                });
            });

            proc.on('close', (code: number | null) => {
                if (code === 0 && stdout.trim() === 'OK') {
                    resolve({ valid: true, pythonPath: pythonCommand });
                } else {
                    const missingMatch = stdout.match(/MISSING:(.+)/);
                    const missingPackage = missingMatch ? missingMatch[1] : 'unknown';
                    resolve({
                        valid: false,
                        pythonPath: pythonCommand,
                        error: `Missing Python package: ${missingPackage}. Run: pip install klayout fastapi uvicorn[standard]`
                    });
                }
            });
        });
    }

    private async findAvailablePort(startPort: number): Promise<number> {
        let port = startPort;
        while (port < startPort + 100) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
            port++;
        }
        throw new Error('No available ports found');
    }

    private isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.once('error', () => {
                resolve(false);
            });
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            server.listen(port, '127.0.0.1');
        });
    }

    private async waitForServer(port: number, timeout: number = 10000): Promise<void> {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (await this.isServerReady(port)) {
                this.outputChannel.appendLine(`Server is ready on port ${port}`);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error(`Server failed to start within ${timeout}ms`);
    }

    private isServerReady(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1000);
            socket.once('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.once('error', () => {
                resolve(false);
            });
            socket.once('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.connect(port, '127.0.0.1');
        });
    }
}
