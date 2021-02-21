const another = require('./anotherFile')

function aFnInThisFile(){
    console.log('aFnInThisFileConsoleContext');

    //它误以为是第一个another了，怎么办？？
    function haha(){
        this.afninhere= function(){console.log(123)}
    }
    let another = new haha()
    another.afninhere()
}

var a=1;
aFnInThisFile()
another.aFnInAnotherFile();

