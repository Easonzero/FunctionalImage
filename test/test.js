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
    // pure(data)
    //     .join(r=>c=>x=>y=>0,'RGB')
    //     .fmap(x=>1,'A')
    //     .run();
    pure(image)
        .fmap(r=>g=>b=>a=>r,'N')
        .fmap(x=>x-0.3,'G')
        .fmap(x=>1,'RB')
        .fmap(x=>1,'A')
        .draw();
};
