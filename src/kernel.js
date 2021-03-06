import {call, combine} from './superfunction';
import {add, multi, divInt, div} from './math';
import {convertCanvasToImage, genParamsName, isUndefined, modifyVector} from "./utils";
import {TYPE_PIXEL,TYPE_NUMBER,TARGET_BASE} from "./const";

// functions which operation kernels

const combineKernel = gpu => (...kernels) => (
    gpu.combineKernels(...kernels, combine(...kernels.reverse()))
);

const promiseKernel = gpu => copyToImage => kernel => (...params) => new Promise((resolve, reject) => {
    let result = -1;
    result = kernel(...params);
    if (result !== -1) {
        if (copyToImage)
            result = convertCanvasToImage(gpu._canvas)
        resolve(result);
    } else reject()
});

const combinePromiseKernels = promise_kernels => promise_kernels.reduce((r,promise_kernel)=>r.then(promise_kernel));

// functions which map function to kernel

const targetConvert = target => inputs => f =>
    target.isNumber ?
        `return ${f(inputs.map(call()))}` : `this.color(${target.colorDist.map(
            (x, i) => x ? `${f(inputs.map(call(i)))}` : inputs[0](i))})`;

const targetNameConvert = target =>
    target.isNumber ? 'N' : target.colorDist.map((x,i) => x ? TARGET_BASE[i+1] : x)
        .filter(x => x).join(',');

const accConvert = target => inputs => f =>
    target.isNumber ?
        `N = ${f(inputs.map(call()))}` :
        target.colorDist.map((x,i) => x ? TARGET_BASE[i+1] : x)
            .filter(x => x).map(x => `${x} = ${f(x,inputs.map(call(TARGET_BASE.indexOf(x)-1)))}`).join(';');

const targetAccConvert = target => inputs =>
    target.isNumber ?
        `return N` : `this.color(${target.colorDist.map(
        (x,i) => x ? TARGET_BASE[i+1] : inputs[0](i))})`;

const inputConvert = isNumber => inputName => useri =>
    isNumber ? inputName : isUndefined(useri) ? [0, 1, 2, 3].map(i => `${inputName}[${i}]`) : `${inputName}[${useri}]`;

const inputType = inputs => inputs.map(input=>input.type);
const inputSize = inputs => inputs.map(input=>input.size);
const inputMinSize = inputs => inputs.reduce((r, input)=>{
    let w = input.size[0], h = input.size[1];
    if(r[0] > w) r[0] = w;
    if(r[1] > h) r[0] = h;
    return r;
}, inputs[0].size);

const mapMapping = input => target => f => new Function('functor',
    `const input = functor[this.thread.y][this.thread.x];
    ${targetConvert(target)
        ([inputConvert(input === TYPE_NUMBER)('input')])
        (inputs => `${f.name}(${inputs})`)}`
);

const fmap = gpu =>
    f => inputs => target =>
        gpu.createKernel(mapMapping(...inputType(inputs))(target)(f))
            .setOutput(inputMinSize(inputs))
            .setFunctions([f])
            .setOutputToTexture(true)
            .setGraphical(!target.isNumber);

const apMapping = inputs => target => f => {
    let params = genParamsName(inputs.length);
    return new Function(...params,
        `${params.map((param, i) =>
            `const input${i} = ${param}[this.thread.y][this.thread.x];`).join('\n')}
        ${targetConvert(target)
            (inputs.map((input, i) => inputConvert(input === TYPE_NUMBER)(`input${i}`)))
            (inputs => `${f.name}(${inputs})`)}`
    );
};

const application = gpu => 
    f => inputs => target =>
        gpu.createKernel(
            apMapping(inputType(inputs))(target)(f)
        )
            .setOutput(inputMinSize(inputs))
            .setFunctions([f])
            .setOutputToTexture(true)
            .setGraphical(!target.isNumber);

const bindMapping = input => target => f => new Function('functor',
    `let x = floor(this.thread.x/this.constants.sizeX);
     let y = floor(this.thread.y/this.constants.sizeY);
     let offsetX = this.thread.x%this.constants.sizeX;
     let offsetY = this.thread.y%this.constants.sizeY;
     let input = functor[y][x];
    ${targetConvert(target)
        ([inputConvert(input === TYPE_NUMBER)('input')])
        (inputs => `${f.name}(${inputs},offsetX,offsetY)`)}
    `
);

const bind = gpu => 
    bindSize => f => inputs => target => {
        let size = inputMinSize(inputs);
        modifyVector(size)(multi(bindSize)(size));

        return gpu.createKernel(bindMapping(...inputType(inputs))(target)(f), {
            constants: { sizeX: bindSize[0], sizeY: bindSize[1] },
            output: size
        })
            .setFunctions([f])
            .setOutputToTexture(true)
            .setGraphical(!target.isNumber);
    };
const joinMapping = input => target => f => new Function('functor',
    `let beginX = this.thread.x*this.constants.sizeX;
     let beginY = this.thread.y*this.constants.sizeY;
     let first_input = functor[beginX][beginY];
     let N = 0,R = 0,G = 0,B = 0,A = 0;
     for(let y=0;y<this.constants.sizeY;y++)
     for(let x=0;x<this.constants.sizeX;x++){
        let input = functor[beginY+y][beginX+x];
        ${accConvert(target)
    ([inputConvert(input === TYPE_NUMBER)('input')])
    ((target,inputs) => `${f.name}(${target},${inputs},x,y)`)}
     }
     ${targetAccConvert(target)([inputConvert(input === TYPE_NUMBER)('first_input')])}
    `
);

const join = gpu =>
    joinSize => f => inputs => target => {
        let size = inputMinSize(inputs);
        modifyVector(size)(divInt(size)(joinSize));
        return gpu.createKernel(joinMapping(...inputType(inputs))(target)(f), {
            constants: { sizeX: joinSize[0], sizeY: joinSize[1] },
            output: size
        })
            .setFunctions([f])
            .setOutputToTexture(true)
            .setGraphical(!target.isNumber);
    };

const convoluteMapping = aIsNumber => isNumber => new Function('a', 'b',
    `let beginX = this.thread.x * this.constants.step;
     let beginY = this.thread.y * this.constants.step;
     let sum = ${aIsNumber?'b':'a'}[beginY][beginX];
     sum = ${isNumber ? '0' : 'vec4(0,0,0,0)'}
     for(let y=0;y<this.constants.sizeY;y++)
     for(let x=0;x<this.constants.sizeX;x++)
        sum += b[y][x] *
            a[beginY+y][beginX+x];
     ${isNumber? 'return sum;' :
        'this.color(sum[0],sum[1],sum[2],1)'}`
);

const convolute = gpu =>
    step => inputs => target =>
        gpu.createKernel(convoluteMapping(inputs[1].type === TYPE_NUMBER)(target.isNumber), {
            constants: { sizeX: inputs[1].size[0], sizeY: inputs[1].size[1], step: step },
            output: add(divInt(add(inputs[0].size)(multi(inputs[1].size)(-1)))(step))(-1)
        })
            .setOutputToTexture(true)
            .setGraphical(!target.isNumber);

export {
    combineKernel, combinePromiseKernels, promiseKernel,
    fmap, application, bind, join, convolute
}