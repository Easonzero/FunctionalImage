const canvas = document.getElementById('canvas');
const image = document.getElementById('image');
const gl = canvas.getContext('webgl2');
const {pure,createDatabase} = $fip({canvas:canvas,webGl:gl});

image.src = './test.jpeg';
createDatabase('dbcolors', 'vec3', color.map(a=>a.map(c=>c/255)));

let cache = -1;
let w = 11, h = 11;
let max = w * w / 4;
let min = (w - 4) * (w - 4) / 4;
let c = Math.floor(11 / 2);

image.onload = () => {
    let container = pure(image)
        .join((r,v)=>(x,y)=>r*(y*2+x)/(y*2+x+1)+v/(y*2+x+1), [w, h], 'RGB')
        .fmap(r=>g=>b=>{
            let d = 2;
            let index = 0;
            for(let i=0;i<48;i++){
                let d_ = distance(dbcolors(i),vec3(r,g,b));
                if(d_ < d){
                    d = d_;
                    index = i;
                }
            }
            return index;
        },'N')
        .bind(v => (x,y) => i => {
            let cx = this.constants.c, cy = this.constants.c;
            let dx = x - cx, dy = y - cy;
            let d2 = dx * dx + dy * dy;
            if (d2 <= this.constants.max && d2 >= this.constants.min)
                return dbcolors(v)[i];
            else return 1;
        }, [w, h], 'RGB', { c, max, min })
        .draw();
};

function getPointOnCanvas(canvas, x, y) {

    let bbox = canvas.getBoundingClientRect();

    return { 
        x: x - bbox.left,
        y: y - bbox.top - 16
    };

}

canvas.onclick = (e) => {
    let pos = getPointOnCanvas(canvas,e.pageX,e.pageY);
    if(cache != -1)
        pure(cache)
        .bind(v => x => y => {
            let cx = this.constants.c, cy = this.constants.c;
            let dx = x - cx, dy = y - cy;
            let d2 = dx * dx + dy * dy;
            if (d2 <= this.constants.max && d2 >= this.constants.min)
                return v;
            else return 1;
        }, [w, h], 'RGB', { c, max, min })
        .draw();
};
