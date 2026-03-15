#!/usr/bin/env bash
# Reads stream-json from stdin, writes human-readable formatted output to stdout.
# Raw JSON is preserved via tee BEFORE this script in the pipeline.
#
# Usage in run.sh:
#   claude ... 2>&1 | tee raw.log | agents/format-log.sh | tee formatted.log

set -euo pipefail

BLUE='\033[0;34m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

while IFS= read -r line; do
    [ -z "$line" ] && continue

    # Parse JSON with python3 (available in devcontainer)
    python3 -c "
import json, sys, textwrap

line = sys.argv[1]
try:
    obj = json.loads(line)
except json.JSONDecodeError:
    print(line)
    sys.exit(0)

t = obj.get('type', '')

if t == 'system' and obj.get('subtype') == 'init':
    model = obj.get('model', '?')
    print(f'\033[1m=== Session started | model: {model} ===\033[0m')

elif t == 'assistant':
    content = obj.get('message', {}).get('content', [])
    for block in content:
        bt = block.get('type', '')

        if bt == 'thinking':
            text = block.get('thinking', '')
            # Show thinking in dim cyan, wrapped
            lines = text.strip().splitlines()
            for l in lines:
                wrapped = textwrap.fill(l, width=120, initial_indent='', subsequent_indent='  ')
                print(f'\033[2m\033[36m💭 {wrapped}\033[0m')

        elif bt == 'text':
            text = block.get('text', '')
            for l in text.strip().splitlines():
                print(f'\033[1m{l}\033[0m')

        elif bt == 'tool_use':
            name = block.get('name', '?')
            inp = block.get('input', {})
            # Compact display of tool input
            if name in ('Read', 'Glob', 'Grep'):
                path = inp.get('file_path', inp.get('path', inp.get('pattern', '')))
                extra = inp.get('pattern', '')
                detail = path + (f' | {extra}' if extra and extra != path else '')
                print(f'\033[33m🔧 {name}({detail})\033[0m')
            elif name == 'Bash':
                cmd = inp.get('command', '')
                # Truncate long commands
                if len(cmd) > 200:
                    cmd = cmd[:200] + '...'
                print(f'\033[33m🔧 {name}$ {cmd}\033[0m')
            elif name in ('Edit', 'Write'):
                path = inp.get('file_path', '?')
                print(f'\033[33m🔧 {name}({path})\033[0m')
            else:
                summary = json.dumps(inp)
                if len(summary) > 150:
                    summary = summary[:150] + '...'
                print(f'\033[33m🔧 {name}({summary})\033[0m')

elif t == 'user':
    content = obj.get('message', {}).get('content', [])
    for block in content:
        if block.get('type') == 'tool_result':
            result = str(block.get('content', ''))
            # Show first few lines of tool results, dimmed
            lines = result.strip().splitlines()
            preview = lines[:5]
            for l in preview:
                if len(l) > 150:
                    l = l[:150] + '...'
                print(f'\033[2m  ↳ {l}\033[0m')
            if len(lines) > 5:
                print(f'\033[2m  ↳ ... ({len(lines) - 5} more lines)\033[0m')

elif t == 'rate_limit_event':
    status = obj.get('rate_limit_info', {}).get('status', '?')
    if status != 'allowed':
        print(f'\033[31m⚠ Rate limit: {status}\033[0m')

elif t == 'result':
    cost = obj.get('cost_usd', 0)
    duration = obj.get('duration_ms', 0)
    print(f'\033[1m\033[32m=== Done | cost: \${cost:.4f} | duration: {duration/1000:.1f}s ===\033[0m')

sys.stdout.flush()
" "$line" 2>/dev/null || echo "$line"
done
