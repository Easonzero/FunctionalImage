import {
    TYPE_PIXEL,
    TYPE_NUMBER
} from "./const";

export const isUndefined = a => typeof a === 'undefined';

export const isFunction = a => typeof a === 'function';

export const isArray = a => a instanceof Array;

export const is2DArray = a => isArray(a) && isArray(a[0]);

export const genParamsName = l => {
    let params = [];
    for(let i=0;i<l;i++){
        params.push(`param${i}`);
    }
    return params;
};

const calParamLength = param => {
    switch (param._outputType){
        case TYPE_NUMBER:
            return 1;
        case TYPE_PIXEL:
            return 4;
        default:
            return 1;
    }
};

export const calParamsLength = outputIsNumber => params =>
    params.reduce((r,e)=>r+=outputIsNumber?calParamLength(e):1,0);

export const arrow2anonymous = f => {
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
export const anonymous2named = (f) => {
    Object.defineProperty(f,'name',{writable:true});
    f.name = 'f'+namedCount++;
    return f;
};

export const  convertCanvasToImage = (canvas) => {
    let image = new Image();
    image.src = canvas.toDataURL("image/png");
    return image;
};