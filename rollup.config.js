import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

export default {
    input: 'index.js',
    output:  [
        {
            format: 'umd',
            name: 'ipol',
            globals: {
                'gpu.js':'GPU'
            },
            file: 'bin/ipol.js',
            indent: '\t'
        },
        {
            format: 'es',
            file: 'bin/ipol.module.js',
            globals: {
                'gpu.js':'GPU'
            },
            indent: '\t'
        }
    ],
    external: [
        'gpu.js'
    ],
    plugins: [
        resolve({jsnext : true}),
        commonjs({include : /node_modules/}),
        babel()
    ]
};