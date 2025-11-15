# Autocommiter CLI (Bun)

A Bun-based CLI tool that replicates all functionalities of the Autocommiter VS Code extension. This CLI allows you to automatically generate and commit changes using AI models from GitHub's inference API.

## Features

✨ **Auto-commit message generation** - Generate intelligent commit messages using AI
🤖 **Multiple AI models** - Support for GPT-4o, GPT-4o mini, Phi-3, and Mistral models
🎨 **Gitmoji support** - Automatically add relevant emoji to commit messages
📦 **Git safety** - Protect sensitive files by updating .gitignore
🔒 **Secure API key storage** - Store API keys locally in `~/.autocommiter/config.json`
🔄 **Model caching** - Cache available models for offline use

## Installation

```bash
# Build the project
bun run build

# Or run directly
bun run index.ts
```

## Setup

Before you can use the autocommit feature, you need to configure your API key and model:

### 1. Set GitHub Models API Key

```bash
bun run index.ts config:apikey
```

This will prompt you to enter your GitHub Models API key. The key will be stored securely in `~/.autocommiter/config.json`.

### 2. Select AI Model

```bash
bun run index.ts config:model
```

This will:
- Fetch available models from the GitHub Models API
- Display a list of available models
- Let you select your preferred model

### 3. (Optional) Refresh Models

To update the cached list of available models:

```bash
bun run index.ts config:refresh-models
```

## Usage

### Basic Auto-Commit

```bash
bun run index.ts commit
```

This will:
1. Check if you're in a git repository
2. Ensure .gitignore safety (protect .env* and docx/ files)
3. Stage all changes (`git add .`)
4. Generate a commit message using your selected AI model
5. Create a commit with the generated message

### Commit with Custom Message

```bash
bun run index.ts commit -m "My custom message"
```

Skip AI generation and use a custom message instead.

### Auto-Commit and Push

```bash
bun run index.ts commit --push
```

After committing, automatically push changes to the remote repository.

### Disable Gitmoji

```bash
bun run index.ts commit --no-gitmoji
```

Commit without adding gitmoji emoji prefix, even if enabled in config.

## Configuration

### Enable/Disable Gitmoji

```bash
# Enable gitmoji
bun run index.ts config:gitmoji true

# Disable gitmoji
bun run index.ts config:gitmoji false
```

When enabled, the CLI will intelligently match your commit message to a relevant emoji and prepend it to the message.

### View Current Configuration

```bash
bun run index.ts config:show
```

Shows:
- API Key status (set or not set)
- Currently selected model
- Gitmoji status
- Number of cached models

## Configuration Files

All configuration is stored in `~/.autocommiter/`:

- `config.json` - Stores API key, selected model, and gitmoji preference
- `models.json` - Caches available AI models from the API

## How It Works

### Commit Message Generation

1. **API Key Validation**: Checks if GitHub Models API key is configured
2. **File Analysis**: Analyzes staged changes to get file names and change statistics
3. **Compression**: Compresses file information into a compact JSON format (~400 chars)
4. **AI Generation**: Sends the changes summary to your selected model with a prompt
5. **Response Parsing**: Extracts the generated message from the API response
6. **Gitmoji Addition** (optional): Intelligently prepends a relevant emoji based on keywords

### Gitmoji Matching

The CLI uses fuzzy matching to find the most relevant emoji based on:
- Keywords in the commit message (e.g., "bug" → 🐛, "docs" → 📝)
- Description matching
- Partial word matches

If no good match is found, a random emoji from the set is used.

### .gitignore Safety

The CLI ensures your repository is protected by:
- Adding common sensitive patterns: `*.env*`, `.env*`, `docx/`
- Detecting and protecting nested git repositories
- Respecting .gitmodules configurations

## Supported Models

### Default Models
- **gpt-4o-mini** - Fast, cost-effective, great for most tasks
- **gpt-4o** - High quality, most capable
- **Phi-3-mini-128k-instruct** - Lightweight, efficient
- **Mistral-large** - Powerful open-source model

Additional models can be fetched via the API and will be cached locally.

## API Documentation

### Available Commands

| Command | Description |
|---------|-------------|
| `commit` | Generate and commit changes automatically |
| `config:apikey` | Set your GitHub Models API key |
| `config:model` | Select your preferred AI model |
| `config:refresh-models` | Fetch and cache available models |
| `config:gitmoji <true/false>` | Enable or disable gitmoji |
| `config:show` | Show current configuration |

### Commit Command Options

```bash
bun run index.ts commit [options]

Options:
  -m, --message <msg>   Use custom commit message
  --no-gitmoji          Disable gitmoji for this commit
  --push                Push after committing
  -h, --help            Show help
```

## Error Handling

The CLI handles various error scenarios:

- **Not in a git repository**: Shows "Not inside a git repository" error
- **No changes to commit**: Shows informational message and exits gracefully
- **API key not found**: Falls back to default message
- **API request failure**: Shows warning and uses fallback message
- **No staged files**: Shows information and skips commit

## Architecture

### Modules

- **`index.ts`** - Main CLI entry point with all commands
- **`src/changesSummarizer.ts`** - Analyzes git diffs and compresses file changes
- **`src/gitmoji.ts`** - Gitmoji matching and prepending
- **`src/modelManager.ts`** - Model caching and settings management
- **`src/apiClient.ts`** - GitHub Models inference API client
- **`src/gitUtils.ts`** - Git operations (stage, commit, push)

## Development

### Running in Development

```bash
bun run index.ts commit
```

### Building for Production

```bash
bun run build
```

This creates a minified executable in the `dist/` directory.

## Comparison with VS Code Extension

Both tools provide identical core functionality:

| Feature | Extension | CLI |
|---------|-----------|-----|
| Auto-commit messages | ✓ | ✓ |
| AI model selection | ✓ | ✓ |
| Gitmoji support | ✓ | ✓ |
| .gitignore safety | ✓ | ✓ |
| Secure key storage | VS Code Secrets | ~/.autocommiter |
| Model caching | Workspace state | ~/.autocommiter |

The CLI version is ideal for:
- CI/CD pipelines
- Server-side automation
- Command-line workflows
- Projects without VS Code

## Troubleshooting

### "Not inside a git repository"
Make sure you're running the command in a git repository root directory.

### "No API key found"
Run `bun run index.ts config:apikey` to set your GitHub Models API key.

### "Failed to generate message"
Check your API key is valid by running `bun run index.ts config:show`. If the API fails, the CLI will use a default message.

### Permission Denied on Commit
Ensure you have write permissions in the current directory and `.git` folder.

## License

MIT - Same as the original Autocommiter extension

## Related

- Original Autocommiter VS Code Extension: https://github.com/nathfavour/autocommiter
- GitHub Models API: https://github.com/marketplace/models
- Commander.js: https://github.com/tj/commander.js
- Bun: https://bun.sh
