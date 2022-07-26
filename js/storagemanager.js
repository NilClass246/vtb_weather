
// 用户存储管理器
class StorageManager{
    static LABEL = "LunaWeather_";
    
    constructor(timespan){
        this.timespan = timespan;
    }

    setAgreed(){
        localStorage.setItem(this.LABEL+"isAgreed", "yes");
    }

    isAgreed(){
        return localStorage.getItem(this.LABEL+"isAgreed") == "yes";
    }

    storeWeather(result){
        localStorage.setItem(this.LABEL+"result", JSON.stringify(result));
        localStorage.setItem(this.LABEL+"time", Date.now());
    }

    storeLocale(lang){
        localStorage.setItem(this.LABEL+"locale", lang);
    }

    loadLocale(){
        return localStorage.getItem(this.LABEL+"locale")?localStorage.getItem(this.LABEL+"locale"):"zh";
    }

    loadWeather(){
        var result = localStorage.getItem(this.LABEL+"result");
        if(result){
            try{
                result = JSON.parse(result);
                return result;
            }catch(e){
                return null;
            }
        }else{
            return null;
        }
    }

    isReloadNeeded(){
        var time = localStorage.getItem(this.LABEL+"time");
        if(time){
            try{
                time = Number(time);
                return ((Date.now() - time)/60000)>=this.timespan;
            }catch(e){
                return false;
            }
        }else{
            return false;
        }
    }
}
