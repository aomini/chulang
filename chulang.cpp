#include <iostream>
#include <stdexcept>
#include <vector>

using namespace std;

void error(string msg) { throw runtime_error(msg); }

/** suppose Variable kind is char 7 */
/** suppose Variable name is char 8 */
/** suppose print is char 1 */
class Token {
public:
  char kind;
  string name;
  double value;
  Token(char k) : kind(k), name(""), value(0) {}
  Token(char k, string n, double v) : kind(k), name(n), value(v) {}
};

Token get_token() {
  char ch;
  cin >> ch;

  switch (ch) {
  case 'a':
  case 'b':
  case 'c':
  case 'd':
  case 'e':
  case 'f':
  case 'g':
  case 'h':
  case 'i':
  case 'k':
  case 'l':
  case 'm':
  case 'n':
  case 'o':
  case 'p':
  case 'q':
  case 'r':
  case 's':
  case 't':
  case 'u':
  case 'v':
  case 'w':
  case 'x':
  case 'y':
  case 'z': {
    // check if token starts with v;
    cin.putback(ch);
    string var;
    cin >> var;
    if (var == "chula") {
      return Token(7);
    } else if (var == "chubhan") {
      return Token(1);
    } else
      // variable name
      return Token(8, var, 0);
  }
  case '=': {
    return Token('=');
  }
  case '0':
  case '1':
  case '2':
  case '3':
  case '4':
  case '5':
  case '6':
  case '7':
  case '8':
  case '9': {
    cin.putback(ch);
    double value;
    cin >> value;
    return Token(9, "", value);
  }

  default:
    error("Invalid token");
  }
  return 0;
}

class Variable {
public:
  string name;
  double value;
  Variable(string name, double value) : name(name), value(value) {}
};

Variable declaration();
double customStatement(vector<Variable> &vct);

int main() {
  vector<Variable> vct{};
  while (cin) {
    Token t = get_token();

    switch (t.kind) {
    // Variable declaration
    case 7:
      vct.push_back(declaration());
      break;
    // Print statement
    case 1: {
      double v = customStatement(vct);
      cout << "> " << v << endl;
      break;
    }
    default:
      error("Invalid character");
    }
  }
  return 0;
}

double customStatement(vector<Variable> &vct) {
  // look for (
  // look for closing )
  while (true) {
    Token t = get_token();
    switch (t.kind) {
    case '(': {
      error("( logic is left to implement)");
    }
    case 8: {
      // variable name
      double val;
      double found = false;
      for (const Variable &v : vct) {
        if (v.name == t.name) {
          val = v.value;
          found = !found;
        }
      }
      if (!found)
        error("Undefined variable " + t.name);
      return val;
    }
    default:
      error("Syntax error: Print statement");
    }
  }
  return 0;
}

Variable declaration() {
  // Get the variable name
  // Get the = symbol
  // Get the value
  Token variableToken = get_token();

  switch (variableToken.kind) {
  case 8: {
    // TODO: extract this logic to some grammer function away
    Token t = get_token();
    switch (t.kind) {
    case '=': {
      Token value = get_token();
      switch (value.kind) {
      // 9 is for numbers
      case 9:
        return Variable(variableToken.name, value.value);
      default: {
        error("Only supports double as a value");
      }
      }
    }
    default:
      error("Variables must be assigned with = first");
    }
  }
  default: {
    error("Invalid variable name");
  }
  }
  return Variable("null", 0);
}
