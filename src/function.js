import {TYPE_NUMBER, TYPE_PIXEL, TARGET_BASE, TYPE_FUNCTION} from './global'
import { is2DArray, isUndefined } from "./utils";
import {promiseKernel, targetRemapping} from "./kernel";
import { loopShift } from './list';

const _calParamLength = param => {
    switch (param.type) {
        case TYPE_NUMBER:
            return 1;
        case TYPE_PIXEL:
            return 4;
        default:
            return 1;
    }
};

const calParamLength = outputIsNumber => param =>
    outputIsNumber ? _calParamLength(param) : 1;

const parseType = data => {
    if (is2DArray(data) || !isUndefined(data.output)) {
        return TYPE_NUMBER;
    } else if (!isUndefined(data.width) && !isUndefined(data.height)) {
        return TYPE_PIXEL;
    } else
        return TYPE_FUNCTION;
};

const paramAttr = param => {
    if(!(param instanceof Param))
        param = new Param(param);

    return {
        type: param.type,
        size: param.size
    }
};

const paramValue = param => {
    if(param instanceof Param)
        return param.get();

    return param;
};

class Param {
    constructor(data){
        this.data = data;
        let type = parseType(data);
        if (type === TYPE_NUMBER) {
            this.type = type;
            this.size = data.size ? data.size : [data[0].length, data.length];
        } else if(type === TYPE_PIXEL) {
            this.type = type;
            this.size = [data.width, data.height];
        } else 
            throw ('Type of param must be 2d_array or h5_image')
    }

    get(){
        return this.data;
    }
}

class CurryFunction {
    constructor(f, target="RGB", constants={}){
        this.f = f;
        this.target = targetRemapping(target);
        this.params = [];
        this.constants = constants;
    }
 
    apply(param){
        if(!(param instanceof Param))
            param = new Param(param);
        this.params.push(param);
        return this;
    }

    get rtType(){
        return this.target.isNumber?TYPE_NUMBER:TYPE_PIXEL;
    }
    // list(param) => kernel
    get(gpu){
        let kernel = params => 
            this.f(loopShift([...this.params, ...params]).map(paramAttr))(this.target)(this.constants);
        return (...params) => kernel(params)(...loopShift([...this.params, ...params]).map(paramValue))
    }
}

class ContainerFunction {
    constructor(f, prevs){
        this.f = f;
        this.prevs = prevs;
        this.params = [];
    }

    apply(param){
        if (!(param instanceof Param))
            param = new Param(param);

        this.params.push(param);
        return this;
    }

    get rtType(){
        return this.f.rtType;
    }
    // list(param) => kernel
    get(gpu,copyToImage=true){
        let kernelf = this.f.get(gpu);
        if(this.prevs)
            return (...params) => this.prevs.then(
                param =>
                    promiseKernel(gpu)
                    (this.rtType === TYPE_PIXEL && copyToImage)
                    (kernelf)
                    (param, ...this.params, ...params)
            );
        else
            return (...params) => 
                promiseKernel(gpu)
                (this.rtType === TYPE_PIXEL && copyToImage)
                (kernelf)(...this.params,...params);
    }
}

export {parseType, Param, CurryFunction, ContainerFunction}