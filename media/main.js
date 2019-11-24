// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();
    const oldState = vscode.getState();
	console.log('oldState:' + oldState);
	// Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
		const message = event.data; // The json data that the extension sent
		console.log(message);
        switch (message.command) {
            case 'config':
				extensionUri = message.data.extensionUri;
				lang = message.data.lang;
				text = message.data.text;
				textLines = text.split('\n');
				break;
		}
		update();
	});
}());

var extensionUri, text, lang;
var curPos, curDecorations, textLines;

function update() {
	require.config({ paths: { 'vs': extensionUri + '/node_modules/monaco-editor/min/vs' }});
	require(['vs/editor/editor.main'], function() {
		let editor = monaco.editor.create(document.getElementById('container'), {
			value: text,
			language: lang
		});
		// disable backspace, tab
		editor.addCommand(monaco.KeyCode.Backspace, ()=>{});
		editor.addCommand(monaco.KeyCode.Tab, ()=>{});
		editor.onKeyDown((e) => {
			e.preventDefault();
			// console.log(e);
			let newPos = _updatePos(e.browserEvent);
			if(newPos){
				editor.setPosition(newPos);
			}
		});
		editor.onDidChangeCursorPosition((e) => {
			curPos = e.position;
			_updateLine(editor);
		});
		editor.focus();
		curPos = { lineNumber: 1, column: 1 };
		editor.setPosition(curPos);
		_updateLine(editor);
	});
}

function _updateLine(editor){
	let line = textLines[curPos.lineNumber - 1];
	curDecorations = editor.deltaDecorations(curDecorations || [], [
		{ 
			range: new monaco.Range(
				curPos.lineNumber, 1,
				curPos.lineNumber, 1), 
			options: { isWholeLine: true, linesDecorationsClassName: 'myLineDecoration' }
		}, { 
			range: new monaco.Range(
				curPos.lineNumber, curPos.column,
				curPos.lineNumber, line.length + 1), 
			  options: { inlineClassName: 'myInlineDecoration' }
		},
	]);
}

function _updatePos(event){
	let key = event.key;
	if(key === 'Tab'){
		key = '\t';
	}
	let curLine = textLines[curPos.lineNumber - 1];
	let curKey = curLine[curPos.column - 1];
	console.log(key + '_' + curKey + '_' + curLine);
	if(key === curKey) {
		if(curPos.column === curLine.length) {
			let nextLineNum = curPos.lineNumber + 1;
			let nextLine;
			while(nextLineNum <= textLines.length) {
				nextLine = textLines[nextLineNum - 1];
				if(nextLine.length > 0){
					return { lineNumber: nextLineNum, column: 1 };
				}
				// skip empty line
				nextLineNum++;
			}
			// ending
			return { lineNumber: curPos.lineNumber, column: textLines[curPos.lineNumber - 1].length + 1 };
		} else {
			return { lineNumber: curPos.lineNumber, column: curPos.column + 1 };
		}
	} else if(key === 'Backspace') {
		if(curPos.column === 1) {
			let nextLineNum = curPos.lineNumber - 1;
			let nextLine;
			while(nextLineNum >= 1) {
				nextLine = textLines[nextLineNum - 1];
				if(nextLine.length > 0) {
					return { lineNumber: nextLineNum, column: nextLine.length };
				}
				// skip empty line
				nextLineNum--;
			}
		} else {
			return { lineNumber: curPos.lineNumber, column: curPos.column - 1 };
		}
	}
	return undefined;
}

// require.config({ paths: { 'vs': 'node_modules/monaco-editor/min/vs' }});
// require(['vs/editor/editor.main'], function() {
// 	console.log('xxxx');
// 	var editor = monaco.editor.create(document.getElementById('container'), {
// 		value: [
// 			'function x() {',
// 			'\tconsole.log("Hello world!");',
// 			'}'
// 		].join('\n'),
// 		language: 'javascript'
// 	});
// });
// console.log('yyyy');
