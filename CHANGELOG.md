# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-12

### Fixed
- `poplr tree --format` / `-f` flag was ignored due to hardcoded `format: 'console'`; the flag now correctly controls output format
- `TreeStats.getStatsObject()` was missing, causing a runtime crash when using JSON format with `--stats`; method is now implemented
- Stats (file/directory counts, total size) were being collected before the exclude filter ran, inflating counts with excluded items
- `getItemStats()` was called twice per item during tree traversal; now uses a cached stat map built in the parallel prefetch pass
- Infinite recursion risk in `sort.js` default case replaced with a safe alphabetical fallback
- `maxDepth` option was not coerced from string to number when passed via CLI, causing depth limiting to fail

### Added
- Glob pattern support for `exclude` entries in `.poplrrc` (e.g. `*.log`, `build-*` now work as expected)
- `filtering.include` from config is now applied — only matching files are shown (directories always pass through)

### Updated
- `figlet` dependency updated to 1.11.0
- `nanospinner` dependency updated to 1.2.2

## [1.0.0] - 2024-11-06

### Added
- Initial release
- Interactive CLI interface
- Multiple output formats (ASCII, Markdown, JSON, HTML, TXT)
- Configurable display options (icons, colors, file sizes)
- Directory statistics
- Custom sorting options (name, type, size, extension)
- Global and local configuration files
- File type recognition and icons
- Export capabilities with timestamps
- Fancy and simple tree styles
- Filtering capabilities for files and directories
- Color-coded output for better visibility
- Support for infinite or limited depth traversal

## [1.0.1] - 2024-11-09

### Updated
- Added more details and methods to README