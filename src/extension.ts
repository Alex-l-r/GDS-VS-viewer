import * as vscode from 'vscode';
import { GdsEditorProvider } from './gdsEditorProvider';

let outputChannel: vscode.OutputChannel;
let provider: GdsEditorProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('GDS Viewer extension is now active');
    
    // Create output channel for logging
    outputChannel = vscode.window.createOutputChannel('GDS VS-Viewer');
    context.subscriptions.push(outputChannel);
    
    // Register the custom editor provider
    provider = new GdsEditorProvider(context, outputChannel);
    
    // Add provider to subscriptions for proper disposal
    context.subscriptions.push(provider);
    
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'gdsViewer.gdsEditor',
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            }
        )
    );
    
    // Register command to open GDS files
    context.subscriptions.push(
        vscode.commands.registerCommand('gdsViewer.openFile', async () => {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: {
                    'GDS Files': ['gds', 'oas']
                }
            });
            
            if (fileUri && fileUri[0]) {
                await vscode.commands.executeCommand('vscode.openWith', fileUri[0], 'gdsViewer.gdsEditor');
            }
        })
    );
    
    outputChannel.appendLine('GDS Viewer extension activated successfully');
}

export function deactivate() {
    // Provider disposal is handled by context.subscriptions
    if (outputChannel) {
        outputChannel.appendLine('GDS Viewer extension deactivated');
    }
}
