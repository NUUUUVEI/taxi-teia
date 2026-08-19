const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const dir = path.join(__dirname, '..', 'assets')
fs.mkdirSync(dir, { recursive: true })

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const combined = Buffer.concat([typeBuf, data])
  const crc = crc32(combined)
  const out = Buffer.allocUnsafe(4 + 4 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  typeBuf.copy(out, 4)
  data.copy(out, 8)
  out.writeUInt32BE(crc, 8 + data.length)
  return out
}

function makePng(r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(1, 0)
  ihdr.writeUInt32BE(1, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const raw = Buffer.from([0, r, g, b]) // filter byte + RGB
  const idat = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const png = makePng(10, 10, 10)

const files = ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png']
files.forEach(f => {
  fs.writeFileSync(path.join(dir, f), png)
  console.log('Created', f)
})
console.log('Done.')
