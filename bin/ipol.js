(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('gpu.js')) :
	typeof define === 'function' && define.amd ? define(['gpu.js'], factory) :
	(factory(global.GPU));
}(this, (function (GPU) { 'use strict';

	GPU = GPU && GPU.hasOwnProperty('default') ? GPU['default'] : GPU;

	const isUndefined = a => typeof a === 'undefined';

	const isFunction = a => typeof a === 'function';

	const isArray = a => a instanceof Array;

	const is2DArray = a => isArray(a) && isArray(a[0]);

	const genParamsName = l => {
	    let params = [];
	    for(let i=0;i<l;i++){
	        params.push(`param${i}`);
	    }
	    return params;
	};

	const arrow2anonymous = f => {
	    let funcstr = f.toString();
	    let funcarray = funcstr.split('=>');
	    if(funcarray.length === 1) return f;
	    let body = funcarray.pop();
	    let params = funcarray;
	    params = [].concat(...params.map(
	        p=>p.replace(/\s|\(|\)+/g,'').split(',')
	    ));
	    body = body.trim();
	    if(body[0]==='{')
	        body = body.substr(1,body.length-2);
	    else body = 'return ' + body;

	    return new Function(...params,body);
	};

	let namedCount = 0;
	const anonymous2named = (f) => {
	    Object.defineProperty(f,'name',{writable:true});
	    f.name = 'f'+namedCount++;
	    return f;
	};

	const convertCanvasToImage = (canvas) => {
	    let image = new Image();
	    image.src = canvas.toDataURL("image/png");
	    return image;
	};

	const modifyVector = v1 => v2 => {
	    if(v1.length !== v2.length) return;
	    for(let i=0;i<v1.length;i++){
	        v1[i] = v2[i];
	    }
	};

	const combine = (a,...fs) => {
	    if(fs.length > 0) return (...c) => a(combine(...fs)(...c));
	    else return a
	};



	const constf = a => () => a;

	const call = (...params) => f => f(...params);

	const multi = a => b => {
	    if(!a instanceof Array)
	        [b,a] = [a,b];

	    if(b instanceof Array)
	        return a.map((e,i)=>e*b[i]);
	    else if(typeof b === 'number')
	        return a.map(e=>e*b);
	};



	const add = a => b => {
	    if(!a instanceof Array)
	        [b,a] = [a,b];

	    if(b instanceof Array)
	        return a.map((e,i)=>e+b[i]);
	    else if(typeof b === 'number')
	        return a.map(e=>e+b);
	};

	const divInt = a => b => {
	    if(!a instanceof Array)
	        return parseInt(a/b);

	    if(b instanceof Array)
	        return a.map((e,i)=>parseInt(e/b[i]));
	    else if(typeof b === 'number')
	        return a.map(x=>parseInt(x/b));
	};

	const TYPE_NUMBER = 0;
	const TYPE_PIXEL = 1;
	const TYPE_FUNCTION = 2;

	const TARGET_BASE = ['N', 'R', 'G', 'B', 'A'];

	const promiseKernel = gpu => copyToImage => kernel => (...params) => new Promise((resolve, reject) => {
	    let result = -1;
	    result = kernel(...params);
	    if (result !== -1) {
	        if (copyToImage)
	            result = convertCanvasToImage(gpu._canvas);
	        resolve(result);
	    } else reject();
	});

	const combinePromiseKernels = promise_kernels => promise_kernels.reduce((r,promise_kernel)=>r.then(promise_kernel));

	// functions which map function to kernel

	const targetConvert = target => inputs => f =>
	    target.isNumber ?
	        `return ${f(inputs.map(call()))}` : `this.color(${target.colorDist.map(
            (x, i) => x ? `${f(inputs.map(call(i)))}` : inputs[0](i))})`;

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

	const last = array => array[array.length-1];

	const head = array => array[0];

	const tail = array => array.slice(1,array.length);

	const front = array => array.slice(0,array.length-1);

	const loopShift = array => {
	    if(array.length === 0) return [];
	    return [...tail(array),head(array)];
	};

	const targetRemapping = (target) => {
	    target = target.toUpperCase();
	    let [isNumber, ...colorDist] = TARGET_BASE.map(c => target.includes(c));
	    return { isNumber, colorDist };
	};

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
	    constructor(f, target){
	        this.f = f;
	        this.target = targetRemapping(target);
	        this.params = [];
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
	            this.f(loopShift([...this.params, ...params]).map(paramAttr))(this.target);

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

	const pure = (gpu) => (data,target) => {
	    if(isFunction(data))
	        return new Container(gpu,data,target);
	    else{
	        if(is2DArray(data)||!isUndefined(data.output))
	            return new Container(gpu,data,'N');
	        else
	            return new Container(gpu,data,'RGBA');
	    }
	};

	window.$fip = (params) => {
	    const gpu = new GPU(params);
	    return {
	        pure:pure(gpu),
	        gpu:gpu
	    };
	};

})));
