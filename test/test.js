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
    pure(image)
        .convolute([
            [0.167,0,0],
            [0,0.167,0],
            [0,0,0.167],
        ],2)
        .run()
        .then(console.log)
};
