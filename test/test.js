const canvas = document.getElementById('canvas');
const image = document.getElementById('image');
const gl = canvas.getContext('webgl2');
const {pure,createDatabase} = $fip({canvas:canvas,webGl:gl});

image.src = './test.jpeg';
createDatabase('dbcolors', 'float', {white:1.,black:0.});

let cache = -1;
let w = h = 11;
let max = w * w / 4;
let min = (w - 4) * (w - 4) / 4;
let c = Math.floor(w / 2);

image.onload = () => {
    let container = pure(image)
        .join((r,v) => (x,y)=>r*(y*2+x)/(y*2+x+1)+v/(y*2+x+1), [w, h], 'RGB');
    container
        .output()
        .then(x => cache = x);
    container
        .bind(v => (x,y) => {
            let cx = this.constants.c, cy = this.constants.c;
            let dx = x - cx, dy = y - cy;
            let d2 = dx * dx + dy * dy;
            if (d2 <= this.constants.max && d2 >= this.constants.min)
                return v;
            else return dbcolors(WHITE);
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
    w = h -= 2;
    max = w * w / 4;
    min = (w - 4) * (w - 4) / 4;
    c = Math.floor(w / 2);
    if(cache != -1)
        pure(cache)
        .bind(v => x => y => {
            let cx = this.constants.c, cy = this.constants.c;
            let dx = x - cx, dy = y - cy;
            let d2 = dx * dx + dy * dy;
            if (d2 <= this.constants.max && d2 >= this.constants.min)
                return v;
            else return dbcolors(WHITE);
        }, [w, h], 'RGB', { c, max, min })
        .draw();
};
