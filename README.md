# autocommiterr

Bun CLI version of Autocommiter - Auto-commit messages using AI.

## Setup

```bash
bun install
```

## Usage

```bash
# Show help
bun run index.ts

# Configure API key
bun run index.ts config:apikey

# Select AI model
bun run index.ts config:model

# Auto-commit with generated message
bun run index.ts commit

# Commit with custom message
bun run index.ts commit -m "fix: bug in parser"

# Commit and push
bun run index.ts commit --push

# View current config
bun run index.ts config:show

# Enable gitmoji
bun run index.ts config:gitmoji true

# Refresh models from API
bun run index.ts config:refresh-models
```

## Building

```bash
bun run build
```

This creates a minified executable in `dist/index.js`.
