export const last = array => array[array.length-1];

export const head = array => array[0];

export const tail = array => array.slice(1,array.length);

export const front = array => array.slice(0,array.length-1);

export const loopShift = array => {
    if(array.length === 0) return [];
    return [...tail(array),head(array)];
}