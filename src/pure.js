import {
    anonymous2named,
    arrow2anonymous,
    isFunction,
    isArray,
    is2DArray,
    isUndefined,
    convertCanvasToImage,
    genParamsName,
    calParamsLength
} from "./utils";

import {
    combineFunction,
    combineKernel,
    promiseKernel,
    call
} from "./superfunction";

import {
    TYPE_FUNCTION,
    TYPE_PIXEL,
    TYPE_NUMBER
} from "./const";

const targetBase = ['N','R','G','B','A'];

const targetRemapping = (target) => {
    let [isNumber,...colorDist] = targetBase.map(c=>target.toUpperCase().includes(c));
    return {isNumber,colorDist};
};

const targetConvert = target => inputs => f =>
    target.isNumber ?
        `return ${f(inputs.map(call()))}` : `this.color(${target.colorDist.map(
            (x,i)=> x ? `${f(inputs.map(call(i)))}` : inputs[0](i))})`;

const inputConvert = isNumber => inputName => useri =>
    isNumber ? inputName : isUndefined(useri) ? [0,1,2,3].map(i=>`${inputName}[${i}]`):`${inputName}[${useri}]`;

const mapMapping = input => target => f => new Function('functor',
    `const input = functor[this.thread.y][this.thread.x];
    ${targetConvert(target)
    ([inputConvert(input===TYPE_NUMBER)('input')])
    (inputs=>`${f.name}(${inputs})`)}`
);

const fmap = gpu => function(f,target='N'){
    f = combineFunction(arrow2anonymous)(anonymous2named)(f);
    target = targetRemapping(target);
    let input = this._outputType;

    let newKernel = gpu.createKernel(mapMapping(input)(target)(f))
        .setOutput(this._size)
        .setFunctions([f])
        .setOutputToTexture(true)
        .setGraphical(!target.isNumber);

    newKernel._params = [];

    if(this._kernels.length === 0||input===TYPE_PIXEL)
        this._kernels.unshift(newKernel);
    else{
        let oldKernel = this._kernels.shift();
        this._kernels.unshift(
            combineKernel(gpu)
            (oldKernel)(newKernel)
        );
    }

    this._outputType = target.isNumber?TYPE_NUMBER:TYPE_PIXEL;

    return this;
};

const apMapping = inputs => target => f => {
    let params = genParamsName(inputs.length);
    return new Function(...params,
        `${params.map((param,i)=>
            `const input${i} = ${param}[this.thread.y][this.thread.x];`).join('\n')}
        ${targetConvert(target)
        (inputs.map((input,i)=>inputConvert(input===TYPE_NUMBER)(`input${i}`)))
        (inputs=>`${f.name}(${inputs})`)}`
    );
};

const ap = gpu => function(a){
    let size;
    if(is2DArray(a)||!isUndefined(a.output)) {
        a._outputType = TYPE_NUMBER;
        size = a.size?a.size:[a[0].length, a.length];
    } else {
        a._outputType = TYPE_PIXEL;
        size = [a.width,a.height];
    }

    if(!isUndefined(this._size)&&(
        this._size[0] !== size[0] ||
        this._size[1] !== size[1]
    )){
        console.error(`the size of param can't match!`);
        return ;
    }

    this._size = size;

    if(isUndefined(this._baseParam)) this._baseParam = a;
    else this._params.push(a);

    let paramsLength = calParamsLength(this.target.isNumber)
    ([this._baseParam,...this._params]);

    if(this.length < paramsLength){
        console.error(`the length of params can't match!`);
        return;
    }

    if(paramsLength === this.length){
        let newKernel = gpu.createKernel(
            apMapping([
                this._baseParam._outputType,
                ...this._params.map(param=>param._outputType)
            ])(this.target)(this)
        )
            .setOutput(this._size)
            .setFunctions([this])
            .setOutputToTexture(true)
            .setGraphical(!this.target.isNumber);
        newKernel._params = this._params;
        this._kernels.push(newKernel);
    }

    return this;
};

const run = gpu => function(toArray=false){
    let [last,kernels] = this._kernels;
    if(isUndefined(kernels))
        return promiseKernel(last)(this._baseParam).then(
            texture => toArray&&!isUndefined(texture) ?
                texture.toArray(gpu):texture
        );

    if(!isArray(kernels)) kernels = [kernels];

    kernels = kernels.map(promiseKernel);

    let P = kernels.pop()(this._baseParam).then(()=>convertCanvasToImage(gpu._canvas));
    while(kernels.length !== 0){
        let kernel = kernels.pop();
        P = P.then(kernel).then(()=>convertCanvasToImage(gpu._canvas));
    }

    return P.then(image=>{
        let params = [image,...last._params];
        let texture = last(...params);
        return toArray&&!isUndefined(texture) ?
            texture.toArray(gpu):texture
    })
};


const pure = gpu => (data,target='N') => {
    if(isFunction(data)){
        data = combineFunction(arrow2anonymous)(anonymous2named)(data);
        data.ap = ap(gpu);
        data._outputType = TYPE_FUNCTION;
        data._kernels = [];
        data._baseParam = undefined;
        data._params = [];
        data._size = undefined;
        data.target = targetRemapping(target);
    } else{
        data._baseParam = data;
        data._kernels = [];
        data.fmap = fmap(gpu);
        //data.bind = ArrayTools.bind(gpu);
        //data.convolute = ArrayTools.convolute(gpu);

        if(is2DArray(data)||!isUndefined(data.output)) {
            data._outputType = TYPE_NUMBER;
            data._size = data.size?data.size:[data[0].length, data.length];
        } else {
            data._outputType = TYPE_PIXEL;
            data._size = [data.width,data.height];
        }
    }
    data.run = run(gpu);
    return data;
};

export default pure;