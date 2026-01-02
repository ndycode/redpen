# Prompt Workflow System

A self-contained, portable prompt execution tracker for AI-assisted development.

## Quick Start

### 1. Copy to Any Project

Copy the entire `/prompts` folder into your project root:

```
your-project/
├── prompts/
│   ├── workflow/
│   │   ├── WORKFLOW_CONTROLLER_PROMPT.txt
│   │   ├── prompt-progress.json
│   │   ├── prompt-inventory.txt
│   │   ├── run-order.txt
│   │   └── commands-cheatsheet.txt
│   ├── your-prompt-1.txt
│   ├── your-prompt-2.txt
│   └── README.md
```

### 2. Start a Workflow Conversation

In a new AI conversation, paste:

1. The contents of `workflow/WORKFLOW_CONTROLLER_PROMPT.txt`
2. The contents of `workflow/prompt-progress.json`
3. The contents of `workflow/prompt-inventory.txt`

Then issue commands: `/status`, `/next`, `/run <path>`, `/complete <path>`

### 3. Update Progress After Completing Prompts

After successfully executing a prompt, issue:

```
/complete relative/path/to/prompt.txt
```

The AI will update `prompt-progress.json` and output the new state.
**You must save this output back to the file** for persistence across conversations.

### 4. Regenerate Inventory When Prompts Change

If you add, remove, or rename prompt files, regenerate the inventory:

1. Delete `workflow/prompt-inventory.txt`
2. Ask the AI: "Scan /prompts for all .txt files and regenerate prompt-inventory.txt"
3. Update `workflow/run-order.txt` if needed

## File Descriptions

| File | Purpose |
|------|---------|
| `WORKFLOW_CONTROLLER_PROMPT.txt` | System instructions for the AI controller |
| `prompt-progress.json` | Tracks completed prompts (source of truth) |
| `prompt-inventory.txt` | List of all available prompt files |
| `run-order.txt` | Recommended execution order by phase |
| `commands-cheatsheet.txt` | Quick reference for commands |

## Rules

- One prompt per `/run` command
- Progress only updates via `/complete`
- Never skip prompts without explicit instruction
- Resume from any conversation by reloading state files
