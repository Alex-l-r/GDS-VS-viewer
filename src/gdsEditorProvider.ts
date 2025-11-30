import * as vscode from 'vscode';
import * as path from 'path';
import { PythonServerManager } from './pythonServerManager';

export class GdsEditorProvider implements vscode.CustomReadonlyEditorProvider, vscode.Disposable {
    private static readonly viewType = 'gdsViewer.gdsEditor';
    private serverManager: PythonServerManager;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly outputChannel: vscode.OutputChannel
    ) {
        this.serverManager = new PythonServerManager(outputChannel);
    }

    dispose(): void {
        this.outputChannel.appendLine('Disposing GdsEditorProvider, stopping all servers...');
        this.serverManager.stopAllServers();
    }

    async openCustomDocument(
        uri: vscode.Uri,
        openContext: vscode.CustomDocumentOpenContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CustomDocument> {
        return {
            uri,
            dispose: () => { }
        };
    }

    async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        // Configure webview options
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'src', 'kweb', 'static')),
                vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
            ]
        };

        // Start the Python server
        try {
            this.outputChannel.appendLine(`Starting Python server for file: ${document.uri.fsPath}`);
            const serverInfo = await this.serverManager.startServer(document.uri.fsPath);
            this.outputChannel.appendLine(`Python server started on port ${serverInfo.port}`);

            // Set up the webview content
            webviewPanel.webview.html = this.getWebviewContent(
                webviewPanel.webview,
                document.uri,
                serverInfo.port
            );

            // Clean up when the panel is closed
            webviewPanel.onDidDispose(() => {
                this.outputChannel.appendLine(`Webview closed for file: ${document.uri.fsPath}`);
                this.serverManager.stopServer(document.uri.fsPath);
            });

        } catch (error) {
            this.outputChannel.appendLine(`Error starting Python server: ${error}`);
            vscode.window.showErrorMessage(`Failed to start GDS viewer server: ${error}`);
            
            // Show error in webview
            webviewPanel.webview.html = this.getErrorWebviewContent(String(error));
        }
    }

    private getWebviewContent(
        webview: vscode.Webview,
        fileUri: vscode.Uri,
        port: number
    ): string {
        const fileName = path.basename(fileUri.fsPath);
        const wsUrl = `ws://localhost:${port}`;
        
        // Get URIs for static resources
        const staticPath = vscode.Uri.file(
            path.join(this.context.extensionPath, 'src', 'kweb', 'static')
        );
        
        const bootstrapCssUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(staticPath.fsPath, 'bootstrap', 'bootstrap.min.css'))
        );
        const customCssUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(staticPath.fsPath, 'custom.css'))
        );
        const bootstrapJsUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(staticPath.fsPath, 'bootstrap', 'bootstrap.bundle.min.js'))
        );
        const viewerJsUri = webview.asWebviewUri(
            vscode.Uri.file(path.join(staticPath.fsPath, 'viewer.js'))
        );

        return `<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
        style-src ${webview.cspSource} 'unsafe-inline'; 
        script-src ${webview.cspSource} 'unsafe-inline'; 
        img-src ${webview.cspSource} data: blob:;
        connect-src ws://localhost:* http://localhost:*;">
    <title>GDS Viewer - ${fileName}</title>
    <link rel="stylesheet" href="${bootstrapCssUri}">
    <link rel="stylesheet" href="${customCssUri}">
    <script type="text/javascript" src="${bootstrapJsUri}"></script>
</head>
<body>
    <div class="container-fluid h-100" id="viewer-panel">
        <div class="row h-100 p-2" id="layout">
            <div class="col-10 rounded shadow d-flex flex-column position-relative h-100 ps-0 pe-1" id="layout-view">
                <canvas class="rounded shadow canvas-container h-100 w-100"
                        style="min-width: 100px; min-height: 100px"
                        id="layout_canvas"></canvas>
                <div class="position-absolute top-0 start-1 p-4 row w-100 overflow-hidden" id="floating-buttons">
                    <div id="modes" class="col m-0"></div>
                    <div id="menu" class="col m-0 px-2 text-end"></div>
                </div>
            </div>
            <div id="rightpanel" role="tablist" class="col-2 rounded shadow bg-default overflow-auto h-100 p-0 ps-1">
                <ul class="nav nav-tabs" id="navigator" role="tablist">
                    <li class="nav-item">
                        <button class="nav-link active" id="layers-tab" data-bs-toggle="tab"
                                data-bs-target="#layers-tab-pane" type="button" role="tab"
                                aria-controls="layers-tab-pane" aria-selected="true">Layers</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" id="cells-tab" data-bs-toggle="tab"
                                data-bs-target="#cells-tab-pane" type="button" role="tab"
                                aria-controls="cells-tab-pane" aria-selected="false">Cells</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" id="metainfo-tab" data-bs-toggle="tab"
                                data-bs-target="#metainfo-tab-pane" type="button" role="tab"
                                aria-controls="metainfo-tab-pane" aria-selected="false" hidden>Cell MetaInfo</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" id="rdb-tab" data-bs-toggle="tab"
                                data-bs-target="#rdb-tab-pane" type="button" role="tab"
                                aria-controls="rdb-tab-pane" aria-selected="false" hidden>RDB</button>
                    </li>
                </ul>
                <div class="tab-content" id="rightpanel-content">
                    <div class="tab-pane fade show active" id="layers-tab-pane" role="tabpanel"
                         aria-labelledby="layers-tab" tabindex="0">
                        <div id="layer-buttons">
                            <div class="form-check form-switch ps-2">
                                <input class="form-check-input ms-0 ps-0" type="checkbox" role="switch"
                                       id="layerEmptySwitch" checked>
                                <label class="form-check-label ps-2" for="layerEmptySwitch">Hide Empty Layers</label>
                            </div>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="cells-tab-pane" role="tabpanel"
                         aria-labelledby="cells-tab" tabindex="0"></div>
                    <div class="tab-pane fade" id="metainfo-tab-pane" role="tabpanel"
                         aria-labelledby="metainfo-tab" tabindex="0"></div>
                    <div class="tab-pane fade" id="rdb-tab-pane" role="tabpanel"
                         aria-labelledby="rdb-tab" tabindex="0">
                        <div class="position-relative">
                            <div class="form-floating my-1">
                                <input type="text" class="form-control z-0" id="rdbCategory"
                                       oninput="filterCategories(this);" onfocus="categoryFocus(event);"
                                       onfocusout="categoryFocusOut(event);" placeholder="...">
                                <label class="z-0" for="floatingInput">Filter by Category</label>
                            </div>
                            <select class="form-select position-absolute bottom-end-0 z-2 bg-light-subtle"
                                    onchange="selectCategory(event)" size="5" id="rdbCategoryOptions"
                                    onfocusout="categoryFocusOut(event);" hidden></select>
                        </div>
                        <div class="position-relative">
                            <div class="form-floating my-1">
                                <input type="text" class="form-control z-0" id="rdbCell"
                                       oninput="filterCells(this);" onfocus="cellFocus(event);"
                                       onfocusout="cellFocusOut(event);" placeholder="...">
                                <label class="z-0" for="floatingPassword">Filter by Cell</label>
                            </div>
                            <select class="form-select position-absolute bottom-end-0 z-2 bg-light-subtle"
                                    onchange="selectCell(event);" size="5" id="rdbCellOptions"
                                    onfocusout="cellFocusOut(event);" hidden></select>
                        </div>
                        <select class="form-select my-1" onchange="requestItemDrawings();" multiple
                                id="rdbItems"></select>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        var ws_url = "${wsUrl}";
        var params = new URLSearchParams({file: "${fileName}"});
    </script>
    <script type="text/javascript" src="${viewerJsUri}"></script>
</body>
</html>`;
    }

    private getErrorWebviewContent(errorMessage: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error Loading GDS File</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
        }
        .error-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid var(--vscode-errorForeground);
            border-radius: 4px;
            background-color: var(--vscode-inputValidation-errorBackground);
        }
        h1 {
            color: var(--vscode-errorForeground);
        }
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
        .requirements {
            margin-top: 20px;
            padding: 10px;
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>Failed to Load GDS Viewer</h1>
        <p>The GDS viewer could not be started. This extension requires Python with KLayout installed.</p>
        
        <h2>Error Details:</h2>
        <pre>${errorMessage}</pre>
        
        <div class="requirements">
            <h3>Requirements:</h3>
            <ol>
                <li>Python 3.11 or higher installed and available in PATH</li>
                <li>KLayout Python module installed: <code>pip install klayout</code></li>
                <li>FastAPI installed: <code>pip install fastapi uvicorn[standard]</code></li>
                <li>Other dependencies: <code>pip install jinja2 pydantic_extra_types</code></li>
            </ol>
            <p>Or install all dependencies from the extension directory:</p>
            <pre>pip install -e .</pre>
        </div>
    </div>
</body>
</html>`;
    }
}
