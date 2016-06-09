	"use strict";
	const aries = require("./index.js");
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