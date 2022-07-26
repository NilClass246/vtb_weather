import { ActBase } from './actbase.js?v=0.01';

class Act1Bg {
    static ASSETS = ['cloud', 'mountain', 'bridge'];
    static BG_WIDTHS = [700, 700, 84];
    static BG_HEIGHTS = [145, 69, 67];
    static BG_TOTAL_HEIGHT = Act1Bg.BG_HEIGHTS[0] + 33;

    static asset(name, nightMode = false) {
        return `../img/act1/background/${name}-${nightMode ? 'night' : 'day'}.png`;
    }

    constructor(containerId, speeds, steppedScroll = false) {
        this.containerId = containerId;

        this.speeds = speeds;
        this.steppedScroll = steppedScroll;

        this.references = Act1Bg.ASSETS.map(v => `#act1-bg-${v}`);
        this.$refs = {};
        for (let v of Act1Bg.ASSETS) {
            this.$refs[v] = `#act1-bg-${v}`;
        }
        this.animations = [];
    }

    createElements() {
        const container = $(`#${this.containerId}`);
        Act1Bg.ASSETS.forEach((asset, i) => {
            container.append(`<div id="act1-bg-${asset}"></div>`);
            $(this.references[i]).css({
                position: 'absolute',
                width: '100%',
                'background-repeat': 'repeat-x',
                'background-image': `url('${Act1Bg.asset(asset)}')`,
                'background-size': 'auto 100%',
                'image-rendering': 'pixelated'
            });
        });

        const heights = Act1Bg.BG_HEIGHTS.map(v => v / Act1Bg.BG_TOTAL_HEIGHT * 100);
        const roadHeight = 33 / Act1Bg.BG_TOTAL_HEIGHT * 100;

        $(this.$refs.bridge).css({
            bottom: 0,
            height: `${heights[2]}%`
        });

        $(this.$refs.cloud).css({
            top: 0,
            height: `${heights[0]}%`
        });

        $(this.$refs.mountain).css({
            bottom: `${roadHeight}%`,
            height: `${heights[1]}%`,
        });
    }

    setSpeeds(speeds) {
        if (this.speeds.toString() === speeds.toString()) {
            return;
        }
        this.speeds = speeds;
        this.stopAnimate();
        this.startAnimate();
    }

    calcScaleFactor() {
        this.pixelSize = window.innerHeight / Act1Bg.BG_TOTAL_HEIGHT;
    }

    setNightMode(nightMode) {
        Act1Bg.ASSETS.forEach((v, i) => {
            $(this.references[i]).css('background-image', `url('${Act1Bg.asset(v, nightMode)}')`);
        });

        this.nightMode = !!nightMode;
    }

    startAnimate() {
        this.calcScaleFactor();

        this.references.forEach((selector, i) => {
            const width = Act1Bg.BG_WIDTHS[i] * this.pixelSize;
            this.animations.push(gsap.to(selector, {
                backgroundPosition: `${width}px 0px`,
                duration: width / this.speeds[i],
                repeat: -1,
                ease: this.steppedScroll ? SteppedEase.config(Act1Bg.BG_WIDTHS[i]) : 'none'
            }));
        });
    }

    stopAnimate() {
        this.animations.forEach(ani => ani.kill());
        this.animations = [];

        this.references.forEach(selector => {
            gsap.set(selector, {
                backgroundPosition: `0px 0px`
            });
        });
    }

    onResize() {
        this.stopAnimate();
        this.startAnimate();
    }
};

class Act1Char {
    static WALK_SINGLE_SIZE = {
        width: 77,
        height: 121
    };

    static BLINK_SINGLE_SIZE = {
        width: 15,
        height: 16
    };

    static FACE_POSITIONS = [
        [30, 18],
        [30, 19],
        [30, 20],
        [30, 19],
        [30, 18],
        [30, 17],
        [30, 19],
        [30, 20],
        [30, 19],
        [30, 18]
    ];

    static async loadAssets(loader) {
        this.walkAsset = await loader('../img/act1/character/walk.png');
        this.faceAsset = await loader('../img/act1/character/blink.png');
    }

    constructor(containerId, delay = 1, blinkProbability = 0.01) {
        this.containerId = containerId;

        this.blinkProbability = blinkProbability;

        this.prevTimestamp = 0;

        this.walkCounter = 0;
        this.blinkCounter = 0;

        this.setDelay(delay);

        this.frameTimer = this.frameDuration;

        this.running = false;
    }

    createElement() {
        const container = $('#' + this.containerId);
        container.append(`<canvas id="luna-main"></canvas>`);

        this.setCanvas('luna-main');
        this.onResize();
    }

    setCanvas(canvasId) {
        this.canvasId = canvasId;
        this.canvas = document.getElementById(canvasId);
        const { width, height } = Act1Char.WALK_SINGLE_SIZE;
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setDelay(delay) {
        if (this.delay === delay) {
            return;
        }
        this.delay = delay;
        this.frameDuration = 100 * delay;
    }

    draw() {
        if (!Act1Char.walkAsset || !Act1Char.faceAsset) {
            return;
        }
        this.clearCanvas();
        let { width, height } = Act1Char.WALK_SINGLE_SIZE;
        this.ctx.drawImage(Act1Char.walkAsset, this.walkCounter * width, 0, width, height, 0, 0, width, height);

        ({ width, height } = Act1Char.BLINK_SINGLE_SIZE);
        const [left, top] = Act1Char.FACE_POSITIONS[this.walkCounter];
        this.ctx.drawImage(Act1Char.faceAsset, this.blinkCounter * width, 0, width, height, left, top, width, height);
    }

    onResize() {
        const { innerWidth, innerHeight } = window;
        const pixelSize = innerHeight / Act1Bg.BG_TOTAL_HEIGHT;
        const illuHeight = pixelSize * Act1Char.WALK_SINGLE_SIZE.height;

        const pixelWidth = innerWidth / pixelSize;

        const restWidth = pixelWidth - 10 - Act1Char.WALK_SINGLE_SIZE.width;
        const minimalLeftWidth = 15;

        if (restWidth < minimalLeftWidth) {
            $('#luna-main').css({
                position: 'absolute',
                height: `${illuHeight}px`,
                width: 'auto',
                bottom: 10 * pixelSize,
                left: minimalLeftWidth * pixelSize,
                right: '',
                'image-rendering': 'pixelated'
            });
        } else {
            $('#luna-main').css({
                position: 'absolute',
                height: `${illuHeight}px`,
                width: 'auto',
                bottom: 10 * pixelSize,
                left: '',
                right: 10 * pixelSize,
                'image-rendering': 'pixelated'
            });
        }
    }

    render(delta) {
        this.frameTimer -= delta;
        if (this.frameTimer < 0) {
            this.walkCounter += 1;
            if (this.walkCounter > 9) {
                this.walkCounter = 0;
            }
            if (this.blinkCounter) {
                this.blinkCounter = (this.blinkCounter + 1) % 3;
            } else {
                this.blinkCounter = Math.random() < this.blinkProbability ? 1 : 0;
            }
            this.draw();
            if (this.frameTimer < - 2 * this.frameDuration) {
                this.frameTimer = 0;
            }
            this.frameTimer += this.frameDuration;
        }
    }

    callbackWrapper(timestamp) {
        window.requestAnimationFrame(timestamp => this.callbackWrapper(timestamp));
        if (!this.running) {
            return;
        }
        const delay = timestamp - this.prevTimestamp;
        this.render(delay);
        this.prevTimestamp = timestamp;
    }

    startAnimate() {
        this.running = true;
        window.requestAnimationFrame(timestamp => this.callbackWrapper(timestamp));
    }

    stopAnimate() {
        this.running = false;
    }
};

export class Act1 extends ActBase {
    static async loadAssets() {
        await Act1Char.loadAssets(this.loadHelper);
    }

    constructor(containerId) {
        super();
        this.containerId = containerId;
        this.background = new Act1Bg(containerId, [10, 50, 50], true, 0, 1);
        this.character = new Act1Char(containerId, 1, 0.01);
    }

    createElements(createEffectLayer) {
        this.background.createElements();
        this.character.createElement();
        createEffectLayer(Act1Bg.BG_TOTAL_HEIGHT); // 特效层放到最上边
    }

    startAnimate() {
        this.background.startAnimate();
        this.character.startAnimate();
    }

    stopAnimate() {
        this.background.stopAnimate();
        this.character.stopAnimate();
    }

    hideCharacter() {
        this.character.stopAnimate();
        this.character.clearCanvas();
    }

    showCharacter() {
        this.character.startAnimate();
    }

    setNightMode(nightMode) {
        this.background.setNightMode(nightMode);
    }

    onResize() {
        this.background.onResize();
        this.character.onResize();
    }
}