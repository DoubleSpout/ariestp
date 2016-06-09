## A Async Template for Node.js, Use ejs template language [![Build Status](https://travis-ci.org/DoubleSpout/ariestp.svg?branch=master)](https://travis-ci.org/DoubleSpout/ariestp)

##Install

   npm install ariestp

##SimpleExample

	"use strict";
	const aries = require("ariestp");
	const fs = require("fs");
	const http = require("http");
	
	const asyncTpl = `<%?
		ctx.thinking;
		setTimeout(function () {
		  ctx.thinking = "1 seconde later"
		  aries();      
		}, 1000);
		
		%>
		<%- ctx.thinking %>
		
		<%?
		ctx.http.get('http://www.baidu.com/', (res) => {
			ctx.status =  res.statusCode;
			res.resume();
			aries();
		}).on('error', (e) => {
		  ctx.status = 500;
		  aries();
		});
		%>
		<%- ctx.status %>
		`;
	
	aries.compile(asyncTpl, {http:http}, (err, renderStr, isUseCache) => {
			if(err) return console.log(err);
			console.log(renderStr);
	});
	   

##API
   
## aries.set(opt)
	
	path: __dirname, 	// template find root path
	includeId: function,		// ex:  (templateId, cb) => return fs.readFile(path.join(__dirname,templateId+'.html'), cb);
	cacheTime:10000,	// 编译缓存时间，单位：毫秒

## aries.compileFile(filepath, ctx, cb)
	
	filepath:"async_example.html"	// template relate to root path
	ctx: {}							// template ctx object
	cb: function					// ex:  (err, renderStr, isUseCache) => {}

	
## aries.compile(templateStr, ctx, cb)
	
	templateStr:"<%= ctx.xxxx %>"	// template relate to root path
	ctx: {}							// template ctx object
	cb: function					// ex:  (err, renderStr, isUseCache) => {}



## Template Language

		<!DOCTYPE html>
		<html lang="zh_CN" class="html-">
		<body>
			<!-- test let fature -->	
			<% let testLet = "let"  %>
			<h4>aries is support that: <%= testLet %></h4>

			<!-- test const fature	 -->
			<% const testConst = "const";  %>
			<h4>aries is support that: <%= testConst %></h4>

			<!-- test template string fature -->	
			<% let tempString = "string"; %>
			<% let templateString = `template ${tempString} `;%>
			<h4>aries is support that: <%= templateString %></h4>	

			<!-- test string.raw string fature -->	
			<% var stringRaw = String.raw({ raw: 'srn.a ' }, 't', 'i', 'g', 'r', 'w'); %>
			<h4>aries is support that: <%= stringRaw %></h4>	

			<!-- test Symbol fature -->	
			<% if( Symbol.for("bar") === Symbol.for("bar") ){ %>
				<h4>aries is support that: <%= "Symbol" %></h4>	
			<% } %>

			<!-- test map fature -->	
			<% var m = new Map(); %>
			<% var o = {p: "Hello World"};%>
			<% m.set(o, "map"); %>
			<% let testMap = m.get(o); %>
			<h4>aries is support that: <%= testMap %></h4>	

			<!-- <%= ctx.fsdsdfsdfsd %> -->	
			<% function* helloWorldGenerator() { %>
				<% yield 'Generator'; %>
				<% return 'ending'; %>
			<% } %>
			<% let hw = helloWorldGenerator(); %>
			<% let testGenerator = hw.next().value; %>
			<h4>aries is support that: <%= testGenerator %></h4>	

			<!-- test arrow functions fature -->	
			<% let testArrowFunction = ""; %>
			<% ["arrow","fuction"].forEach((x) => { %>
				<% testArrowFunction += ' ' +x; %>
			<% })%>
			<h4>aries is support that: <%= testArrowFunction %></h4>
			
			<!-- test for .. of fature -->
			<% var str = ''; %>
			<% for (let item of 'for...of') { %>
				<% str += item; %>
			<% } %>
			<h4>aries is support that: <%= str %></h4>
			
			<!-- test for .. of fature -->
			<% include "foot.html" %>
			
			
			<!-- test for .. of fature ,includeId and transfer param, in foot tpl, use ctx.param1 and ctx.param2 to get it-->
			<% includeId "foot?param1=1&param2=2" %>
			
		</body>
		</html>

	
## MIT

```
Copyright (c) 2013 wu zhonghua <snoopyxdy@gmail.com>

The MIT License

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```