import fs from "fs"
import path from "path"

const distDir = "dist"

function copyRecursive(src: string, dest: string, ignore: string[] = []) {
  if (ignore.some((ignored) => src.includes(ignored))) return

  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file), ignore)
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
  }
}

function main() {
  fs.rmSync(distDir, { recursive: true, force: true })
  fs.mkdirSync(distDir, { recursive: true })

  copyRecursive("optimizer-rust", path.join(distDir, "optimizer-rust"), [
    path.join("optimizer-rust", "target"),
  ])

  console.log("✅ Files copied successfully.")
}

main()
