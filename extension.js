const vscode = require('vscode');
const esprima = require('esprima');
const toProtect = "_uniq";
const toProtectReplacer = toProtect + "2";
const uniqKey = toProtect + "_" // _uniq_key_";
const openToClose = {
	"{" : "}",
	"(" : ")",
	"[" : "]"
}

const closeToOpen = {
	"}": "{",
	")": "(",
	"]": "["
}

const rgx = new RegExp(toProtect, "g");
function protectUniqKey(str) {
	return str.replace(rgx, toProtectReplacer);
}
/**
 * return an array of syntax element returned by esprima 
 * or if our cursor is not after a parsed coma then the part from 
 * the last parsed coma til our cursor is split by letter
 */
function getParsedCodeBeforeCursor() {
	// The code you place here will be executed every time your command is executed
	var editor = vscode.window.activeTextEditor;
	if (!editor) {
		return; // No open text editor
	}

	var start = editor.selection.start;
	let textOrCode = editor.document.getText().split("\n");
	textOrCode[start.line] = 
		protectUniqKey(textOrCode[start.line].slice(0, start.character))
		+ " " + uniqKey + " " // we allow us to find where is the cursor in the string after parsing the code
		+ protectUniqKey(textOrCode[start.line].slice(start.character))
	;
	let parsedCode = esprima.tokenize(textOrCode.join("\n"), { tolerant: true });
	
	for (let index = 0; index < parsedCode.length; index++) {
		const idx = parsedCode[index].value.indexOf(uniqKey);
		if(idx >= 0) {
			// remove everything before the cursor and split the text of the current cursor by letter
			parsedCode.splice(index, parsedCode.length - index, ...parsedCode[index].value.slice(0, idx).split(""));
			return parsedCode;
		}
	}
	console.error("the cursor position has not been found");
}

function comaCounter(parsedCodeBeforeCursor) {
	let openingChar = "";
	let nbComa = 0;
	let lastClosed = [];
	for(let idx2 = parsedCodeBeforeCursor.length; idx2--;) {
		let ch = parsedCodeBeforeCursor[idx2];
		if(ch.value !== undefined) {
			// sometime it is already a string and we don`t enter here when we are close to the cursor inside a string
			ch = ch.value;
		}

		if(openToClose[ch]) {
			if(lastClosed.length) {
				lastClosed.length--;
			} else {
				openingChar = ch;
				break;
			}
		}

		if(closeToOpen[ch]) {
			lastClosed.push(ch);
		}
		
		// if the matching closing parenthesis is after the cursor or inexistant then count the coma
		// otherwise we are between matching parenthesis before the cursor and we don't count the coma
		if(!lastClosed.length) {
			if(ch == ",") {
				++nbComa;
			}
		}
	}
	return {openingChar, nbComa}
}

function counter() {
	const parsedCodeBeforeCursor = getParsedCodeBeforeCursor();
	const {nbComa, openingChar} = comaCounter(parsedCodeBeforeCursor);
	vscode.window.setStatusBarMessage(openingChar ? `${openingChar}${openToClose[openingChar]}: ${nbComa}` : "");
};


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	vscode.window.onDidChangeTextEditorSelection(function() {
		try {
			counter();
		} catch (error) {
			console.error(error.stack);
		}
	});
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
