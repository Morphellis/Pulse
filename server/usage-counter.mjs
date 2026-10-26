/*
  Счётчик установок VK Desktop.

  Принимает POST с {"installId": "<uuid>"} и возвращает {"users": N, "logins": M}.
  Хранит только сами идентификаторы установок - ни id ВКонтакте, ни IP, ни чего-либо,
  по чему можно узнать человека.

  Запуск:
    node usage-counter.mjs
  Порт и файл данных задаются переменными окружения PORT и DATA_FILE.

  Как повесить на systemd (по образцу вашего tgbot.service):
    [Unit]
    Description=VK Desktop usage counter
    After=network.target

    [Service]
    WorkingDirectory=/opt/vkd-counter
    ExecStart=/usr/bin/node /opt/vkd-counter/usage-counter.mjs
    Environment=PORT=8787
    Restart=always

    [Install]
    WantedBy=multi-user.target
*/

import http from 'http'
import fs from 'fs/promises'
import path from 'path'

const PORT = Number(process.env.PORT ?? 8787)
const DATA_FILE = process.env.DATA_FILE ?? path.join(process.cwd(), 'usage.json')

/** @type {{ installs: Record<string, number>, logins: number }} */
let data = { installs: {}, logins: 0 }
let saveTimer = null

async function load() {
  try {
    data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'))
    data.installs ??= {}
    data.logins ??= 0
  } catch {
    // Первого запуска ещё не было, начинаем с чистого счётчика
  }
}

/** Пишем не чаще раза в секунду: запуски могут прийти пачкой */
function scheduleSave() {
  if (saveTimer) {
    return
  }

  saveTimer = setTimeout(async () => {
    saveTimer = null
    const tmp = `${DATA_FILE}.tmp`
    await fs.writeFile(tmp, JSON.stringify(data))
    await fs.rename(tmp, DATA_FILE)
  }, 1000)
}

const stats = () => ({
  users: Object.keys(data.installs).length,
  logins: data.logins
})

const server = http.createServer((req, res) => {
  const send = (code, body) => {
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    })
    res.end(JSON.stringify(body))
  }

  if (req.method === 'OPTIONS') {
    send(204, {})
    return
  }

  if (req.method === 'GET') {
    send(200, stats())
    return
  }

  if (req.method !== 'POST') {
    send(405, { error: 'method not allowed' })
    return
  }

  let body = ''
  req.on('data', (chunk) => {
    body += chunk
    // Защита от мусора: тело заведомо маленькое
    if (body.length > 1024) {
      req.destroy()
    }
  })

  req.on('end', () => {
    let installId

    try {
      installId = JSON.parse(body).installId
    } catch {
      send(400, { error: 'bad json' })
      return
    }

    if (typeof installId !== 'string' || !/^[0-9a-f-]{36}$/i.test(installId)) {
      send(400, { error: 'bad installId' })
      return
    }

    data.installs[installId] = Date.now()
    data.logins++
    scheduleSave()

    send(200, stats())
  })
})

await load()
server.listen(PORT, () => {
  console.log(`Счётчик слушает порт ${PORT}, данные в ${DATA_FILE}`)
  console.log('Текущее состояние:', stats())
})
