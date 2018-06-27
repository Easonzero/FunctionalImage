import GPU from 'gpu.js'
import pure from './src/pure'

window.$fip = (params) => {
    const gpu = new GPU(params);
    return {
        pure:pure(gpu),
        gpu:gpu
    };
};
