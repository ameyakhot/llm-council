require('./vite.polyfill.cjs')
const { spawn } = require('child_process')
const path = require('path')

const vitePath = path.join(__dirname, 'node_modules', '.bin', 'vite')
const args = process.argv.slice(2)

const child = spawn('node', [vitePath, ...args], {
  stdio: 'inherit',
  shell: false
})

child.on('exit', (code) => {
  process.exit(code || 0)
})

