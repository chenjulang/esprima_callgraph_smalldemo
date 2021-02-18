const another = require('./anotherFile')

function aFnInThisFile(){
    console.log('aFnInThisFileConsoleContext')
}

var a=1;
aFnInThisFile()
another.aFnInAnotherFile();

