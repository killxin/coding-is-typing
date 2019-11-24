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
				let extensionUri = message.data.extensionUri;
				let text = message.data.text;
				let lang = message.data.lang;
				init(extensionUri, text, lang);
				break;
		}
	});
}());

var curPos, curDecorations;
var isCounting = false, charCount, startTime;

function init(extensionUri, text, lang) {
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
			let newPos = _updatePos(e.browserEvent, _getTextLines(editor));
			if(newPos){
				editor.setPosition(newPos);
				// display current position in center
				editor.revealPositionInCenter(curPos);
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

function _getTextLines(editor){
	return editor.getValue().split('\n');
}

function _updateLine(editor){
	let textLines = _getTextLines(editor);
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

function _updatePos(event, textLines){
	let key = event.key;
	if(key === 'Escape'){
		isCounting = !isCounting;
		if(isCounting){
			charCount = 0;
			startTime = new Date();
		}
		setCounting();
		return;
	}
	if(key === 'Tab'){
		key = '\t';
	}
	let curLine = textLines[curPos.lineNumber - 1];
	let curKey = curLine[curPos.column - 1];
	console.log(key + '_' + curKey + '_' + curLine);
	if(key === curKey) {
		charCount++;
		if(curPos.column === curLine.length) {
			let nextLineNum = curPos.lineNumber + 1;
			let nextLine;
			while(nextLineNum <= textLines.length) {
				nextLine = textLines[nextLineNum - 1];
				let trimLine = nextLine.trim();
				// skip start white spaces
				if(trimLine.length > 0){
					return { lineNumber: nextLineNum, column: nextLine.indexOf(trimLine[0]) + 1 };
				}
				// skip empty lines
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
				// skip empty lines
				nextLineNum--;
			}
		} else {
			return { lineNumber: curPos.lineNumber, column: curPos.column - 1 };
		}
	}
	return undefined;
}

function setCounting(){
	if(isCounting){
		setTimeout(()=>{
			let now = new Date();
			let durition = (now - startTime) / 1000 ; // seconds
			console.log(charCount + ' in ' + durition + ' seconds');
			// TODO: send msg to vscode
			setCounting();
		}, 2000 /* ms */);
	}
}
