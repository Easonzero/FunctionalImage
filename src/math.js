export const multi = a => b => {
    if(!a instanceof Array)
        [b,a] = [a,b];

    if(b instanceof Array)
        return a.map((e,i)=>e*b[i]);
    else if(typeof b === 'number')
        return a.map(e=>e*b);
};

export const add = a => b => {
    if(!a instanceof Array)
        [b,a] = [a,b];

    if(b instanceof Array)
        return a.map((e,i)=>e+b[i]);
    else if(typeof b === 'number')
        return a.map(e=>e+b);
};