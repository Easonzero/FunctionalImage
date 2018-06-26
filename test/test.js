const canvas = document.getElementById('canvas');
const image = document.getElementById('image');
const gl = canvas.getContext('webgl2');

const {pure} = $fip({canvas:canvas,webGl:gl});

const data = [];
for(let i=0;i<219;i++){
    let dataTmp = [];
    for(let j=0;j<219;j++){
        dataTmp.push(1);
    }
    data.push(dataTmp);
}

image.src = './headpic.jpg';
image.onload = () => {
    pure(r=>g=>b=>a=>r2=>g2=>b2=>a2=>r-g2,'N')
        .ap(image)
        .ap(image)
        .run(true)
        .then(console.log)
};
