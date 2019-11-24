import * as vscode from 'vscode';
import { CodeTypingPanel } from './CodeTypingPanel';

export const appName = "codeTyping";
export const appTitle = "coding is typing";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand(appName + '.start', () => {
			CodeTypingPanel.createOrShow(context.extensionPath);
		})
	);
	
	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(CodeTypingPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				CodeTypingPanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}
}
