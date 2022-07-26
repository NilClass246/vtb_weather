const EFFECT_SHADERS = {
    fog: {
        source: `
        uniform float fogDensity;
        uniform bool isDust;
        uniform vec2 rateRange;

        vec4 fogColor = vec4(1.0, 1.0, 1.0, 1.0);
        vec4 dustColor = vec4(0.96, 0.76, 0.26, 1.0);
        
        float rand(vec2 coord) {
            return fract(sin(dot(coord, vec2(56, 78)) * 1000.0) * 1000.0);
        }
        
        float noise(vec2 coord) {
            vec2 i = floor(coord);
            vec2 f = fract(coord);
        
            float a = rand(i);
            float b = rand(i + vec2(1.0, 0.0));
            float c = rand(i + vec2(0.0, 1.0));
            float d = rand(i + vec2(1.0, 1.0));
        
            vec2 cubic = f * f * (3.0 - 2.0 * f);
        
            return mix(a, b, cubic.x) + (c - a) * cubic.y * (1.0 - cubic.x) + (d - b) * cubic.x * cubic.y;
        }
        
        float fbm(vec2 coord) {
            float value = 0.0;        
            value += noise(coord) * 0.5;
            value += noise(coord * 2.0) * 0.25;
            value += noise(coord * 4.0) * 0.125;
            value += noise(coord * 8.0) * 0.0625;
            return value;
        }
        
        void paint(out vec4 fragColor, in vec2 fragCoord) {
            vec2 uv = fragCoord / u_screenSize * 10.0;
            vec2 motion = vec2(fbm(uv + u_time * 0.01));
            vec4 baseColor = fogColor;
            float final = fbm(uv + motion + vec2(-u_time * 0.5, 0)) * (rateRange.y - rateRange.x) + rateRange.x;
            fragColor = baseColor * fogDensity * final;
        }`,
        params: {
            fogDensity: ['1f', 0.5],
            isDust: ['1i', false],
            rateRange: ['2f', [0.0, 1.0]]
        }
    },
    rain: {
        source: `
        uniform bool lightningEnabled;
        uniform vec2 rainingRate;
        uniform float dropSpeed;
        uniform float windSpeed;
        uniform float dropSizeX;
        uniform float dropSizeY;
        uniform vec4 dropColor;
        
        vec2 rand2(vec2 coord) {
            vec2 p = fract(coord * vec2(.1031, .11369));
            p += dot(p, p.yx + 11.4514);
            return fract(p * 100.0);
        }
        
        float rain(vec2 coord) {
            vec2 center = rand2(floor(coord));
            vec2 delta = fract(coord) - center;
            return step(-dropSizeX * 0.5, delta.x) * step(delta.x, dropSizeX * 0.5) * step(-dropSizeY * 0.5, delta.y) * step(delta.y, dropSizeY * 0.5);
        }
        
        void paint(out vec4 fragColor, in vec2 fragCoord) {
            vec2 uv = (fragCoord - u_screenSize * 0.5) / u_screenSize.y;
            uv *= rainingRate;
            float d = rain(uv + vec2(u_time * windSpeed, u_time * dropSpeed));
            float lightning = lightningEnabled ? pow(max(0.0, (sin(u_time / 2.0 + sin(u_time / 2.0)) - 0.4) / 0.6), 10.0) * sin(2.0 * u_time * sin(2.0 * u_time)) : 0.0;
            fragColor = mix(dropColor * d, vec4(0.5, 0.5, 0.5, 0.5), lightning);
        }`,
        params: {
            lightningEnabled: ['1i', false],
            dropColor: ['4f', [1.0, 1.0, 1.0, 1.0]],
            rainingRate: ['2f', [10.0, 10.0]],
            dropSpeed: ['1f', 10.0],
            windSpeed: ['1f', -0.1],
            dropSizeX: ['1f', 0.05],
            dropSizeY: ['1f', 0.4]
        }
    },
    snow: {
        source: `
        uniform float windSpeed;
        uniform float dropSpeed;
        uniform vec2 snowingRate;

        float rand(vec2 coord) {
            return fract(sin(dot(coord, vec2(56, 78)) * 1000.0) * 1000.0);
        }

        vec2 rand2(vec2 coord) {
            vec2 p = fract(coord * vec2(.1031, .11369));
            p += dot(p, p.yx + 11.4514);
            return fract(p * 100.0);
        }
        
        float snow(vec2 coord) {
            vec2 center = rand2(floor(coord));
            float d = length(fract(coord) - center);
            return smoothstep(0.05, 0.0, d);
        }
        
        float noise(vec2 coord) {
            vec2 i = floor(coord);
            vec2 f = fract(coord);
        
            float a = rand(i);
            float b = rand(i + vec2(1.0, 0.0));
            float c = rand(i + vec2(0.0, 1.0));
            float d = rand(i + vec2(1.0, 1.0));
        
            vec2 cubic = f * f * (3.0 - 2.0 * f);
        
            return mix(a, b, cubic.x) + (c - a) * cubic.y * (1.0 - cubic.x) + (d - b) * cubic.x * cubic.y;
        }
        
        float fbm(vec2 coord) {
            float value = 0.0;        
            value += noise(coord) * 0.5;
            value += noise(coord * 2.0) * 0.25;
            value += noise(coord * 4.0) * 0.125;
            value += noise(coord * 8.0) * 0.0625;
            return value;
        }

        void paint(out vec4 fragColor, in vec2 fragCoord) {
            vec2 uv = (fragCoord - u_screenSize * 0.5) / u_screenSize.y;
            uv *= snowingRate;
            vec2 motion = vec2(fbm(uv + vec2(u_time * 0.1, 0.0))) * vec2(0.5, 0.1);
            float d = snow(uv + vec2(u_time * windSpeed, u_time * dropSpeed) + motion);
            fragColor = vec4(0.5, 0.5, 0.5, 0.5) * d;
        }`,
        params: {
            windSpeed: ['1f', -1.0],
            dropSpeed: ['1f', 0.5],
            snowingRate: ['2f', [10.0, 10.0]]
        }
    },
    aurora: {
        source: `
        // this shader is referenced from https://www.shadertoy.com/view/MsjfRG
        // which is written by Mattenii

        float hash(vec2 co) {
            return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
        }
        float hash(float x, float y) {
            return hash(vec2(x, y));
        }

        float shash(vec2 co)
        {
            float x = co.x;
            float y = co.y;
            
            float corners = (hash(x-1., y-1.) + hash(x+1., y-1.) + hash(x-1., y+1.) + hash(x+1., y+1.))/16.;
            float sides   = (hash(x-1., y) + hash(x+1., y) + hash(x, y-1.) + hash(x, y+1.))/8.;
            float center  = hash(co) / 4.;
            
            return corners + sides + center;
        }

        float noise(vec2 co)
        {
            vec2 pos  = floor(co);
            vec2 fpos = co - pos;
            
            fpos = (3.0 - 2.0*fpos)*fpos*fpos;
            
            float c1 = shash(pos);
            float c2 = shash(pos + vec2(0.0, 1.0));
            float c3 = shash(pos + vec2(1.0, 0.0));
            float c4 = shash(pos + vec2(1.0, 1.0));
            
            float s1 = mix(c1, c3, fpos.x);
            float s2 = mix(c2, c4, fpos.x);
            
            return mix(s1, s2, fpos.y);
        }

        float pnoise(vec2 co, int oct)
        {
            float total = 0.0;
            float m = 0.0;
            
            for(int i=0; i<oct; i++)
            {
                float freq = pow(2.0, float(i));
                float amp  = pow(0.5, float(i));
                
                total += noise(freq * co) * amp;
                m += amp;
            }
            
            return total/m;
        }

        vec2 fbm(vec2 p, int oct)
        {
            return vec2(pnoise(p + vec2(u_time, 0.0), oct), pnoise(p + vec2(-u_time, 0.0), oct));
        }

        float fbm2(vec2 p, int oct)
        {
            return pnoise(p + 10.*fbm(p, oct) + vec2(0.0, u_time), oct);
        }

        vec3 lights(vec2 co)
        {
            float d,r,g,b,h;
            vec3 rc,gc,bc,hc;
            
            r = fbm2(co * vec2(1.0, 0.5), 1);
            d = pnoise(2.*co+vec2(0.3*u_time), 1);
            rc = vec3(1, 0.0, 0.0) * r * smoothstep(0.0, 2.5+d*r, co.y) * smoothstep(-5., 1., 5.-co.y-2.*d);

            g = fbm2(co * vec2(2., 0.5), 4);
            gc = 0.8*vec3(0.5,1.0,0.0) * clamp(2.*pow((3.-2.*g)*g*g,2.5)-0.5*co.y, 0.0, 1.0) * smoothstep(-2.*d, 0.0, co.y) * smoothstep(0.0, 0.3, 1.1+d-co.y);
            
            g = fbm2(co * vec2(1.0, 0.2), 2);
            gc += 0.5*vec3(0.5,1.0,0.0) * clamp(2.*pow((3.-2.*g)*g*g,2.5)-0.5*co.y, 0.0, 1.0) * smoothstep(-2.*d, 0.0, co.y) * smoothstep(0.0, 0.3, 1.1+d-co.y);
                        
            h = pnoise(vec2(5.0*co.x, 5.0*u_time), 1);
            hc = vec3(0.0, 0.8, 1.0) * pow(h+0.1,2.0) * smoothstep(-2.*d, 0.0, co.y+0.2) * smoothstep(-h, 0.0, -co.y-0.4);
            
            return rc+gc+hc;
        }

        vec3 sky(vec2 co)
        {
            vec3 col = vec3(0.5*pow(co.y-1.,2.));

            vec2 sco = co*500.0;
            if (hash(floor(sco)) < 0.005)
            {
                float s1 = hash(floor(sco)*floor(sco));
                float s2 = max(1.-2.*distance(vec2(0.5),fract(sco)), 0.0);
                return col + vec3(s1*s2);
            }

            return col;
        }

        void paint(out vec4 fragColor, in vec2 fragCoord)
        {
            vec2 uv = fragCoord.xy / u_screenSize.xy;
            vec2 co = fragCoord.xy / u_screenSize.y;
            
            vec3 col = sky(co);

            float s = 0.1*sin(u_time);
            float f = 0.3+0.4*pnoise(vec2(5.*uv.x, 0.3*u_time),1);
            vec2 aco = co;
            aco.y -= f;
            aco *= 10.*uv.x+5.0;
            col += 0.5*lights(aco)
                * (smoothstep(0.3, 0.6, pnoise(vec2(10.*uv.x, 0.3*u_time),1))
                +  0.5*smoothstep(0.5, 0.7, pnoise(vec2(10.*uv.x,u_time),1)));
            
            fragColor = vec4(col, 1.0);
        }`,
        params: {

        }
    },
};


class PixelShaderProgram {

    static vertexShaderSource = `#version 300 es
    in vec2 a_position;
    
    void main() {
        gl_Position = vec4(a_position.xy, 0.0, 1.0);
    }`;

    static fragmentShaderSource = `#version 300 es
    precision highp float;
    out vec4 color;

    uniform vec2 u_screenSize;
    uniform float u_time;
    uniform bool u_nightMode;

    <!-- insert here -->
    
    void main() {
        vec4 col = vec4(0.0);
        paint(col, gl_FragCoord.xy);
        color = col;
    }`;

    constructor(gl, source) {
        this.gl = gl;
        const fsSource = this.constructor.fragmentShaderSource.replace('<!-- insert here -->', source);

        const loadShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw gl.getShaderInfoLog(shader);
            }

            return shader;
        };

        const vertexShader = loadShader(gl.VERTEX_SHADER, this.constructor.vertexShaderSource);
        const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw gl.getProgramInfoLog(this.program);
        }

        this.uniformLocationCache = new Map();
        this.attributeLocationCache = new Map();
    }

    a(name) {
        if (!this.attributeLocationCache.has(name)) {
            this.attributeLocationCache.set(name, this.gl.getAttribLocation(this.program, name));
        }

        return this.attributeLocationCache.get(name);
    }

    u(name) {
        if (!this.uniformLocationCache.has(name)) {
            this.uniformLocationCache.set(name, this.gl.getUniformLocation(this.program, name));
        }

        return this.uniformLocationCache.get(name);
    }

    set(type, uniformName, ...values) {
        this.gl[`uniform${type}`](this.u(uniformName), ...values);
    }

    use() {
        this.gl.useProgram(this.program);
    }

    free() {
        this.gl.deleteProgram(this.program);
    }
};

export const Weather = Object.freeze({
    Clear: 0,
    Fog: 1,
    Rain: 2,
    Snow: 3,
    Aurora: 4
});

export class Effects {
    constructor(containerId) {
        this.containerId = containerId;

        this.canvas = null;
        this.gl = null;

        this.program = null;

        this.running = false;

        this.height = null;

        this.lastTimestamp = 0;

        this.currentBasicWeather = null;
        this.currentWeatherParams = null;

        this.nightMode = false;
    }

    createElement(height) {
        const container = $('#' + this.containerId);
        const canvasId = 'effect-canvas'

        container.append(`<canvas id="${canvasId}"></canvas>`);

        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext('webgl2');

        $('#' + canvasId).css({
            position: 'absolute',
            width: '100%',
            height: '100%',
            'image-rendering': 'pixelated'
        });

        this.height = height;
        this.onResize();
    }

    removeAll() {
        this.stop();
        delete this.canvas;
        delete this.gl;
        delete this.positionBuffer;
        if (this.program) {
            this.program.free();
            delete this.program;    
        }
    }

    initialize() {
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);

        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
            1, 1,
            -1, 1,
            1, -1,
            -1, -1
        ]), this.gl.STATIC_DRAW);
    }

    setup(height) {
        this.currentBasicWeather = null;
        this.currentWeatherParams = null;
        this.createElement(height);
        this.initialize();
    }

    configure(source) {
        if (this.program) {
            this.program.free();
            delete this.program;
        }

        this.program = new PixelShaderProgram(this.gl, source);

        this.program.use();

        this.gl.vertexAttribPointer(this.program.a('a_position'), 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.program.a('a_position'));
    }

    clear() {
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clearDepth(1);

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    render(timestamp) {
        if (!this.running) {
            return;
        }

        if (!this.program) {
            this.running = false;
            return;
        }

        window.requestAnimationFrame(timestamp => this.render(timestamp));

        this.lastTimestamp = timestamp;

        if (this.currentBasicWeather !== 0) {
            this.clear();

            this.gl.uniform2f(this.program.u('u_screenSize'), this.gl.canvas.width, this.gl.canvas.height);
            this.gl.uniform1f(this.program.u('u_time'), timestamp / 1000);
            this.gl.uniform1i(this.program.u('u_nightMode'), this.nightMode);
    
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        }
    }

    onResize() {
        if (!this.gl) {
            return;
        }
        const width = window.innerWidth * this.height / window.innerHeight;

        this.canvas.width = width;
        this.canvas.height = this.height;

        this.gl.viewport(0, 0, width, this.height);
        this.render(0);
    }

    setWeather(basicWeather, params = null) {
        const effectNames = [null, 'fog', 'rain', 'snow', 'aurora'];
        if (basicWeather >= effectNames.length) {
            basicWeather = 0;
        }

        if (basicWeather === 0) {
            // 清除当前特效
            this.currentBasicWeather = basicWeather;
            this.stop();
            this.clear();
            return;
        }

        if (this.currentBasicWeather === basicWeather) {
            // 不设置新的基础天气，仅调整当前天气的参数
            // 从默认设置更改
            // 先拷贝一份默认设置
            const effectInfo = EFFECT_SHADERS[effectNames[basicWeather]];
            const weatherParams = {...effectInfo.params};
            // 然后将默认设置跟传入的参数合并
            if (params) {
                for (let key in weatherParams) {
                    const paramInfo = weatherParams[key];
                    if (params[key] !== undefined) {
                        paramInfo[1] = params[key];
                    }
                }
            }

            // 再将合并后的参数同当前的参数相比较
            // 如果不同，那么更改对应的uniform，然后再更新当前参数的记录
            for (let key in this.currentWeatherParams) {
                const paramInfo = this.currentWeatherParams[key];
                const [type, value] = paramInfo;

                const newValue = weatherParams[key][1];
                // 比较设置项与当前的记录
                const equal = value instanceof Array ? JSON.stringify(value) === JSON.stringify(newValue) : value === newValue;
                if (!equal) {
                    // 如果不符，那么使用当前的设置
                    paramInfo[1] = newValue;
                    if (newValue instanceof Array) {
                        this.program.set(type, key, ...newValue);
                    } else {
                        this.program.set(type, key, newValue);
                    }
                }
            }
        } else {
            // 设置新的基础天气
            const effectInfo = EFFECT_SHADERS[effectNames[basicWeather]];
            this.configure(effectInfo.source);
            this.currentBasicWeather = basicWeather;
            this.currentWeatherParams = JSON.parse(JSON.stringify(effectInfo.params)); // deep clone一份数据，防止编辑到原始数据
            if (params) {
                for (let key in this.currentWeatherParams) {
                    const paramInfo = this.currentWeatherParams[key];
                    if (params[key] !== undefined) {
                        paramInfo[1] = params[key];
                    }
                }
            }
            for (let key in this.currentWeatherParams) {
                const [type, value] = this.currentWeatherParams[key];
                if (value instanceof Array) {
                    this.program.set(type, key, ...value);
                } else {
                    this.program.set(type, key, value);
                }
            }
        }
        this.start();
    }

    setNightMode(nightMode) {
        this.nightMode = !!nightMode;
    }

    start() {
        this.running = true;
        this.render(0);
    }

    stop() {
        this.running = false;
    }
};