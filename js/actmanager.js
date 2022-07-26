import { SunriseSunset } from './utils.js?v=0.01';

import { Act1 } from './acts/act1.js?v=0.01';
import { Act2 } from './acts/act2.js?v=0.01';
import { Effects, Weather } from './effects.js?v=0.01';


class ActManager {
    constructor(containerId, checkInterval = 60 * 5) {
        this.containerId = containerId;
        this.container = $('#' + containerId);

        this.location = null;
        this.sunrs = null;

        this.nightMode = false;

        this.dayNightMonitor = null;

        this.checkInterval = checkInterval * 1000;

        this.act = null;
        this.currentActId = null;

        this.weatherEffect = new Effects(containerId);
    }

    registerActs() {
        this.acts = {
            outside: Act1,
            inside: Act2
        };
    }

    // 对actmanager进行基本设置
    async setup(defaultActId = 'outside') {
        // 在这里加载全部的素材
        for (let actName in this.acts) {
            const act = this.acts[actName];
            await act.loadAssets();
        }

        // 设置初始场景
        this.setAct(defaultActId);
        this.currentActId = defaultActId;
        // 初始界面隐藏人物
        this.act.hideCharacter();
    }

    clearContainer() {
        this.container.empty();
    }

    setAct(actId) {
        // 设置act
        if (!actId || !this.acts[actId]) {
            return false; // 设置失败
        }

        if (!(this.act instanceof this.acts[actId])) {
            // 如果设置的场景和之前的不同
            // 那么更新场景
            if (this.act) {
                // 清空上一个布局
                this.act.stopAnimate();
                this.clearContainer();
            }
    
            // 创建场景
            this.act = new this.acts[actId](this.containerId);
            // 创建dom节点，传入一个回调函数用于在场景集合中插入特效层
            this.act.createElements(height => {
                this.weatherEffect.removeAll();
                this.weatherEffect.setup(height);
            });
        }

        // 启动动画
        this.act.stopAnimate();
        this.act.startAnimate();

        // 新的一幕被创建/切换到时，默认是显示白天的素材
        this.nightMode = false;

        // 这时如果我们能推断出来当前是否为夜晚，则切换到对应的模式
        if (!this.locationIsEmpty()) {
            this.switchDayNightMode();
            this.startDayNightMonitor();
        }
    }

    locationIsEmpty() {
        return !(this.location || this.sunrs);
    }

    setLocation({ longitude, latitude }) {
        this.location = { longitude, latitude };
        this.sunrs = new SunriseSunset(+longitude, +latitude);

        if (this.act) {
            this.switchDayNightMode();
            this.startDayNightMonitor();
        }
    }

    setWeather(name) {
        switch (name) {
            case '晴':
            case '少云':
            case '晴间多云':
                // 在家 晴天 无特效
                this.setAct('inside');
                this.act.setCloudy(false);
                this.weatherEffect.setWeather(Weather.Clear);
                break;
            case '多云':
            case '阴':
                // 在家 阴天 无特效
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Clear);
                break;

            case '薄雾':
            case '雾':
            case '霾':
                // 在家 阴天 雾(白) 轻
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Fog, {
                    fogDensity: 0.5,
                    rateRange: [0.1, 1.0]
                });
                break;
            case '浓雾':
            case '中度霾':
                // 在家 阴天 雾(白) 中
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Fog, {
                    fogDensity: 0.6,
                    rateRange: [0.3, 1.0]
                });
                break;
            case '大雾':
            case '重度霾':
                // 在家 阴天 雾(白) 重
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Fog, {
                    fogDensity: 0.8,
                    rateRange: [0.5, 1.0]
                });
                break;
            case '强浓雾':
            case '严重霾':
            case '特强浓雾':
                // 在家 阴天 雾(白) 暴
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Fog, {
                    fogDensity: 1.0,
                    rateRange: [0.8, 1.0]
                });
                break;
            case '扬沙':
            case '浮尘':
                // 在家 阴天 雾(黄) 轻
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Fog, {
                    fogDensity: 0.4,
                    isDust: true,
                    rateRange: [0.1, 1.0]
                });
                break;
            case '沙尘暴':
                // 在家 阴天 雾(黄) 中
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Fog, {
                    fogDensity: 0.7,
                    isDust: true,
                    rateRange: [0.3, 1.0]
                });
                break;
            case '强沙尘暴':
                // 在家 阴天 雾(黄) 暴
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Fog, {
                    fogDensity: 1.0,
                    isDust: true,
                    rateRange: [0.8, 1.0]
                });
                break;

            case '阵雨':
            case '毛毛雨':
            case '细雨':
            case '毛毛雨/细雨':
                // 在外 雨 微
                this.setAct('outside');
                this.weatherEffect.setWeather(Weather.Rain, {
                    rainingRate: [3.0, 10.0],
                    dropColor: [0.5, 0.5, 0.5, 0.5],
                    dropSizeY: 0.1,
                    dropSizeX: 0.01,
                    dropSpeed: 5.0
                });
                break;
            case '小雨':
            case '小到中雨':
            case '雨':
                // 在外 雨 小
                this.setAct('outside');
                this.weatherEffect.setWeather(Weather.Rain, {
                    rainingRate: [6.0, 10.0],
                    dropColor: [0.7, 0.7, 0.7, 0.7],
                    dropSizeY: 0.2,
                    dropSizeX: 0.01,
                    dropSpeed: 5.0
                });
                break;
            case '强阵雨':
            case '中雨':
            case '冻雨':
            case '中到大雨':
                // 在外 雨 中
                this.setAct('outside');
                this.weatherEffect.setWeather(Weather.Rain, {
                    rainingRate: [10.0, 10.0],
                    dropColor: [0.7, 0.7, 0.7, 0.7],
                    dropSizeY: 0.4,
                    dropSizeX: 0.03,
                    dropSpeed: 15.0
                });
                break;
            case '大雨':
            case '暴雨':
            case '大到暴雨':
                // 在外 雨 大
                this.setAct('outside');
                this.weatherEffect.setWeather(Weather.Rain, {
                    rainingRate: [15.0, 10.0],
                    dropColor: [0.8, 0.8, 0.8, 0.8],
                    dropSizeY: 0.4,
                    dropSizeX: 0.04,
                    dropSpeed: 30.0
                });
                break;
            case '极端降雨':
            case '大暴雨':
            case '特大暴雨':
            case '暴雨到大暴雨':
            case '大暴雨到特大暴雨':
                // 在家 阴天 雨 暴
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Rain, {
                    rainingRate: [50.0, 10.0],
                    dropColor: [1.0, 1.0, 1.0, 1.0],
                    dropSizeY: 0.6,
                    dropSizeX: 0.06,
                    dropSpeed: 60.0
                });
                break;
            case '雷阵雨':
                // 在外 阴天 雨 中 雷
                this.setAct('outside');
                this.weatherEffect.setWeather(Weather.Rain, {
                    lightningEnabled: true,
                    rainingRate: [10.0, 10.0],
                    dropColor: [0.7, 0.7, 0.7, 0.7],
                    dropSizeY: 0.4,
                    dropSizeX: 0.03,
                    dropSpeed: 15.0
                });
                break;
            case '强雷阵雨':
                // 在家 阴天 雨 大 雷
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Rain, {
                    lightningEnabled: true,
                    rainingRate: [15.0, 10.0],
                    dropColor: [0.8, 0.8, 0.8, 0.8],
                    dropSizeY: 0.4,
                    dropSizeX: 0.04,
                    dropSpeed: 30.0
                });
                break;
            case '雷阵雨伴有冰雹':
                // 在家 阴天 雨 暴 雷
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Rain, {
                    lightningEnabled: true,
                    rainingRate: [50.0, 10.0],
                    dropColor: [1.0, 1.0, 1.0, 1.0],
                    dropSizeY: 0.6,
                    dropSizeX: 0.06,
                    dropSpeed: 60.0
                });
                break;

            case '小雪':
            case '雨夹雪':
            case '阵雨夹雪':
            case '阵雪':
            case '小到中雪':
            case '雪':
                // 在外 阴天 雪 小
                this.setAct('outside');
                this.weatherEffect.setWeather(Weather.Snow);
                break;
            case '中雪':
            case '雨雪天气':
            case '中到大雪':
                // 在外 阴天 雪 中
                this.setAct('outside');
                this.weatherEffect.setWeather(Weather.Snow, {
                    windSpeed: -1.0,
                    dropSpeed: 2.0,
                    snowingRate: [15.0, 15.0]
                });
                break;
            case '大雪':
            case '大到暴雪':
                // 在外 阴天 雪 大
                this.setAct('outside');
                this.weatherEffect.setWeather(Weather.Snow, {
                    windSpeed: -1.0,
                    dropSpeed: 2.0,
                    snowingRate: [20.0, 20.0]
                });
                break;
            case '暴雪':
                // 在家 阴天 雪 暴
                this.setAct('inside');
                this.act.setCloudy(true);
                this.weatherEffect.setWeather(Weather.Snow, {
                    windSpeed: -2.0,
                    dropSpeed: 3.0,
                    snowingRate: [30.0, 30.0]
                });
                break;
            default:
                // 根据和风天气官网的说法，后续可能还会继续添加天气种类
                // 这时就有可能落到这个case中，即表示该天气未知
                // 有时候因为缓存的原因，获取不到天气时也可能会落到这里，此时name一般为undefined
                // 在上述情况下设置天气为极光
                // 这个典故出自FTG《东方绯想天》
                // 在该游戏的天气系统中，极光天气的设定是“不知道会发生什么程度的天气”
                console.log('未知天气: ' + name);
                this.setAct('inside');
                this.weatherEffect.setWeather(Weather.Aurora);
                return;    
        }
        console.log('设置天气为: ' + name);
    }

    setNightMode(nightMode) {
        this.act.setNightMode(nightMode);
        this.weatherEffect.setNightMode(nightMode);
        this.nightMode = nightMode;
    }

    switchDayNightMode() {
        if (!this.act) {
            // 如果现在没有展示任何一幕，那么不做任何事情
            // 当然一般情况下这不可能发生
            return;
        }

        if (this.locationIsEmpty()) {
            return;
        }

        if (!this.sunrs) {
            this.sunrs = new SunriseSunset(+this.location.longitude, +this.location.latitude);
        }

        // 计算日出日落时间
        const now = new Date();
        const { sunrise, sunset } = this.sunrs.calc(now);
        // 判断当前时间是否在夜间
        const nowIsNight = now < sunrise || now > sunset;

        if (nowIsNight !== this.nightMode) {
            // 更新夜间模式设置
            this.setNightMode(nowIsNight);
        }
    }

    startDayNightMonitor() {
        if (this.dayNightMonitor !== null) {
            clearInterval(this.dayNightMonitor);
        }
        this.dayNightMonitor = setInterval(() => {
            this.switchDayNightMode();
        }, this.checkInterval);
    }

    stopDayNightMonitor() {
        if (this.dayNightMonitor === null) {
            return;
        }
        clearInterval(this.dayNightMonitor);
        this.dayNightMonitor = null;
    }

    onResize() {
        if (this.act) {
            this.act.onResize();
            this.weatherEffect.onResize();
        }
    }
};

window.ActManager = ActManager;