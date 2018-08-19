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

export const createDatabase = gpu => (name, type, values) => {
    let native_func = `${type} db_${name}[] = ${type}[${values.length}](${dbconvert(type)(values)});
     ${type} ${name}(float i){
        return db_${name}[int(i)];
     }
    `;
    gpu.addNativeFunction(name, native_func);
};