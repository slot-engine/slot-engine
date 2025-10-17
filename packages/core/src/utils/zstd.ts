import path from "path"
import { spawn } from "child_process"

export async function zstd(...args: string[]) {
  return new Promise((resolve, reject) => {
    const task = spawn(path.join(__dirname, "./lib/zstd.exe"), args)
    task.on("error", (error) => {
      console.error("Error:", error)
      reject(error)
    })
    task.on("exit", () => {
      resolve(true)
    })
    task.on("close", () => {
      resolve(true)
    })
    task.stdout.on("data", (data) => {
      console.log(data.toString())
    })
    task.stderr.on("data", (data) => {
      console.log(data.toString())
    })
    task.stdout.on("error", (data) => {
      console.log(data.toString())
      reject(data.toString())
    })
  })
}
