/* Savana Jerky v2 – WebGL pozadí „zlaté duny“ v hero + plovoucí tlačítko.
   Vlastní shader: vrstvy dun z fbm šumu, slunce sleduje myš, filmové zrno. */
(() => {
  'use strict';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- plovoucí tlačítko „Vybrat jerky“ ---------- */
  const cta = document.querySelector('.float-cta');
  const products = document.getElementById('produkty');
  const contact = document.getElementById('kontakt');
  const onScroll = () => {
    if (!cta) return;
    const y = scrollY, vh = innerHeight;
    const inProducts = products && products.getBoundingClientRect().top < vh * .5 && products.getBoundingClientRect().bottom > vh * .5;
    const atEnd = contact && contact.getBoundingClientRect().top < vh * .8;
    cta.classList.toggle('is-visible', y > vh * .8 && !inProducts && !atEnd);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- WebGL duny ---------- */
  const canvas = document.querySelector('.dunes');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return; // zůstane CSS přechod v pozadí hero

  const vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const fs = `precision highp float;
uniform vec2 r;uniform float t;uniform vec2 m;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r;float asp=r.x/r.y;vec2 p=vec2(uv.x*asp,uv.y);vec2 mm=vec2(m.x*asp,m.y);
  vec3 col=mix(vec3(.42,.16,.05),vec3(.045,.03,.025),smoothstep(.12,1.,uv.y));
  float sun=exp(-3.2*length(p-vec2(mm.x,.58+.12*m.y)));
  col+=vec3(1.,.55,.2)*sun*.6;
  for(int i=0;i<5;i++){
    float fi=float(i);
    float x=p.x*(1.1+fi*.35)+t*(.018+fi*.011)+fi*7.3;
    float f0=fbm(vec2(x,fi));
    float y=.6-fi*.115+.12*f0+.045*sin(x*1.7+fi+t*.05);
    float d=y-uv.y;
    float mask=smoothstep(0.,.003+.002*fi,d);
    float slope=fbm(vec2(x+.03,fi))-fbm(vec2(x-.03,fi));
    float side=clamp(slope*16.*sign(p.x-mm.x),-1.,1.);
    vec3 lit=mix(vec3(.98,.58,.24),vec3(.5,.22,.07),fi/4.);
    vec3 dark=mix(vec3(.2,.08,.03),vec3(.035,.022,.018),fi/4.);
    vec3 c=mix(lit,dark,clamp(d*3.2,0.,1.)*.85+(.5+.5*side)*.3);
    c+=vec3(1.,.72,.38)*exp(-d*80.)*(.55-.08*fi)*(.7+.3*(1.-side));
    col=mix(col,c,mask);
  }
  col*=1.-.38*length(uv-vec2(.6,.45));
  col+=(h(gl_FragCoord.xy+fract(t*7.)*91.)-.5)*.05;
  gl_FragColor=vec4(max(col,0.),1.);
}`;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('Duny: WebGL shader selhal', e); return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't'), uM = gl.getUniformLocation(prog, 'm');

  const scale = Math.min(devicePixelRatio || 1, 1.5) * 0.6; // nižší rozlišení = plynulost, zrno skryje rozdíl
  const resize = () => {
    const w = Math.max(1, Math.round(canvas.clientWidth * scale)), h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  };
  const target = { x: .72, y: .55 }, mouse = { x: .72, y: .55 };
  const hero = canvas.closest('.hero') || canvas;
  hero.addEventListener('pointermove', (e) => {
    const b = hero.getBoundingClientRect();
    target.x = (e.clientX - b.left) / b.width; target.y = 1 - (e.clientY - b.top) / b.height;
  });
  hero.addEventListener('pointerleave', () => { target.x = .72; target.y = .55; });

  let visible = true, raf = 0;
  const t0 = performance.now();
  const frame = (now) => {
    raf = 0;
    resize();
    mouse.x += (target.x - mouse.x) * .05; mouse.y += (target.y - mouse.y) * .05;
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uT, reduceMotion ? 12 : (now - t0) / 1000);
    gl.uniform2f(uM, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.classList.add('is-ready');
    if (visible && !reduceMotion) raf = requestAnimationFrame(frame);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }).observe(canvas);
  }
  addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(frame); });
  raf = requestAnimationFrame(frame);
})();
