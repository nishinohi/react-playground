#!/usr/bin/env node

// バリデーションルールを (検証関数, メッセージ) のタプルのリストとして定義
const VALIDATION_RULES = [
  [
    (cmd) => cmd.trim().startsWith('grep '),
    'grep の変わりに git grep --function-context [--and|--or|--not|(|)|-e <pattern>...] -- <pathspec>... を使ってください。--function-context フラグにより出力行が多すぎる場合、 --show-function と -C フラグを利用してください',
  ],
  [
    (cmd) => cmd.trim().startsWith('rg '),
    'rg の変わりに git grep --function-context [--and|--or|--not|(|)|-e <pattern>...] -- <pathspec>... を使ってください。--function-context フラグにより出力行が多すぎる場合、 --show-function と -C フラグを利用してください',
  ],
  [
    (cmd) => {
      return /^git\s+grep\s+/.test(cmd) && !/-W|-p|--function-context|--show-function/.test(cmd)
    },
    'git grep では --function-context か --show-function フラグを使ってください。まず --function-context フラグを利用し、結果行が多すぎる場合、 --show-function と [ -C | -A | -B ] フラグを利用してください',
  ],
  [
    (cmd) => /\bfind\s+.+\s+-name\b/.test(cmd),
    'find -name の変わりに git ls-files -- <パターン> を使ってください。git ls-files -o --exclude-standard を使うと、未追跡のファイルも確認できます。チェックアウトしていないコミットを確認するときは --with-tree=<tree-ish> でコミットを指定してください',
  ],
  [
    (cmd) => {
      const match = cmd.match(/^git\s+checkout\s+(\S+)/)
      if (!match) return false

      const branch = match[1]
      return (
        branch !== '-b' &&
        branch !== '-B' &&
        branch !== '--' &&
        !branch.startsWith('origin/') &&
        !branch.startsWith('-')
      )
    },
    'ローカルのブランチはチェックアウトせず、detached checkout してください。例えば git checkout master はせず git checkout origin/master してください',
  ],
  [
    (cmd) => /^git\s+ls-files\b.*\|\s*xargs\s+(git\s+)?grep/.test(cmd),
    'git ls-files を xargs へパイプして使うのではなく、git grep --show-function [-C|-A|-B] -- <path...> を使ってください。xargs は不要です',
  ],
  [
    (cmd) => /^cd/.test(cmd),
    'cd コマンドは使わないでください。例えば yarn の場合 --cwd フラグ、make の場合 -C フラグ、docker compose なら --project-directory フラグが利用できます',
  ],
]

function validateCommand(command) {
  const issues = []
  for (const [validationFunc, message] of VALIDATION_RULES) {
    if (validationFunc(command)) {
      issues.push(message)
    }
  }
  return issues
}

// 標準入力からJSONデータを読み込む
let inputData = ''
process.stdin.setEncoding('utf8')

process.stdin.on('data', (chunk) => {
  inputData += chunk
})

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(inputData)

    const toolName = data.tool_name || ''
    const toolInput = data.tool_input || {}
    const command = toolInput.command || ''

    if (toolName !== 'Bash' || !command) {
      process.exit(1)
    }

    // コマンドを検証
    const issues = validateCommand(command)

    if (issues.length > 0) {
      for (const message of issues) {
        console.error(`• ${message}`)
      }
      process.exit(2)
    }

    process.exit(0)
  } catch (e) {
    console.error(`Error: Invalid JSON input: ${e.message}`)
    process.exit(1)
  }
})

process.stdin.on('error', (err) => {
  console.error(`Error reading input: ${err.message}`)
  process.exit(1)
})
