import {isArray, isObject} from './utils';

export const TYPE_NUMBER = 0;
export const TYPE_PIXEL = 1;
export const TYPE_FUNCTION = 2;

export const TARGET_BASE = ['N', 'R', 'G', 'B', 'A'];

const dbconvert = type => values => {
  switch(type){
      case "vec3":
      case "vec4":
          return values.map(v=>`${type}(${v})`);
      case "float":
          return values.map(v=>{
              v = v.toString();
              if(v.includes('.')) return v;
              else return v+'.';
          });
      default:
          return values;
  }
};

const createArray = gpu => (name, type, array) => {
    let native_func = `${type} db_${name}[] = ${type}[${array.length}](${dbconvert(type)(array)});
${type} ${name}(float i){
    return db_${name}[int(i)];
}`;
    gpu.addNativeFunction(name, native_func);
};

const createMap = gpu => (name, type, json) => {
    let keys = Object.keys(json);
    let values = Object.values(json);

    let native_func = `${keys.map((key,i)=>`#define user_${key.toUpperCase()} ${i}`).join('\n')}
${type} db_${name}[] = ${type}[${values.length}](${dbconvert(type)(values)});
${type} ${name}(int i){
    return db_${name}[i];
}`;
    gpu.addNativeFunction(name, native_func);
};

export const createDatabase = gpu => {
    let create_array = createArray(gpu);
    let create_map = createMap(gpu);
    return (name, type, data) => {
        if(isArray(data)) return create_array(name, type, data);
        if(isObject(data)) return create_map(name, type, data);
    }
};