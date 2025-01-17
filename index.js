const fs = require("fs");
const path = require("path");
const readline = require("readline");
const stdin = process.stdin;

stdin.setRawMode(true);
stdin.resume(true);

stdin.setEncoding("utf8");

const writeLog = (msg) => {
  fs.appendFileSync("log.txt", JSON.stringify(msg, null, 2));
};

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H"); // Clear the screen and move cursor to (0,0)
}

function endOfLine(row) {
  readline.cursorTo(row);
}

function setCursor(column = null, row = null) {
  readline.cursorTo(process.stdout, column, row);
}
const file = process.argv[2];

const data = fs.readFileSync(__dirname + "/" + file, "utf8");

clearScreen();
// Use existing data
// process.stdout.write(data);

const rows = process.stdout.rows;
const columns = process.stdout.columns;
const maxNumberLength = rows.toString().length;

// For new file we dont have to generate all numbers
/*
for (let i = 1; i < rows; i++) {
  process.stdout.write(
    "\x1b[33m" + `${i.toString().padStart(maxNumberLength)}\n`,
  );
}
*/

const cursor = {
  row: 0,
  // Extra space
  column: 4,
  currentLine: 1,
  // tracks last position of the cursor
  // eg: on escape it should get back to here
  // [col, row]
  lastPos: [4, 0],
  setBlockCursor() {
    return process.stdout.write("\x1b[1 q");
  },
  setBarCursor() {
    return process.stdout.write("\x1b[5 q");
  },
  save() {
    return process.stdout.write("\x1b[s");
  },
  restore() {
    return process.stdout.write("\x1b[u");
  },
  updateLastPos() {
    this.lastPos = [this.column, this.row];
  },
  onKeypress() {
    this.column++;
    this.updateLastPos();
  },
  // handle row change
  onEnter(column) {
    this.column = column;
    this.updateLastPos();
  },
};

const mode = {
  normal: true,
  normalText: "Normal",
  insertText: "Insert",
  escapeChar: "\x1B",
  color: {
    // normal
    true: "\x1b[1;34m",
    // insert
    false: "\x1b[1;32m",
  },
  setFooterMode() {
    setCursor(0, rows - 2);
    process.stdout.write(
      this.color[this.normal] +
        `${this.normal ? this.normalText : this.insertText} <Mode>` +
        "\x1b[0m",
    );
    // Get the cursor back to where it was before
    setCursor(...cursor.lastPos);
  },
  onEscape() {
    this.normal = !this.normal;
    this.setFooterMode();
    if (this.normal) {
      cursor.setBlockCursor();
    } else {
      cursor.setBarCursor();
    }
    const col =
      (buffer.line[buffer.currentRow].length || 0) +
      buffer.restricted.cols.length;
    writeLog({
      action: "Escape",
      currentCol: col,
      currentRow: buffer.currentRow,
    });
    setCursor(col, buffer.currentRow);
  },
};

// Last two rows
const setFooter = () => {
  // Rakesh <3
  const reservedColumns = 8;

  // Set background color to footer
  // New to add some gap between the mode text & bg
  //
  const maxLeftText = (mode.normalText + "<Mode>").length + 2;
  for (let i = maxLeftText; i < columns; i++) {
    setCursor(i, rows - 2);
    process.stdout.write("\x1b[48;5;89m" + " " + `\x1b[0m`);
  }
  const colPositionRight = columns - reservedColumns;
  setCursor(colPositionRight, rows - 2);
  // Foreground color
  // process.stdout.write("\x1b[1;35m" + "Rakesh \u2764" + `\x1b[0m`);
  process.stdout.write("\x1b[48;5;89m" + "Rakesh \u2764" + `\x1b[0m`);

  mode.setFooterMode();
};

const onReturn = () => {
  // extract this login in cursor
  cursor.row++;
  cursor.currentLine++;
  const currentLine = cursor.currentLine;
  setCursor(0, cursor.row);
  const nextNum = currentLine.toString().padStart(3);
  process.stdout.write("\x1b[33m" + `${nextNum} ` + `\x1b[0m`);
  // We are setting extra space after numbers so add +1 char
  setCursor(nextNum.length + 1, cursor.row);
  cursor.onEnter(nextNum.length + 1);
  buffer.onLineBreak();
};

/** Initial Set up */

//
// \x1b[0m resets the color
// New file
process.stdout.write("\x1b[33m" + `  1 ` + `\x1b[0m`);

setFooter();

// Extra space at the end
setCursor(maxNumberLength + 2, 0);

const tty = {
  write(input) {
    process.stdout.write(input);
  },
};

const initialRow = 0;
const initialCol = 4;
const buffer = {
  currentRow: initialRow,
  currentColumn: initialCol,
  // Restricted cols; users cant update
  restricted: {
    // Line numbers cols (TODO: dynamic left)
    cols: [0, 1, 2, 3],
    // Last two rows; nth row is used as command-line & n-1 used as airline
    rows: [rows, rows - 1],
  },
  // Returns end of the line or last column of a line
  getLineEnd(row) {
    // TODO: Multiline left
    const restrictedColumns = this.restricted.cols.length;
    const rowCols = (this.line[row].length || 0) + restrictedColumns;
    writeLog({
      action: "EndLine",
      restrictedColumns,
      rowColsWithRestrictedCols: rowCols,
      rowChar: this.line[row].length,
    });
    // empty
    if (rowCols === restrictedColumns) {
      return restrictedColumns;
    }
    if (rowCols > restrictedColumns) {
      return this.line[row].length + restrictedColumns - 1;
    } else return this.line[row].length + restrictedColumns + 1;
  },
  // Tracks row content
  line: {
    // Initial is empty, since there will be nothing to add
    [initialRow]: "",
  },
  // Buffer moves
  transition() {
    const buffer = this;
    return {
      up() {
        // First row
        if (buffer.currentRow === 0) {
          return;
        }
        const previousRow = parseInt(buffer.currentRow) - 1;
        writeLog({
          action: "up",
          ...buffer.line,
          currentCol: buffer.currentColumn,
          previousRowLength: buffer.line[previousRow].length,
        });
        // check if previousRow has the same col available or not
        // if yes just move with the current col value
        // else get the line end
        if (
          buffer.line[previousRow].length + buffer.restricted.cols.length >
          buffer.currentColumn
        ) {
          setCursor(buffer.currentColumn, previousRow);
          // After move
          buffer.currentRow = previousRow;
        } else {
          const col = buffer.getLineEnd(previousRow);
          setCursor(col, previousRow);
          // After move
          buffer.currentRow = previousRow;
          buffer.currentColumn = col;
        }
      },
      down() {
        const nextRow = parseInt(buffer.currentRow) + 1;
        const nextLine = buffer.line[nextRow];
        writeLog({
          action: "down",
          ...buffer.line,
          currentCol: buffer.currentColumn,
          nextRowLength: buffer.line[nextRow]?.length,
        });

        // check last row exists
        if (typeof nextLine === "undefined") {
          return;
        }
        // check if nextRow has the same col available or not
        // if yes just move with the current col value
        // else get the line end
        if (
          nextLine.length + buffer.restricted.cols.length >
          buffer.currentColumn
        ) {
          setCursor(buffer.currentColumn, nextRow);
          // After move
          buffer.currentRow = nextRow;
        } else {
          const col = buffer.getLineEnd(nextRow);
          setCursor(col, nextRow);
          // After move
          buffer.currentRow = nextRow;
          buffer.currentColumn = col;
        }
      },
      right() {
        // If it's the end of the line
        const nextCol = buffer.currentColumn + 1;
        if (
          nextCol >
          // 1 is the last char
          buffer.line[buffer.currentRow].length +
            buffer.restricted.cols.length -
            1
        ) {
          return false;
        }
        buffer.currentColumn++;
        setCursor(buffer.currentColumn, buffer.currentRow);
      },
      left() {
        // If it's the start of the line
        // Bug: on escape and h
        const previousCol = buffer.line[buffer.currentRow].length - 1;
        if (previousCol < buffer.restricted.cols.length) {
          return false;
        }
        buffer.currentColumn--;
        setCursor(buffer.currentColumn, buffer.currentRow);
      },
      backspace() {
        writeLog({
          action: "backspace",
          // includes restricted cols as it starts with col restricted
          currentLineCol: buffer.line[buffer.currentRow].length,
          lineContent: buffer.line[buffer.currentRow],
        });
        const col = buffer.line[buffer.currentRow].length || 0;
        // const currentCol = buffer.currentColumn - buffer.restricted.cols.length;
        if (col) {
          process.stdout.write("\u0008 \u0008");
          buffer.currentColumn--;
          buffer.line[buffer.currentRow] = buffer.line[buffer.currentRow].slice(
            0,
            -1,
          );
        }
      },
    };
  },
  // Increment col count of the line
  onAddChar(char = "") {
    if (char) {
      this.line[this.currentRow] += char;
    } else this.line[this.currentRow] = "";
  },
  // On line break, add row
  onLineBreak() {
    this.currentRow++;
    this.onAddChar();
    // console.log(this.line, columns, this.line[this.currentRow - 1].length);
  },

  // Different than editor.write & tty.write
  // since, it tracks the currentRow, currentColumn & filled lines
  write(char) {
    this.currentColumn++;
    this.onAddChar(char);
    editor.write(char);
  },
};

const editor = {
  write: tty.write,
  eraseLine() {
    this.write("\x1b[0K");
  },
  eraseLineCursorLast() {
    this.write("\x1b[2K");
  },
  // Returns if vim-like motions can be executed
  isMotion() {
    const { normal } = mode;
    const { isOn } = commandSequence;
    return normal && !isOn;
  },
};

const commandSequence = {
  command: "",
  isOn: false,
  timeout: null,
  init() {
    this.isOn = true;
    this.onCommand({ init: true });
    // Erase after the cursor is at command line
    editor.eraseLine();
  },
  write(command) {
    this.command += command;
  },
  complete() {
    const currentCommand = this.command;
    this.isOn = false;
    this.command = "";
    // just a test
    if (currentCommand === "q") {
      cursor.setBlockCursor();
      process.exit(0);
    } else {
      this.onCommand({ failure: true });
    }
  },
  // Displays error at the bottom of the screen
  setError(error) {
    editor.write(`\x1b[${rows}H\x1b[38;5;196m${error}\x1b[0m`);
    cursor.restore();
    this.timeout = setTimeout(() => {
      /** \x1b means escape in hex, \033 octal & \u0001b in uni
       * \[2k means clear line
       * \[s save current cursor position
       * \[u restore saved cursor position
       */
      editor.write(`\x1b[${rows}H\x1b[2K`);
      cursor.restore();
    }, 3000);
  },
  onCommand({ init = false, success = false, failure = false }) {
    // process.stdout.write(`\x1b[s`);
    if (init) {
      if (this.timeout) clearTimeout(this.timeout);
      cursor.save();
      editor.write(`\x1b[${rows}H:`);
    } else if (success) {
      editor.write(`\x1b[${rows}H\x1b[2k`);
    } else if (failure) {
      this.setError("Command not found");
      // process.stdout.write(`\x1b[u`);
    } else {
      this.setError(
        "No command status sent, atleast send init, success or failure",
      );
    }
  },
};

// Writes the command part
const debug = {
  print(char) {
    process.stdout.write(char);
  },
};

stdin.on("data", function (key) {
  const { normal } = mode;

  // ctrl-c
  if (key === "\u0003") {
    cursor.setBlockCursor();
    process.exit(0);
  }
  if (key === "\u001b") {
    mode.onEscape();
  }
  // if (key === "\u000D") {
  else if (key === "\r" || key === "\n") {
    if (commandSequence.isOn) commandSequence.complete();
    else onReturn();
    // In mac, backspace is read as del 127(\x7F) rather than \u0008 or \x08
  } else if (!normal && key === "\x7F") {
    buffer.transition().backspace();
  } else if (normal && key === ":") {
    commandSequence.init();
  } else if (normal && key === "h") {
    buffer.transition().left();
    // process.stdout.write("\x1b[D");
  } else if (normal && key === "l") {
    // process.stdout.write("\x1b[C");
    buffer.transition().right();
  } else if (normal && key === "j") {
    buffer.transition().down();
    // process.stdout.write("\x1b[B");
  } else if (normal && key === "k") {
    buffer.transition().up();
    //process.stdout.write("\x1b[A");
  } else if (!normal || commandSequence.isOn) {
    if (commandSequence.isOn) {
      commandSequence.write(key);
      process.stdout.write(key);
    } else buffer.write(key);

    // console.log(buffer.line);
    // cursor.onKeypress();
  }
});
