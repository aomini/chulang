const fs = require("fs");
const stdin = process.stdin;

stdin.setRawMode(true);
stdin.resume(true);

stdin.setEncoding("utf8");

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H"); // Clear the screen and move cursor to (0,0)
}

const file = process.argv[2];

const data = fs.readFileSync(__dirname + "/" + file, "utf8");

clearScreen();
process.stdout.write(data);

let lastToken = "";

stdin.on("data", function (key) {
  // ctrl-c
  if (key === "\u0003") {
    process.exit();
  }
  if (key === "\u000D") {
    process.stdout.write("\n");
  }
  if (key === ":" && lastToken !== ":") {
    lastToken = key;
    const rows = process.stdout.rows;
    process.stdout.write(`\x1b[${rows}H:`);
  } else if (key === "h") {
    process.stdout.write("\x1b[D");
  } else if (key === "l") {
    process.stdout.write("\x1b[C");
  } else if (key === "j") {
    process.stdout.write("\x1b[B");
  } else if (key === "k") {
    process.stdout.write("\x1b[A");
  } else {
    process.stdout.write(key);
  }
});
