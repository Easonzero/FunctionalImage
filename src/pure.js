import {
    anonymous2named,
    arrow2anonymous,
    isFunction,
    isArray,
    is2DArray,
    isUndefined,
    convertCanvasToImage,
    genParamsName,
    calParamsLength,
    modifyVector
} from './utils';

import {
    combineFunction,
    combineKernel,
    promiseKernel,
    call
} from './superfunction';

import {
    TYPE_FUNCTION,
    TYPE_PIXEL,
    TYPE_NUMBER
} from './const';

import {
    add,multi
} from './math';

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

const chainKernel = gpu => createKernel => function(f,target='N',...params){
    f = combineFunction(arrow2anonymous)(anonymous2named)(f);
    target = targetRemapping(target);
    let input = this._outputType;
    let newKernel = createKernel(input)(target)(f)(this._size,...params);
    newKernel._params = [];

    if(this._kernels.length === 0||input===TYPE_PIXEL)
        this._kernels.unshift(newKernel);
    else{
        let oldKernel = this._kernels.shift();
        let kernel = combineKernel(gpu)(oldKernel)(newKernel);
        kernel._params = [];
        this._kernels.unshift(kernel);
    }

    this._outputType = target.isNumber?TYPE_NUMBER:TYPE_PIXEL;

    return this;
};

const mapMapping = input => target => f => new Function('functor',
    `const input = functor[this.thread.y][this.thread.x];
    ${targetConvert(target)
    ([inputConvert(input===TYPE_NUMBER)('input')])
    (inputs=>`${f.name}(${inputs})`)}`
);

const fmap = gpu => chainKernel(gpu)(
    input => target => f => size =>
        gpu.createKernel(mapMapping(input)(target)(f))
            .setOutput(size)
            .setFunctions([f])
            .setOutputToTexture(true)
            .setGraphical(!target.isNumber)
);

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

const bindMapping = input => target => f => new Function('functor',
    `let x = floor(this.thread.x/this.constants.sizeX);
     let y = floor(this.thread.y/this.constants.sizeY);
     let offsetX = this.thread.x%this.constants.sizeX;
     let offsetY = this.thread.y%this.constants.sizeY;
     let input = functor[y][x];
    ${targetConvert(target)
    ([inputConvert(input===TYPE_NUMBER)('input')])
    (inputs=>`${f.name}(${inputs},offsetX,offsetY)`)}
    `
);

const bind =  gpu => chainKernel(gpu)(
    input => target => f => (size,bindSize=[1,1]) => {
        modifyVector(size)(multi(bindSize)(size));

        return gpu.createKernel(bindMapping(input)(target)(f),{
            constants:{sizeX:bindSize[0],sizeY:bindSize[1]},
            output:size
        })
            .setFunctions([f])
            .setOutputToTexture(true)
            .setGraphical(!target.isNumber);
    }
);

const convoluteMapping = aIsNumber => bIsNumber => new Function('a','b',
    `let sum = ${aIsNumber?'b':'a'}[this.thread.y][this.thread.x];
     sum = ${aIsNumber&&bIsNumber?'0':'vec4(0,0,0,0)'}
     for(let y=0;y<this.constants.sizeY;y++)
     for(let x=0;x<this.constants.sizeX;x++)
        sum += b[y][x] *
            a[this.thread.y+y][this.thread.x+x];
     ${aIsNumber&&bIsNumber?'return sum;':
        'this.color(sum[0],sum[1],sum[2],1)'}`
);

const convolute = gpu => function(data){
    let aIsNumber = TYPE_NUMBER === this._outputType,bIsNumber;
    let size;

    if(is2DArray(data)||!isUndefined(data.output)) {
        bIsNumber = true;
        size = data.size?data.size:[data[0].length, data.length];
    } else {
        bIsNumber = false;
        size = [data.width,data.height];
    }

    if(size[0]>this._size[0]||size[1]>this._size[1]){
        console.error('the size of convoluted kernel is larger than that of main data');
        return;
    }

    let newKernel = gpu.createKernel(convoluteMapping(aIsNumber)(bIsNumber),{
        constants:{sizeX:size[0],sizeY:size[1]},
        output:add(add(this._size)(1))(multi(size)(-1))
    })
        .setOutputToTexture(true)
        .setGraphical(!(aIsNumber&&bIsNumber));

    newKernel._params = [data];
    this._kernels.push(newKernel);
    return this;
};

const run = gpu => function(toArray=true){
    let [last,kernels] = this._kernels;
    if(isUndefined(kernels))
        return promiseKernel(last)(this._baseParam).then(
            texture => toArray&&this._outputType !== TYPE_PIXEL ?
                texture.toArray(gpu):undefined
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
        return toArray&&this._outputType !== TYPE_PIXEL ?
            texture.toArray(gpu):undefined
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
        data.bind = bind(gpu);
        data.convolute = convolute(gpu);

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