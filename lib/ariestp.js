var path  = require('path'),
    fs    = require('fs'),
    util  = require('util'),
	moment  = require('moment'),
	domain  = require('domain'),
    vm    = require('vm'),
	EventEmitter = require('events'),
    atry  = require('./atry.js');

var _escape_table = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'":'&apos;' }
var _escape_reg = new RegExp(/[&<>"']/g);
var _escape_func = function(m) { return _escape_table[m]; }
var _escape = function(s) {
    return typeof(s) != 'string' ? s : s.replace(_escape_reg, _escape_func);
}


function Promise() {
    this.cbs = [];
    this.errbs = [];
  }


Promise.prototype = {
    addCallback: function (cb) {
        this.cbs.push(cb);
    },
    addErrback: function (errb) {
        this.errbs.push(errb)
    },
    emitSuccess: function () {
        for(var i = 0, len = this.cbs.length; i < len; ++i) {
            var cb = this.cbs[i];
            cb.apply(this, arguments);
        }
    },
    // emitError: function (err) {
    //     var called = false;
    //     for(var i = 0, len = this.errbs.length; i < len; ++i) {
    //         var cb = this.errbs[i];
    //         cb.call(this, err);
    //         called = true;
    //     }
    //     if(!called) {
    //         throw(err)
    //     }
    // }
}


//模板缓存
//保存内容为
//{
//	"data": ...
//	"ts":...
//}
var templateCache = {};
// A TemplateEngine holds template factories
// plus a config for all templates
var TemplateEngine = function (config) {
    config = config || {};
    this.path = config.path || process.cwd();
    this.includeId = config.includeId || false;
    this.cacheTime = (config.cacheTime - 0) || 0;
}

//对外暴露接口config
exports.Engine = function (config) {
    return new TemplateEngine(config);
}

TemplateEngine.prototype = {
  
    //获取当天的日期字符串
    getTodayStr:function(){
  		return moment().format("YYYY_MM_DD_HH");
    },
    //设置模板解析缓存
    setCache:function(key, fnList){
  		var todayHourStr = this.getTodayStr()
  		var tmpCache = templateCache[todayHourStr] || {};
  		tmpCache[key] = {
  			"data":fnList,
  			"ts":Date.now(),
  		}
  		//每次自动剔除1小时的模板缓存
  		templateCache = {};
  		templateCache[todayHourStr] = tmpCache;
  },
  //获取模板解析缓存
  getCache:function(key){
  		var todayHourStr = this.getTodayStr();
  		if(!templateCache[todayHourStr] || !templateCache[todayHourStr][key]) return false
  		var now = Date.now();
  		if(now - (templateCache[todayHourStr][key]["ts"]) <= this.cacheTime){
  			return templateCache[todayHourStr][key]["data"]
  		}
  		
  		return false;
  },
  // template constructor with a callback parameter
  template: function (templateStrList, cacheKey, cb) {
      var self = this;
      //console.log(templateStrList, cacheKey, cb)
     
      return self.templateAsync(templateStrList, cacheKey, cb);

      
  },

  // Asynchronous template constructor
  // Returns a promise for a template
  templateAsync: function (templateStrList, cacheKey, cb) {
      var self = this;
      var templatePromise = new Promise();
      templatePromise.addCallback(cb);

      //缓存
  	  var cacheData = this.getCache(cacheKey);
      if(cacheData) {
          process.nextTick(function () {
            templatePromise.emitSuccess(null, cacheData, true);
          });
          return templatePromise;
      }
    
      load(templateStrList, function (fnList) {
            var t = function (te, cacheKey, ctx, tpromise) {

                    var res = new TemplateResponse(te, cacheKey);
                    res.fnList = fnList;
                    res.totalFn = fnList.length;
                    res.exePos = 0;
                    res.ctx = ctx;
					res.codeStr = [];
					
					for(var i=0;i<fnList.length;i++){
						res.codeStr[i] = fnList[i].codeStr || '';
					}
					
                    atry(function() {
                          ctx._escape = _escape; //传入escape函数						  
					
						  vm.runInNewContext(' fnList[res.exePos](ctx, res);', {
								fnList:fnList,
								ctx:ctx,
								res:res,
						  },{
								timeout:5000,
						  })
						                        
                    }).catch(function(err) {
						  var err = err || {}; // 保证err对象有值
						  if(res && res.exePos && fnList[res.exePos] && fnList[res.exePos].codeStr){
								err.codeStr = fnList[res.exePos].codeStr || '';
						  }else{
								err.codeStr = '';
						  }
						  
                          return tpromise.emitSuccess(err);
                    });

                    res.exePos++;//表示执行了一个异步

                    process.nextTick(function () {
                        res.partFinished();
                    })
                    return res;
              };

            // 设置缓存
      	    self.setCache(cacheKey, t);
            process.nextTick(function () {
              templatePromise.emitSuccess(null, t);
            })

      }, function (e) {
            templatePromise.emitSuccess(e)
      });

      return templatePromise;
  },
  
  //Should not be public :)
  // partial: function (filename, res, ctx) {
    // var partialPromise = new Promise();
    // var p = this.templateAsync(filename);
  
    // var partRes;
  
    // if(res) {
      // res.schedule(function (res) {
        // partRes = res;
      // })
    // }
  
    // p.addCallback(function (t) {
      // var partialResponse = t(ctx);

      // partialResponse.addListener("body", function (chunk) {

        // partRes.print(chunk);
      // });
      // partialResponse.addListener("complete", function () {

        // partialResponse.finished = true;
        // partRes.finish();
        // res.partFinished();
        // partialPromise.emitSuccess();
      // });
    // })
    // return partialPromise;
  // }
};

function load(templateStrList, cb, errcb) {


  var srcList = parseAndGenerate(templateStrList[0]);
  var fnList = [];

	for(var i=0;i<srcList.length;i++){
  		try{
    			var fn = vm.runInThisContext(srcList[i], {
    				'timeout':3000,
    			});
  		}catch(e){			
				e.codeStr = srcList[i];				
    			errcb(e);
    			return;
  		}
		fn.codeStr = srcList[i];
      fnList.push(fn);
	}
  return cb(fnList);
}


function TemplateResponse(engine, filename) {
  var self = this;
  EventEmitter.call(this);
  this.engine     = engine;
  this.filename   = filename || "";
  this.p          = [];
  this.returned   = 0;
  this.finished   = false;
  this.exePos     = 0;
}

util.inherits(TemplateResponse, EventEmitter);


var body = {
  print: function () {
      this.p.push.apply(this.p, arguments);
  },
  
  toString: function () {
      return "<a TemplateResponse for "+this.filename+" "+this.finished+">"
  },
  
  finish: function () {
      this.emit("complete");
  },
  
  schedule: function (fn) {
      var part = this._schedule(fn);
      this.p.push(part);
  },
  
  _schedule: function (fn) {
    var self = this;
	//var codeStr = self.codeStr[self.exePos] || '';

    var part = new TemplateResponse(this.engine, this.filename+"->async");
	part.codeStr = self.codeStr[self.exePos] || '';
	self.lastPos = self.exePos;

	
    part.addListener("complete", function () {
		  part.finished = true;
		  self.partFinished();
    })
	
    part.addListener("error", function (err) {
        part.finished = true;
		err.codeStr = self.codeStr[self.lastPos] || '';
        self.partFinished(err);
    })

    atry(function() {
          fn.call(part, part);
    }).catch(function(err) {
		  err.codeStr = self.codeStr[self.lastPos] || '';
          return part.emit("error",err);
    });

    return part;
  },
  
  // partial: function (filename, ctx) {
  //   return this.engine.partial(filename, this, ctx);
  // },
  
  partFinished: function (err) {
    var self = this;
	
  	if(err){
		self.emit("error", err);
		return 
  	}
	
    if(this.returned < this.p.length) {
      var done = this._partFinished(function (chunk) {
        self.emit("body", chunk);
      });
    
      if(done === this.p.length || this.ctx.__hasFinish__ === true) {
          //console.log(this.exePos, this.totalFn)
          //if async fn has been exec,emit complete
          if(this.exePos == this.totalFn || this.ctx.__hasFinish__ === true){
              this.emit("complete");
          }else{
			  try{
					var self = this
					
					vm.runInNewContext('self.fnList[self.exePos](self.ctx, self);;', {
								self:self,
						  },{
								timeout:5000,
						  })
			  
					
			  }catch(err){
					
					err.codeStr = this.fnList[this.exePos]['codeStr'] || '';
					self.emit("error", err);
					return
			  }
              this.exePos++;
              process.nextTick(function () {
                  self.partFinished();
              })
          }
      }
    }
  },
  
  _partFinished: function (cb, start) {
    var p = this.p;

    if(start != null) {
      this.returned = start
    }
    for(var i = this.returned, len = p.length; i < len; ++i) {
      var part = p[i];
      if(!(part instanceof TemplateResponse)) {
        cb(part);
        this.returned++;
      }
      else if(part.finished) {
        part._partFinished(cb, 0)
        this.returned++;
      } else {
        break;
      }
    }
    return i;
  }
};
for(var i in body) {
  TemplateResponse.prototype[i] = body[i];
};

function parseAndGenerate(str) {
  var open   = "<%";
  var close  = "%>";
  var index;
  var dynPart = [];

  // TODO tweak the second replace so that the first can go away (and the later which reverse it)
  var staticParts = str.replace(/[\n\r]/g, "<;;;;>").replace(/<%(.*?)%>/g, function (part, code) {
    dynPart.push(code.replace(/<;;;;>/g, "\n"));
    return "<%%>"
  }).replace(/<;;;;>/g, "\n").replace(/'/g, "\\'").replace(/[\n\r]/g, "\\n\\\n").split(/<%%>/);


  var staticPartsList = [];
  var dynPartList = [];
  var i = 0;
  staticParts.forEach(function(part, index){
      if(!staticPartsList[i]){
        staticPartsList[i] = [];
      }
      if(!dynPartList[i]){
        dynPartList[i] = [];
      }

      var code = dynPart[index];
      if(code != null) {
          if(code.charAt(0) === "-" || code.charAt(0) === "=") {
              staticPartsList[i].push(part)
              dynPartList[i].push(code)
          }
          else if(code.charAt(0) === "?") {
              staticPartsList[i].push(part)
              dynPartList[i].push(code)
              i++;
          }
          else {
            staticPartsList[i].push(part)
            dynPartList[i].push(code)
          }
      }
      else{
        staticPartsList[i].push(part)
      }
  })

  var srcList = [];
  var tempSrc = 'function __template__ (ctx, res) { \r\n'+'\"use strict\"\r\n';

  staticPartsList.forEach(function(staticItemList, j){
      var src = tempSrc;
      var dynPart = dynPartList[j];

      src = staticItemList.reduce(function(src, part, index){
        //console.log(part)

        src = src + "\n res.p.push(\n'" + part + "'\n);\n";
        var code = dynPart[index];
        if(code != null) {
          if(code.charAt(0) === "-") {
            code = code.substr(1);
            src = src + "\n res.p.push(\n"+code+"\n);\n";
          }
          else if(code.charAt(0) === "="){
            code = code.substr(1);
            src = src + "\n res.p.push(ctx._escape(\n"+code+"\n));\n";

          }
          else if(code.charAt(0) === "?") {
            code = code.substr(1);
            src = src + "\n res.p.push(res._schedule(function (res) {var aries = function(){  process.nextTick(function(){res.finish();}) };\n"+code+"\n}));\n"
          }
          else {
            src = src + code
          }
        }
        return src;
      }, src) + "\n return res}__template__;\n";

      srcList.push(src);
  })


  return srcList;
}

// function parseJohnResig(str) {
//   // Stolen from underscore.js http://documentcloud.github.com/underscore/underscore.js
//   // JavaScript templating a-la ERB, pilfered from John Resig's
//   // "Secrets of the JavaScript Ninja", page 83.
//   var src =
//     'function __template__ (ctx, res) {' +
//     'res.p.push(\'' +
//     str
//       .replace(/[\t]/g, " ")
//       .replace(/[\n\r]/g, "<%\n%>\\n")
//       .split("<%").join("\t")
//       .replace(/((^|%>)[^\t]*)'/g, "$1\n")
//       .replace(/\t\-(.*?)%>/g, "',$1,'")
//       .replace(/\t\?(.*?)%>/g, "',res._schedule(function (res) {$1}),'")
//       .split("\t").join("');")
//       .split("%>").join("res.p.push('")
//       .split("\r").join("\\'")
//   + "');return res}__template__;";
  
//   return src;
// }
