/**
 * Минимальный валидный 16x16 icon.ico (одна иконка, 32bpp).
 * Запуск: node scripts/gen-icon-ico.cjs
 */
const fs = require('fs')
const path = require('path')

const HEADER = Buffer.from([
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x20, 0x00, 0x28, 0x04, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
])
const DIB_HEADER = Buffer.alloc(40)
DIB_HEADER.writeUInt32LE(40, 0)
DIB_HEADER.writeInt32LE(16, 4)
DIB_HEADER.writeInt32LE(32, 8)
DIB_HEADER.writeUInt16LE(1, 12)
DIB_HEADER.writeUInt16LE(32, 14)
DIB_HEADER.writeUInt32LE(1024, 20)

const pixels = Buffer.alloc(1024)
for (let i = 0; i < 1024; i += 4) {
  pixels[i] = 0x6b
  pixels[i + 1] = 0x9a
  pixels[i + 2] = 0xd4
  pixels[i + 3] = 0xff
}

const ico = Buffer.concat([HEADER, DIB_HEADER, pixels])
const outPath = path.join(__dirname, '..', 'src-tauri', 'icons', 'icon.ico')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, ico)
console.log('Written:', outPath)
