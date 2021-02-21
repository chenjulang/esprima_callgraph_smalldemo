// @ts-ignore
const { types } = require('babel-core');
// @ts-ignore
const { log } = require('console');
const path= require('path')
const fs = require('fs')
// @ts-ignore
const esprima = require('esprima');
// @ts-ignore
const esprima_Utils = require('esprima-ast-utils')
const execSync = require('child_process').execSync;
const esrefactor = require('esrefactor')

// var ctx = new esrefactor.Context('var x = 42; y = x * 2; z = x / 2');
// var id = ctx.identify(17);
// var code = ctx.rename(id, 'answer');
// var code2 = ctx.rename(id, 'answer2');

let util = require('./mocks/util');

const Types={
    "CallExpression":"CallExpression",
    "Identifier":"Identifier",
    "MemberExpression":"MemberExpression",
    "VariableDeclarator":"VariableDeclarator",
}

//目标结果
let requires = []//外部导入的定义,如{fromfilepath,varname,targetfilepath,start}
//要通过esrefactor记录一下位置信息
let calls = []//本地模块调用,如{fromfilepath,name,targetfilepath}
let membercalls=[]//系统函数+外部函数的调用，如{object:'console',property:'log'}

//1.作用域问题如何解决？
//要分析各层次的块都定义了什么东西，然后用就近原则？

analyzeModule('./mocks/file.js','./mocks/file.js',true)
// jquery-2.1.0-analysis copy.js
// analyzeModule('./mocks/jquery-2.1.0-analysis copy.js','./mocks/jquery-2.1.0-analysis copy.js',true)


// @ts-ignore
function collectImportVariables(node,parent,property,index,depth,currentanalyzePath,ctx){
    if(node.type == Types.VariableDeclarator){//这种方法找定义肯定有问题的，同名的变量会隐藏问题
        if(node.init ===null)return;

        if(node.id.type==Types.Identifier &&
            node.init.type == Types.CallExpression &&
            node.init.callee.name == "require")
            {
                let requirevarname = node.id.name,
                fromfilepath=currentanalyzePath,
                targetfilepath=node.init.arguments[0].value;
                let start = node.id.range[0];

                requires.push({fromfilepath,targetfilepath,requirevarname,start})
            }
    }
}

// @ts-ignore
function analyzeFunctions(node,parent,property,index,depth,currentanalyzePath,ctx){
    if(node.type == Types.CallExpression){
        if(node['callee']['type']==Types.MemberExpression){//系统函数+外部文件函数
            let variablename = node['callee']['object']['name']
            let externalfunctionName = node['callee']['property']['name'];
            let fromfilepath = currentanalyzePath,
            targetfilepath = null;
            let start = node['callee']['object']['range'][0],
            ctxId = ctx.identify(start);
            let declarationStart = ctxId.declaration? ctxId.declaration.range[0] : null; 
            requires.forEach((ele)=>{ 
                if(ele.requirevarname == variablename 
                    && ele.start == declarationStart)
                {
                    targetfilepath=ele.targetfilepath
                } 
            })
            5
            if(targetfilepath===null){targetfilepath = variablename}
            membercalls.push(
                {fromfilepath,targetfilepath,externalfunctionName}
            )
        }

        if(node['callee'].type == Types.Identifier &&
        node['callee'].name != "require"){//本文件函数
            let localfunctionName = node['callee']['name'],
            fromfilepath = currentanalyzePath,
            targetfilepath = currentanalyzePath;
            calls.push({fromfilepath,targetfilepath,localfunctionName})
        }

        

    }
}

//'./mocks/file.js','./anotherFile'=>'./mocks/anotherFile'
let localizePath = (rawpath,filepath)=>{
    let dir1 = path.parse(rawpath).dir;
    let res= path.join(dir1,filepath)+'.js'
    return  res;
}


let anaylzeTotal = 1;
function analyzeModule(initpath,currentanalyzePath,init=false){
    let localpath;    
    if(init==false){
        localpath = localizePath(initpath,currentanalyzePath)
    }else if(init == true){
        localpath = initpath = currentanalyzePath;
    }

    let ctx;
    // var id = ctx.identify(17);

    util.readFile(localpath)
    .then((es6)=>{

        ctx = new esrefactor.Context(es6);

        // @ts-ignore
        let tree = esprima_Utils.parse(es6)
        // aFnInThisFile

        if(init)util.writeFile('./mocks/result.json',JSON.stringify(tree));

        // @ts-ignore
        esprima_Utils.traverse(tree,(node,parent,property,index,depth)=>{
            collectImportVariables(node,parent,property,index,depth,currentanalyzePath,ctx)
        },true)

        // @ts-ignore
        esprima_Utils.traverse(tree,(node,parent,property,index,depth)=>{
            analyzeFunctions(node,parent,property,index,depth,currentanalyzePath,ctx)
            
            if(node.init ===null)return;
            if(node.type == Types.VariableDeclarator){
                if(node.id.type==Types.Identifier &&
                    node.init.type == Types.CallExpression &&
                    node.init.callee.name == "require")//分析模块
                    {
                        let value=node.init.arguments[0].value;
                        anaylzeTotal++;
                        analyzeModule(initpath,value)                        
                    }
            }
        },true)

        anaylzeTotal--;
        if(anaylzeTotal==0){
            return true
        }
        
    }).catch((err)=>{console.log(err);})
    .then((res)=>{
        if(res==true){
            createDotAndPng()
        }
    })
}

    // `[${currentFile}]${fn}`
    // @ts-ignore
    const mapTupleToString = t => `"${t[0]}" -> "${t[1]}"`;
    function makeTuples(){
        let tuples=[];
        calls.forEach((ele)=>{
            tuples.push('"['+ele.fromfilepath+']" -> "['+ele.targetfilepath+']'+ele.localfunctionName+'"');
        })
        membercalls.forEach((ele)=>{
            tuples.push('"['+ele.fromfilepath+']" -> "['+ele.targetfilepath+']'+ele.externalfunctionName+'"');
        })
        return tuples;
    }
    function createDotAndPng(){
        let tuples= makeTuples();

        const stream = fs.openSync('callgraph.dot', 'w');
        const callsString = tuples.join(`\n`)
        const data = `
digraph test{
overlap=scalexy;
${callsString}
}`;
        fs.writeSync(stream, data);
        
        execSync('dot -Tpng -o callgraph.png callgraph.dot')
        console.log("Success! Check callgraph.png")
    }






// let tree = esprima.parseModule(es6, 
        //     {range:true,loc:true,tokens:true}, 
        //     (node, meta)=>
        //     {
        //         if(node.type == Types.CallExpression){
        //             if(node['callee'].type == Types.Identifier &&
        //             node['callee'].name == "require"){//分类：导入模块
        //                 console.log(1);
        //                 // let aa = Object.getOwnPropertyNames(node);
        //                 // let raw = node['callee']['arguments']['raw']//外部文件相对路径
        //             }
        //         }
        //     }
        // )