import { ActBase } from './actbase.js?v=0.01';

class Act2Bg {
    static BG_HEIGHT = 170;
    static BG_WIDTH_SKY = 334;
    static BG_WIDTH_CLOUDY = 821;

    static asset(cloudy = false, nightMode = false) {
        return `../img/act2/background/${cloudy ? 'cloudy' : 'sky'}-${nightMode ? 'night' : 'day'}.png`;
    }

    constructor(containerId, speed = 1, steppedScroll = true) {
        this.containerId = containerId;
        this.$ref = `#act2-bg-sky`;
        this.speed = speed;

        this.animation = null;

        this.cloudy = false;

        this.steppedScroll = steppedScroll;
    }

    createElement() {
        const container = $(`#${this.containerId}`);
        container.append(`<div id="act2-bg-sky"></div>`);;
        $(this.$ref).css({
            position: 'absolute',
            width: '100%',
            height: '100%',
            'background-repeat': 'repeat-x',
            'background-image': `url('${Act2Bg.asset()}')`,
            'background-size': 'auto 100%',
            'image-rendering': 'pixelated'
        });
    }

    setSpeed(speed) {
        if (this.speed === speed) {
            return;
        }
        this.speed = speed;
        this.stopAnimate();
        this.startAnimate();
    }

    setNightMode(nightMode) {
        $(this.$ref).css('background-image', `url('${Act2Bg.asset(this.cloudy, nightMode)}')`);
        this.nightMode = !!nightMode;
    }

    setCloudy(cloudy) {
        if (this.cloudy === cloudy) {
            return;
        }
        this.cloudy = cloudy;
        this.setNightMode(this.nightMode);
        this.stopAnimate();
        this.startAnimate();
    }

    calcScaleFactor() {
        this.pixelSize = window.innerHeight / Act2Bg.BG_HEIGHT;
    }

    startAnimate() {
        this.calcScaleFactor();

        const bgWidth = this.cloudy ? Act2Bg.BG_WIDTH_CLOUDY : Act2Bg.BG_WIDTH_SKY;
        const width = bgWidth * this.pixelSize;
        this.animation = gsap.to(this.$ref, {
            backgroundPosition: `${width}px 0px`,
            duration: width / this.speed,
            repeat: -1,
            ease: this.steppedScroll ? SteppedEase.config(bgWidth) : 'none'
        });
    }

    stopAnimate() {
        if (this.animation) {
            this.animation.kill();
            this.animation = null;
        }

        gsap.set(this.$ref, {
            backgroundPosition: '0px 0px'
        });
    }

    onResize() {
        this.stopAnimate();
        this.startAnimate();
    }
};

class Act2Fg {
    static BG_ASSETS = ['room', 'frame', 'bed', 'desktop'];
    static BG_TOTAL_HEIGHT = 170;

    static BREATHE_SINGLE_SIZE = {
        width: 42,
        height: 65
    };

    static BUBBLE_SINGLE_SIZE = {
        width: 27,
        height: 31
    };

    static ZZZ_SINGLE_SIZE = {
        width: 27,
        height: 31
    };

    static ICON_SIZE = {
        width: 14,
        height: 12
    };

    static asset(name, nightMode = false, basedir = 'background') {
        return `../img/act2/${basedir}/${name}-${nightMode ? 'night' : 'day'}.png`;
    }

    static async loadAssets(loader) {
        this.bgAssets = {};
        for (let asset of this.BG_ASSETS) {
            this.bgAssets[asset] = {
                day: await loader(this.asset(asset)),
                night: await loader(this.asset(asset, true))
            };
        }

        // TODO 这块代码之后应该改成并行执行
        // 使用Promise.all
        this.charAssets = {
            breathe: {
                day: await loader(this.asset('breathe', false, 'character')),
                night: await loader(this.asset('breathe', true, 'character'))
            },
            bubble: await loader(this.asset('bubble', false, 'character')),
            zzz: await loader(this.asset('zzz', false, 'character')),
            icons: await loader(this.asset('icons', false, 'character'))
        };
    }

    constructor(containerId, frameDelay = null) {
        this.containerId = containerId;

        this.$refs = {};
        for (let asset of Act2Fg.BG_ASSETS) {
            this.$refs[asset] = `#act2-bg-${asset}`
        }

        this.nightMode = false;

        this.running = false;

        this.prevTimestamp = 0;

        this.canvasId = 'luna-home';

        this.renderLuna = true;  // 是否绘制角色

        this.breatheCounter = 0;

        this.frameDelay = frameDelay || [1300, 130, 130, 1300, 130];
        this.lunaFrameTimer = this.frameDelay[0]; // 立绘播放倒计时

        /// 立绘旁装饰物
        this.decorationFrameCounter = 0;  // 0: 不显示; 1, 2, 3: zzz; 4, 5, 6: 泡泡

        // 图标素材信息
        this.iconsOneLine = Act2Fg.charAssets.icons.width / Act2Fg.ICON_SIZE.width; // 一行有几个图标
        this.iconsOneColumn = Act2Fg.charAssets.icons.height / Act2Fg.ICON_SIZE.height; // 一列有几个图标
        this.randomIconIndex = 0;

        this.decorationFrameDelay = [1000, 1000, 1000, 1000, 1000, 1000, 6000]; // 立绘旁装饰物每帧时长
        this.decorationFrameTimer = this.decorationFrameDelay[0]; // 立绘旁边的装饰物帧计时器
    }

    createElement() {
        $('#' + this.containerId).append(`<canvas id="${this.canvasId}"></canvas>`);
        $('#' + this.canvasId).css({
            position: 'absolute',
            height: '100%',
            width: '100%',
            'image-rendering': 'pixelated'
        })
        this.canvas = document.getElementById(this.canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.setSize();
    }

    setSize() {
        const height = Act2Fg.BG_TOTAL_HEIGHT;
        const width = window.innerWidth * height / window.innerHeight;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawRoom(rightOffset = 0) {
        const { room } = Act2Fg.bgAssets;
        const { width, height } = this.canvas;
        const asset = room[this.nightMode ? 'night' : 'day'];
        this.ctx.drawImage(asset, width - asset.width - rightOffset, 0);
        if (rightOffset > 0) {
            this.ctx.fillStyle = ['#c3a89a', '#655750'][this.nightMode];
            this.ctx.fillRect(width - rightOffset, 0, rightOffset, height);
        }
    }

    drawFurniture(furniture, rightOffset = 0) {
        const asset = Act2Fg.bgAssets[furniture][this.nightMode ? 'night' : 'day'];
        const { width, height } = this.canvas;
        this.ctx.drawImage(asset, width - asset.width - rightOffset, height - asset.height);
    }

    drawFrame(rightOffset = 0) {
        const { frame } = Act2Fg.bgAssets;
        const { width, height } = this.canvas;
        const asset = frame[this.nightMode ? 'night' : 'day'];
        this.ctx.drawImage(asset, width - asset.width - rightOffset - 100, 14);
    }

    // 绘制月奈和她旁边的气泡
    drawLuna(rightOffset = 0) {
        if (!this.renderLuna) {
            return;
        }
        const mode = this.nightMode ? 'night' : 'day';
        const { width, height } = Act2Fg.BREATHE_SINGLE_SIZE;
        const breathe = Act2Fg.charAssets.breathe[mode];
        this.ctx.drawImage(breathe, this.breatheCounter * width, 0, width, height, this.canvas.width - rightOffset - width, this.canvas.height - height - 58, width, height);

        if (this.decorationFrameCounter <= 0) {
            return;
        } else if (this.decorationFrameCounter <= 3) {
            const frameIndex = this.decorationFrameCounter - 1;
            const zzz = Act2Fg.charAssets.zzz;
            const sz = Act2Fg.ZZZ_SINGLE_SIZE;
            this.ctx.drawImage(zzz, frameIndex * sz.width, 0, sz.width, sz.height, this.canvas.width - rightOffset - width - sz.width - 3, this.canvas.height - height - 70, sz.width, sz.height);
        } else if (this.decorationFrameCounter <= 6) {
            const frameIndex = this.decorationFrameCounter - 4;
            const bubble = Act2Fg.charAssets.bubble;
            const sz = Act2Fg.BUBBLE_SINGLE_SIZE;
            this.ctx.drawImage(bubble, frameIndex * sz.width, 0, sz.width, sz.height, this.canvas.width - rightOffset - width - sz.width - 3, this.canvas.height - height - 70, sz.width, sz.height);

            if (frameIndex == 2) {
                // 绘制图标
                const rowIndex = ~~(this.randomIconIndex / this.iconsOneLine);
                const columnIndex = this.randomIconIndex % this.iconsOneLine;
                const icons = Act2Fg.charAssets.icons;
                const isz = Act2Fg.ICON_SIZE;
                this.ctx.drawImage(icons, columnIndex * isz.width, rowIndex * isz.height, isz.width, isz.height, this.canvas.width - rightOffset - width - sz.width + 4, this.canvas.height - height - 67, isz.width, isz.height)
            }
        }
    }

    setNightMode(nightMode) {
        this.nightMode = !!nightMode;
    }

    // 动态布局函数
    layout() {
        this.clearCanvas();
        const lunaDefaultOffset = 20;

        const { width } = this.canvas;
        const roomWidth = Act2Fg.bgAssets.room.day.width;
        if (width > roomWidth) {
            // 如果屏幕能够把整个房间放进去，那么就靠右显示整个房间
            this.drawRoom();
            this.drawFrame();
            this.drawFurniture('bed', Act2Fg.bgAssets.desktop.day.width);
            this.drawLuna(lunaDefaultOffset);
            this.drawFurniture('desktop');
        } else {
            // 否则，以房间左侧（窗户）为基准，重新计算布局
            // helper function按照右端对齐，需要按照左端对齐计算参数
            const widthOffset = width - roomWidth;
            this.drawRoom(widthOffset);
            this.drawFrame(widthOffset);
            const desktopWidth = Act2Fg.bgAssets.desktop.day.width;
            this.drawFurniture('bed', desktopWidth + widthOffset);
            if (width < desktopWidth) {
                // 如果屏幕过窄，那么将月奈按照左对齐计算布局
                // 裁剪桌子，其余布局不动
                const widthOffset1 = width - desktopWidth;
                if (widthOffset1 < -lunaDefaultOffset) {
                    // 如果屏幕已经窄到开始裁剪立绘了，
                    // 那么将月奈重新右对齐，桌子对齐月奈进行双边裁剪
                    this.drawLuna(0);
                    this.drawFurniture('desktop', -lunaDefaultOffset);

                    // TODO 应该还有一个分支用来讨论气泡和Zzz被裁剪的问题
                    // 但由于一般情况下遇不到，先不管了
                } else {
                    // 否则直接按照规则绘制
                    this.drawLuna(lunaDefaultOffset + widthOffset1);
                    this.drawFurniture('desktop', widthOffset1);
                }
            } else {
                // 否则直接按照规则绘制
                this.drawLuna(lunaDefaultOffset);
                this.drawFurniture('desktop');
            }
        }
    }

    render(delta) {
        this.lunaFrameTimer -= delta;
        this.decorationFrameTimer -= delta;

        let needRedraw = false;

        // 更改月奈立绘绘制计数器
        if (this.lunaFrameTimer < 0) {
            // 如果计时器归零
            // 那么帧动画往下移一帧
            this.breatheCounter += 1;
            if (this.breatheCounter > 4) {
                // 如果已经是最后一帧了，那么从第一帧开始
                this.breatheCounter = 0;
            }

            // 标记重绘
            needRedraw = true;

            // 如果小于零太多了（两帧长的时间），那么就将计时器复位，重新开始
            // 一般这种情况发生于浏览器被置于后台，重新切回前台后render函数会被传一个巨大的delta
            // 如果不复位，那么会造成动画鬼畜
            if (this.lunaFrameTimer < -2 * this.frameDelay[this.breatheCounter]) {
                this.lunaFrameTimer = 0;
            }
            // 设置计时器，倒数到下一帧
            this.lunaFrameTimer += this.frameDelay[this.breatheCounter];
        }

        const bubbleRate = 0.1;

        if (this.decorationFrameTimer < 0) {
            switch (this.decorationFrameCounter) {
                case 0: {
                    // 第0帧（即什么都不画）的下一帧可能是zzz或者是泡泡
                    const rand = Math.random();
                    if (rand < bubbleRate) {
                        // bubbleRate的概率是泡泡
                        this.decorationFrameCounter = 4;
                    } else {
                        // 其余的概率是zzz
                        this.decorationFrameCounter++;
                    }
                    break;
                }
                case 5:
                    // 泡泡最后一帧的前一帧
                    // 需要生成一个随机数
                    this.randomIconIndex = ~~(Math.random() * this.iconsOneColumn * this.iconsOneLine);
                case 1:
                case 2:
                case 4:
                    // 中间帧，移动到下一帧
                    this.decorationFrameCounter ++;
                    break;
                case 6:
                case 3:
                    // 最后一帧
                    // 移动到第0帧
                    this.decorationFrameCounter = 0;
                    break;
            }

            needRedraw = true;

            if (this.decorationFrameTimer < -2 * this.decorationFrameDelay[this.decorationFrameCounter]) {
                this.decorationFrameTimer = 0;
            }

            this.decorationFrameTimer += this.decorationFrameDelay[this.decorationFrameCounter];
        }

        // 仅当需要重新绘制的时候再绘制
        if (needRedraw) {
            this.layout();
        }
    }

    animateCallback(timestamp) {
        if (!this.running) {
            return;
        }

        window.requestAnimationFrame(timestamp => this.animateCallback(timestamp));
        const delay = timestamp - this.prevTimestamp;
        this.render(delay);
        this.prevTimestamp = timestamp;
    }

    startAnimate() {
        this.running = true;
        window.requestAnimationFrame(timestamp => this.animateCallback(timestamp));
    }

    stopAnimate() {
        this.running = false;
    }

    onResize() {
        this.setSize();
        this.layout();
    }
};

export class Act2 extends ActBase {
    static async loadAssets() {
        await Act2Fg.loadAssets(this.loadHelper);
    }

    constructor(containerId) {
        super();
        this.containerId = containerId;
        this.background = new Act2Bg(containerId);
        this.foreground = new Act2Fg(containerId);
    }

    createElements(createEffectLayer) {
        this.background.createElement();
        createEffectLayer(Act2Bg.BG_HEIGHT); // 特效层放到背景的前边，前景的后边
        this.foreground.createElement();
    }

    startAnimate() {
        this.background.startAnimate();
        this.foreground.startAnimate();
    }

    stopAnimate() {
        this.background.stopAnimate();
        this.foreground.stopAnimate();
    }

    hideCharacter() {
        this.foreground.renderLuna = false;
    }

    showCharacter() {
        this.foreground.renderLuna = true;
    }

    setNightMode(nightMode) {
        this.background.setNightMode(nightMode);
        this.foreground.setNightMode(nightMode);
    }

    onResize() {
        this.background.onResize();
        this.foreground.onResize();
    }

    setCloudy(cloudy) {
        this.background.setCloudy(cloudy);
    }
};
