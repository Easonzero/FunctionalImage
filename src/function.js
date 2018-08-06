import {TYPE_NUMBER,TYPE_PIXEL,TARGET_BASE} from './const'

const targetRemapping = (target) => {
    let [isNumber, ...colorDist] = TARGET_BASE.map(c => target.toUpperCase().includes(c));
    return { isNumber, colorDist };
};

const calParamLength = param => {
    switch (param.type) {
        case TYPE_NUMBER:
            return 1;
        case TYPE_PIXEL:
            return 4;
        default:
            return 1;
    }
};

const calParamsLength = outputIsNumber => param =>
    outputIsNumber ? calParamLength(param) : 1;

const parseType = data => {
    if (is2DArray(data) || !isUndefined(data.output)) {
        return TYPE_NUMBER;
    } else if (!isUndefined(data.width) && !isUndefined(data.height)) {
        return TYPE_PIXEL;
    } else
        return TYPE_FUNCTION;
}

class Param {
    constructor(data){
        this.origin_data = data;
        let type = parseType(data);
        if (type == TYPE_NUMBER) {
            this.type = type;
            this.size = data.size ? data.size : [data[0].length, data.length];
        } else if(type == TYPE_PIXEL) {
            this.type = type;
            this.size = [data.width, data.height];
        } else 
            throw ('type of param must be 2d_array or h5_image')
    }

    get(){
        return this.origin_data;
    }
}

class CurryFunction {
    constructor(f, paramlen, target){
        this.origin_f = f;
        this.target = targetRemapping(target);
        this.params = [];
        this.total_paramlen = paramlen;
        this.cur_paramlen = 0;
    }
 
    apply(param){
        if(!param instanceof Param)
            param = new Param(param);
        this.params.push(param);
        this.cur_paramlen += calParamLength(this.target.isNumber)(param);

        if(this.cur_paramlen > this.total_paramlen) 
            throw ('too many params are applied')

        return this;
    }

    get(){
        let kernel = param => this.origin_f([this.params,param].map(param=>{param.type,param.size}))(this.target);
        return param => [kernel(param)(...this.params,param)]
    }
}

class ContainerFunction {
    constructor(f, prevs, prevTarget){
        this.f = f;
        this.prevs = prevs;
        this.params = [];
        this.total_paramlen = f.total_paramlen;
        this.cur_paramlen = f.cur_paramlen + ;
    }

    apply(param){
        this.f.apply(param)
        return this;
    }

    get(){
        let kernel = this.f.get();
        if(kernel instanceof CurryFunction)
            return this;
        
        
    }
}

export {parseType, Param, CurryFunction}