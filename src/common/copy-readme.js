const fs = require("fs")
const path = require("path")

fs.copyFileSync(path.join("..",
  "..",
  "README.md"),
  "README.md")