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
//todo remove state setting in pure() and create a class manage state
//todo change state which put on data into that which put on a new object
//todo the object manager the data and function on the chain, and run the chain lazy 
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