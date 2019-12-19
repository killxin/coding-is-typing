import * as path from 'path';
import * as vscode from 'vscode';
import { appName, appTitle } from './extension';
var player = require('play-sound')({});

/**
 * Manages codeTyping webview panels
 */
export class CodeTypingPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: CodeTypingPanel | undefined;
	public static readonly viewType = appName + '.view';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		// If we already have a panel, dispose it.
		if (CodeTypingPanel.currentPanel) {
			CodeTypingPanel.currentPanel.dispose();
		}
		// Create a new panel.
		const panel = vscode.window.createWebviewPanel(
			CodeTypingPanel.viewType,
			appTitle,
			column || vscode.ViewColumn.One,
			{
				// Enable javascript in the webview
				enableScripts: true,
				// And restrict the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [
					vscode.Uri.file(path.join(extensionPath, 'node_modules')),
                    vscode.Uri.file(path.join(extensionPath, 'media')),
                ]
			}
		);
		CodeTypingPanel.currentPanel = new CodeTypingPanel(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		CodeTypingPanel.currentPanel = new CodeTypingPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'counting':
						let status = message.status;
						vscode.window.setStatusBarMessage(status);
						return;
					case 'keyNoise':
						let keypress_path = path.join(this._extensionPath, 'media', 'audio', 'key.mp3');
						player.play(keypress_path);
						return;
					case 'backNoise':
						let backpress_path = path.join(this._extensionPath, 'media', 'audio', 'back.mp3');
						player.play(backpress_path);
						return;
					case 'enterNoise':
						let enterpress_path = path.join(this._extensionPath, 'media', 'audio', 'enter.mp3');
						player.play(enterpress_path);
						return;
				}
			},
			null,
			this._disposables
		);
    }
    
    private _update() {
        const webview = this._panel.webview;
        const html = this._getHtmlForWebview(webview);
		webview.html = html;
		const extensionUri = webview.asWebviewUri(vscode.Uri.file(this._extensionPath)) + '';
		let languageId = 'javascript';
		let text = [
			'function x() {',
			'\tconsole.log("Hello world!");',
			'}'
		].join('\n');
		let fileName = "myTest.js";
		let editor = vscode.window.activeTextEditor;
		if(editor){
			languageId = editor.document.languageId;
			text = editor.document.getText().toString();
			fileName = editor.document.fileName;
		}
		this._panel.title = fileName.substring(fileName.lastIndexOf('/') + 1) + '.ct';
		webview.postMessage({
			command: 'config',
			extensionUri: extensionUri,
			text: text,
			lang: languageId,
		});
	}

	public dispose() {
		CodeTypingPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}
	
	private _getHtmlForWebview(webview: vscode.Webview) {
        // Local path to main script run in the webview
        const monacoLoaderPath = vscode.Uri.file(
            path.join(this._extensionPath, 'node_modules', 'monaco-editor', 'min', 'vs', 'loader.js')
		);
		const monacoLoaderUri = webview.asWebviewUri(monacoLoaderPath);

		const mediaPath = vscode.Uri.file(
			path.join(this._extensionPath, 'media')
		);
		const mediaRootUri = webview.asWebviewUri(mediaPath);

		return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <!--
                Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src ${webview.cspSource} data: file:; img-src ${webview.cspSource} data: file: https:; script-src ${webview.cspSource} data: file: https:; style-src 'unsafe-inline' ${webview.cspSource} data: file: https:;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${appTitle}</title>
            </head>
			<body>
				<h1>Coding is typing</h1>
				<div>
					<input type="checkbox" id="sound">sound</input>
					<input type="button" id="play" value="start" />
					<input type="button" id="pause" value="stop" />
					<input type="button" id="reset" value="reset" />
					<span id="status"></span>
				</div>
				<br />
				<div id="container" style="width:800px;height:500px;border:1px solid grey"></div>
			</body>
			<link rel="stylesheet" type="text/css" href="${mediaRootUri}/main.css" >
			<script src="${monacoLoaderUri}"></script>
			<script src="${mediaRootUri}/main.js"></script>
            </html>`;
	}
}
