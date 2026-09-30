# 🌳 Poplr

A flexible and fun directory tree generator for the command line.

## Installation

```bash
npm install -g poplr
```

## Quick Start

```bash
# Interactive menu
poplr

# Generate a tree directly
poplr tree
```

## Features

- 📁 Clean, customizable directory tree visualization
- 🎨 Multiple output formats (Console, Markdown, JSON, HTML, Text)
- 🔍 Smart sorting (directories first, by name, size, type, or extension)
- 🚫 Automatic `.gitignore` respect - ignored files stay out of the tree
- 🎯 File and directory filtering via exclude and include patterns (supports globs)
- 📂 Write output directly to a file with `-o`
- ⚙️ Configurable through `.poplrrc` files (local and global)
- 🖼️ Optional file type icons
- 📊 Optional directory statistics
- 🎭 Fancy or simple characters for tree structure

## Usage

### Interactive Mode

Run `poplr` to open the menu:

- **Quick tree** - generates a tree using your current config settings
- **Custom tree** - prompts for options and optionally exports to a file
- **About poplr**

### Command Line

```bash
poplr tree [options]
```

#### Options

| Flag | Description |
|------|-------------|
| `-f, --format <type>` | Output format: `ascii` (default), `markdown`, `json` |
| `-o, --output <path>` | Write output to a file; format is inferred from the extension (`.md`, `.json`, `.html`, `.txt`) |
| `-d, --max-depth <n>` | Maximum depth to traverse |
| `-s, --show-size` | Show file sizes |
| `-p, --full-path` | Show full file paths |
| `-r, --show-root` | Show the root directory name |
| `--stats` | Show a directory summary (file count, total size, scan time) |
| `--sort <type>` | Sort order: `directory-first` (default), `name`, `type`, `size`, `extension` |
| `--no-gitignore` | Disable automatic `.gitignore` respect |

#### Examples

```bash
# Basic tree
poplr tree

# Show file sizes, limit to 2 levels deep
poplr tree -s -d 2

# Show directory statistics
poplr tree --stats

# Write a markdown file (format inferred from .md extension)
poplr tree -o structure.md

# Write a markdown file with sizes
poplr tree -o structure.md -s

# Write a JSON export with stats
poplr tree -o tree.json --stats

# Write an HTML report
poplr tree -o report.html

# Show everything, including files listed in .gitignore
poplr tree --no-gitignore

# Sort alphabetically, show full paths
poplr tree --sort name -p
```

### Configuration

```bash
# Create a local config in the current directory
poplr init

# Create a global config in your home directory
poplr init -g

# Show the current merged configuration
poplr config
```

#### .poplrrc

```json
{
    "display": {
        "fancy": true,
        "useIcons": false,
        "useColors": true,
        "showSize": false,
        "showStats": false,
        "showRoot": false,
        "fullPath": false
    },
    "sorting": {
        "enabled": true,
        "default": "directory-first"
    },
    "filtering": {
        "maxDepth": null,
        "exclude": ["node_modules", ".git", ".DS_Store"],
        "include": [],
        "respectGitignore": true
    },
    "export": {
        "defaultFormat": "ascii",
        "outputDir": "./",
        "timestamp": false
    }
}
```

**`filtering.exclude`** - basenames or glob patterns to hide (e.g. `"*.log"`, `"build-*"`).

**`filtering.include`** - when non-empty, only files matching these patterns are shown; directories always pass through so the tree structure is preserved.

**`filtering.respectGitignore`** - when `true` (the default), entries listed in `.gitignore` are automatically excluded.

### Output Formats

#### Console (default)
```
├── src/
│   ├── index.js
│   └── utils/
│       └── helper.js
└── package.json
```

#### Markdown (`-o file.md` or `-f markdown`)
```markdown
## Directory Structure

* src/
  * index.js
  * utils/
    * helper.js
* package.json
```

#### JSON (`-o file.json` or `-f json`)
```json
{
  "generated": "2026-05-14T00:00:00.000Z",
  "config": { "format": "json", "showSize": false, "..." : "..." },
  "tree": "...",
  "stats": { "totalFiles": 12, "totalDirs": 4, "..." : "..." }
}
```

#### HTML (`-o file.html`)
Generates a styled HTML page with the tree inside a `<pre>` block.

#### Text (`-o file.txt`)
Plain ASCII tree saved to a `.txt` file.

## Configuration Precedence

1. Command-line flags (highest priority)
2. Local `.poplrrc` (in current directory)
3. Global `.poplrrc` (in home directory)
4. Built-in defaults (lowest priority)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

Rick Knowlton | tiny.

<p align="center">Made with ☕️ by <a href="https://wearetiny.io">tiny.</a></p>
