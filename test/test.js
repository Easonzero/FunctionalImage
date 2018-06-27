const canvas = document.getElementById('canvas');
const image = document.getElementById('image');
const gl = canvas.getContext('webgl2');

const {pure} = $fip({canvas:canvas,webGl:gl});

const data = [];
for(let i=0;i<219;i++){
    let dataTmp = [];
    for(let j=0;j<219;j++){
        dataTmp.push(0.5);
    }
    data.push(dataTmp);
}

image.src = './headpic.jpg';
image.onload = () => {
    pure(a=>b=>a*b,'RGB')
        .ap(image)
        .ap(data)//data是一个与图片等尺寸的float二维数组
        .run()
        .then(console.log)
};
