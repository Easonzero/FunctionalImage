import {fmap, bind, application, convolute, promiseKernels, combinePromiseKernels, promiseKernel} from './kernel'
import {TYPE_NUMBER,TYPE_PIXEL} from './const'
import { CurryFunction, ContainerFunction, Param } from './function'
import { combine, constf } from './superfunction'
import { arrow2anonymous, anonymous2named, isFunction } from './utils'
import {front, last, head} from "./list";

class Container {
    constructor(gpu, data, target){
        this.gpu = gpu;
        this.functions = [];
        
        if(isFunction(data)){
            let f = combine(anonymous2named,arrow2anonymous)(data);
            let l = f.length;
            f = application(gpu)(f);
            let curry_f = new CurryFunction(f, l, target);
            this.functions.push(curry_f);
        } else {
            let f = input=>target=>constf(data);
            let curry_f = new CurryFunction(f, 0, target);
            this.functions.push(curry_f);
        }
    }

    fmap(f, target){
        f = combine(anonymous2named,arrow2anonymous)(f);
        let l = f.length;
        f = fmap(this.gpu)(f);
        let curry_f = new CurryFunction(f, l, target);
        this.functions.push(curry_f);
        return this;
    }

    bind(f, target, bindSize = [1, 1]){
        f = combine(anonymous2named,arrow2anonymous)(f);
        let l = f.length;
        f = bind(this.gpu)(bindSize)(f);
        let curry_f = new CurryFunction(f, l, target);
        this.functions.push(curry_f);
        return this;
    }
    // todo join (act is fold)
    join(f, target){
        return this;
    }
    // support container_function
    convolute(data,step=1){
        let paramlen = 2;
        let f = convolute(this.gpu)(step);
        let param = new Param(data);
        let prevType = last(this.functions).rtType;
        let target = param.type === TYPE_NUMBER &&
            prevType === TYPE_NUMBER ?
            'N':'RGBA';

        let curry_f = new CurryFunction(f, paramlen, target);
        curry_f.apply(param);
        this.functions.push(curry_f);
        return this;
    }

    ap(data){
        let last_f = last(this.functions);
        last_f.apply(data);
        return this;
    }

    combine(containerf){
        if(!(containerf instanceof ContainerFunction))
            throw ('Is input the Container.get()?');

        this.functions.push(containerf);

        return this;
    }

    get(){
        if(this.functions.length===1)
            return new ContainerFunction(head(this.functions));

        let prevs = front(this.functions);
        let f = last(this.functions);

        let result = [], tmp = [];
        for(let prevff of prevs){
            let prevf = prevff.get();
            let type = prevff.rtType;

            if(type === TYPE_NUMBER || prevff.total_paramlen === 0){
                tmp.push(prevf);
            }else if(type === TYPE_PIXEL){
                tmp.push(prevf);
                result.push(combine(tmp.reverse()));
                tmp.length = 0;
            }
        }
        let restf = combine(...tmp.reverse());
        if(result.length === 0)
            prevs = promiseKernel(restf)([]);
        else {
            prevs = combinePromiseKernels(promiseKernels(this.gpu)(result));
            prevs = prevs.then(restf);
        }

        return new ContainerFunction(f, prevs);
    }

    run(){
        return this.get() // get container function
                   .get() // get kernel function
                       ();    // call the function
    }
}

export {Container}