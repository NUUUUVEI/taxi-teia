const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '..', 'assets')
fs.mkdirSync(dir, { recursive: true })

// Minimal valid 1x1 black PNG
const png = Buffer.from(
  '89504e470d0a1a0a' +
  '0000000d49484452' + // IHDR chunk header (13 bytes)
  '00000001' +         // width: 1
  '00000001' +         // height: 1
  '08020000' +         // 8-bit depth, color type 2 (RGB), no filters
  '00' +               // filter method
  '9001' +             // interlace + crc hi
  '2e00' +             // crc lo part
  '0000' +
  '034944415478016360000000020001e221bc33' +
  '0000000049454e44ae426082',
  'hex'
)

const files = ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png']
files.forEach(f => {
  fs.writeFileSync(path.join(dir, f), png)
  console.log('Created', f)
})
