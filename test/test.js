"use strict";
const aries = require("../index.js");
const assert = require('assert');
const async = require('async');
const fs = require('fs');
const path = require('path');
//设置白羊座
aries.set({
	path:__dirname,
	includeId:function(templateId, cb){
		return fs.readFile(path.join(__dirname,templateId+'.html'), cb)
	},
	cacheTime:10000,
});

let taskList = [];
let taskList2 = [];


// 测试普通字符串
taskList.push(function(callback){
	let syncStr = "<html><body>helloworld</body></html>";
	aries.compile(syncStr, {}, (err, renderStr, a,b,c,isUseCache) => {
		   if(err){
				console.log(err.stack)
		   }
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr === "<html><body>helloworld</body></html>");

		   aries.compile(syncStr, {}, (err, renderStr, a,b,c,isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "<html><body>helloworld</body></html>");
			   console.log("normal str test ok");
			   callback();
			})
	})
});


// //测试转移字符串
taskList.push(function(callback){
	let syncStr = "<%= ctx.data %>";
	aries.compile(syncStr, {data:"<p>\"\'</p>"}, (err, renderStr, a, b, c, isUseCache) => {
			if(err){
				 console.log(err.stack)
			}
			console.log(renderStr)
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr === "&lt;p&gt;&quot;&apos;&lt;/p&gt;");

		   aries.compile(syncStr, {data:"<p>\"\'</p>"}, (err, renderStr, a, b, c, isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "&lt;p&gt;&quot;&apos;&lt;/p&gt;");
			   console.log("escape sync str test ok");
			   callback();
			})
	})
});


// //测试渲染字符串
taskList.push(function(callback){
	let syncStr = "<%- ctx.data %>";
	aries.compile(syncStr, {data:"123"}, (err, renderStr, a, b, c, isUseCache) => {
			if(err){
				 console.log(err.stack)
			}
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr === "123");

		   aries.compile(syncStr, {data:"1234"}, (err, renderStr, a, b, c, isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "1234");
			   console.log("sync str test ok");
			   callback();
			})
	})
});


// //测试渲染异步模板字符串
taskList.push(function(callback){
	let syncStr = "<%? setTimeout(function(){ctx.data='123';aries();},ctx.timeout) %><%- ctx.data %>";
	aries.compile(syncStr, {timeout:1000}, function(err, renderStr, a, b, c, isUseCache){
			if(err) {
				 console.log(err.stack)
			}
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr === "123");

		   aries.compile(syncStr, {timeout:1000}, (err, renderStr, a, b, c, isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "123");	
			   console.log("async str test ok");
			   		callback();
			})
	})
});



// //测试同步include文件功能
taskList.push(function(callback){
	let syncStr = "<% include sync.html %>";
	aries.compile(syncStr, {data:"123"}, (err, renderStr, a, includeIds, includeFs, isUseCache) => {
		   
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr === "123");
		   assert(includeFs.length === 1)
		   assert(includeFs[0] === "sync.html")


		   aries.compile(syncStr, {data:"1234"}, (err, renderStr, a, includeIds, includeFs, isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "1234");	
			   console.log("include test ok");		
			   callback();
			})
	})
});


// //测试异步includeId文件功能
taskList.push(function(callback){
	let syncStr = "<% includeId async %>";
	aries.compile(syncStr, {data:"123"}, function(err, renderStr, a, includeIds, includeFs, isUseCache){
			
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr === "123");
		   
		   assert(includeIds.length === 1)
		   assert(includeIds[0] === "async")

		   aries.compile(syncStr, {data:"123"}, (err, renderStr, a, b, c, isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "123");	
			   console.log("includeId test ok");		
			   callback();
			})
	})
});




// // //测试include嵌套
taskList.push(function(callback){
	let syncStr = "<% include incLv1.html %>";
	aries.compile(syncStr, {data:"123"}, (err, renderStr, a, includeIds, includeFs, isUseCache) => {
			if(err){
				console.log(err.stack)
			}
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr === "123");

		   assert(includeFs.length === 4)
		   assert(includeFs[0] === "incLv1.html")
		   assert(includeFs[1] === "incLv2.html")
		   assert(includeFs[2] === "incLv3.html")
		   assert(includeFs[3] === "incLv4.html")

		  
		   aries.compile(syncStr, {data:"123"}, (err, renderStr, a, b, c, isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "123");	
			   console.log("include embed test ok");		
			   callback();
			})
	})
});



// // //测试include嵌套
taskList.push(function(callback){
	let syncStr = "<% include incLv1.html %>";
	
	aries.includes(syncStr, (err, includeIds, includeFs) => {
		   if(err){
				console.log(err)
		   }
		   assert(!err);

		   assert(includeFs.length === 4)
		   assert(includeFs[0] === "incLv1.html")
		   assert(includeFs[1] === "incLv2.html")
		   assert(includeFs[2] === "incLv3.html")
		   assert(includeFs[3] === "incLv4.html")

		   console.log("include embed only include test ok");	
		   callback();
		
	})
});


// //测试 if else 语句
taskList.push(function(callback){
	let syncStr = "<% if(false){ %><%- ctx.data %><%} else {%><%- ctx.data %><%}%>";
	aries.compile(syncStr, {data:"123"}, (err, renderStr, a, b, c, isUseCache) => {
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr === "123");

		   aries.compile(syncStr, {data:"1234"}, (err, renderStr, a, b, c, isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "1234");
			   console.log("if else test ok");
			   callback();
			})
	})
});

// //测试 for 语句
taskList.push(function(callback){
	let syncStr = "<% for(var i=1;i<ctx.data;i++){%><%- i %><%}%>";
	aries.compile(syncStr, {data:10}, (err, renderStr, a, b, c, isUseCache) => {
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr === "123456789");

		   aries.compile(syncStr, {data:5}, (err, renderStr, a, b, c, isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "1234");
			   console.log("for loop test ok");		
			   callback();
			})
	})
});




//测试获取模版文件，相对路径
taskList.push(function(callback){
	let tplPath = "async/async.html";
	aries.compileFile(tplPath, {data:10}, (err, renderStr, a, b, c, isUseCache) => {
		   if(err){
		   		console.log(err.stack)
		   }
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr === "20");

		   aries.compileFile(tplPath, {data:20}, (err, renderStr, a, b, c, isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "40");
			   console.log("tpl async tpl test ok");		
			   callback();
			})
	})
});


//测试获取模版文件，绝对路径
taskList.push(function(callback){
	let tplPath = path.join(__dirname,"async", "async.html");
	console.log("tplPath abs path "+tplPath)
	aries.compileFile(tplPath, {data:10}, (err, renderStr, a, b, c, isUseCache) => {
		   assert(!err);
		   assert(isUseCache);//已经缓存
		   assert(renderStr === "20");

		   aries.compileFile(tplPath, {data:20}, (err, renderStr, a, b, c, isUseCache) => {
			   assert(!err);
			   assert(isUseCache);
			   assert(renderStr === "40");
			   console.log("tpl abs path tpl test ok");		
			   callback();
			})
	})
});

//测试include模板传参
taskList.push(function(callback){
	let syncStr = "<% ctx.data = 1%><% includeId paramLv1?data=a %>|<%= ctx.data %>";
	aries.compile(syncStr, {}, function(err, renderStr, a, includeIds, includeFs, isUseCache){
			
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr.trim() === "a|a");
		   console.log("tpl includeId param test ok");		
		   callback();
	})
});


//测试includefile模板传参
taskList.push(function(callback){
	let syncStr = "<% ctx.data = 1%><% include paramLv1.html?data=a %>|<%= ctx.data %>";
	aries.compile(syncStr, {}, function(err, renderStr, a, includeIds, includeFs, isUseCache){
			
		   assert(!err);
		   assert(!isUseCache);
		   assert(renderStr.trim() === "a|a");
		   console.log("tpl include file param test ok");		
		   callback();
	})
});



async.series(taskList, function(err){
	if(err){
		console.log(err);
		return
	}
	console.log("all test ok");
	process.exit(0)
})