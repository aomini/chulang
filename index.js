const fs = require("fs");
const readline = require("readline");
const stdin = process.stdin;

stdin.setRawMode(true);
stdin.resume(true);

stdin.setEncoding("utf8");

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
};

const backspace = () => {
  process.stdout.write("\u0008 \u0008");
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

const buffer = {
  // Current line the user is at
  currentRow: 0,
  // Column the user is at (default is 3, need to make dynamic once the line numbers are greater than 999)
  currentColumn: 3,
  // Restricted cols; users cant update
  restricted: {
    // 0 inclusive to 3 inclusive
    cols: [0, 3],
    // Last two rows; nth row is used as command-line & n-1 used as airline
    rows: [rows, rows - 1],
  },
  // Track lines rows & cols filled
  line: {
    // Initial is empty, since there will be nothing to add
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
  } else if (key === "\x7F") {
    backspace();
  } else if (normal && key === ":") {
    commandSequence.init();
  } else if (normal && key === "h") {
    process.stdout.write("\x1b[D");
  } else if (normal && key === "l") {
    process.stdout.write("\x1b[C");
  } else if (normal && key === "j") {
    process.stdout.write("\x1b[B");
  } else if (normal && key === "k") {
    process.stdout.write("\x1b[A");
  } else if (!normal || commandSequence.isOn) {
    if (commandSequence.isOn) commandSequence.write(key);
    process.stdout.write(key);
    cursor.onKeypress();
  }
});
