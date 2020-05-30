/*
 * @Author: your name
 * @Date: 2020-05-30 14:20:21
 * @LastEditTime: 2020-05-30 17:44:24
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \my-project\mykoa.js
 */ 
const http = require('http');
const path = require('path');
// NOTE:合并所有中间件,参考koa-compose
function compose(middleware) {
  return (ctx) => {
    return dispatch(0);
    function dispatch(i){
      let fn = middleware[i];
      if (!fn) {
        return Promise.resolve();
      }
      return Promise.resolve(fn(ctx, dispatch.bind(null, i+1)));
    }
  };
}

// NOTE:简单的路由, POST需要配套解析请求体
class Router{
  constructor(){
    this.routeMapGet = {};
    this.routeMapPost = {};
  }
  get(paths, ...callback) {
    this.routeMapGet[paths] = compose(callback);
  }
  post(paths, ...callback) {
    this.routeMapPost[paths] = compose(callback);
  }
  routes(){
    return async (ctx, next) => {
      const { method, url } = ctx.request;
      switch (method) {
        case "GET": {
          const handle = this.routeMapGet[url];
          if(!handle){
            return await next();
          }
          await handle(ctx);
          return await next();
        }
        case "POST": {
          const handle = this.routeMapPost[url];
          if(!handle){
            return await next();
          }
          await handle(ctx);
          return await next();
        }
        default:
         await next()
      }
    }
  }
}

// 简单的模板渲染
function template(root){
  const fs = require('fs');
  const path = require("path")
  const util = require('util');
  return async (ctx, next)=>{
    async function render(rel, options = {}){
      const paths = path.join(root, rel);
      console.log(paths)
      if(!fs.existsSync(paths)) {
        throw new Error('views template not found');
      }

      let str = await util.promisify(fs.readFile)(paths);
      str = str.toString();
      for (let item in options) {
        str = str.replace(`{{${item}}}`, options[item]);
      }
      str = str.replace(/\{\{.*?\}\}/img,'');
      this.body = str;
      this.console = {};
    }
    ctx.render = render;
    await next();
  }
}


// NOTE：模拟koa
class Koa{
  constructor(){
    this.middleware = [];
    this.use = this.use.bind(this);
    this.listen = this.listen.bind(this);
    this.callback = this.callback.bind(this);
  }
  use(handle){
    this.middleware.push(handle);
  }
  listen(...args){
    const server = http.createServer(this.callback);
    this.task = compose([this.default,...this.middleware]);
    server.listen(...args);
    return server;
  }
  callback(request, response){
    const ctx = { request, response };
    this.task(ctx);
  }
  /**
   * 前置中间件
   *
   * @memberof Koa
   */
  async default(ctx, next){
    ctx.status = 200;
    ctx.body = 'koa';
    await next();
    if(!ctx.body || ctx.status === 404) {
      const status = ctx.status ;
      const body = ctx.body||""
      return ctx.response.end(`status: ${status} ${body}`); 
    }

    ctx.response.statusCode = ctx.status;
    ctx.response.end(ctx.body, ctx.encode||"utf8");
  }
}


/**
 * 以下为初始化应用
 */

const app = new Koa();
const router = new Router();
router.get('/', async (ctx)=>{
  await ctx.render('index.html',
   { 
     name:"hello koa",
     desc:"Front end Engineer",
     birthday:"1994-9-20",
     like: "coding"
    });
})

router.get('/page2', async (ctx)=>{
  await ctx.render('page2.html', { name:"render in my template1" });
})
router.get('/page3', async (ctx)=>{
  await ctx.render('page3.html', { name:"render in my template2" });
})

router.get('/page4', async (ctx)=>{
  await ctx.render('page4.html', { name:"render in my template3" });
})

router.get('/page5', async (ctx)=>{
  await ctx.render('page5.html', { name:"render in my template4"});
})


router.get('/get/page', async (ctx)=>{
  ctx.body = "<h3>hellow </h3>"
})

// NOTE: 简单的日志中间件
app.use(async (ctx, next)=>{
  const { method, url } = ctx.request;
  await next();
  console.log(`[method]:${method}  -  ${new Date()}   ${url}`);
});

// 模板引擎
app.use(template(path.join(__dirname,'views')));
app.use(router.routes());

app.listen(8080, ()=>{
  console.log("server is running");
})


process.on("uncaughtException",(error)=>console.error(error));
process.on('unhandledRejection',(error)=>console.error(error));