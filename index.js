import GPU from 'gpu.js'
import {is2DArray, isFunction, isUndefined} from "./src/utils";
import {Container} from "./src/container";
import {createDatabase} from "./src/global";

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

window.$fip = params => {
    const gpu = new GPU(params);
    return {
        pure:pure(gpu),
        createDatabase:createDatabase(gpu)
    }
};
