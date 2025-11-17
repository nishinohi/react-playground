#!/usr/bin/env node

// 検証ルールを (検証関数, メッセージ) のタプルのリストとして定義
const VALIDATION_RULES = [
  [
    (_cmd) => true,
    'git grep --function-context [--and|--or|--not|(|)|-e <pattern>...] -- <pathspec>... を使ってください。--function-context フラグにより出力行が多すぎる場合、 --show-function と -C フラグを利用してください',
  ],
]

function validateCommand(pattern) {
  const issues = []
  for (const [validationFunc, message] of VALIDATION_RULES) {
    if (validationFunc(pattern)) {
      issues.push(message)
    }
  }
  return issues
}

// 標準入力からJSONを読み取る
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
    const pattern = toolInput.pattern || ''

    if (toolName !== 'Grep' || !pattern) {
      process.exit(1)
    }

    // パターンを検証
    const issues = validateCommand(pattern)

    if (issues.length > 0) {
      for (const message of issues) {
        process.stderr.write(`• ${message}\n`)
      }
      process.exit(2)
    }
  } catch (e) {
    process.stderr.write(`Error: Invalid JSON input: ${e.message}\n`)
    process.exit(1)
  }
})

process.stdin.on('error', (err) => {
  process.stderr.write(`Error reading input: ${err.message}\n`)
  process.exit(1)
})
