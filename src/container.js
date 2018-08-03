import { promiseKernel, combineKernel, fmap, bind, application, convolute} from './kernel'
import { CurryFunction, Param} from './function'
import { combine, constf } from './superfunction'
import { arrow2anonymous, anonymous2named, isUndefined, isFunction, last } from './utils'

class Container {
    constructor(gpu, data, target){
        this.gpu = gpu;
        this.functions = [];
        
        if(isFunction(data)){
            let f = application(gpu)(data);
            let curry_f = new CurryFunction(f, data.length, target);
            this.functions.push(curry_f);
        } else {
            let f = constf(data);
            let curry_f = new CurryFunction(f, 0, target);
            this.functions.push(curry_f);
        }
    }

    fmap(f, target){
        let paramlen = f.length;
        f = combine(fmap(this.gpu),anonymous2named,arrow2anonymous)(f);
        let curry_f = new CurryFunction(f, paramlen, target);
        this.functions.push(curry_f);
        return this;
    }

    bind(f, bindSize = [1, 1]){
        let paramlen = f.length;
        f = combine(bind(this.gpu)(bindSize),anonymous2named,arrow2anonymous)(f);
        let curry_f = new CurryFunction(f, paramlen, target);
        this.functions.push(curry_f);
        return this;
    }

    join(f, target){
        return this;
    }

    convolute(data,step=1){
        let paramlen = 2;
        let f = convolute(this.gpu)(step);
        let curry_f = new CurryFunction(f, paramlen);
        curry_f.apply(new Param(data));
        this.functions.push(curry_f);
        return this;
    }

    ap(data){
        let last_f = last(this.functions)
        last_f.apply(data);
        return this;
    }

    _get(){
        
    }

    get(){

    }
}