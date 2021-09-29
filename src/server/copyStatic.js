const path = require("path")
const fs = require("fs")

const src = path.join("src", "static")
const dest = path.join("dist", "static")


function copyRec(fromFolder, toFolder) {
  fs.mkdirSync(toFolder, { recursive: true })
  for (let file of fs.readdirSync(fromFolder)) {
    const srcPath = path.join(fromFolder, file)
    const destPath = path.join(toFolder, file)
    const stat = fs.lstatSync(srcPath)
    if (stat.isDirectory()) {
      copyRec(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

copyRec(src, dest)