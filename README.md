# 🌳 Poplr

A flexible and fun directory tree generator for the command line.

## Installation

```bash
npm install -g poplr
```

## Quick Start

```bash
# Generate a tree with default settings
poplr

# Or directly use the tree command
poplr tree
```

## Features

- 📁 Clean, customizable directory tree visualization
- 🎨 Multiple output formats (Console, Markdown, Text, JSON, HTML)
- 🔍 Smart sorting (directories first, by name, size, or type)
- 🎯 File and directory filtering
- ⚙️ Configurable through `.poplrrc` files
- 🖼️ Optional file type icons
- 📊 Optional directory statistics
- 🎭 Fancy or simple characters for tree structure

## Usage

### Interactive Mode

Simply run `poplr` and choose from the menu:
- Quick tree (default settings)
- Custom tree (with export options)
- About poplr

### Command Line Options

```bash
# Basic tree generation
poplr tree

# Show file sizes
poplr tree -s

# Show full paths
poplr tree -p

# Set maximum depth
poplr tree -d 2

# Show root directory
poplr tree -r

# Change sort order
poplr tree --sort type

# Show directory statistics
poplr tree --stats

# Export as markdown
poplr tree -f markdown
```

Available options:
- `-f, --format <type>` - Output format (ascii, markdown, txt, json, html)
- `-d, --max-depth <number>` - Maximum depth to traverse
- `-s, --show-size` - Show file sizes
- `-p, --full-path` - Show full paths
- `-r, --show-root` - Show root directory
- `--stats` - Show directory summary
- `--sort <type>` - Sort by (name, type, size, extension)

```bash
# Export examples
poplr tree -f markdown > tree.md
poplr tree -f html > tree.html
poplr tree -f json > tree.json
poplr tree -f txt > tree.txt
```

### Configuration

You can create a global or local configuration file:

```bash
# Create local config
poplr init

# Create global config
poplr init -g

# View current configuration
poplr config
```

#### Configuration File (.poplrrc)

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
        "include": ["README.md"]
    },
    "export": {
        "defaultFormat": "ascii",
        "outputDir": "./",
        "timestamp": false
    }
}
```

### Output Formats

#### Console (Default)
```
├── src/
│   ├── index.js
│   └── utils/
│       └── helper.js
└── package.json
```

#### Text File (.txt)
The same as console output but saved to a text file:
```
├── src/
│   ├── index.js
│   └── utils/
│       └── helper.js
└── package.json
```

#### Markdown (.md)
```markdown
## Directory Structure

* src/
  * index.js
  * utils/
    * helper.js
* package.json
```

#### HTML
Generates a styled HTML page with the tree structure:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Directory Tree</title>
</head>
<body>
    <pre>
    ├── src/
    │   ├── index.js
    │   └── utils/
    │       └── helper.js
    └── package.json
    </pre>
</body>
</html>
```

#### JSON
```json
{
  "generated": "2024-11-05T20:19:05.327Z",
  "config": {
    "format": "json",
    "showSize": true,
    ...
  },
  "tree": "..."
}
```

### Sorting Options

- `name` - Alphabetical order
- `directory-first` (default) - Directories at top, then files
- `type` - Group by file type
- `size` - Largest files first
- `extension` - Group by file extension

## Examples

```bash
# Generate a simple tree
poplr tree

# Export as markdown with file sizes
poplr tree -f markdown -s

# Show only 2 levels deep with stats
poplr tree -d 2 --stats

# Custom tree with interactive options
poplr
# Then select "Custom tree" from the menu
```

## Configuration Precedence

1. Command line arguments (highest priority)
2. Local .poplrrc (in current directory)
3. Global .poplrrc (in home directory)
4. Default settings (lowest priority)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author
Rick Knowlton | tiny.

<p align="center">Made with ☕️ by <a href="https://wearetiny.io">tiny.</a></p>