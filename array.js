import {arrow2anonymous, anonymous2named, combineFunction, combineKernel, genParamsName, multi} from "./src/utils";

// f :: a -> b
const mapMapping = f => new Function('functor',
    `return ${f.name}(functor[this.thread.y][this.thread.x])`
);
// f :: a -> b -> c
const apMapping = f => {
    let params = genParamsName(f.length);
    return new Function(...params,
        `return ${f.name}(${
            params.map(param=>`${param}[this.thread.y][this.thread.x]`)
            })`
    );
};
// f :: a -> pos -> b
const bindMapping = f => new Function('functor',
    `let x = floor(this.thread.x/this.constants.sizeX);
     let y = floor(this.thread.y/this.constants.sizeY);
     let offsetX = this.thread.x%this.constants.sizeX;
     let offsetY = this.thread.y%this.constants.sizeY;
    return ${f.name}(functor[y][x],offsetX,offsetY);
    `
);

const fmap = gpu => function(f){
    f = combineFunction(arrow2anonymous)(anonymous2named)(f);

    let newKernel = gpu.createKernel(mapMapping(f))
        .setOutput(this._size)
        .setFunctions([f]);

    if(!this._kernel)
        this._kernel = newKernel;
    else
        this._kernel = combineKernel(gpu)
        (this._kernel)(newKernel);

    return this;
};

const ap = gpu => function(a){
    if(this._params.length === 0){
        this._size = [a[0].length,a.length];
        let f = combineFunction(arrow2anonymous)(anonymous2named)(this);
        this._kernel = gpu.createKernel(apMapping(f))
            .setOutput(this._size)
            .setFunctions([f]);
    }

    this._params.push(a);

    return this;
};

const bind = gpu => function(f,size=[2,2]){
    this._size = multi(size)(this._size);
    f = combineFunction(arrow2anonymous)(anonymous2named)(f);
    this._kernel = gpu.createKernel(bindMapping(f),{
        constants:{sizeX:size[0],sizeY:size[1]},
        output:this._size
    }).setFunctions([f]);

    return this;
};

const convolute = gpu => function(data){
    let size = [data[0].length,data.length];
    this._kernel = gpu.createKernel(function(a,b){
        let sum = 0;
        for(let x=0;x<this.constants.sizeX;x++)
            for(let y=0;y<this.constants.sizeY;y++)
                sum += b[this.thread.y+y][this.thread.x+x] *
                    a[this.thread.y+y][this.thread.x+x];
        return sum;
    },{
        constants:{sizeX:size[0],sizeY:size[1]},
        output:add(add(this._size)(1))(multi(size)(-1))
    });

    this._params.push(data);
    return this;
};

export default {fmap,ap,bind,convolute}