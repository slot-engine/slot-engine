"use client"

import { useEffect, useRef } from "react"

/**
 * An animated, cursor-reactive northern-lights (aurora) background rendered with
 * a WebGL fragment shader. No dependencies.
 *
 *  - Defined aurora curtains meander and shoot vertical rays; they bend toward
 *    and brighten near the pointer.
 *  - Uses an alpha context so that, if the shader can't run, the canvas stays
 *    transparent and the CSS fallback gradient (inline style) shows through.
 *  - Retries context creation a few frames (covers transient failures during
 *    client-side navigation) and never permanently hides itself.
 *  - Respects `prefers-reduced-motion` (renders a single static frame).
 *  - Pauses while the tab is hidden.
 *
 * NOTE: we intentionally do NOT call `WEBGL_lose_context.loseContext()` on
 * cleanup. Forcing context loss makes the *next* mount (React Strict Mode
 * double-invoke in dev, or navigating back to this page) fail to initialise.
 */

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_mouseInf;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

vec3 layerColor(int i) {
  if (i == 0) return vec3(0.10, 0.85, 0.72); // teal-cyan
  if (i == 1) return vec3(0.20, 0.55, 1.00); // blue
  return vec3(0.62, 0.32, 1.00);             // violet
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / u_res.y;
  float x = (uv.x - 0.5) * aspect;
  float t = u_time * 0.12;

  vec2 m = u_mouse;
  float mx = (m.x - 0.5) * aspect;

  // night-sky background
  vec3 col = mix(vec3(0.015, 0.03, 0.06), vec3(0.004, 0.008, 0.018),
                 smoothstep(0.0, 1.0, uv.y));
  // faint horizon glow near the bottom
  col += vec3(0.02, 0.06, 0.10) * smoothstep(0.4, 0.0, uv.y);

  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec3 lc = layerColor(i);

    // the curtain's vertical center meanders horizontally over time
    float meander = fbm(vec2(x * 0.7 + t * (0.5 + 0.12 * fi) + fi * 7.0, t * 0.25 + fi));
    float center = 0.4 + 0.12 * fi + (meander - 0.5) * 0.45;

    // pointer bends the curtain locally toward the cursor
    float qx = (x - mx) * 1.1;
    float infx = exp(-qx * qx);
    center += (m.y - center) * u_mouseInf * 0.4 * infx;

    float d = uv.y - center;

    // bright meandering core line
    float core = exp(-d * d * (150.0 - 30.0 * fi));

    // vertical rays shooting up from the core
    float rayTex = 0.5 + 0.5 * sin(x * 14.0 + fbm(vec2(x * 4.0 + fi, t * 0.8)) * 7.0 + t * 1.5);
    rayTex = pow(rayTex, 2.0);
    float streak = exp(-max(d, 0.0) * 5.0) * smoothstep(-0.01, 0.05, d) * rayTex;

    float band = core * 1.15 + streak * 0.7;

    // extra brightness right under the cursor
    band *= 1.0 + u_mouseInf * 0.7 * infx * exp(-d * d * 30.0);

    col += lc * band;
  }

  // sparse stars in the upper sky
  float star = hash21(floor(gl_FragCoord.xy / 2.0));
  star = pow(star, 60.0) * smoothstep(0.45, 1.0, uv.y);
  col += vec3(star) * 0.55;

  // soft filmic saturation so bright cores glow without harsh clipping
  col = 1.0 - exp(-col * 1.3);

  // dither to reduce banding
  col += (hash21(gl_FragCoord.xy) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`

export function ShaderBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let stop: (() => void) | null = null

    const opts: WebGLContextAttributes = {
      antialias: false,
      alpha: true,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    }

    const setup = (gl: WebGLRenderingContext): (() => void) | null => {
      const compile = (type: number, src: string) => {
        const sh = gl.createShader(type)
        if (!sh) return null
        gl.shaderSource(sh, src)
        gl.compileShader(sh)
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          gl.deleteShader(sh)
          return null
        }
        return sh
      }

      const vs = compile(gl.VERTEX_SHADER, VERT)
      const fs = compile(gl.FRAGMENT_SHADER, FRAG)
      const prog = gl.createProgram()
      if (!vs || !fs || !prog) return null
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null
      gl.useProgram(prog)

      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      )
      const aPos = gl.getAttribLocation(prog, "a_pos")
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

      const uRes = gl.getUniformLocation(prog, "u_res")
      const uTime = gl.getUniformLocation(prog, "u_time")
      const uMouse = gl.getUniformLocation(prog, "u_mouse")
      const uInf = gl.getUniformLocation(prog, "u_mouseInf")

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

      let w = 1
      let h = 1
      const target = { x: 0.5, y: 0.5 }
      const cur = { x: 0.5, y: 0.5 }
      let inf = 0
      let targetInf = 0
      const start = performance.now()

      const draw = (now: number) => {
        cur.x += (target.x - cur.x) * 0.06
        cur.y += (target.y - cur.y) * 0.06
        inf += (targetInf - inf) * 0.05
        gl.uniform2f(uRes, w, h)
        gl.uniform1f(uTime, reduce ? 8.0 : (now - start) / 1000)
        gl.uniform2f(uMouse, cur.x, 1.0 - cur.y) // flip y for GL coords
        gl.uniform1f(uInf, inf)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }

      const resize = () => {
        const rect = canvas.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
        w = Math.max(1, Math.round(rect.width * dpr))
        h = Math.max(1, Math.round(rect.height * dpr))
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
        if (reduce) draw(performance.now())
      }

      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(canvas)

      let raf = 0
      let running = true
      const frame = (now: number) => {
        if (!running) return
        draw(now)
        raf = requestAnimationFrame(frame)
      }
      if (reduce) {
        draw(performance.now())
      } else {
        raf = requestAnimationFrame(frame)
      }

      const onMove = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect()
        target.x = (e.clientX - rect.left) / rect.width
        target.y = (e.clientY - rect.top) / rect.height
        targetInf = 1
      }
      const onLeave = () => {
        targetInf = 0
      }
      const onVis = () => {
        if (document.hidden) {
          running = false
          cancelAnimationFrame(raf)
        } else if (!reduce && !running) {
          running = true
          raf = requestAnimationFrame(frame)
        }
      }
      const onLost = (e: Event) => {
        e.preventDefault()
        running = false
        cancelAnimationFrame(raf)
      }

      window.addEventListener("pointermove", onMove, { passive: true })
      window.addEventListener("pointerout", onLeave)
      document.addEventListener("visibilitychange", onVis)
      canvas.addEventListener("webglcontextlost", onLost, false)

      return () => {
        running = false
        cancelAnimationFrame(raf)
        ro.disconnect()
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerout", onLeave)
        document.removeEventListener("visibilitychange", onVis)
        canvas.removeEventListener("webglcontextlost", onLost)
      }
    }

    const tryInit = (attempt: number) => {
      if (disposed) return
      const gl = (canvas.getContext("webgl", opts) ||
        canvas.getContext("experimental-webgl", opts)) as WebGLRenderingContext | null
      if (!gl) {
        // transient failure (e.g. context limit during navigation) — retry a
        // few frames; otherwise the CSS fallback gradient stays visible.
        if (attempt < 8) requestAnimationFrame(() => tryInit(attempt + 1))
        return
      }
      stop = setup(gl)
    }
    tryInit(0)

    return () => {
      disposed = true
      stop?.()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        background:
          "radial-gradient(70% 55% at 30% 35%, rgba(20,200,170,0.22), transparent 60%), radial-gradient(70% 55% at 72% 45%, rgba(110,70,230,0.22), transparent 60%), linear-gradient(180deg, #02030a 0%, #051426 70%, #02050f 100%)",
      }}
    />
  )
}
