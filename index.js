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

let lastToken = "";

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

  const colPositionRight = columns - reservedColumns;
  setCursor(colPositionRight, rows - 2);
  process.stdout.write("\x1b[1;35m" + "Rakesh \u2764" + `\x1b[0m`);

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

const commandSequence = {
  command: "",
  isOn: false,
  init() {
    this.isOn = true;
  },
  write(command) {
    this.command += command;
  },
  complete() {
    // just a test
    if (commandSequence.command === "q") {
      cursor.setBlockCursor();
      process.exit(0);
    }
    this.isOn = false;
    this.command = "";
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
    onReturn();
    commandSequence.complete();
    // In mac, backspace is read as del 127(\x7F) rather than \u0008 or \x08
  } else if (key === "\x7F") {
    backspace();
  } else if (key === ":" && lastToken !== ":") {
    lastToken = key;
    commandSequence.init();
    const rows = process.stdout.rows;
    process.stdout.write(`\x1b[${rows}H:`);
  } else if (normal && key === "h") {
    process.stdout.write("\x1b[D");
  } else if (normal && key === "l") {
    process.stdout.write("\x1b[C");
  } else if (normal && key === "j") {
    process.stdout.write("\x1b[B");
  } else if (normal && key === "k") {
    process.stdout.write("\x1b[A");
  } else {
    if (commandSequence.isOn) commandSequence.write(key);
    process.stdout.write(key);
    cursor.onKeypress();
  }
});
