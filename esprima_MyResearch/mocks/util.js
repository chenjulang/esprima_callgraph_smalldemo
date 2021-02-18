const fs = require("fs");
const path = require("path");

const readFile = (filename) => 
{   
    return new Promise((res)=>{
        let result= fs.readFileSync(filename, "utf-8");
        res(result)
    })
}
const writeFile = (filename,str)=>{
    return new Promise(async(res)=>{
         let result= fs.writeFile(filename, str,(err)=>{
            if(err) {
                return console.log(err);
            }
            res("The file was saved!")
            console.log("The file was saved!");
         });
    })
}


const appendFile =(filename,str)=>{
    fs.appendFile(filename,str, (error)  => {
        if (error) return console.log("追加文件失败" + error.message);
        console.log("追加成功");
      });
}

module.exports ={
    readFile,
    appendFile,
    writeFile
}