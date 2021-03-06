import {
    fmap, bind, join, application, convolute,
    combinePromiseKernels, promiseKernel
} from './kernel'
import { CurryFunction, ContainerFunction, Param } from './function'
import { combine, constf } from './superfunction'
import { arrow2anonymous, anonymous2named, isFunction } from './utils'
import { front, last, head } from "./list";
import { TYPE_NUMBER, TYPE_PIXEL } from "./const";

class Container {
    constructor(gpu, data, target){
        this.gpu = gpu;
        this.functions = [];
        if(isFunction(data)){
            let f = combine(application(gpu),anonymous2named,arrow2anonymous)(data);
            let curry_f = new CurryFunction(f, target);
            this.functions.push(curry_f);
        } else {
            let f = input=>target=>constf(data);
            let curry_f = new CurryFunction(f, target);
            this.functions.push(curry_f);
        }
    }

    fmap(f, target){
        f = combine(fmap(this.gpu),anonymous2named,arrow2anonymous)(f);
        let curry_f = new CurryFunction(f, target);
        this.functions.push(curry_f);
        return this;
    }

    bind(f, target, bindSize = [1, 1]){
        f = combine(bind(this.gpu)(bindSize),anonymous2named,arrow2anonymous)(f);
        let curry_f = new CurryFunction(f, target);
        this.functions.push(curry_f);
        return this;
    }

    join(f, target, joinSize = [1, 1]){
        f = combine(join(this.gpu)(joinSize),anonymous2named,arrow2anonymous)(f);
        let curry_f = new CurryFunction(f, target);
        this.functions.push(curry_f);
        return this;
    }
    
    convolute(data,step=1){
        let f = convolute(this.gpu)(step);

        let type = undefined;
        if(data instanceof ContainerFunction){
            type = data.rtType;
        }else{
            data = new Param(data);
            type = data.type;
        }
        
        let prevType = last(this.functions).rtType;
        let target = type === TYPE_NUMBER &&
            prevType === TYPE_NUMBER ?
            'N':'RGB';
        let curry_f = new CurryFunction(f, target);

        if(data instanceof ContainerFunction){
            let containerf = new ContainerFunction(curry_f,data.get(this.gpu)());
            this.functions.push(containerf);
            return this;
        }

        curry_f.apply(data);
        this.functions.push(curry_f);
        return this;
    }

    ap(data){
        let last_f = this.functions.pop();

        if(data instanceof ContainerFunction){
            let containerf = new ContainerFunction(last_f,data.get(this.gpu)());
            this.functions.push(containerf);
            return this;
        }
        last_f.apply(data);
        this.functions.push(last_f);
        return this;
    }

    combine(containerf){
        if(!(containerf instanceof ContainerFunction))
            throw ('Is input the Container.get()?');

        this.functions.push(containerf);

        return this;
    }

    get(copyToImage=false){
        if(this.functions.length===1)
            return new ContainerFunction(head(this.functions));
        let prevs = front(this.functions);
        let f = last(this.functions);

        let result = [], tmp = [], i = 0;
        for(let prevff of prevs){
            let prevf = prevff.get(this.gpu);
            let type = prevff.rtType;

            if(type === TYPE_NUMBER || (i===0&&prevff.params.length===0)){
                tmp.push(prevf);
            }else if(type === TYPE_PIXEL){
                tmp.push(prevf);
                result.push(combine(...tmp.reverse()));
                tmp.length = 0;
            }
            i++;
        }
        let restf = combine(...tmp.reverse());
        if(result.length === 0)
            prevs = promiseKernel(this.gpu)(false)(restf)();
        else {
            result = result.map(promiseKernel(this.gpu)(true));
            result[0] = result[0]();
            prevs = combinePromiseKernels(result);
            prevs = prevs.then(restf);
        }
        
        return new ContainerFunction(f, prevs);
    }

    draw(){
        return this.get() // get container function
                   .get(this.gpu,false) // get kernel function
                       ();// call the function
    }

    output(){
        return this.get()
                   .get(this.gpu,false)
                       ()
                    .then(texture => texture.toArray(this.gpu))
    }
}

export {Container}