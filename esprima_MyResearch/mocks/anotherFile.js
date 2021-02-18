function aFnInAnotherFile() {
  console.log('aFnInAnotherFileConsoleContext')
}
function fn2InAnotherFile(){
  console.log(123)
}

fn2InAnotherFile()
console.log(123)

module.exports = {
  aFnInAnotherFile
}