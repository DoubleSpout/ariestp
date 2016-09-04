var fs = require('fs');
var path = require('path');
var url = require('url');
var util = require('util');
var md5 = require('blueimp-md5');
var ariestp = require("./ariestp.js")
var te = ariestp.Engine();
var async = require('async');
var domain = require('domain');
var hasSet = false;
var atry = require('./atry.js');
var aries = {};


aries.set = function(opt){
	if(hasSet) return te;
	
	if(opt.path){
		//检查 opt.path是否存在
		fs.exists(opt.path, function (exists) {
		  if(!exists){
			 var errMsg = "[ariestp] ariestp.set opt.path is not exist!"
			 console.error(errMsg);
			 throw new Error(errMsg);
		  }
		});
	}
	
	if(opt.includeId && "function" !== typeof opt.includeId){
		var errMsg = "[ariestp] ariestp.set opt.includeId must be function!"
		console.error(errMsg);
		throw new Error(errMsg);
	}
	
	if(opt.cacheTime){
		if(isNaN(opt.cacheTime - 0)){
			var errMsg = "[ariestp] ariestp.set opt.cacheTime must be a number!"
			console.error(errMsg);
			throw new Error(errMsg);
		}
		if(opt.cacheTime < 10*1000){
			var errMsg = "[ariestp] ariestp.set opt.cacheTime must gte 10 secs!"
			console.error(errMsg);
			throw new Error(errMsg);
		}
		if(opt.cacheTime > 3600*1000){
			var errMsg = "[ariestp] ariestp.set opt.cacheTime must lt 1 hour!"
			console.error(errMsg);
			throw new Error(errMsg);
		}
		
	}
	
	te = ariestp.Engine(opt);
	hasSet = true;
	console.log("[ariestp] ariestp.set ok, ready for compile.");
	return te;
}



//渲染文件路径
aries.compileFile = function(filename, ctx, cb){
	aries.getTemplateFromFile(filename, function(err, tempstr){
		if(err) return cb(err);
		aries.compile(tempstr.toString(), ctx, cb);
	})
}

//渲染文件字符串
aries.includes = function(tempstr, cb){
	cb.isIncludes = true;
	aries.compile(tempstr, {}, cb);
}


//优雅的错误输出
aries.prettyStackFunc = function(err, incMapStr){
	var incMapStr = incMapStr || {};
	var keys = Object.keys(incMapStr);
	var eId = ''
	
	try{
		if(!err.stack){
			return err;
		}else{
			var stackLineReg = /^(.*)at(.*):(.*):(.*)\)$/
			var stackList = (err.stack || '').split('\n');
			var stackLen = stackList.length;
			
			
			//console.log(incMapStr)
			//console.log(err.stack)
			//console.log(err.codeStr)

			//当stack length 大于0
			if(keys.length > 0 && stackLen > 0){
				var codeStr = '';
				for(var i=0;i<stackLen;i++){
					if(stackLineReg.test(stackList[i])){
						var line = stackList[i].split(':')[1] - 0;
						if(line && line > 0){//找到出错的行号了
							codeStr = (((err.codeStr || '').toString().split('\n') || [])[line-1] || '').trim();
							//如果最后是分号
							if(codeStr.lastIndexOf(';') == (codeStr.length - 1)){
								codeStr = codeStr.slice(0, -2);
							}
							break;
						}
					}
				}

				// 找到出错的行号
				if(codeStr != ''){
						keys.forEach(function(key){
							var mapStrList = incMapStr[key].split('\n');				
							for(var i=0;i<mapStrList.length;i++){
								if(mapStrList[i].indexOf(codeStr) >= 0){
									eId += key + ', '
									break;
								}
							}
							return;
						})
				}
			}
			
		

			
			var tplId = eId || 'main';
			err.prettyStack = 'error occur in '+ tplId + '<br/>\n'+stackList.join('<br/>\n');
			
			//console.log(err.prettyStack)
		}
	}catch(e){
		console.log(e);
		return err;
	}
	
	
	return err;
}

//渲染文件字符串
aries.compile = function(tempstr, ctx, cb){
				
		var compileFinish = false;
		if(!tempstr){
			return cb(null, "");
		}
		var ctx = ctx || {};

		try{
			var key = md5(tempstr);
		}
		catch(e){
			e = aries.prettyStackFunc(e);
			return cb(e);
		}
		var tempStrList = [tempstr];


		//ctx中途结束的标识符
		ctx.__hasFinish__ = false;
		ctx.finished = function(){ //预留函数
			this.__hasFinish__ = true;
		}
		

		aries.scanInclude(tempStrList, 0, ctx, function(err, strList, noInclude, includeIds, includeFiles, incMapStr){
							
				//避免回调2次
				if(compileFinish) return;
				if(err){
					compileFinish = true
					err = aries.prettyStackFunc(err, incMapStr);
					return cb(err);
				}
				
				//如果仅仅返回includeIds
				if(cb.isIncludes){
					return cb(null, includeIds, includeFiles)
				}
				
				
				
				//去渲染模版
				var templatePromise = te.template(strList, key, function (err, t, isUseCache) {
						//避免回调2次
						if(compileFinish) return;

						if(err){
							compileFinish = true;
							err = aries.prettyStackFunc(err, incMapStr);
							return cb(err);
						}
						var templateResponse = t(te, key, ctx, templatePromise);
						var bodyList = [];

						templateResponse.addListener("body", function (chunk) {
								if(compileFinish) return
								bodyList.push(chunk);
						});

						templateResponse.addListener("complete", function () {
								if(compileFinish) return;
								compileFinish = true;

								//如果出现错误
								if(ctx._ariestpError){
									err = aries.prettyStackFunc(ctx._ariestpError, incMapStr);
									return cb(ctx._ariestpError, null, isUseCache)
								}
								strList = strList || [];
								cb(null, bodyList.join(""), strList.join(""), includeIds, includeFiles, isUseCache);
								
						});
						
						templateResponse.addListener("error", function (err) {

								if(compileFinish) return
								compileFinish = true
								err = aries.prettyStackFunc(err, incMapStr);
								cb(err);
						});
				});
		
		});
		
}


aries.getTemplateFromFile = function getTemplateFromFile(filename, cb){
	//是否是绝对路径
	if (filename.charAt(0) === '/' || /^[a-zA-Z]:$/.test(filename.slice(0,2))) {
		filename = filename;
    } else{
		filename = path.join(te.path, filename);
	}
			
	fs.readFile(filename, function (err, tempstr) {
		if (err) return cb(err);
		return cb(null, tempstr)
	});
}


//内部方法扫描是否具有包含include的方法
aries.scanInclude = function scanInclude(tempStrList, count, ctx, cb){
	//符号用
	var templateSymbol = [];
	var symbolPos = -1;	
	var isPairing = false;
	var tmpS, tmpE;
	
	//如果没有就创建数组
	if(typeof cb.includeFiles == "undefined"){
		cb.includeFiles = [];
	}
	
	if(typeof cb.includeIds == "undefined"){
		cb.includeIds = [];
	}
	
	if(typeof cb.incMapStr == "undefined"){
		cb.incMapStr = {};
	}
		

	//大于5次的嵌套就出错，防止死循环嵌套
	count++;
	if(count>5){
		var err = new Error(util.format("[ariestp] scanInclude include count lt 5 times"));
		return cb(err);
	}

	//注释用
	// var noteList = [];
	// var notePos = -1;
	// var isPairingNote = false;
	// var tmpNS, tmpNE;
	// 去除注释
	// 字符串长度
	// var len = tempStrList[0].length;
	// for(var i=0;i<len; i++){		
	// 	// <!-- 11916796840964503050040715 -->
	// 	//判断注释
	// 	if(tempStrList[0][i] === '<' && tempStrList[0][i+1] === '!' && tempStrList[0][i+2] === '-' && tempStrList[0][i+3] === '-'){
	// 		if(isPairingNote === true){
	// 			var err = new Error(util.format("[ariestp] template str scan error, not pair <!-- at template char %s, str copy:", i, tempStrList[0].slice(tmpNS, i+4)));
	// 			return cb(err);
	// 		}
	// 		tmpNS = i;
	// 		noteList.push({
	// 			s:i,
	// 			e:-1,
	// 		})
	// 		notePos = noteList.length - 1;		
	// 		isPairingNote = true;

	// 	}else if(tempStrList[0][i] === '-' && tempStrList[0][i+1] === '-' && tempStrList[0][i+2] === '>'){
	// 		if(isPairingNote !== true){
	// 			var err = new Error(util.format("[ariestp] template str scan error, not pair --> at template char %s, str copy:", i, tempStrList[0].slice(tmpNE, i+3)));
	// 			return cb(err);
	// 		}
	// 		tmpE = i + 3;
	// 		noteList[notePos]['e'] = tmpE;
	// 		isPairingNote = false;
	// 		notePos = -1;
	// 	}
	// }

	// //如果有注释
	// if(noteList.length > 0){
	// 	var noteLen = noteList.length;
	// 	//去掉注释
	// 	for(var i=noteLen-1; i>=0;i--){
	// 		tempStrList[0] = tempStrList[0].slice(0, noteList[i]["s"]) + tempStrList[0].slice(noteList[i]["e"]);
	// 	}
	// }

	//字符串长度
	var len = tempStrList[0].length;
	for(var i=0;i<len; i++){
		if(tempStrList[0][i] === '<' && tempStrList[0][i+1] === '%'){
			if(isPairing === true){
				var err = new Error(util.format("[ariestp] template str scan error, not pair <% at template char %s, str copy:", i, tempStrList[0].slice(tmpS, i+2)));
				return cb(err);
			}
			tmpS = i;
			templateSymbol.push({
				s:i,
				e:-1,
			})
			symbolPos = templateSymbol.length - 1;		
			isPairing = true
		} else if(tempStrList[0][i] === '%' && tempStrList[0][i+1] === '>'){
			if(isPairing !== true){
				var err = new Error(util.format("[ariestp] template str scan error, not pair %> at template char %s, str copy:", i, tempStrList[0].slice(tmpE, i+2)));
				return cb(err);
			}
			tmpE = i + 2;
			templateSymbol[symbolPos]['e'] = tmpE;
			isPairing = false;
			symbolPos = -1;
		}		
	}
	
	//所有 <% xxxx %> 的匹配，存入临时数组
	var len = templateSymbol.length;
	var includeList = [];
	var includeReg = /^<%\s+include\s(.+)\s+%>$/;
	var includeIdReg = /^<%\s+includeId\s(.+)\s+%>$/;
	var renderReg = /^<%[=|-](.+)%>$/;
	var hasFh = /^<%(.+);(\s*?)%>$/;

	var needSemicolon = false;
	var include = 0;
	for(var i=0;i<len;i++){
		var includeMatchStr = tempStrList[0].slice(templateSymbol[i]['s'], templateSymbol[i]['e']);
		var matchList =  includeMatchStr.match(includeReg);
		
		//如果include文件
		if(matchList && matchList[0] && matchList[1]){
			includeList.push({
				's':templateSymbol[i]['s'],
				'e':templateSymbol[i]['e'],
				'type':1,//1 表示include文件
				'val':matchList[1],
			})
			
			cb.includeFiles.push(matchList[1].split("?")[0]);
			//cb.incMapStr['file_'+matchList[1].split("?")[0]] = "";
			
			include++;
			continue;
		}
		
		//如果includeid id
		var matchListId = includeMatchStr.match(includeIdReg);
		if(matchListId && matchListId[0] && matchListId[1]){
			includeList.push({
				's':templateSymbol[i]['s'],
				'e':templateSymbol[i]['e'],
				'type':2,//1 表示include文件
				'val':matchListId[1],
			})
			//将includeId存入cb的includeIds数组
			cb.includeIds.push(matchListId[1].split("?")[0]);
			//cb.incMapStr['id_'+matchListId[1].split("?")[0]]= "";
			
			include++;
			continue;
		}

		if(!(renderReg.test(includeMatchStr)) && !(hasFh.test(includeMatchStr))){
			includeMatchStr = includeMatchStr.slice(0, -2) + ';' + includeMatchStr.slice(-2);
			includeList.push({
					's':templateSymbol[i]['s'],
					'e':templateSymbol[i]['e'],
					'type':3,//表示正常的<% %>对，非include
					'val':includeMatchStr,
			})
		}

	}

	//如果模版不包含 include 或者 includeId
	// if(includeList.length === 0){
	// 	var notHaveInclude = false
	// 	return cb(null, tempStrList, notHaveInclude);
	// }
	if(include === 0){
		var notHaveInclude = false
		aries.assemble(tempStrList, includeList, notHaveInclude, ctx, cb);
		// return cb(null, tempStrList, notHaveInclude);
	}else{
		aries.replaceIncludeStr(tempStrList, includeList, count, ctx, cb);
	}
		
}

aries.replaceIncludeStr = function replaceIncludeStr(tempStrList, includeList, count, ctx, cb){
	var asyncWorker = [];
	
	includeList.forEach(function(incItem){
		var okCallback = true
		var dealFunc = function(callback){	
					
			if(incItem.type == 1){
				
				//去解析include的内容
				var tmpList = aries.splitIncludeParam(incItem.val);
				if(tmpList[2]){
					return callback(tmpList[2])
				}
							
				aries.getTemplateFromFile(tmpList[0], function(err, tempstr){
					if(err) return callback(err);
					incItem.template =  tmpList[1] + tempstr.toString();
					
					cb.incMapStr['file_'+incItem.val] = tempstr.toString();
					
					//tempStrList[0] = tempStrList[0].slice(0, incItem['s']) + tempstr + tempStrList[0].slice(incItem['e']);
					okCallback && callback();
					okCallback = false
					return
				})
			}else if(incItem.type == 2){
						
				if(!te.includeId){
					okCallback && callback(new Error("[ariestp] not defined opt.includeId can't use includeId in template!"));
					okCallback = false
					return
				}else{
					
					//去解析include的内容
					var tmpList = aries.splitIncludeParam(incItem.val);
					if(tmpList[2]){
						return callback(tmpList[2])
					}
					
					atry(function() {
					  	te.includeId(tmpList[0], function(err, tempstr){
							if(err){
								okCallback && callback(err);
								okCallback = false
								return
							}
							
							cb.incMapStr['id_'+incItem.val] = tempstr.toString();

							process.nextTick(function () {
								incItem.template = tmpList[1] + tempstr.toString();
								// tempStrList[0] = tempStrList[0].slice(0, incItem['s']) + tempstr + tempStrList[0].slice(incItem['e']);
								okCallback && callback();
								okCallback = false
							});
							return;
						});
					}).catch(function(err) {
						//定义ariestp错误
						ctx._ariestpError = err;

						okCallback && callback(err);
						okCallback = false
						return
					});

				}
			}
			else{ //type == 3
				incItem.template = incItem.val;
				okCallback && callback();
				okCallback = false
				return
			}
		}
		asyncWorker.push(dealFunc);	
		
	});
	//异步并发
	async.parallel(asyncWorker, function(err){
		if(err){
			return cb(err);
		} 
		//重新做检查，看是否有include
		var len = includeList.length;
		for(var i=len-1;i>=0;i--){

			tempStrList[0] = tempStrList[0].slice(0, includeList[i]["s"]) + includeList[i]["template"] + tempStrList[0].slice(includeList[i]["e"]);
		}
		aries.scanInclude(tempStrList,count,ctx,cb);
	})
	
}

aries.assemble = function assemble(tempStrList, includeList, notHaveInclude, ctx, cb){
	
	var len = includeList.length;
	for(var i=len-1;i>=0;i--){
			tempStrList[0] = tempStrList[0].slice(0, includeList[i]["s"]) + includeList[i]["val"] + tempStrList[0].slice(includeList[i]["e"]);
		}

	cb(null, tempStrList, notHaveInclude, cb.includeIds, cb.includeFiles, cb.incMapStr);	
}

//添加功能
//include xxxxx?a=1 这样的方式传参
aries.splitIncludeParam = function(rawIncludeStr){
			
	var list = rawIncludeStr.trim().split('?');
	var includeStr = (list[0]||'').trim();
	var queryParam = (list[1]||'').trim();
	//如果没有?没有参数
	if(!queryParam){
		return [includeStr, '', null];
	}
	
	//对url query字符串进行parse解析
	try{
		var obj = url.parse('/?'+queryParam, true);
	}catch(e){
		var err = new Error(util.format('include or includeid query error: %s \n %s', rawIncludeStr, e.stack||''));
		err.stack = e.stack || '';
		return ['', '', err];
	}
	
	//添加模板字符串
	var tmpStr = '<%';
	Object.keys(obj.query).forEach(function(key){
		tmpStr += util.format(' ctx["%s"] = "%s"; ', key, obj.query[key] || '');
	})
	tmpStr += '%>';
	
	return [includeStr, tmpStr, null];
}

exports.set = aries.set;
exports.compileFile = aries.compileFile;
exports.compile = aries.compile;
exports.includes = aries.includes;
exports.splitIncludeParam = aries.splitIncludeParam;





