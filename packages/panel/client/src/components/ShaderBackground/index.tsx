import { useEffect, useRef } from "react"

type Variant = "default" | "danger"

type Rgb = [number, number, number]

const VARIANTS: Record<Variant, { dim: Rgb; bright: Rgb; tint: string }> = {
  default: {
    dim: [0.12, 0.42, 0.38],
    bright: [0.25, 0.84, 0.75],
    tint: "var(--color-accent-500)",
  },
  danger: {
    dim: [0.45, 0.18, 0.15],
    bright: [0.95, 0.42, 0.34],
    tint: "var(--color-danger-500)",
  },
}

// Browsers drop their oldest WebGL context once about 16 are live, and an unmounted canvas
// holds its context until garbage collection, so cards past this cap keep the CSS fallback.
const MAX_CONTEXTS = 8
let liveContexts = 0

const VERTEX = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAGMENT = `
precision highp float;

uniform vec2 u_res;
uniform float u_scale;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_mouseInf;
uniform vec3 u_dim;
uniform vec3 u_bright;

const vec3 UI900 = vec3(0.098, 0.110, 0.125);

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

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 0.6;
  float t = u_time * 0.08;

  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) + t));
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.5),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.5)
  );
  // Only the top of the noise becomes ink, so at most a third of the card is ever tinted.
  float v = smoothstep(0.45, 0.87, fbm(p + 4.0 * r));

  vec3 col = mix(UI900, u_dim, smoothstep(0.35, 0.85, v)) + u_bright * pow(v, 4.0) * 0.45;

  vec2 css = (vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) - 0.5) / u_scale;
  float dist = length(mod(css, 24.0) - 12.0);
  float dots = 1.0 - smoothstep(0.75 - 0.5 / u_scale, 0.75 + 0.5 / u_scale, dist);
  col = mix(col, u_bright, 0.18 * dots * smoothstep(0.4, 0.9, v));

  // The pointer scales only the ink, so pixels with no flow stay exactly the card surface.
  float near = 1.0 - smoothstep(0.0, 0.35, length((uv - u_mouse) * vec2(1.0, 1.0 / aspect)));
  col = UI900 + (col - UI900) * (1.0 + 0.25 * u_mouseInf * near);

  col += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`

const fallback = (tint: string) =>
  `radial-gradient(70% 55% at 30% 35%, color-mix(in oklab, ${tint} 18%, transparent), transparent 60%), radial-gradient(70% 55% at 72% 45%, color-mix(in oklab, ${tint} 10%, transparent), transparent 60%), linear-gradient(var(--color-ui-950), var(--color-ui-900))`

function link(gl: WebGLRenderingContext) {
  const program = gl.createProgram()
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, FRAGMENT],
  ] as const) {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    gl.attachShader(program, shader)
  }
  gl.linkProgram(program)
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null
}

function startShader(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  palette: { dim: Rgb; bright: Rgb },
  onContextLost: () => void,
) {
  const program = link(gl)
  if (!program) return
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, "a_pos")
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

  const uRes = gl.getUniformLocation(program, "u_res")
  const uScale = gl.getUniformLocation(program, "u_scale")
  const uTime = gl.getUniformLocation(program, "u_time")
  const uMouse = gl.getUniformLocation(program, "u_mouse")
  const uInfluence = gl.getUniformLocation(program, "u_mouseInf")
  gl.uniform3fv(gl.getUniformLocation(program, "u_dim"), palette.dim)
  gl.uniform3fv(gl.getUniformLocation(program, "u_bright"), palette.bright)

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const card = canvas.parentElement
  const start = performance.now()
  // Cards mounted together would otherwise show the same flow in lockstep.
  const phase = Math.random() * 600
  const target = { x: 0.5, y: 0.5 }
  const pointer = { x: 0.5, y: 0.5 }
  let influence = 0
  let targetInfluence = 0
  let inView = false
  let lost = false
  let raf = 0

  const draw = (now: number) => {
    pointer.x += (target.x - pointer.x) * 0.06
    pointer.y += (target.y - pointer.y) * 0.06
    influence += (targetInfluence - influence) * 0.05
    gl.uniform1f(uTime, reduceMotion ? phase : phase + (now - start) / 1000)
    gl.uniform2f(uMouse, pointer.x, 1 - pointer.y)
    gl.uniform1f(uInfluence, influence)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const frame = (now: number) => {
    draw(now)
    raf = requestAnimationFrame(frame)
  }

  const sync = () => {
    const run = inView && !document.hidden && !reduceMotion && !lost
    if (run && !raf) raf = requestAnimationFrame(frame)
    if (!run && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  // Resizing clears the drawing buffer, so draw right away instead of waiting for a frame
  // that may be paused.
  const resize = () => {
    const scale = Math.min(window.devicePixelRatio, 1)
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale))
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale))
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(uRes, canvas.width, canvas.height)
    gl.uniform1f(uScale, scale)
    draw(performance.now())
  }

  const onMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    target.x = (event.clientX - rect.left) / rect.width
    target.y = (event.clientY - rect.top) / rect.height
  }
  const onEnter = (event: PointerEvent) => {
    onMove(event)
    targetInfluence = 1
    card?.addEventListener("pointermove", onMove, { passive: true })
  }
  const onLeave = () => {
    targetInfluence = 0
    card?.removeEventListener("pointermove", onMove)
  }
  const onLost = () => {
    lost = true
    onContextLost()
    sync()
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) inView = entry.isIntersecting
    sync()
  })
  intersectionObserver.observe(canvas)
  document.addEventListener("visibilitychange", sync)
  canvas.addEventListener("webglcontextlost", onLost)
  if (!reduceMotion) {
    card?.addEventListener("pointerenter", onEnter)
    card?.addEventListener("pointerleave", onLeave)
  }

  return () => {
    cancelAnimationFrame(raf)
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    document.removeEventListener("visibilitychange", sync)
    canvas.removeEventListener("webglcontextlost", onLost)
    card?.removeEventListener("pointerenter", onEnter)
    card?.removeEventListener("pointerleave", onLeave)
    card?.removeEventListener("pointermove", onMove)
  }
}

export function ShaderBackground({ variant = "default" }: { variant?: Variant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let held = false
    let retry = 0
    let stop: (() => void) | undefined

    const release = () => {
      if (held) liveContexts--
      held = false
    }

    const init = (attempt: number) => {
      if (liveContexts >= MAX_CONTEXTS) return
      liveContexts++
      held = true
      const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      })
      if (gl) {
        stop = startShader(canvas, gl, VARIANTS[variant], release)
        return
      }
      release()
      // Creation can fail while the browser reclaims contexts during navigation.
      if (attempt < 8) retry = requestAnimationFrame(() => init(attempt + 1))
    }
    init(0)

    // Cleanup never calls loseContext(): StrictMode reruns this effect on the same canvas,
    // and getContext would then hand back the dead context.
    return () => {
      cancelAnimationFrame(retry)
      stop?.()
      release()
    }
  }, [variant])

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 -z-10 size-full pointer-events-none"
        style={{ background: fallback(VARIANTS[variant].tint) }}
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-ui-900/85 via-ui-900/40 to-transparent" />
    </>
  )
}
