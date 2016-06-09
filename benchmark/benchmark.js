var ejs = require('ejs');
var ariestp = require("../");

var ejsTemplate = "<div><h1 class='header'><%- header %></h1><h2 class='header2'><%- header2 %>"+
				  "</h2><h3 class='header3'><%- header3 %></h3><h4 class='header4'><%- header4 %>"+
				  "</h4><h5 class='header5'><%- header5 %></h5><h6 class='header6'><%- header6 %></h6>"+
				  "<ul class='list'><% for (var i = 0, l = list.length; i < l; i++) { %><li class='item'>"+
				  "<%- list[i] %></li><% } %></ul></div>";

var ariesTemplate = "<div><h1 class='header'><%- ctx.header %></h1><h2 class='header2'><%- ctx.header2 %>"+
                  "</h2><h3 class='header3'><%- ctx.header3 %></h3><h4 class='header4'><%- ctx.header4 %>"+
                  "</h4><h5 class='header5'><%- ctx.header5 %></h5><h6 class='header6'><%- ctx.header6 %></h6>"+
                  "<ul class='list'><% for (var i = 0, l = ctx.list.length; i < l; i++) { %><li class='item'>"+
                  "<%- ctx.list[i] %></li><% } %></ul></div>";



var ejsTemplate2 = "<div><h1 class='header'><%= header %></h1><h2 class='header2'><%= header2 %>"+
                  "</h2><h3 class='header3'><%= header3 %></h3><h4 class='header4'><%= header4 %>"+
                  "</h4><h5 class='header5'><%= header5 %></h5><h6 class='header6'><%= header6 %></h6>"+
                  "<ul class='list'><% for (var i = 0, l = list.length; i < l; i++) { %><li class='item'>"+
                  "<%= list[i] %></li><% } %></ul></div>";

var ariesTemplate2 = "<div><h1 class='header'><%= ctx.header %></h1><h2 class='header2'><%= ctx.header2 %>"+
                  "</h2><h3 class='header3'><%= ctx.header3 %></h3><h4 class='header4'><%= ctx.header4 %>"+
                  "</h4><h5 class='header5'><%= ctx.header5 %></h5><h6 class='header6'><%= ctx.header6 %></h6>"+
                  "<ul class='list'><% for (var i = 0, l = ctx.list.length; i < l; i++) { %><li class='item'>"+
                  "<%= ctx.list[i] %></li><% } %></ul></div>";


var sharedVariables = {
    header: "Header",
    header2: "Header2",
    header3: "Header3",
    header4: "Header4",
    header5: "Header5",
    header6: "Header6",
    list: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
}; 


var run_num = 10000;



var ejsTemplateFn = ejs.compile(ejsTemplate);
var now = Date.now();
for (var i=0; i<run_num;i++){
	var s = ejsTemplateFn(sharedVariables);
    //console.log(s)
}
console.log("ejs ",run_num, " time: ", Date.now() - now, " ms");




var now = Date.now();
ariestp.set({"cacheTime":1000*60*60});
var count = run_num
for (var i=0; i<run_num;i++){
    ariestp.compile(ariesTemplate, sharedVariables, function(err, s, useCache){
            //console.log(err,s)
            if(--count <= 0){
                console.log("aries ",run_num," time: ", Date.now() - now, " ms");
            }
    });
}




var ejsTemplateFn = ejs.compile(ejsTemplate2);
var now = Date.now();
for (var i=0; i<run_num;i++){
    var s = ejsTemplateFn(sharedVariables);
    //console.log(s)
}
console.log("ejs2 ",run_num, " time: ", Date.now() - now, " ms");


setTimeout(function(){

	var now = Date.now();
	ariestp.set({"cacheTime":1000*60*60});
	var count2 = run_num
	for (var i=0; i<run_num;i++){
		ariestp.compile(ariesTemplate2, sharedVariables, function(err, s, useCache){
				//console.log(err,s)
				if(--count2 <= 0){
					console.log("aries2 ",run_num," time: ", Date.now() - now, " ms");
				}
		});
	}
},5000)

