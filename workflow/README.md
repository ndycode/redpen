# Prompt Workflow

Manual prompt execution system. For when you want to run prompts in a raw AI conversation instead of using the CLI.

## Setup

Copy the `/prompts` folder into your project. Structure looks like:

```
your-project/
  prompts/
    workflow/
      WORKFLOW_CONTROLLER_PROMPT.txt
      prompt-progress.json
      prompt-inventory.txt
      run-order.txt
    some-prompt.txt
    another-prompt.txt
```

## Running prompts

Start a new AI conversation. Paste these files in order:

1. `workflow/WORKFLOW_CONTROLLER_PROMPT.txt`
2. `workflow/prompt-progress.json`
3. `workflow/prompt-inventory.txt`

Then use commands:

- `/status` - see what is done
- `/next` - get next prompt
- `/run path/to/prompt.txt` - run a specific prompt
- `/complete path/to/prompt.txt` - mark it done

## Saving progress

When you mark something complete, the AI outputs updated JSON. Copy that back into `prompt-progress.json`. Otherwise progress resets next conversation.

## Adding prompts

If you add or remove prompt files:

1. Delete `prompt-inventory.txt`
2. Ask the AI to regenerate it by scanning `/prompts`
3. Update `run-order.txt` if needed

## Files

| File | What it does |
|------|--------------|
| `WORKFLOW_CONTROLLER_PROMPT.txt` | Instructions for the AI |
| `prompt-progress.json` | Tracks what is done |
| `prompt-inventory.txt` | List of all prompts |
| `run-order.txt` | Execution order |

## Rules

- One prompt at a time
- Only `/complete` updates progress
- Do not skip prompts unless you mean to
- Reload state files to resume in a new conversation
