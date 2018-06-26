export const combineFunction = a => b => function(c){return b(a(c))};

export const combineKernel = gpu => a => b  => (
    gpu.combineKernels(a,b,combineFunction(a)(b))
);

export const promiseKernel = kernel => baseParam => new Promise((resolve,reject)=>{
    let texture = -1;
    let params = [baseParam,...kernel._params];
    texture = kernel(...params);
    if(texture!==-1) {
        resolve(texture);
    } else reject()
});

export const id = a => a;

export const constf = a => () => a;

export const call = (...params) => f => f(...params);