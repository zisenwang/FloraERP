import morgan from 'morgan'
import fs from 'fs'
import path from 'path'

function getLogStream() {
  const date = new Date().toISOString().slice(0, 10)
  const logDir = path.join(__dirname, '../../logs')
  fs.mkdirSync(logDir, { recursive: true })
  return fs.createWriteStream(path.join(logDir, `access-${date}.log`), { flags: 'a' })
}

export const requestLogger = morgan(
  ':date[iso] :method :url :status :response-time ms',
  { stream: getLogStream() },
)
