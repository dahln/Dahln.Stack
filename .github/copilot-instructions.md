When editing C# code in this repository, every `if` statement must use braces even for a single statement body.

Use this exact layout:

```csharp
if (condition)
{
    DoWork();
}
```

Do not use single-line `if` statements such as `if (condition) return value;`.
Do not place the opening brace on the same line as the `if` condition.

When editing .JS, .TS, .JSX, or .TSX files in this repository, every `if` statement must also use braces even for a single statement body.

Use this exact layout:

```javascript
if (condition) {
    DoWork();
}
```

Do not use single-line `if` statements such as `if (condition) return value;`.
Do not use the ternary operator (`? :`). Use `if`/`else if`/`else` instead.