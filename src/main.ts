import "./style.css";
import { Game } from "./game/Game";

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

if (new URLSearchParams(location.search).has("debug")) {
  const staticBox = document.createElement("pre");
  const liveBox = document.createElement("pre");
  const style =
    "position:fixed;left:0;z-index:99999;background:rgba(0,0,0,0.75);color:#0f0;font-size:11px;padding:6px;margin:0;max-width:100vw;white-space:pre-wrap;pointer-events:none;";
  staticBox.style.cssText = `${style}top:0;`;
  liveBox.style.cssText = `${style}top:160px;`;
  document.body.appendChild(staticBox);
  document.body.appendChild(liveBox);
  const staticLines: string[] = [];
  const logStatic = (msg: string) => {
    staticLines.push(msg);
    staticBox.textContent = staticLines.join("\n");
  };

  window.addEventListener("error", (e) => logStatic(`JS ERROR: ${e.message} @ ${e.filename}:${e.lineno}`));
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    logStatic("WEBGL CONTEXT LOST");
  });

  logStatic(`UA: ${navigator.userAgent}`);
  logStatic(`DPR: ${window.devicePixelRatio}, canvas: ${canvas.clientWidth}x${canvas.clientHeight}`);

  const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
  if (gl) {
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    logStatic(`GL version: ${gl.getParameter(gl.VERSION)}`);
    logStatic(`GL renderer: ${dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "n/a"}`);
    logStatic(`Max varying vectors: ${gl.getParameter(gl.MAX_VARYING_VECTORS)}`);
    logStatic(`Max texture size: ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`);
  } else {
    logStatic("No WebGL context obtained via debug probe");
  }

  const params = new URLSearchParams(location.search);
  const debugFlagNames = ["noground", "flatground", "nofog", "nopipeline", "nofrustumcull", "wireframe"];
  const activeFlags = debugFlagNames.filter((f) => params.has(f));
  logStatic(`active flags: ${activeFlags.length ? activeFlags.join(", ") : "(none — add e.g. ?debug=1&noground=1 to test)"}`);

  try {
    const game = new Game(canvas);
    game.applyDebugFlags(params);
    setInterval(() => {
      const info = game.debugInfo();
      const statusStr = Object.entries(info.meshStatus)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      liveBox.textContent = `meshes=${info.meshCount} lights=${info.lightCount} materials=${info.materialCount} fps=${info.fps.toFixed(0)}\ncam ${info.camera}\n${statusStr}`;
    }, 1000);
  } catch (err) {
    logStatic(`CONSTRUCTOR THREW: ${(err as Error).message}\n${(err as Error).stack}`);
  }
} else {
  new Game(canvas);
}
