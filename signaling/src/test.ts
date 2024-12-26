const myOtherFunc = () => {
    console.log("from non exported func");
}

const myFunc = () => {
    myOtherFunc();
    console.log("Hello World 2");
}

export {
    myFunc
}