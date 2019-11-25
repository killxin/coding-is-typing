
var editor, curPos, curDecorations;
var vscode, isCounting, charCount, durition;

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    vscode = acquireVsCodeApi();
    let oldState = vscode.getState();
	console.log('oldState:' + oldState);
	// Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
		const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case 'config':
				let extensionUri = message.extensionUri;
				let text = message.text;
				let lang = message.lang;
				init(extensionUri, text, lang);
				break;
		}
	});
	_resetCounting();
	document.getElementById('play').addEventListener('click', _startCounting);
	document.getElementById('pause').addEventListener('click', _stopCounting);
	document.getElementById('reset').addEventListener('click', _resetCounting);
}());

function init(extensionUri, text, lang) {
	require.config({ paths: { 'vs': extensionUri + '/node_modules/monaco-editor/min/vs' }});
	require(['vs/editor/editor.main'], function() {
		editor = monaco.editor.create(document.getElementById('container'), {
			value: text,
			language: lang
		});
		// disable backspace, tab
		editor.addCommand(monaco.KeyCode.Backspace, ()=>{});
		editor.addCommand(monaco.KeyCode.Tab, ()=>{});
		editor.addCommand(monaco.KeyCode.Escape, () => {
			if(isCounting){
				_stopCounting();
			} else {
				_startCounting();
			}
		});
		editor.onKeyDown((e) => {
			e.preventDefault();
			let newPos = _updatePos(e.browserEvent);
			if(newPos){
				editor.setPosition(newPos);
				// display current position in center
				editor.revealPositionInCenter(curPos);
			}
		});
		editor.onDidChangeCursorPosition((e) => {
			curPos = e.position;
			_updateLine();
		});
		editor.focus();
		curPos = { lineNumber: 1, column: 1 };
		editor.setPosition(curPos);
		_updateLine();
	});
}

function _getTextLines(){
	return editor.getValue().split('\n');
}

function _updateLine(){
	let textLines = _getTextLines();
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
	let textLines = _getTextLines();
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
			_stopCounting();
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

function _startCounting(){
	isCounting = true;
	document.getElementById('play').style.display = 'none';
	document.getElementById('pause').style.display = '';
	_updateStatus();
	setCounting();
}

function _stopCounting(){
	isCounting = false;
	document.getElementById('play').style.display = '';
	document.getElementById('pause').style.display = 'none';
	_updateStatus();
}

function _resetCounting(){
	charCount = 0;
	durition = 0;
	isCounting = false;
	document.getElementById('play').style.display = '';
	document.getElementById('pause').style.display = 'none';
	_updateStatus();
}

function _updateStatus(){
	let secDurition = durition / 1000;
	let speed = charCount / secDurition ;
	let status = charCount + ' chars in ' 
				+ secDurition.toFixed(2) + ' seconds with speed ' 
				+ speed.toFixed(2) + ' c/s' ;
	// show msg in status bar
	document.getElementById('status').innerHTML = status;
	// send msg to vscode
	vscode.postMessage({
		command: 'counting',
		status: status,
	});
	if(editor){
		editor.focus();
		editor.setPosition(curPos);
	}
}

function setCounting(){
	if(isCounting){
		setTimeout(()=>{
			durition += 200;
			_updateStatus();
			setCounting();
		}, 100 /* ms */);
	}
}
