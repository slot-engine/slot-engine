import fs from "fs"

const distDir = "dist"

function main() {
  fs.rmSync(distDir, { recursive: true, force: true })
  fs.mkdirSync(distDir, { recursive: true })
}

main()
