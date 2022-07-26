class RainDrop {
    constructor(x, y, vx, vy, ax, ay) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.ax = ax;
        this.ay = ay;
    }
};

class RainLayer {
	constructor(canvasId, rainfall, rainDropSpeed, windSpeed) {
		this.rainfall = rainfall;
		this.rainDropSpeed = rainDropSpeed;
		this.windSpeed = windSpeed;
        
        this.canvas = document.getElementById(canvasId);
		this.fullScreen();

		this.ctx = this.canvas.getContext('2d');

		this.prevTimestamp = 0;

		this.dropDelayMs = 1000 / rainfall;

		this.drops = [];
		Array.from({length: 40}).forEach(_ => this.drop(this.pixelHeight));

		this.running = false;
	}

	fullScreen() {
		this.pixelHeight = 114;
		this.pixelWidth = Math.round(window.innerWidth / window.innerHeight * this.pixelHeight);

		this.canvas.height = this.pixelHeight;
		this.canvas.width = this.pixelWidth;
	}
	
	clearLayer() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	reset() {
		this.clearLayer();
		this.fullScreen();
	}

	boundingCheck(rainDrop) {
		const vx = Math.abs(rainDrop.vx);
		const vy = Math.abs(rainDrop.vy);
		if (-vx <= rainDrop.x && rainDrop.x <= this.pixelWidth + vx && -vy <= rainDrop.y && rainDrop.y <= this.pixelHeight + vy) {
			return true;
		}
		return false;
	}

	drop(maxY) {
		maxY = maxY || 0;
		const x = Math.random() * this.pixelWidth;
		const y = maxY > 0 ? Math.random() * maxY : 0;
		this.drops.push(new RainDrop(x, y, this.windSpeed, this.rainDropSpeed, 0, 0));
	}

	// 使用两个数组更新雨滴
    process1(delay) {
		this.dropDelayMs -= delay;
		while (this.dropDelayMs < 0) {
			this.drop();
			this.dropDelayMs += 1000 / this.rainfall;
		}
		
		let drops = [];

		for (let currentDrop of this.drops) {
			if (!this.boundingCheck(currentDrop)) {
				continue;
			}
			// currentDrop.vx += delay / 1000 * currentDrop.ax;
			// currentDrop.vy += delay / 1000 * currentDrop.ay;
			currentDrop.x += delay / 1000 * currentDrop.vx;
			currentDrop.y += delay / 1000 * currentDrop.vy;
			drops.push(currentDrop);
		}
		
		this.drops = drops;
    }

	// 使用单个环形队列更新雨滴
	process2(delay) {
		this.dropDelayMs -= delay;
		while (this.dropDelayMs < 0) {
			this.drop();
			this.dropDelayMs += 1000 / this.rainfall;
		}
		
		let currentDrop;
		this.drops.push(null);

		while ((currentDrop = this.drops.shift()) !== null) {
			if (!this.boundingCheck(currentDrop)) {
				continue;
			}
			// currentDrop.vx += delay / 1000 * currentDrop.ax;
			// currentDrop.vy += delay / 1000 * currentDrop.ay;
			currentDrop.x += delay / 1000 * currentDrop.vx;
			currentDrop.y += delay / 1000 * currentDrop.vy;
			this.drops.push(currentDrop);
		}		
    }

	render(delay) {
		let offscreenCanvas = document.createElement('canvas');
		offscreenCanvas.width = this.pixelWidth;
		offscreenCanvas.height = this.pixelHeight;
		let ctx = offscreenCanvas.getContext('2d');
		
		for (let drop of this.drops) {
			ctx.beginPath();
			ctx.strokeStyle = 'white';
			ctx.lineWidth = 0.3;

			ctx.moveTo(drop.x, drop.y);
			ctx.lineTo(drop.x - delay * drop.vx / 1000, drop.y - delay * drop.vy / 1000);
			ctx.stroke();
		}

		this.clearLayer();
		this.ctx.drawImage(offscreenCanvas, 0, 0);
	}

    callbackWrapper(timestamp) {
		window.requestAnimationFrame(timestamp => this.callbackWrapper(timestamp));
		if (!this.running) {
			return;
		}
		const delay = timestamp - this.prevTimestamp;
		this.process2(delay);
		this.render(delay);
		this.prevTimestamp = timestamp;
    }

	start() {
		this.running = true;
		window.requestAnimationFrame(timestamp => {
			this.prevTimestamp = timestamp;
			this.callbackWrapper(timestamp)
		});
	}

	stop() {
		this.running = false;
	}
};
