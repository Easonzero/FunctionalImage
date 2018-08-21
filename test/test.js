const canvas = document.getElementById('canvas');
const image = document.getElementById('image');
const gl = canvas.getContext('webgl2');
const {pure,createDatabase} = $fip({canvas:canvas,webGl:gl});

image.src = './test2.jpg';
createDatabase('dbcolors', 'vec3', color);

let cache = -1;
let w = h = 11;
let max = w * w / 4;
let min = (w - 4) * (w - 4) / 4;
let c = Math.floor(w / 2);

image.onload = () => {
    let container = pure(image)
        .join((r,v)=>(x,y)=>r*(y*2+x)/(y*2+x+1)+v/(y*2+x+1), [w, h])
        .fmap(r=>g=>b=>{
            r *= 255;
            g *= 255;
            b *= 255;
            let d = 1e5;
            let index = 1;
            for(let i=1;i<=48;i++){
                let dr = abs(dbcolors(i, 0) - r);
                let dg = abs(dbcolors(i, 1) - g);
                let db = abs(dbcolors(i, 2) - b);
                let dr2 = dr*dr,dg2 = dg*dg,db2 = db*db;
                let dtmp = 2 * dr2 + 4 * dg2 + 3 * db2 + (dbcolors(i, 0) + r)*(dr2-db2)/512;
                if(dtmp < d){
                    d = dtmp;
                    index = i;
                }
            }
            return index;
        },'N')
    container
        .output()
        .then(v=>cache=v.reverse());
    container
        .fmap(v => i => dbcolors(v,i)/255)
        .fmap(v => 1., 'A')
        .bind(v => (x,y) => i => {
            let cx = this.constants.c, cy = this.constants.c;
            let dx = x - cx, dy = y - cy;
            let d2 = dx * dx + dy * dy;
            if (d2 <= this.constants.max && d2 >= this.constants.min){
                return v;
            }
            else return 0.95;
        }, [w, h], 'RGB', { c, max, min })
        .draw();
};

function getPointOnCanvas(canvas, x, y) {

    let bbox = canvas.getBoundingClientRect();

    return { 
        x: x - bbox.left,
        y: y - bbox.top
    };

}

canvas.onclick = (e) => {
    let pos = getPointOnCanvas(canvas,e.pageX,e.pageY);

    let x = Math.floor(pos.x/w);
    let y = Math.floor(pos.y/h);
    let index = cache[y][x];
    console.log(`pos: (${x},${y}) | 色号: #${index} ${color_name[index]}`)

    if(cache != -1)
        pure(cache)
            .fmap(v => i => dbcolors(v, i) / 255)
            .fmap(v => 1., 'A')
            .bind(v => (x, y) => i => {
                let cx = this.constants.c, cy = this.constants.c;
                let dx = x - cx, dy = y - cy;
                let d2 = dx * dx + dy * dy;
                if (d2 <= this.constants.max && d2 >= this.constants.min) {
                    return v;
                }
                else return 0.95;
            }, [w, h], 'RGB', { c, max, min })
            .draw();
};
