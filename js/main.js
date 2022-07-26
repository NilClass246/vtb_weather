// 初始化界面

var Luna_Weather = Luna_Weather || {};

Luna_Weather.ref = {};
Luna_Weather.ref.cover = "cover";
Luna_Weather.ref.start_panel = "start_panel";
Luna_Weather.ref.language_panel = "language_panel";
Luna_Weather.ref.main_info = "main_info";
Luna_Weather.ref.menu_group = "menu_group";
Luna_Weather.ref.foreground_group = "foreground_group";
Luna_Weather.ref.background_group = "background_group";
Luna_Weather.ref.info_section = "info_section";
Luna_Weather.ref.main_info = "main_info";
Luna_Weather.ref.secondary_info = "secondary_info";
Luna_Weather.ref.lds_roller = "lds";
Luna_Weather.ref.privacy_group = "privacy_group";
Luna_Weather.ref.privacy_choice = "privacy_choice";
Luna_Weather.ref.privacy_return = "privacy_return";
Luna_Weather.ref.location_window = "location_window";
Luna_Weather.ref.location_group = "location_group";
Luna_Weather.ref.language_group = "language_group";
Luna_Weather.ref.credit_group = "credit_group";
Luna_Weather.ref.location_option_group = "location_option_group";

Luna_Weather.ref.option_group = "option_group";

// 设置天气信息默认更新间隔, 单位为分钟
// 默认5分钟
Luna_Weather.storage = new StorageManager(5);
Luna_Weather.weather_result = null;

// 判断是否为极端天气
// 极端天气这里指虽然降雨，但月奈仍需待在家中的天气
function isExtremeWeather(result) {
	const { zh } = result.curtext;
	const extremeWeathers = ['极端降雨', '大暴雨', '特大暴雨', '暴雨到大暴雨', '大暴雨到特大暴雨', '强雷阵雨', '雷阵雨伴有冰雹', '暴雪'];
	return extremeWeathers.indexOf(zh) !== -1;
}

function initializeAll(){
	createLogoAnimation();
	adjust_centreArea();
	adjust_calendar();
	readJson();
	adjust_locationWindow();
	adjust_privacyWindow();
	Luna_Weather.acts = new ActManager('here-is-acts');
	Luna_Weather.acts.registerActs();

	Luna_Weather.locale = Luna_Weather.storage.loadLocale();
	localize(Luna_Weather.locale);
	Luna_Weather.weather_result = Luna_Weather.storage.loadWeather();
	console.log(Luna_Weather.weather_result);

	// 初始化背景及立绘
	// 新
	// 在加载了位置后设置背景
	(async () => {
		showByDiminishing(Luna_Weather.ref.lds_roller);
		await Luna_Weather.acts.setup();
		if(Luna_Weather.weather_result){
			if(Luna_Weather.storage.isReloadNeeded()){
				createByLocation(null, null, Luna_Weather.weather_result);
			}else{
				setInfo(Luna_Weather.weather_result);
				setCalendar(Luna_Weather.weather_result);
				if (Luna_Weather.acts.locationIsEmpty()) {
					Luna_Weather.acts.setLocation({
						longitude: Luna_Weather.weather_result.lon,
						latitude: Luna_Weather.weather_result.lat,
					});
					switchByWeather(Luna_Weather.weather_result);
				}
				hideByDiminishing(Luna_Weather.ref.lds_roller);
			}
			showByDiminishing(Luna_Weather.ref.foreground_group);
		}else{
			showByDiminishing(Luna_Weather.ref.menu_group);
			hideByDiminishing(Luna_Weather.ref.lds_roller);
		}
		// hideByDiminishing(Luna_Weather.ref.lds_roller);
	})();

	// 打开隐私协议
	// if(!Luna_Weather.storage.isAgreed()){
	// 	openPrivacyWindow("first");
	// }

	// 更新直播相关内容
	createByLive();
}

function switchByWeather(result) {
	if (result && result.curtext) {
		Luna_Weather.acts.setWeather(result.curtext.zh);
	} else {
		Luna_Weather.acts.setWeather();
	}
}

// 生成场景

function prepareForeground(){
	// document.getElementById(Luna_Weather.ref.foreground_group).style.display = "block";
	// gsap.to("#"+Luna_Weather.ref.info_section, {y: 0, opacity: 1, duration: 0.5});
	// showByDiminishing(Luna_Weather.ref.background_group);
}

// 获取位置
const getIp = (ipInfo => async () => {
	// 已经缓存了，则直接返回
	if (ipInfo) {
		return ipInfo;
	}

	// 新
	// 先使用geoip获取ip
	try {
		const result = await (await fetch(`https://ip.lunatimes.cn/geoip/`)).json();
		if (result.succeed) {
			if(!result["in Chinese Mainland"]){
				// 如果是国外的话，直接返回
				ipInfo = result;
				return ipInfo;
			}else{
				// 否则继续
				// pass
			}
		}
	} catch (e) {
		console.log(e);
	}

	// 国内的场合，先使用ip-api调用

	try {
		const result = await (await fetch(`https://ip.lunatimes.cn/ip-api/`)).json();
		if (result.succeed) {
			//过一遍和风天气
			const { lat, lon } = await searchLocation(result.city);
			ipInfo = {
				addr: result.city,
				latitude: lat,
				longitude: lon
			}
			return ipInfo;
		}
	} catch (e) {
		console.log(e);
	}

	// ip-api 不起作用，使用ip.cn

	try {
		const result = await (await fetch(`https://ip.lunatimes.cn/ip.cn/`)).json();
		if (result.succeed) {
			//过一遍和风天气
			const { lat, lon } = await searchLocation(result.city);
			ipInfo = {
				addr: result.city,
				latitude: lat,
				longitude: lon
			}
			return ipInfo;
		}
	} catch (e){
		console.log(e);
	}

	// ip.cn 不起作用，使用cz88

	try {
		const result = await (await fetch(`https://ip.lunatimes.cn/cz88/`)).json();
		if (result.succeed) {
			//过一遍和风天气
			const { lat, lon } = await searchLocation(result.city);
			ipInfo = {
				addr: result.city,
				latitude: lat,
				longitude: lon
			}
			return ipInfo;
		}
	} catch (e){
		console.log(e);
	}
})(null);

// 从地区名称获取经纬度坐标
const searchLocation = async area => {
	let result = await fetch(`https://api.weather.lunatimes.cn/geoapi/v2/city/lookup?location=${encodeURIComponent(area)}`);
	result = await result.json();
	if (result.code === '200') {
		return {
			lat: result.location[0].lat,
			lon: result.location[0].lon
		};
	} else {
		console.log(result);
	}
};

// 统计分钟降雨数据
const statWeather = (minutely, factor) => {
	if (!minutely.length) throw 0;
	factor = factor || 1;
	const nowRaining = minutely[0];
	let count = 0;
	for (let minute of minutely) {
		if (minute === nowRaining) {
			count ++;
		} else {
			break;
		}
	}
	return {
		nowRaining,
		duration: count >= minutely.length ? Infinity : count * factor
	};
};

// 从统计得到的数据生成文案
const generateSummary = (result) => {
	const { nowRaining, duration } = result.stat;
	if (isExtremeWeather(result)) {
		// 如果是极端天气，那么不产生文案，直接使用和风天气给出的介绍
		return {
			zh: result.details,
			ja: "",
			ko: "",
			en: ""
		};
	}
	// 否则，根据设定生成文案
	if (nowRaining) {
		if(duration === Infinity){
			return {
				zh: "暂时没有回家的打算",
				ja: "今家に帰る積りはありません",
				ko: "지금 집에 갈 생각은 없습니다",
				en: "No plan to go home now"
			};
		}else{
			return {
				zh: `大约还有${duration}分钟到家`,
				ja: `あと${duration}分くらいで家に着きます`,
				ko: `약 ${duration}분 후에 집에 도착합니다`,
				en: `About ${duration} min to home`
			}
		}
	} else {
		if(duration === Infinity){
			return {
				zh: "暂时没有出门的打算",
				ja: "今出かける積りはありません",
				ko: "지금 나갈 생각은 없습니다",
				en: "No travel plan now"
			};
		}else{
			return {
				zh: `预计在${duration}分钟后出去买东西`,
				ja: `${duration}分後に買物をする予定`,
				ko: `${duration}분 후에 물건을 구입하러 갈 예정입니다`,
				en: `Plan to shop after ${duration} min`
			}
		}
	}
};

// 尝试从小时降水数据预测分钟降水
const tryPredictFromHourly = (currently, hourly) => {
	let nowRaining;
	let duration;
	if (currently.precipProbability === 0) {
		// 现在没雨
		nowRaining = false;
		const rate = 2 - (hourly[0].precipProbability + hourly[1].precipProbability);
		if (rate === 2) {
			duration = Infinity;
		} else {
			duration = Math.floor(rate * 60);
		}
	} else {
		// 现在正在下雨
		nowRaining = true;
		const rate = hourly[0].precipProbability + hourly[1].precipProbability;
		duration = Math.floor(rate * 60);
	}
	return {
		nowRaining,
		duration
	};
};

// 2-5次api请求
function createByLocation(lat, lon, weather_result, location, cityID, isChangingLang){
	showByDiminishing(Luna_Weather.ref.lds_roller);
	if(weather_result){
		lat = weather_result.lat;
		lon = weather_result.lon;
		location = weather_result.location;
		cityID = weather_result.cityID;
	}
	(async ()=>{
		try {
			var result = await getResult(lat, lon);
			if(!result){
				switch(Luna_Weather.locale){
					case "zh":
						alert("获取地区信息失败！");
						break;
					case "ja":
						alert("地域情報の取得に失敗しました！");
						break;
					case "ko":
						alert("지역 정보 취득에 실패했습니다!");
						break;
					case "en":
						alert("Failed to get the district information!");
						break;
				}
				hideByDiminishing(Luna_Weather.ref.lds_roller);
				showByDiminishing(Luna_Weather.ref.foreground_group);
				return;
			}
			lat = result.lat;
			lon = result.lon;
			Luna_Weather.acts.setLocation({
				longitude: lon,
				latitude: lat
			});
			switchByWeather(result);
		}catch(error){
			console.log(error);
			result = {
				main: "N/A",
				details: "N/A"
			}
		}

		// 获取地区名称以及ID
		if(location&&!isChangingLang){
			result.location = location;
			result.cityID = cityID;
		}else{
			result = await getLocationName(result, lon, lat);
		}

		// 获取日历所需信息
		try{
			var history = await createCalendar(result.lat, result.lon, result.cityID);
			result.history = history.list;
			result.dname = history.dname;
		}catch(error){
			console.log(error);
			result.history = [];
		}

		Luna_Weather.weather_result = result;
		Luna_Weather.storage.storeWeather(result);

		// 更新界面
		setInfo(result);
		setCalendar(result);

		localize(Luna_Weather.locale);
		hideByDiminishing(Luna_Weather.ref.lds_roller);
		showByDiminishing(Luna_Weather.ref.foreground_group);
		console.log(result);
	})();
}

async function getLocationName(result, lon, lat){
	try{
		var name = await fetch(`https://api.weather.lunatimes.cn/geoapi/v2/city/lookup?lang=${Luna_Weather.locale}&location=${lon},${lat}`);
		name = await name.json();
		result.cityID = name.location[0].id;
		result.location = name.location[0].name;
	}catch(e){
		console.log(e);
		result.location = "N/A";
	}

	return result;
}

// 1-3次api请求
async function createCalendar(lat, lon, cityID){
	// 获取星期
	var list =[];
	var dname = "";
	var d = new Date();
	var dayN = d.getDay();
	if(dayN==0){
		dayN=7;
	}
	// console.log(dayN);
	// $("#test").text("hello");

	// 获取城市ID
	if(!cityID && dayN>0){
		cityID = await fetch(`https://api.weather.lunatimes.cn/geoapi/v2/city/lookup?location=${lon},${lat}`);
		cityID = await cityID.json();
		cityID = cityID.location[0].id;
		console.log("获得城市ID："+cityID);
	}

	var yyyy = null;
	var mm = null;
	var dd = null;
	var ymd = null;
	// 先获取历史天气信息
	for(let i=0; i<dayN-1; i++){
		d.setDate(d.getDate()-1);
		yyyy = String(d.getFullYear());
		mm = String(d.getMonth()+1).padStart(2, '0');
		dd = String(d.getDate()).padStart(2, '0');
		ymd = yyyy+mm+dd;
		// console.log(ymd);
		var history_weather = await fetch(`https://api.weather.lunatimes.cn/datasetapi/v7/historical/weather?location=${cityID}&date=${ymd}`);
		history_weather = await history_weather.json();
		var h= {
			isRained: "n/a"
		};
		try{
			h = {
				tempMax: history_weather.weatherDaily.tempMax,
				tempMin: history_weather.weatherDaily.tempMin,
				isRained: (Number(history_weather.weatherDaily.precip)>0)
			}
		}catch(e){
			console.log(e);
		}
		list.unshift(h);
	}
	mm = String(d.getMonth()+1).padStart(2, '0');
	dd = String(d.getDate()).padStart(2, '0');
	ymd = mm+"/"+dd;

	dname = dname+ymd;
	
	// 后获取未来天气信息
	// 获取未来7天天气信息

	var forecast7d = await fetch(`https://api.weather.lunatimes.cn/api/v7/weather/7d?location=${lon},${lat}`);
	forecast7d = await forecast7d.json();
	for(let i =0; i<7-dayN+1; i++){
		var h ={
			tempMax: forecast7d.daily[i].tempMax,
			tempMin: forecast7d.daily[i].tempMin,
			isRained: (Number(forecast7d.daily[i].precip)>0)
		}
		list.push(h);
	}
	
	d.setDate(d.getDate()+6);
	mm = String(d.getMonth()+1).padStart(2, '0');
	dd = String(d.getDate()).padStart(2, '0');
	ymd = mm+"/"+dd;
	dname = dname+"~"+ymd;

	return {
		list: list,
		dname: dname
	};
}

function setInfo(result){
	// console.log(result.curtemp);
	var day = new Date().getDay()-1;
	if(day<0){
		day = 6;
	}
	if(result.curtemp){
		$("#info_temp").text(result.curtemp+"°");
	}
	$("#info_textWeather").empty();
	$("#info_textWeather").append(`<span lang="${Luna_Weather.locale}">${result.curtext.cur}</span>`);

	$("#info_textLuna").empty();
	if(!result.main){
		$("#info_textLuna").text("N/A");
	}else{
		$("#info_textLuna").append(`<span lang="zh">${result.main.zh}</span><span lang="en">${result.main.en}</span><span lang="ja">${result.main.ja}</span><span lang="ko">${result.main.ko}</span>`)
	}
	if(result.history){
		var tempMin = result.history[day].tempMin;
		var tempMax = result.history[day].tempMax;
		$("#info_tempMM").text(""+tempMin+"~"+tempMax+"°");
	}
	$("#info_location").empty();
	$("#info_location").append(`<span lang="${Luna_Weather.locale}">${result.location}</span>`);
	localize(Luna_Weather.locale);

	prepareForeground();
}

function setCalendar(result){
	var history = result.history;
	for(var i=0; i<history.length; i++){
		$("#tempMax_"+i).text(history[i].tempMax?history[i].tempMax+"°C":"N/A");
		$("#tempMin_"+i).text(history[i].tempMin?history[i].tempMin+"°C":"N/A");
		$("#plan_"+i).empty();
		if(history[i].isRained == "n/a"){
			$("#plan_"+i).text("N/A");
		}else{
			if(history[i].isRained){
				$("#plan_"+i).append(`<span lang="zh">出门</span><span lang="en">Outdoors</span><span lang="ja">外出します</span><span lang="ko">외출합니다</span>`);
			}else{
				$("#plan_"+i).append(`<span lang="zh">宅家</span><span lang="en">At home</span><span lang="ja">家に居る</span><span lang="ko">집에서</span>`);
			}
		}
	}
	$("#calendar_title").empty();
	$("#calendar_title").append(`🌞 ${result.dname}<span lang="zh">行程表</span><span lang="en"> Schedule</span><span lang="ja">日程表</span><span lang="ko"> 일정표</span> ☔`);
	localize(Luna_Weather.locale);
}

// 1次api请求
async function getResult(lat, lon){
	let result = {};
	let info = await getIp();
	if(!info&&(!lat||!lon)){
		return null;
	}
	// console.log(info);
	// 通过地址获取坐标
	let pos = {};
	if(!lat||!lon){
		pos = {lat: info.latitude, lon: info.longitude};
	}else{
		pos = {lat: lat, lon: lon};
	}
	// console.log(pos);
	//result.addr = info.addr;
	result.lon = pos.lon;
	result.lat = pos.lat;
	//result.geo = `地理位置：${info.addr}；经纬度：${pos.lon},${pos.lat}`;
	let weather;
	let stat = null;
	result.curtemp = "N/A"
	try {
		// 先试试是不是在国内
		weather = await fetch(`https://api.weather.lunatimes.cn/api/v7/minutely/5m?location=${pos.lon},${pos.lat}`);
		weather = await weather.json();
		// console.log(weather);
		stat = statWeather(weather.minutely.map(v => v.precip !== '0.0'), 5);
		result.details = weather.summary;
	} catch (e) {
		console.log(e);
		try{
			// 应该不是在国内，试试DarkSky的分钟API
			weather = await fetch(`https://api.weather.lunatimes.cn/forecast/${pos.lat},${pos.lon}?lang=zh`);
			weather = await weather.json();
			result.curtemp = Math.round((weather.currently.temperature-32)*5/9);
			// console.log(weather);
			try {
				stat = statWeather(weather.minutely.data.map(v => v.precipProbability != 0));
				result.details = weather.minutely.summary;
			} catch (e) {
				// 国外偏远山区，试试用逐小时数据预测
				stat = tryPredictFromHourly(weather.currently, weather.hourly.data);
				result.details = weather.hourly.summary;
			}
		} catch (e) {
			console.log(e);
			return null;
		}
	}

	//获取 实时温度
	result = await getCurtext(result, pos.lon, pos.lat);
	
	result.weather = weather;
	result.stat = stat;
	result.main = generateSummary(result);
	return result;
}

// 1-2次api请求
async function getCurtext(result, lon, lat){
	result.curtext = {
		zh: "N/A",
		cur: "N/A"
	};

	try {

		var current_weather_zh = await (await fetch(`https://api.weather.lunatimes.cn/api/v7/weather/now?lang=zh&location=${lon},${lat}`)).json();
		result.curtemp = current_weather_zh.now.temp;

		result.curtext = {
			zh: (current_weather_zh.now.text)?current_weather_zh.now.text:"N/A",
		}

		if(Luna_Weather.locale == "zh"){
			result.curtext.cur = result.curtext.zh;
		}else{
			var current_weather = await fetch(`https://api.weather.lunatimes.cn/api/v7/weather/now?lang=${Luna_Weather.locale}&location=${lon},${lat}`);
			current_weather = await current_weather.json();
			result.curtext.cur = (current_weather.now.text)?current_weather.now.text:"N/A";
		}
	} catch (e) {
		console.log(e);
	}

	return result;

}

// 刷新界面

function refreshWeather(){
	// showByDiminishing(Luna_Weather.ref.lds_roller);
	getLocation_automaticly_onclick();
	// createByLocation(null, null, Luna_Weather.weather_result);
}

// 获取直播信息

function createByLive(){
	(async ()=>{
		var live_status = await fetch("https://api.danmaku.meagames.cn/room_init/24808180");
		live_status = await live_status.json();
		live_status = live_status.data.live_status;
		// 未开播
		if(live_status==0){
			if($("#front_status_button").hasClass("changed")){
				$("#front_status_button").toggleClass("unchanged changed");
			}
		}else{
			if(!$("#front_status_button").hasClass("changed")){
				$("#front_status_button").toggleClass("unchanged changed");
			}
		}
		// console.log(live_status);
	})();
}

// 窗口管理
// 从窗口1切换到窗口2

Luna_Weather.dim_counter = 0;
Luna_Weather.dim_windows = [
	 Luna_Weather.ref.language_group,
	  Luna_Weather.ref.option_group,
	   Luna_Weather.ref.credit_group,
	   Luna_Weather.ref.location_option_group
	];

Luna_Weather.isDimmed = function(name){
	var result = false;
	for(var i = 0; i<Luna_Weather.dim_windows.length; i++){
		if(name == Luna_Weather.dim_windows[i]){
			result = true;
		}
	}
	return result;
}

function switchPanel(p1, p2){
	hideByDiminishing(p1);
	showByDiminishing(p2);
}

function hideByDiminishing(p1, duration){
	if(document.getElementById(p1).style.display!="none"){
		if(Luna_Weather.isDimmed(p1)){
			Luna_Weather.dim_counter--;
			if(Luna_Weather.dim_counter<=0){
				Luna_Weather.dim_counter=0;
				hideByDiminishing("dim_background");
			}
		}
		gsap.to("#"+p1, 
		{opacity:0, 
		 duration: duration?duration:0.5,
		onComplete: function(){
			document.getElementById(p1).style.display = "none";
		}});

	}
}

function showByDiminishing(p2, duration){
	if(document.getElementById(p2).style.display!="block"){
		if(Luna_Weather.isDimmed(p2)){
			Luna_Weather.dim_counter++;
			showByDiminishing("dim_background");
		}
		document.getElementById(p2).style.display = "block";
		gsap.to("#"+p2, {opacity: 1, duration: duration?duration:0.5});
	}
}
// 本地化
Luna_Weather.locale = "zh";

function refreshByLocalization(lang){
	Luna_Weather.locale = lang;
	if(Luna_Weather.weather_result){
		createByLocation(null, null, Luna_Weather.weather_result, null, null, true);
	}else{
		localize(Luna_Weather.locale);
	}
}

function localize(lang){
	Luna_Weather.locale = lang;
	Luna_Weather.storage.storeLocale(Luna_Weather.locale);

	$("[lang]").each(function(){
		if($(this).attr("lang")==lang){
			$(this).css("display", "unset");
		}else{
			$(this).css("display", "none");
		}
	});

	switch(Luna_Weather.locale){
		case "zh":
			$("#search_bar").attr("placeholder", "可输入市/县/区名称");
			$("#search_bar").css("font-family", "cubicFont");
			break;
		case "ja":
			$("#search_bar").attr("placeholder", "ここにあなたの街を入力する");
			$("#search_bar").css("font-family", "cubicFont");
			break;
		case "ko":
			$("#search_bar").attr("placeholder", "여기에 당신의 소재지를 입력하세요");
			$("#search_bar").css("font-family", "galmuri");
			break;
		case "en":
			$("#search_bar").attr("placeholder", "Here to input your place");
			$("#search_bar").css("font-family", "cubicFont");
			break;
	}
}

// 点击方法

// 自动获取位置

function getLocation_automaticly_onclick(){
	hideByDiminishing(Luna_Weather.ref.location_option_group);
	hideByDiminishing(Luna_Weather.ref.menu_group);
	// showByDiminishing(Luna_Weather.ref.lds_roller);
	createByLocation();
}

// 手动获取位置！

// 开关位置界面
function openLocationWindow(){
	document.getElementById(Luna_Weather.ref.location_group).style.display = "block";
	gsap.to("#"+Luna_Weather.ref.location_window, 
	{y: "-100%", 
	duration: 0.5,
	onComplete: ()=>{
		// hideByDiminishing(Luna_Weather.ref.location_option_group, 0);
	}
	});
	adjust_locationWindow();
}

function closeLocationWindow(){
	hideByDiminishing(Luna_Weather.ref.menu_group);
	gsap.to("#"+Luna_Weather.ref.location_window, 
	{y: "0%", 
	duration: 0.5, 
	onComplete: ()=>{
		document.getElementById(Luna_Weather.ref.location_group).style.display = "none";
		$("#search_bar").val("");
		$("#cnab_area").css("display", "block");
		clearSearchArea();
		$("#search_area").css("display","none");
		adjust_locationWindow();
	}});
}

Luna_Weather.cityareacn_id = 0;
Luna_Weather.cityareaab_id = 1;

function getLocation_manually_onclick(){
	// 生成选项
	// 打开窗口
	openLocationWindow()
}

// 生成地区选择窗口
// 	读取json
async function readJson(){
	$.getJSON("../data/cn.json?v=0.01", createLocationSelectionWindow_cn);
	$.getJSON("../data/ab.json?v=0.01", createLocationSelectionWindow_ab);
}

//	切换国内海外

function goToCN(){
	$("#selection_ab").css("display", "none");
	$("#selection_cn").css("display", "unset");
	$("#cityareacn_"+Luna_Weather.cityareacn_id).css("display", "unset");
}

function goToAB(){
	$("#selection_cn").css("display", "none");
	$("#selection_ab").css("display", "unset");
	$("#cityareaab_"+Luna_Weather.cityareaab_id).css("display", "unset");
}

// 	生成国内
function createLocationSelectionWindow_cn(data){
	for(var i = 0; i<data.RECORDS.length; i++){
		var state = data.RECORDS[i];
		if(state.err == "iserr"){
			continue;
		}
		
		$("#location_table_cn").append(
			`<tr><th><button class=\"side_button\" data_goto=${i} onClick=\"goToCityAreaCN(this)\"><span lang="zh">${state.cname}</span><span lang="en">${state.name}</span><span lang="ja">${state.jname}</span><span lang="ko">${state.kname}</span></button></th></tr>`);
		var cityareaName = "cityareacn_"+i;
		$("#selection_cn").append(`<div class = "cityarea" id=\"${cityareaName}\"></div>`);
		
		// 读取城市
		for(var j = 0; j<state.cities.length; j++){
			var city = state.cities[j];
			$("#"+cityareaName).append(`<button class=\"round_button\" lat=${city.lat} lon=${city.lon} cname=${city.cname} name=${city.name} jname=${city.jname} kname=${city.kname} cityID=${city.id} onClick=\"goToLocation(this)\"><span lang="zh">${city.cname}</span><span lang="en">${city.name}</span><span lang="ja">${city.jname}</span><span lang="ko">${city.kname}</span></button>`);
		}
	}
	
	$("#cityareacn_0").css("display", "unset");
	Luna_Weather.cityareacn_id = 0;
}

// 	生成海外
function createLocationSelectionWindow_ab(data){
	for(var i = 0; i<data.RECORDS.length; i++){
		var country = data.RECORDS[i];
		if(country.cities.length <= 0){
			continue;
		}
		
		$("#location_table_ab").append(`<tr><th><button class=\"side_button\" data_goto=${i} onClick=\"goToCityAreaAB(this)\"><span lang="zh">${country.cname}</span><span lang="en">${country.name}</span><span lang="ja">${country.jname}</span><span lang="ko">${country.kname}</span></button></th></tr>`);
		var cityareaName = "cityareaab_"+i;
		$("#selection_ab").append(`<div class ="cityarea" id=\"${cityareaName}\"></div>`);

		//读取城市
		for(var j = 0; j<country.cities.length; j++){
			var city = country.cities[j];
			if(city.err == "iserr"){
				continue;
			}
			$("#"+cityareaName).append(`<button class=\"round_button\" lat=${city.lat} lon=${city.lon} cname=${city.cname} name=${city.name} jname=${city.jname} kname=${city.kname} cityID=${city.id} onClick=\"goToLocation(this)\"><span lang="zh">${city.cname}</span><span lang="en">${city.name}</span><span lang="ja">${city.jname}</span><span lang="ko">${city.kname}</span></button>`);
		}

		$("#cityareaab_1").css("display", "unset");
		$("#selection_ab").css("display", "none");
		Luna_Weather.cityareaab_id = 0;
	}
}

//	搜索位置

function searchBarOnfocus(){
	$("#cnab_area").css("display", "none");
	$("#search_area").css("display","block");
}

function searchBarOnBlur(){
	if($("#search_bar").val()==""){
		$("#cnab_area").css("display", "block");
		$("#search_area").css("display","none");
	}
}

function confirmLocationSearch(){
	clearSearchArea();
	$("#search_lds").css("display", "flex");
	var value = $("#search_bar").val();
	(async ()=>{
		try{
			var places = await fetch(`https://api.weather.lunatimes.cn/geoapi/v2/city/lookup?lang=${Luna_Weather.locale}&location=${value}`);
			places = await places.json();
			for(let i = 0; i<places.location.length; i++){
				var location = null;
				location = places.location[i];
				var display_name = generateDisplayName(location);
				$("#search_content").append(`<div class="search_item" lat=${location.lat} lon=${location.lon} name=${display_name.split(", ")[0]} onclick=\"goToLocation(this, true)\"><span lang="${Luna_Weather.locale}">${display_name}</span></div>`);
				localize(Luna_Weather.locale);
			}
		}catch(e){
			clearSearchArea();
			$("#search_content").append(`<div class="search_item" id="error_item"><span lang="zh">未能找到结果</span><span lang="en">No result</span><span lang="ja">検索結果なし</span><span lang="ko">검색결과가 없습니다</span></div>`);
		}
		$("#search_lds").css("display", "none");
		localize(Luna_Weather.locale);
	})()
}

function generateDisplayName(location){
	var display_name = location.name;
	if(location.adm1 && location.adm1 != location.name){
		display_name += (", "+location.adm1);
	}
	if(location.adm2&& location.adm2 != location.name){
		display_name+= (", "+location.adm2);
	}
	display_name += (", "+location.country);
	return display_name;
}

function clearSearchArea(){
	$("#search_content").empty();
}

// 从位置界面返回

function locationReturn(){
	closeLocationWindow();
}

// 	前往对应菜单

function goToCityAreaCN(e){
	var i = e.getAttribute("data_goto");
	$("#cityareacn_"+Luna_Weather.cityareacn_id).css("display", "none");
	$("#cityareacn_"+i).css("display", "unset");
	Luna_Weather.cityareacn_id = i;
}

function goToCityAreaAB(e){
	var i = e.getAttribute("data_goto");
	$("#cityareaab_"+Luna_Weather.cityareaab_id).css("display", "none");
	$("#cityareaab_"+i).css("display", "unset");
	Luna_Weather.cityareaab_id = i;
}

// 	前往对应区域
function goToLocation(e, isSearch){
	var lat = Number(e.getAttribute("lat"));
	var lon = Number(e.getAttribute("lon"));
	var cityID = e.getAttribute("cityID");
	var location = "N/A"
	if(isSearch){
		location = e.getAttribute("name");
	}else{
		switch(Luna_Weather.locale){
			case "zh":
				location = e.getAttribute("cname");
				break;
			case "en":
				location = e.getAttribute("name");
				break;
			case "ja":
				location = e.getAttribute("jname");
				break;
			case "ko":
				location = e.getAttribute("kname");
				break;	
		}
	}
	console.log(location);

	closeLocationWindow();
	showByDiminishing(Luna_Weather.ref.lds_roller);
	createByLocation(lat, lon, null, location, cityID);
}

// 日历界面翻页
Luna_Weather.pageNumber = 0;

function changePages(){
	if(Luna_Weather.pageNumber == 0){
		Luna_Weather.pageNumber = -1;
		gsap.to("#calendar_group",
		{
			x: "-100%",
			duration: 0.5,
			opacity: 1,
			onComplete: ()=>{
				Luna_Weather.pageNumber = 1;
			},
			onUpdate: adjust_calendar
		});
		gsap.to("#info_section", 
		{
			x: "-120%",
			duration: 0.5,
			opacity: 0,
			onComplete: ()=>{
				gsap.set("#info_section", {x: "120%"});
			}
		});

	}else if (Luna_Weather.pageNumber == 1){
		Luna_Weather.pageNumber = -1;
		gsap.to("#calendar_group",
		{
			x: "-200%",
			duration: 0.5,
			opacity: 0,
			onComplete: ()=>{
				gsap.set("#calendar_group", {x: "0%"});
			}
		});
		gsap.to("#info_section", 
		{
			x: "0%",
			duration: 0.5,
			opacity: 1,
			onComplete: ()=>{
				Luna_Weather.pageNumber = 0;
			}
		});
	}
}

// 选项界面

function openOptionWindow(){
	// console.log(1);
	showByDiminishing(Luna_Weather.ref.option_group);
}

function option_selectLanguage_onclick(){
	showByDiminishing(Luna_Weather.ref.language_group);
	hideByDiminishing(Luna_Weather.ref.option_group);
}

function option_privacy_onclick(){
	openPrivacyWindow("readonly");
	// hideByDiminishing(Luna_Weather.ref.option_group);
}

function option_return(){
	hideByDiminishing(Luna_Weather.ref.option_group);
}

// 位置选项界面

function locationOptionReturn(){
	hideByDiminishing(Luna_Weather.ref.location_option_group);
}

// 打开隐私协议

function openPrivacyWindow(mode){
	document.getElementById(Luna_Weather.ref.privacy_group).style.display = "unset";
	if(mode=="first"){
		document.getElementById(Luna_Weather.ref.privacy_choice).style.display = "unset";
		document.getElementById(Luna_Weather.ref.privacy_return).style.display = "none";
	}else{
		document.getElementById(Luna_Weather.ref.privacy_return).style.display = "unset";
		document.getElementById(Luna_Weather.ref.privacy_choice).style.display = "none";
	}
	gsap.to("#"+Luna_Weather.ref.privacy_group, 
	{y: "-100%", 
	duration: 0.5,
	onComplete: ()=>{
		hideByDiminishing(Luna_Weather.ref.option_group, 0);
	}
	});
	adjust_privacyWindow();
}

function closePrivacyWindow(){
	gsap.to("#"+Luna_Weather.ref.privacy_group, 
	{y: "0%", 
	duration: 0.5, 
	onComplete: ()=>{
		document.getElementById(Luna_Weather.ref.privacy_group).style.display = "none";
	}});
	if(!Luna_Weather.storage.isAgreed()){
		Luna_Weather.storage.setAgreed();
	}
}

function onAgreed(){
	closePrivacyWindow();
	getLocation_automaticly_onclick();
}

function onDisagreed(){
	switch(Luna_Weather.locale){
		case "zh":
			alert("您需要同意隐私声明才能体验月奈出行\n若您不同意，很遗憾我们将无法为您提供服务");
			break;
		case "ja":
			alert("「ルナおでけけ」を体験するには、この免責事項に同意する必要があります\n申し訳ございません、この免責事項に同意しないなら我々のサービスを提供することはできません");
			break;
		case "ko":
			alert("당신은 이 면책성명에 동의해야만 「루나출행」를 체험할 수 있습니다\n죄송합니다, 이 면책성명에 동의하지 않는다면 우리는 서비스를 제공할 수 없습니다");
			break;
		case "en":
			alert("You need to accept the disclaimers to experience Lunatrip\nWe are so sorry that we cannot serve for you if you do not accept the disclaimers");
			break;
		default:
			alert("ERROR");
			break;
	}
}

function earth_onclick(){
	getLocation_manually_onclick();
}

function getLocation_onclick(){
	showByDiminishing(Luna_Weather.ref.location_option_group);
	// hideByDiminishing(Luna_Weather.ref.menu_group);
	//showByDiminishing(Luna_Weather.ref.lds_roller);
	//createByLocation();
}

function menu_privacy_onclick(){
	// hideByDiminishing(Luna_Weather.ref.menu_group);
	openPrivacyWindow("readonly")
}

function privacy_return(){
	closePrivacyWindow();
	// showByDiminishing(Luna_Weather.ref.menu_group);
}

// 本地化按钮

function menu_selectLanguage_onclick(){
	showByDiminishing(Luna_Weather.ref.language_group);
}

function selectLanguage_cn(){
	refreshByLocalization("zh");
	selectLanguage_return();
}

function selectLanguage_en(){
	refreshByLocalization("en");
	selectLanguage_return();
}

function selectLanguage_jp(){
	refreshByLocalization("ja");
	selectLanguage_return();
}

function selectLanguage_ko(){
	refreshByLocalization("ko");
	selectLanguage_return();
}

Luna_Weather.isFromMainMenu = false;

function selectLanguage_return(){
	hideByDiminishing(Luna_Weather.ref.language_group);
	if(Luna_Weather.isFromMainMenu){
		showByDiminishing(Luna_Weather.ref.start_panel);
		Luna_Weather.isFromMainMenu = false;
	}
}

// 制作人员名单

function menu_credit_onclick(){
	showByDiminishing(Luna_Weather.ref.credit_group);
}

function option_credit_onclick(){
	showByDiminishing(Luna_Weather.ref.credit_group);
	hideByDiminishing(Luna_Weather.ref.option_group);
}

function credit_return(){
	hideByDiminishing(Luna_Weather.ref.credit_group);
}

// 标题界面

function createLogoAnimation(){
	var tl = gsap.timeline({repeat: -1});
	tl.to(".logo_div", {y: "-5px", duration: 1.5, ease: "none"});
	tl.to(".logo_div", {y: "0px", duration: 1.5, ease: "none"});
	tl.play();
}

// 窗口适应

function adjust_locationWindow(){
	if($("#location_group").css("display")!="none"){
		var height = (window.innerHeight-$("#location_header").outerHeight(true)-$("#location_return").outerHeight(true)-$("#search_header").outerHeight(true)+10);
		var mheight = (height-$("#topbar").outerHeight(true)-28);
		// console.log($(".selection_header").outerHeight(true));
		$(".selectLocation_area").css("height", height);
		$(".main_selection").css("height", mheight);
	}
}

// 隐私区域调整

function adjust_privacyWindow(){
	if($("#privacy_group").css("display")!="none"){
		var height = (window.innerHeight-$("#privacy_title").outerHeight(true)-$("#privacy_choice").outerHeight(true));
		$("#privacy_content").css("height", height);
	}
}

// 中心区域调整
function adjust_centreArea(){
	var ca = document.getElementsByClassName("center_area");
	var ndist = Math.min(window.innerHeight, window.innerWidth);
	for(var i = 0; i<ca.length; i++){
		ca[i].style.width = ""+ndist+"px";
	}
}

// 立绘位置调整
function adjust_character(){

	let ndist = Math.min(window.innerHeight, window.innerWidth) - $('#luna-main').width();
	if (ndist < -40) {
		ndist = -40;
	}
	$('#luna-main').css({ left: ndist });

}

// 日历区域调整

function adjust_calendar(){
	// var left_distance = $("#display_section").offset().left+$("#display_section").outerWidth();
	// var top_distance = $("#display_section").offset().top;
	// var calendar_left = $("#calendar_wrapper").offset().left-25;
	// var calendar_top_distance = $("#calendar_wrapper").offset().top+$("#calendar_wrapper").outerHeight();

	// if(calendar_left<left_distance && calendar_top_distance>top_distance){
	// 	var dist = left_distance-calendar_left;
	// 	$("#live_notice_panel").css("margin-left", dist+"px");
	// }else{
	// 	$("#live_notice_panel").css("margin-left", 0+"px");
	// }
}

// 设置方法
window.onresize = function(){
	// 重置滚动进程
	Luna_Weather.acts.onResize();

	// 中心区域调整
	adjust_centreArea();
	
	// 位置区域调整
	adjust_locationWindow();
	adjust_privacyWindow();

	adjust_calendar();

}

window.onload = initializeAll;
