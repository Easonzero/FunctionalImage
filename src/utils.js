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

export const modifyVector = v1 => v2 => {
    if(v1.length !== v2.length) return;
    for(let i=0;i<v1.length;i++){
        v1[i] = v2[i];
    }
};