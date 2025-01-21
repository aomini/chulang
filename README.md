# Chulang
> A personal interpreter or a syntax analyzer that can ony take input from stdin.
> A demo to understand how interpreters interpret tokens.
> So, it's not made for anybody to use

# Requirement
- C++ 17 installation
- Build the file with gnu c++

# Supports:
- With an hr of work, it only supports variable declaration & print.
- No need to add semi colons (no support for symbols), probably will throw errors (unidentified token runtime error)
- `chula` for variable declaration
- `chubhan` can only print declared variable, for non declared variable it will throw an error
- Variable declaration only supports double types 

# Example:
```
chula x = 1 // variable declaration
chula y = 2 // variable declaration
chubhan x // prints the value of x
```
