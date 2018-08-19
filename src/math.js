export const multi = a => b => {
    if(!a instanceof Array)
        [b,a] = [a,b];

    if(b instanceof Array)
        return a.map((e,i)=>e*b[i]);
    else if(typeof b === 'number')
        return a.map(e=>e*b);
};

export const div = a => b => {
    if(!a instanceof Array)
        return a/b;

    if(b instanceof Array)
        return a.map((e,i)=>e/b[i]);
    else if(typeof b === 'number')
        return a.map(x=>x/b);
};

export const add = a => b => {
    if(!a instanceof Array)
        [b,a] = [a,b];

    if(b instanceof Array)
        return a.map((e,i)=>e+b[i]);
    else if(typeof b === 'number')
        return a.map(e=>e+b);
};

export const divInt = a => b => {
    if(!a instanceof Array)
        return parseInt(a/b);

    if(b instanceof Array)
        return a.map((e,i)=>parseInt(e/b[i]));
    else if(typeof b === 'number')
        return a.map(x=>parseInt(x/b));
};