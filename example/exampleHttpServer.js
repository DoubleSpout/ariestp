"use strict";
const http = require("http");
const url = require("url");
const fs = require("fs");
const aries = require("../index.js");
const path = require("path");
const util = require('util');

//设置白羊座
aries.set({
	path:__dirname,
	includeId:function(templateId, cb){
		return fs.readFile(path.join(__dirname,templateId+'.html'), cb)
	},
	cacheTime:10000,
})

let server = http.createServer((req, res) => {

    let parseObj = url.parse(req.url, true);

    if(parseObj.pathname.indexOf("/sync") === 0){
    	return syncTemplate(req, res);
    }

    if(parseObj.pathname.indexOf("/async") === 0){
    	return asyncTemplate(req, res);
    }
    if(parseObj.pathname.indexOf("/debug") === 0){
    	return debugTemplate(req, res);
    }
    if(parseObj.pathname.indexOf("/fature") === 0){
    	return templateFature(req, res);
    }
	

    	
	res.statusCode = 200;
	res.end("not found");
 
});

server.listen(3001);
console.log("listen port "+ 3001)

//异步错误响应
let errorResp = (req, res, err) => {
	res.writeHead(500, {
		"Content-Type": "text/html",
	});
    res.end(util.format("%s", err.prettyStack));
}


//同步渲染模板
let syncTemplate = (req, res) => {
	let s1 = Date.now()
	res.end("<% includeId 5710b3053caccff63744a3f5 %>"+'<br/>消耗时间：'+(Date.now()-s1)+';')

}



//异步渲染模板
let asyncTemplate = (req, res) => {
	let s1 = Date.now()
	let ctx = {
		"http":http,
		"msg":"这时一个异步模版",
		"fs":fs,
	}
	aries.compileFile("async_example.html", ctx, (err, renderStr, isUseCache) => {
		   err && errorResp(req, res, err);
		   res.writeHead(200, {
				"Content-Type": "text/html",
			});
	       res.end(renderStr+'<br/>消耗时间：'+(Date.now()-s1)+'; 是否使用缓存：'+ (isUseCache||"false"));
	})

}
//模板支持的特性
let templateFature = (req, res) => {
	let s1 = Date.now()
	let ctx = {
		print:function(str) { 
			return util.format("%s + %s + %s", str, str, str)
		},
		data:["a","b","c","d","e","f","g"]
	};

	aries.compileFile("fature_example.html", ctx, (err, renderStr, isUseCache) => {
		   err && errorResp(req, res, err);
		   res.writeHead(200, {
				"Content-Type": "text/html",
			});
	       res.end(renderStr+'<br/>消耗时间：'+(Date.now()-s1)+'; 是否使用缓存：'+(isUseCache||"false"));
	})

}


//测试控制器
let debugTemplate = (req, res) => {
	let s1 = Date.now()
	let ctx = {
		//"http":http,
		"msg":"这时一个异步模版",
		"fs":fs,
	}
	aries.compileFile("async_debug.html", ctx, (err, renderStr, isUseCache) => {
		   err && errorResp(req, res, err);
		   res.writeHead(200, {
				"Content-Type": "text/html",
			});
	       res.end(renderStr+'<br/>消耗时间：'+(Date.now()-s1)+'; 是否使用缓存：'+ (isUseCache||"false"));
	})

}