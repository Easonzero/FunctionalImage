import {combineFunction} from './superfunction';
import {
    add, multi, divInt
} from './math';

const combineKernel = gpu => a => b => (
    gpu.combineKernels(a, b, combineFunction(a)(b))
);

const promiseKernel = kernel => params => new Promise((resolve, reject) => {
    let texture = -1;
    texture = kernel(...params);
    if (texture !== -1) {
        resolve(texture);
    } else reject()
});

const targetConvert = target => inputs => f =>
    target.isNumber ?
        `return ${f(inputs.map(call()))}` : `this.color(${target.colorDist.map(
            (x, i) => x ? `${f(inputs.map(call(i)))}` : inputs[0](i))})`;
const inputConvert = isNumber => inputName => useri =>
    isNumber ? inputName : isUndefined(useri) ? [0, 1, 2, 3].map(i => `${inputName}[${i}]`) : `${inputName}[${useri}]`;

const inputType = inputs => inputs.map(input=>input.type)
const inputSize = inputs => inputs.map(input=>input.size)
const inputMinSize = inputs => inputs.reduce((r, input)=>{
    let w = input.size[0], h = input.size[1];
    if(r[0] > w) r[0] = w;
    if(r[1] > h) r[0] = h;
}, inputs[0].size)

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
            .setGraphical(!target.isNumber)

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
            apMapping(inputType(inputs))(target)(this)
        )
            .setOutput(inputMinSize(inputs))
            .setFunctions([f])
            .setOutputToTexture(true)
            .setGraphical(!target.isNumber)

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
    }

const convoluteMapping = aIsNumber => bIsNumber => new Function('a', 'b',
    `let beginX = this.thread.x * this.constants.step;
     let beginY = this.thread.y * this.constants.step;
     let sum = ${aIsNumber ? 'b' : 'a'}[beginY][beginX];
     sum = ${aIsNumber && bIsNumber ? '0' : 'vec4(0,0,0,0)'}
     for(let y=0;y<this.constants.sizeY;y++)
     for(let x=0;x<this.constants.sizeX;x++)
        sum += b[y][x] *
            a[beginY+y][beginX+x];
     ${aIsNumber && bIsNumber ? 'return sum;' :
        'this.color(sum[0],sum[1],sum[2],1)'}`
);

const convolute = gpu =>
    step => inputs => target =>
        gpu.createKernel(convoluteMapping(inputs[1].type == TYPE_NUMBER)(inputs[0].type == TYPE_NUMBER), {
            constants: { sizeX: inputs[0].size[0], sizeY: inputs[0].size[1], step: step },
            output: add(divInt(add(inputs[1].size)(multi(inputs[0].size)(-1)))(step))(-1)
        })
            .setOutputToTexture(true)
            .setGraphical(inputs[1].type == TYPE_PIXEL || inputs[0].type == TYPE_PIXEL)

export { combineKernel, promiseKernel, fmap, application, bind, convolute}