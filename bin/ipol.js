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
	    if(fs.length > 0) return c => a(combine(...fs)(c));
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
	    
	    return a.map(x=>x/b);
	};

	const TYPE_NUMBER = 0;
	const TYPE_PIXEL = 1;
	const TYPE_FUNCTION = 2;

	const TARGET_BASE = ['N', 'R', 'G', 'B', 'A'];

	const promiseKernel = kernel => params => new Promise((resolve, reject) => {
	    let result = -1;
	    result = kernel(...params);
	    if (result !== -1) {
	        resolve(result);
	    } else reject();
	});

	const promiseKernels = gpu => kernels => kernels.map(
	    kernel => combine(
	        promise=>promise.then(convertCanvasToImage(gpu._canvas)),
	        promiseKernel(kernel)
	    )
	);

	const combinePromiseKernels = (...promise_kernels) => promise_kernels.reduce((r,promise_kernel)=>r.then(promise_kernel));

	// functions which map function to kernel

	const targetConvert = target => inputs => f =>
	    target.isNumber ?
	        `return ${f(inputs.map(call()))}` : `this.color(${target.colorDist.map(
            (x, i) => x ? `${f(inputs.map(call(i)))}` : inputs[0](i))})`;

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
	const convoluteMapping = aIsNumber => isNumber => new Function('a', 'b',
	    `let beginX = this.thread.x * this.constants.step;
     let beginY = this.thread.y * this.constants.step;
     let sum = ${aIsNumber?'b':'a'}[beginY][beginX];
     sum = ${isNumber ? '0' : 'vec4(0,0,0,0)'}
     for(let y=0;y<this.constants.sizeY;y++)
     for(let x=0;x<this.constants.sizeX;x++)
        sum += b[beginY+y][beginX+x] *
            a[y][x];
     ${isNumber? 'return sum;' :
        'this.color(sum[0],sum[1],sum[2],1)'}`
	);

	const convolute = gpu =>
	    step => inputs => target =>
	        gpu.createKernel(convoluteMapping(inputs[0].type === TYPE_NUMBER)(target.isNumber), {
	            constants: { sizeX: inputs[0].size[0], sizeY: inputs[0].size[1], step: step },
	            output: add(divInt(add(inputs[1].size)(multi(inputs[0].size)(-1)))(step))(-1)
	        })
	            .setOutputToTexture(true)
	            .setGraphical(!target.isNumber);

	const targetRemapping = (target) => {
	    target = target.toUpperCase();
	    let [isNumber, ...colorDist] = TARGET_BASE.map(c => target.includes(c));
	    return { isNumber, colorDist };
	};

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
	    constructor(f, paramlen, target){
	        this.f = f;
	        this.target = targetRemapping(target);
	        this.params = [];
	        this.total_paramlen = paramlen;
	        this.cur_paramlen = 0;
	    }
	 
	    apply(param){
	        if(!(param instanceof Param))
	            param = new Param(param);
	        this.params.push(param);
	        this.cur_paramlen += calParamLength(this.target.isNumber)(param);

	        if(this.cur_paramlen > this.total_paramlen) 
	            throw ('Too many params are applied');

	        return this;
	    }

	    get rtType(){
	        return this.target.isNumber?TYPE_NUMBER:TYPE_PIXEL;
	    }
	    // list(param) => kernel
	    get(){
	        let kernel = params =>
	            this.f([...this.params, ...params].map(paramAttr))(this.target);

	        return (...params) => kernel(params)(...this.params.concat(params).map(paramValue))
	    }
	}

	class ContainerFunction {
	    constructor(f, prevs){
	        this.f = f;
	        this.prevs = prevs;
	        this.params = [];
	    }

	    apply(param){
	        this.params.push(param);
	        return this;
	    }

	    get rtType(){
	        return this.f.rtType;
	    }
	    // list(param) => kernel
	    get(){
	        let kernelf = this.f.get();
	        if(this.prevs)
	            return (...params) => this.prevs.then(param=>kernelf(param,...this.params,...params));
	        else
	            return (...params) => promiseKernel(kernelf)(this.params.concat(params));
	    }
	}

	const last = array => array[array.length-1];

	const head = array => array[0];



	const front = array => array.slice(0,array.length-1);

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
	                       ();// call the function
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
