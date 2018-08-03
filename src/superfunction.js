export const combine = (a,...fs) => {
    if(fs.length > 0) return c => a(combine(...fs)(c))
    else return a
}

export const id = a => a;

export const constf = a => () => a;

export const call = (...params) => f => f(...params);