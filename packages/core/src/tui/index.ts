export class TerminalUi {
  private progress: number = 0
  private timeRemaining: number = 0
  private gameMode: string
  private currentSims: number = 0
  private totalSims: number = 0

  private logs: Array<{ i: number; m: string }> = []
  private logScrollOffset: number = 0
  private isScrolled: boolean = false

  private minWidth = 50
  private minHeight = 12

  private isRendering = false
  private renderInterval: NodeJS.Timeout | null = null
  private resizeHandler: () => void
  private sigintHandler: () => void
  private keyHandler: (data: Buffer) => void

  constructor(opts: TerminalUiOptions) {
    this.gameMode = opts.gameMode

    this.resizeHandler = () => {
      this.clearScreen()
      this.render()
    }
    this.sigintHandler = () => {
      this.stop()
      process.exit(0)
    }
    this.keyHandler = (data: Buffer) => {
      const key = data.toString()

      if (key === "j" || key === "\u001b[A") {
        // or arrow up
        this.scrollUp()
      } else if (key === "k" || key === "\u001b[B") {
        // or arrow down
        this.scrollDown()
      } else if (key === "l") {
        this.scrollToBottom()
      } else if (key === "\u0003") {
        // ctrl + c
        this.stop()
        process.exit(0)
      }
    }
    process.stdout.on("resize", this.resizeHandler)
  }

  private get terminalWidth() {
    return process.stdout.columns || 80
  }

  private get terminalHeight() {
    return process.stdout.rows || 24
  }

  private get isTooSmall() {
    return this.terminalWidth < this.minWidth || this.terminalHeight < this.minHeight
  }

  start() {
    this.enterAltScreen()
    this.hideCursor()
    this.clearScreen()

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.on("data", this.keyHandler)
    }

    this.render()
    this.renderInterval = setInterval(() => this.render(), 100)
    process.on("SIGINT", this.sigintHandler)
  }

  stop() {
    if (this.renderInterval) {
      clearInterval(this.renderInterval)
      this.renderInterval = null
    }

    if (process.stdin.isTTY) {
      process.stdin.off("data", this.keyHandler)
      process.stdin.setRawMode(false)
      process.stdin.pause()
    }

    this.showCursor()
    this.clearScreen()
    this.exitAltScreen()
    process.stdout.off("resize", this.resizeHandler)
    process.off("SIGINT", this.sigintHandler)
  }

  setProgress(progress: number, timeRemaining: number, completedSims: number) {
    this.progress = Math.max(0, Math.min(100, progress))
    this.timeRemaining = Math.max(0, timeRemaining)
    this.currentSims = completedSims
  }

  setDetails(opts: { gameMode: string; totalSims: number }) {
    this.gameMode = opts.gameMode
    this.totalSims = opts.totalSims
  }

  log(message: string) {
    this.logs.push({ i: this.logs.length, m: message })
    if (!this.isScrolled) this.scrollToBottom()
  }

  scrollUp(lines: number = 1) {
    this.logScrollOffset = Math.max(0, this.logScrollOffset - lines)
    this.isScrolled = true
  }

  scrollDown(lines: number = 1) {
    const maxOffset = Math.max(0, this.logs.length - this.getLogAreaHeight())
    this.logScrollOffset = Math.min(maxOffset, this.logScrollOffset + lines)

    if (this.logScrollOffset >= maxOffset) {
      this.isScrolled = false
    }
  }

  scrollToBottom() {
    const maxOffset = Math.max(0, this.logs.length - this.getLogAreaHeight())
    this.logScrollOffset = maxOffset
    this.isScrolled = false
  }

  clearLogs() {
    this.logs = []
    this.logScrollOffset = 0
  }

  private getLogAreaHeight() {
    // Total height minus: top border (1) + nav hint (1) + bottom border (1) + info bar (3) + progress bar (2)
    return Math.max(1, this.terminalHeight - 8)
  }

  private enterAltScreen() {
    process.stdout.write("\x1B[?1049h")
  }

  private exitAltScreen() {
    process.stdout.write("\x1B[?1049l")
  }

  private hideCursor() {
    process.stdout.write("\x1B[?25l")
  }

  private showCursor() {
    process.stdout.write("\x1B[?25h")
  }

  private clearScreen() {
    process.stdout.write("\x1B[2J\x1B[H")
  }

  private moveTo(row: number, col: number) {
    process.stdout.write(`\x1B[${row};${col}H`)
  }

  private render() {
    if (this.isRendering) return
    this.isRendering = true

    try {
      this.moveTo(1, 1)

      if (this.isTooSmall) {
        this.clearScreen()
        let msg = "Terminal too small."
        let row = Math.floor(this.terminalHeight / 2)
        let col = Math.max(1, Math.floor((this.terminalWidth - msg.length) / 2))
        this.moveTo(row, col)
        process.stdout.write(msg)
        msg = "Try resizing or restarting the terminal."
        row += 1
        col = Math.max(1, Math.floor((this.terminalWidth - msg.length) / 2))
        this.moveTo(row, col)
        process.stdout.write(msg)
        return
      }

      const lines: string[] = []
      const width = this.terminalWidth

      lines.push(this.boxLine("top", width))

      const canScrollUp = this.logScrollOffset > 0
      const topHint = canScrollUp ? "↑ scroll up (j)" : ""
      lines.push(this.contentLine(this.centerText(topHint, width - 2), width))

      const logAreaHeight = this.getLogAreaHeight()
      const visibleLogs = this.getVisibleLogs(logAreaHeight)

      for (const log of visibleLogs) {
        lines.push(
          this.contentLine(` (${log.i}) ` + this.truncate(log.m, width - 4), width),
        )
      }

      for (let i = visibleLogs.length; i < logAreaHeight; i++) {
        lines.push(this.contentLine("", width))
      }

      const canScrollDown =
        this.logScrollOffset < Math.max(0, this.logs.length - logAreaHeight)
      const bottomHint = canScrollDown ? "↓ scroll down (k) ↓ jump to newest (l)" : ""
      lines.push(this.contentLine(this.centerText(bottomHint, width - 2), width))

      lines.push(this.boxLine("middle", width))

      const modeText = `Mode: ${this.gameMode}`
      const simsText = `${this.currentSims}/${this.totalSims}`
      const infoLine = this.createInfoLine(modeText, simsText, width)
      lines.push(infoLine)

      lines.push(this.boxLine("middle", width))

      lines.push(this.createProgressLine(width))

      lines.push(this.boxLine("bottom", width))

      this.moveTo(1, 1)
      process.stdout.write(lines.join("\n"))
    } finally {
      this.isRendering = false
    }
  }

  private getVisibleLogs(height: number) {
    const start = this.logScrollOffset
    const end = start + height
    return this.logs.slice(start, end)
  }

  private boxLine(type: "top" | "middle" | "bottom", width: number): string {
    const chars = {
      top: { left: "┌", right: "┐", fill: "─" },
      middle: { left: "├", right: "┤", fill: "─" },
      bottom: { left: "└", right: "┘", fill: "─" },
    }
    const c = chars[type]
    return c.left + c.fill.repeat(width - 2) + c.right
  }

  private contentLine(content: string, width: number): string {
    const innerWidth = width - 2
    const paddedContent = content.padEnd(innerWidth).slice(0, innerWidth)
    return "│" + paddedContent + "│"
  }

  private createInfoLine(left: string, right: string, width: number): string {
    const innerWidth = width - 2
    const separator = " │ "
    const availableForText = innerWidth - separator.length
    const leftWidth = Math.floor(availableForText / 2)
    const rightWidth = availableForText - leftWidth

    const leftTruncated = this.truncate(left, leftWidth)
    const rightTruncated = this.truncate(right, rightWidth)

    const leftPadded = this.centerText(leftTruncated, leftWidth)
    const rightPadded = this.centerText(rightTruncated, rightWidth)

    return "│" + leftPadded + separator + rightPadded + "│"
  }

  private createProgressLine(width: number): string {
    const innerWidth = width - 2
    const timeStr = this.formatTime(this.timeRemaining)
    const percentStr = `${this.progress.toFixed(2)}%`
    const rightInfo = `${timeStr}  ${percentStr}`

    const barWidth = Math.max(10, innerWidth - rightInfo.length - 3)
    const filledWidth = Math.round((this.progress / 100) * barWidth)
    const emptyWidth = barWidth - filledWidth

    const bar = "█".repeat(filledWidth) + "-".repeat(emptyWidth)
    const content = ` ${bar} ${rightInfo}`

    return this.contentLine(content, width)
  }

  private formatTime(seconds: number) {
    return new Date(seconds * 1000).toISOString().substr(11, 8)
  }

  private centerText(text: string, width: number) {
    if (text.length >= width) return text.slice(0, width)
    const padding = width - text.length
    const leftPad = Math.floor(padding / 2)
    const rightPad = padding - leftPad
    return " ".repeat(leftPad) + text + " ".repeat(rightPad)
  }

  private truncate(text: string, maxLength: number) {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 3) + "..."
  }
}

interface TerminalUiOptions {
  gameMode: string
}
