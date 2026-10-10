# Local synthetic example

`synthetic-prompt.txt` contains fake credentials only. Initialize Hushkey in a
private working directory, then sanitize this file using the README commands.
Review the result locally; do not paste the original input or vault into chat.

`config.json` demonstrates a trusted custom regex. After `hushkey init`, copy
its contents into `.hushkey/config.json` only if that rule matches your local
credential format. Custom patterns are trusted code and can consume excessive
processing time. Keep state files private and exclude `.hushkey` from Git.
