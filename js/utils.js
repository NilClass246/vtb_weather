const daysDelta = (end, begin) =>  Math.round((end - begin) / 1000 / 60 / 60 / 24);
const getDate = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const getDateOfToday = () => getDate(new Date());

const radians = x => x * Math.PI / 180;
const degree = x => x * 180 / Math.PI;
const sinDegree = x => Math.sin(radians(x));
const cosDegree = x => Math.cos(radians(x));

// 根据经纬度坐标和日期计算日出日落时间
// 理论上针对南半球有另一个H参数，但我忘了
// 先暂时这样，等碰到来自南半球的用户再进行改动
export class SunriseSunset {
    static H = -0.833;
    static CENTURY_BEGINNING = new Date(2000, 0, 1);

    constructor(longitude, latitude) {
        this.longitude = longitude;
        this.latitude = latitude;
    }

    iteratorHelper(uto, days) {
        const tCentury = (uto / 360 + days) / 36525;
        const gSun = 357.528 + 35999.05 * tCentury;
        const lSun = 280.46 + 36000.77 * tCentury;
        const ecliLong = lSun + 1.915 * sinDegree(gSun) + 0.02 * sinDegree(gSun * 2);
        const gha = uto - 180 - 1.915 * sinDegree(gSun) - 0.02 * sinDegree(gSun * 2) + 2.466 * sinDegree(ecliLong * 2) - 0.053 * sinDegree(ecliLong * 4);
        const earthTlit = 23.4393 - 0.013 * tCentury;
        const sunDegree = degree(Math.asin(sinDegree(earthTlit) * sinDegree(ecliLong)));
        const e = degree(Math.acos((sinDegree(SunriseSunset.H) - sinDegree(this.latitude) * sinDegree(sunDegree)) / cosDegree(this.latitude) / cosDegree(sunDegree)));
        return {gha, e};
    }

    calc(date) {
        const daysOfCentury = daysDelta(getDate(date), SunriseSunset.CENTURY_BEGINNING);
        const zone = this.longitude >= 0 ? ~~(this.longitude / 15) + 1 : ~~(this.latitude / 15) - 1;

        let uto = 180;
        let result = this.iteratorHelper(uto, daysOfCentury);
        let utRise = uto - (result.gha + this.longitude + result.e);
        let utSet = uto - (result.gha + this.longitude - result.e);

        while (Math.abs(utRise - uto) >= 0.1) {
            uto = utRise;
            result = this.iteratorHelper(uto, daysOfCentury);
            utRise = uto - (result.gha + this.longitude + result.e);
        }
        utRise = utRise / 15. + zone;
        const rise = Math.round(utRise * 3600);

        uto = 180;
        while (Math.abs(utSet - uto) >= 0.1) {
            uto = utSet;
            result = this.iteratorHelper(uto, daysOfCentury);
            utSet = uto - (result.gha + this.longitude - result.e);
        }
        utSet = utSet / 15 + zone;
        const set = Math.round(utSet * 3600);

        return {
            sunrise: new Date(date.getFullYear(), date.getMonth(), date.getDate(), ~~(rise / 3600), ~~((rise % 3600) / 60), rise % 60),
            sunset: new Date(date.getFullYear(), date.getMonth(), date.getDate(), ~~(set / 3600), ~~((set % 3600) / 60), set % 60)
        };
    }
};

