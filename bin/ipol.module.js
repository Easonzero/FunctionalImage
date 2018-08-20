import GPU from 'gpu.js';

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var toArray = function (arr) {
  return Array.isArray(arr) ? arr : Array.from(arr);
};

var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var last = function last(array) {
    return array[array.length - 1];
};

var head = function head(array) {
    return array[0];
};

var tail = function tail(array) {
    return array.slice(1, array.length);
};

var front = function front(array) {
    return array.slice(0, array.length - 1);
};

var loopShift = function loopShift(array) {
    if (array.length === 0) return [];
    return [].concat(toConsumableArray(tail(array)), [head(array)]);
};

var range = function range(size) {
    var startAt = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    return [].concat(toConsumableArray(Array(size).keys())).map(function (i) {
        return i + startAt;
    });
};

var isUndefined = function isUndefined(a) {
    return typeof a === 'undefined';
};

var isFunction = function isFunction(a) {
    return typeof a === 'function';
};

var isArray = function isArray(a) {
    return toString.apply(a) === "[object Array]";
};

var isObject = function isObject(a) {
    return toString.apply(a) === "[object Object]";
};

var is2DArray = function is2DArray(a) {
    return isArray(a) && isArray(a[0]);
};

var genParamsName = function genParamsName(l) {
    var params = [];
    for (var i = 0; i < l; i++) {
        params.push('param' + i);
    }
    return params;
};

var arrow2anonymous = function arrow2anonymous(paramslen) {
    return function (f) {
        var _ref;

        var funcstr = f.toString();
        var funcarray = funcstr.split('=>');
        if (funcarray.length === 1) return f;
        var body = funcarray.pop();
        var params = funcarray;
        params = (_ref = []).concat.apply(_ref, toConsumableArray(params.map(function (p) {
            return p.replace(/\s|\(|\)+/g, '').split(',');
        })));
        if (params.length < paramslen) {
            params = params.concat(range(paramslen - params.length).map(function (i) {
                return 'Pa_R_aM_' + i;
            }));
        }
        body = body.trim();
        if (body[0] === '{') body = body.substr(1, body.length - 2);else body = 'return ' + body;

        return new (Function.prototype.bind.apply(Function, [null].concat(toConsumableArray(params), [body])))();
    };
};

var namedCount = 0;
var anonymous2named = function anonymous2named(f) {
    Object.defineProperty(f, 'name', { writable: true });
    f.name = 'f' + namedCount++;
    return f;
};

var convertCanvasToImage = function convertCanvasToImage(canvas) {
    var image = new Image();
    image.src = canvas.toDataURL("image/png");
    return image;
};

var modifyVector = function modifyVector(v1) {
    return function (v2) {
        if (v1.length !== v2.length) return;
        for (var i = 0; i < v1.length; i++) {
            v1[i] = v2[i];
        }
    };
};

var combine = function combine(a) {
    for (var _len = arguments.length, fs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        fs[_key - 1] = arguments[_key];
    }

    if (fs.length > 0) return function () {
        return a(combine.apply(undefined, fs).apply(undefined, arguments));
    };else return a;
};

var constf = function constf(a) {
    return function () {
        return a;
    };
};

var call = function call() {
    for (var _len2 = arguments.length, params = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        params[_key2] = arguments[_key2];
    }

    return function (f) {
        return f.apply(undefined, params);
    };
};

var multi = function multi(a) {
    return function (b) {
        if (!a instanceof Array) {

            var _ref = [a, b];
            b = _ref[0];
            a = _ref[1];
        }if (b instanceof Array) return a.map(function (e, i) {
            return e * b[i];
        });else if (typeof b === 'number') return a.map(function (e) {
            return e * b;
        });
    };
};

var add = function add(a) {
    return function (b) {
        if (!a instanceof Array) {

            var _ref2 = [a, b];
            b = _ref2[0];
            a = _ref2[1];
        }if (b instanceof Array) return a.map(function (e, i) {
            return e + b[i];
        });else if (typeof b === 'number') return a.map(function (e) {
            return e + b;
        });
    };
};

var divInt = function divInt(a) {
    return function (b) {
        if (!a instanceof Array) return parseInt(a / b);

        if (b instanceof Array) return a.map(function (e, i) {
            return parseInt(e / b[i]);
        });else if (typeof b === 'number') return a.map(function (x) {
            return parseInt(x / b);
        });
    };
};

var TYPE_NUMBER = 0;
var TYPE_PIXEL = 1;
var TYPE_FUNCTION = 2;

var TARGET_BASE = ['N', 'R', 'G', 'B', 'A'];

var dbconvert = function dbconvert(type) {
    return function (values) {
        switch (type) {
            case "vec3":
            case "vec4":
                return values.map(function (v) {
                    return type + '(' + v + ')';
                });
            case "float":
                return values.map(function (v) {
                    v = v.toString();
                    if (v.includes('.')) return v;else return v + '.';
                });
            default:
                return values;
        }
    };
};

var createArray = function createArray(gpu) {
    return function (name, type, array) {
        var native_func = type + ' db_' + name + '[] = ' + type + '[' + array.length + '](' + dbconvert(type)(array) + ');\n' + type + ' ' + name + '(float i){\n    return db_' + name + '[int(i)];\n}';
        gpu.addNativeFunction(name, native_func);
    };
};

var createMap = function createMap(gpu) {
    return function (name, type, json) {
        var keys = Object.keys(json);
        var values = Object.values(json);

        var native_func = keys.map(function (key, i) {
            return '#define user_' + key.toUpperCase() + ' ' + i;
        }).join('\n') + '\n' + type + ' db_' + name + '[] = ' + type + '[' + values.length + '](' + dbconvert(type)(values) + ');\n' + type + ' ' + name + '(int i){\n    return db_' + name + '[i];\n}';
        gpu.addNativeFunction(name, native_func);
    };
};

var createDatabase = function createDatabase(gpu) {
    var create_array = createArray(gpu);
    var create_map = createMap(gpu);
    return function (name, type, data) {
        if (isArray(data)) return create_array(name, type, data);
        if (isObject(data)) return create_map(name, type, data);
    };
};

var promiseKernel = function promiseKernel(gpu) {
    return function (copyToImage) {
        return function (kernel) {
            return function () {
                for (var _len2 = arguments.length, params = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    params[_key2] = arguments[_key2];
                }

                return new Promise(function (resolve, reject) {
                    var result = -1;
                    result = kernel.apply(undefined, params);
                    if (result !== -1) {
                        if (copyToImage) {
                            result = convertCanvasToImage(gpu._canvas);
                            gpu._webGl.clear(gpu._webGl.COLOR_BUFFER_BIT);
                        }
                        resolve(result);
                    } else reject();
                });
            };
        };
    };
};

var combinePromiseKernels = function combinePromiseKernels(promise_kernels) {
    return promise_kernels.reduce(function (r, promise_kernel) {
        return r.then(promise_kernel);
    });
};

// functions which map function to kernel

var targetRemapping = function targetRemapping(target) {
    target = target.toUpperCase();

    var _TARGET_BASE$map = TARGET_BASE.map(function (c) {
        return target.includes(c);
    }),
        _TARGET_BASE$map2 = toArray(_TARGET_BASE$map),
        isNumber = _TARGET_BASE$map2[0],
        colorDist = _TARGET_BASE$map2.slice(1);

    return { isNumber: isNumber, colorDist: colorDist };
};

var targetConvert = function targetConvert(target) {
    return function (inputs) {
        return function (f) {
            return target.isNumber ? 'return ' + f(inputs.map(call())) : 'this.color(' + target.colorDist.map(function (x, i) {
                return x ? '' + f(inputs.map(call(i))) : inputs[0](i);
            }) + ')';
        };
    };
};

var accConvert = function accConvert(target) {
    return function (inputs) {
        return function (f) {
            return target.isNumber ? 'N = ' + f(inputs.map(call())) : target.colorDist.map(function (x, i) {
                return x ? TARGET_BASE[i + 1] : x;
            }).filter(function (x) {
                return x;
            }).map(function (x) {
                return x + ' = ' + f(x, inputs.map(call(TARGET_BASE.indexOf(x) - 1)));
            }).join(';');
        };
    };
};

var targetAccConvert = function targetAccConvert(target) {
    return function (inputs) {
        return target.isNumber ? 'return N' : 'this.color(' + target.colorDist.map(function (x, i) {
            return x ? TARGET_BASE[i + 1] : inputs[0](i);
        }) + ')';
    };
};

var inputConvert = function inputConvert(isNumber) {
    return function (inputName) {
        return function (useri) {
            return isNumber ? inputName : isUndefined(useri) ? [0, 1, 2, 3].map(function (i) {
                return inputName + '[' + i + ']';
            }) : inputName + '[' + useri + ']';
        };
    };
};

var inputType = function inputType(inputs) {
    return inputs.map(function (input) {
        return input.type;
    });
};
var inputMinSize = function inputMinSize(inputs) {
    return inputs.reduce(function (r, input) {
        var w = input.size[0],
            h = input.size[1];
        if (r[0] > w) r[0] = w;
        if (r[1] > h) r[0] = h;
        return r;
    }, inputs[0].size);
};

var mapMapping = function mapMapping(input) {
    return function (target) {
        return function (f) {
            return new Function('functor', 'const input = functor[this.thread.y][this.thread.x];\n    ' + targetConvert(target)([inputConvert(input === TYPE_NUMBER)('input')])(function (inputs) {
                return f.name + '(' + inputs + ',this.thread.x,this.thread.y)';
            }));
        };
    };
};

var fmap = function fmap(gpu) {
    return function (f) {
        return function (inputs) {
            return function (target) {
                return function (constants) {
                    return gpu.createKernel(mapMapping.apply(undefined, toConsumableArray(inputType(inputs)))(target)(f), { constants: constants }).setOutput(inputMinSize(inputs)).setFunctions([f]).setOutputToTexture(true).setGraphical(!target.isNumber);
                };
            };
        };
    };
};

var apMapping = function apMapping(inputs) {
    return function (target) {
        return function (f) {
            var params = genParamsName(inputs.length);
            return new (Function.prototype.bind.apply(Function, [null].concat(toConsumableArray(params), [params.map(function (param, i) {
                return 'const input' + i + ' = ' + param + '[this.thread.y][this.thread.x];';
            }).join('\n') + '\n        ' + targetConvert(target)(inputs.map(function (input, i) {
                return inputConvert(input === TYPE_NUMBER)('input' + i);
            }))(function (inputs) {
                return f.name + '(' + inputs + ')';
            })])))();
        };
    };
};

var application = function application(gpu) {
    return function (f) {
        return function (inputs) {
            return function (target) {
                return function (constants) {
                    return gpu.createKernel(apMapping(inputType(inputs))(target)(f), { constants: constants }).setOutput(inputMinSize(inputs)).setFunctions([f]).setOutputToTexture(true).setGraphical(!target.isNumber);
                };
            };
        };
    };
};

var bindMapping = function bindMapping(input) {
    return function (target) {
        return function (f) {
            return new Function('functor', '\n     let x = floor(this.thread.x/this.constants.sizeX_);\n     let y = floor(this.thread.y/this.constants.sizeY_);\n     let offsetX = this.thread.x%this.constants.sizeX_;\n     let offsetY = this.thread.y%this.constants.sizeY_;\n     let input = functor[y][x];\n    ' + targetConvert(target)([inputConvert(input === TYPE_NUMBER)('input')])(function (inputs) {
                return f.name + '(' + inputs + ',offsetX,offsetY,x,y)';
            }) + '\n    ');
        };
    };
};

var bind = function bind(gpu) {
    return function (bindSize) {
        return function (f) {
            return function (inputs) {
                return function (target) {
                    return function (constants) {
                        var size = inputMinSize(inputs);
                        modifyVector(size)(multi(bindSize)(size));

                        return gpu.createKernel(bindMapping.apply(undefined, toConsumableArray(inputType(inputs)))(target)(f), {
                            constants: Object.assign({ sizeX_: bindSize[0], sizeY_: bindSize[1] }, constants),
                            output: size
                        }).setFunctions([f]).setOutputToTexture(true).setGraphical(!target.isNumber);
                    };
                };
            };
        };
    };
};

var joinMapping = function joinMapping(input) {
    return function (target) {
        return function (f) {
            return new Function('functor', 'let beginX = this.thread.x*this.constants.sizeX_;\n     let beginY = this.thread.y*this.constants.sizeY_;\n     let first_input = functor[beginX][beginY];\n     let N = 0,R = 0,G = 0,B = 0,A = 0;\n     for(let y=0;y<this.constants.sizeY_;y++)\n     for(let x=0;x<this.constants.sizeX_;x++){\n        let input = functor[beginY+y][beginX+x];\n        ' + accConvert(target)([inputConvert(input === TYPE_NUMBER)('input')])(function (target, inputs) {
                return f.name + '(' + target + ',' + inputs + ',x,y,beginX,beginY)';
            }) + '\n     }\n     ' + targetAccConvert(target)([inputConvert(input === TYPE_NUMBER)('first_input')]) + '\n    ');
        };
    };
};

var join = function join(gpu) {
    return function (joinSize) {
        return function (f) {
            return function (inputs) {
                return function (target) {
                    return function (constants) {
                        var size = inputMinSize(inputs);
                        modifyVector(size)(divInt(size)(joinSize));
                        return gpu.createKernel(joinMapping.apply(undefined, toConsumableArray(inputType(inputs)))(target)(f), {
                            constants: Object.assign({ sizeX_: joinSize[0], sizeY_: joinSize[1] }, constants),
                            output: size
                        }).setFunctions([f]).setOutputToTexture(true).setGraphical(!target.isNumber);
                    };
                };
            };
        };
    };
};

var convoluteMapping = function convoluteMapping(aIsNumber) {
    return function (isNumber) {
        return new Function('a', 'b', 'let beginX = this.thread.x * this.constants.step_;\n     let beginY = this.thread.y * this.constants.step_;\n     let sum = ' + (aIsNumber ? 'b' : 'a') + '[beginY][beginX];\n     sum = ' + (isNumber ? '0' : 'vec4(0,0,0,0)') + '\n     for(let y=0;y<this.constants.sizeY_;y++)\n     for(let x=0;x<this.constants.sizeX_;x++)\n        sum += b[y][x] *\n            a[beginY+y][beginX+x];\n     ' + (isNumber ? 'return sum;' : 'this.color(sum[0],sum[1],sum[2],1)'));
    };
};

var convolute = function convolute(gpu) {
    return function (step) {
        return function (inputs) {
            return function (target) {
                return function (constants) {
                    return gpu.createKernel(convoluteMapping(inputs[1].type === TYPE_NUMBER)(target.isNumber), {
                        constants: { sizeX_: inputs[1].size[0], sizeY_: inputs[1].size[1], step_: step },
                        output: add(divInt(add(inputs[0].size)(multi(inputs[1].size)(-1)))(step))(-1)
                    }).setOutputToTexture(true).setGraphical(!target.isNumber);
                };
            };
        };
    };
};

var _calParamLength = function _calParamLength(param) {
    switch (param) {
        case TYPE_NUMBER:
            return 1;
        case TYPE_PIXEL:
            return 4;
        default:
            return 1;
    }
};

var calParamLength = function calParamLength(outputIsNumber) {
    return function (param) {
        return outputIsNumber ? _calParamLength(param) : 1;
    };
};

var parseType = function parseType(data) {
    if (is2DArray(data) || !isUndefined(data.output)) {
        return TYPE_NUMBER;
    } else if (!isUndefined(data.width) && !isUndefined(data.height)) {
        return TYPE_PIXEL;
    } else return TYPE_FUNCTION;
};

var paramAttr = function paramAttr(param) {
    if (!(param instanceof Param$1)) param = new Param$1(param);

    return {
        type: param.type,
        size: param.size
    };
};

var paramValue = function paramValue(param) {
    if (param instanceof Param$1) return param.get();

    return param;
};

var Param$1 = function () {
    function Param(data) {
        classCallCheck(this, Param);

        this.data = data;
        var type = parseType(data);
        if (type === TYPE_NUMBER) {
            this.type = type;
            this.size = data.size ? data.size : [data[0].length, data.length];
        } else if (type === TYPE_PIXEL) {
            this.type = type;
            this.size = [data.width, data.height];
        } else throw 'Type of param must be 2d_array or h5_image';
    }

    createClass(Param, [{
        key: "get",
        value: function get$$1() {
            return this.data;
        }
    }]);
    return Param;
}();

var CurryFunction = function () {
    function CurryFunction(f, target) {
        var constants = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        classCallCheck(this, CurryFunction);

        this.f = f;
        this.target = target;
        this.params = [];
        this.constants = constants;
    }

    createClass(CurryFunction, [{
        key: "apply",
        value: function apply(param) {
            if (!(param instanceof Param$1)) param = new Param$1(param);
            this.params.push(param);
            return this;
        }
    }, {
        key: "get",

        // list(param) => kernel
        value: function get$$1(gpu) {
            var _this = this;

            var kernel = function kernel(params) {
                return _this.f(loopShift([].concat(toConsumableArray(_this.params), toConsumableArray(params))).map(paramAttr))(_this.target)(_this.constants);
            };
            return function () {
                for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
                    params[_key] = arguments[_key];
                }

                return kernel(params).apply(undefined, toConsumableArray(loopShift([].concat(toConsumableArray(_this.params), params)).map(paramValue)));
            };
        }
    }, {
        key: "rtType",
        get: function get$$1() {
            return this.target.isNumber ? TYPE_NUMBER : TYPE_PIXEL;
        }
    }]);
    return CurryFunction;
}();

var ContainerFunction = function () {
    function ContainerFunction(f, prevs) {
        classCallCheck(this, ContainerFunction);

        this.f = f;
        this.prevs = prevs;
        this.params = [];
    }

    createClass(ContainerFunction, [{
        key: "apply",
        value: function apply(param) {
            if (!(param instanceof Param$1)) param = new Param$1(param);

            this.params.push(param);
            return this;
        }
    }, {
        key: "get",

        // list(param) => kernel
        value: function get$$1(gpu) {
            var _this2 = this;

            var copyToImage = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

            var kernelf = this.f.get(gpu);
            if (this.prevs) return function () {
                for (var _len2 = arguments.length, params = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    params[_key2] = arguments[_key2];
                }

                return _this2.prevs.then(function (param) {
                    return promiseKernel(gpu)(_this2.rtType === TYPE_PIXEL && copyToImage)(kernelf).apply(undefined, [param].concat(toConsumableArray(_this2.params), params));
                });
            };else return function () {
                for (var _len3 = arguments.length, params = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                    params[_key3] = arguments[_key3];
                }

                return promiseKernel(gpu)(_this2.rtType === TYPE_PIXEL && copyToImage)(kernelf).apply(undefined, toConsumableArray(_this2.params).concat(params));
            };
        }
    }, {
        key: "rtType",
        get: function get$$1() {
            return this.f.rtType;
        }
    }]);
    return ContainerFunction;
}();

var Container = function () {
    function Container(gpu, data) {
        var target = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "RGB";
        var constants = arguments[3];
        classCallCheck(this, Container);

        this.gpu = gpu;
        this.functions = [];
        target = targetRemapping(target);
        if (isFunction(data)) {
            var f = combine(application(gpu), anonymous2named, arrow2anonymous)(data);
            var curry_f = new CurryFunction(f, target, constants);
            this.functions.push(curry_f);
        } else {
            var _f = function _f(input) {
                return function (target) {
                    return function (constants) {
                        return constf(data);
                    };
                };
            };
            var _curry_f = new CurryFunction(_f, target);
            this.functions.push(_curry_f);
        }
    }

    createClass(Container, [{
        key: 'fmap',
        value: function fmap$$1(f) {
            var target = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "RGB";
            var constants = arguments[2];

            target = targetRemapping(target);
            var paramslen = calParamLength(target.isNumber)(last(this.functions).rtType) + 2;
            f = combine(fmap(this.gpu), anonymous2named, arrow2anonymous(paramslen))(f);
            var curry_f = new CurryFunction(f, target, constants);
            this.functions.push(curry_f);
            return this;
        }
    }, {
        key: 'bind',
        value: function bind$$1(f) {
            var bindSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [1, 1];
            var target = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "RGB";
            var constants = arguments[3];

            target = targetRemapping(target);
            var paramslen = calParamLength(target.isNumber)(last(this.functions).rtType) + 4;
            f = combine(bind(this.gpu)(bindSize), anonymous2named, arrow2anonymous(paramslen))(f);
            var curry_f = new CurryFunction(f, target, constants);
            this.functions.push(curry_f);
            return this;
        }
    }, {
        key: 'join',
        value: function join$$1(f) {
            var joinSize = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [1, 1];
            var target = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "RGB";
            var constants = arguments[3];

            target = targetRemapping(target);
            var paramslen = calParamLength(target.isNumber)(last(this.functions).rtType) + 5;
            f = combine(join(this.gpu)(joinSize), anonymous2named, arrow2anonymous(paramslen))(f);
            var curry_f = new CurryFunction(f, target, constants);
            this.functions.push(curry_f);
            return this;
        }
    }, {
        key: 'convolute',
        value: function convolute$$1(data) {
            var step = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

            var f = convolute(this.gpu)(step);

            var type = undefined;
            if (data instanceof ContainerFunction) {
                type = data.rtType;
            } else {
                data = new Param(data);
                type = data.type;
            }

            var prevType = last(this.functions).rtType;
            var target = type === TYPE_NUMBER && prevType === TYPE_NUMBER ? 'N' : 'RGB';
            var curry_f = new CurryFunction(f, target);

            if (data instanceof ContainerFunction) {
                var containerf = new ContainerFunction(curry_f, data.get(this.gpu)());
                this.functions.push(containerf);
                return this;
            }

            curry_f.apply(data);
            this.functions.push(curry_f);
            return this;
        }
    }, {
        key: 'ap',
        value: function ap(data) {
            var last_f = this.functions.pop();

            if (data instanceof ContainerFunction) {
                var containerf = new ContainerFunction(last_f, data.get(this.gpu)());
                this.functions.push(containerf);
                return this;
            }
            last_f.apply(data);
            this.functions.push(last_f);
            return this;
        }
    }, {
        key: 'combine',
        value: function combine$$1(containerf) {
            if (!(containerf instanceof ContainerFunction)) throw '[ERROR] Is input the Container.get()?';

            this.functions.push(containerf);

            return this;
        }
    }, {
        key: 'get',
        value: function get$$1() {

            if (this.functions.length === 1) return new ContainerFunction(head(this.functions));
            var prevs = front(this.functions);
            var f = last(this.functions);

            var result = [],
                tmp = [],
                i = 0;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = prevs[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var prevff = _step.value;

                    var prevf = prevff.get(this.gpu);
                    var type = prevff.rtType;

                    if (type === TYPE_NUMBER || i === 0 && prevff.params.length === 0) {
                        tmp.push(prevf);
                    } else if (type === TYPE_PIXEL) {
                        tmp.push(prevf);
                        result.push(combine.apply(undefined, toConsumableArray(tmp.reverse())));
                        tmp.length = 0;
                    }
                    i++;
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            var restf = combine.apply(undefined, toConsumableArray(tmp.reverse()));
            if (result.length === 0) prevs = promiseKernel(this.gpu)(false)(restf)();else {
                result = result.map(promiseKernel(this.gpu)(true));
                result[0] = result[0]();
                prevs = combinePromiseKernels(result);
                prevs = prevs.then(restf);
            }

            return new ContainerFunction(f, prevs);
        }
    }, {
        key: 'draw',
        value: function draw() {
            var containerf = this.get();
            var rtType = containerf.rtType;

            if (rtType != TYPE_PIXEL) throw "[ERROR] type of return value is not image!";

            return containerf.get(this.gpu, false)();
        }
    }, {
        key: 'output',
        value: function output() {
            var _this = this;

            var containerf = this.get();
            var rtType = containerf.rtType;

            if (rtType === TYPE_NUMBER) {
                return containerf.get(this.gpu, false)().then(function (texture) {
                    return texture.toArray(_this.gpu);
                });
            } else if (rtType === TYPE_PIXEL) return containerf.get(this.gpu, true)();else throw "[ERROR] type of return value is function!";
        }
    }]);
    return Container;
}();

//hack, fuck gpu.js

GPU.WebGLKernel.prototype.updateMaxTexSize = function () {
    var texSize = this.texSize;
    this.maxTexSize = [].concat(toConsumableArray(texSize));
};

var pure = function pure(gpu) {
    return function (data, target) {
        if (isFunction(data)) return new Container(gpu, data, target);else {
            if (is2DArray(data) || !isUndefined(data.output)) return new Container(gpu, data, 'N');else return new Container(gpu, data, 'RGBA');
        }
    };
};

window.$fip = function (params) {
    var gpu = new GPU(params);
    return {
        pure: pure(gpu),
        createDatabase: createDatabase(gpu),
        gpu: gpu
    };
};
