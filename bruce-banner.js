console.log("Universe Banner");

const banner = document.getElementById("bruce-banner");

banner.style.width="100%";
banner.style.maxWidth="1100px";
banner.style.height="120px";
banner.style.margin="20px auto";
banner.style.borderRadius="12px";
banner.style.overflow="hidden";
banner.style.background="#000814";
banner.style.position="relative";

banner.innerHTML="<canvas id='cv'></canvas>";

const canvas=document.getElementById("cv");
const ctx=canvas.getContext("2d");

function resize(){

canvas.width=banner.clientWidth;
canvas.height=banner.clientHeight;

}

resize();

window.addEventListener("resize",resize);

//////////////////////////////////////////////////
// Stars
//////////////////////////////////////////////////

const stars=[];

for(let i=0;i<200;i++){

stars.push({

x:Math.random()*canvas.width,
y:Math.random()*canvas.height,
r:Math.random()*2,
s:Math.random()*0.5+0.2

});

}

//////////////////////////////////////////////////
// Images
//////////////////////////////////////////////////

const jupiter=new Image();
jupiter.src="images/Jupiter.png";

const black=new Image();
black.src="images/blackhole.png";

//////////////////////////////////////////////////
// Planets
//////////////////////////////////////////////////

let jx=-120;
let jy=10;

let bx=canvas.width+120;
let by=0;

let jAngle=0;
let bAngle=0;

let exploded=false;

//////////////////////////////////////////////////
// Explosion
//////////////////////////////////////////////////

const particles=[];

function createExplosion(x,y){

for(let i=0;i<300;i++){

particles.push({

x:x,
y:y,

vx:(Math.random()-0.5)*10,
vy:(Math.random()-0.5)*10,

size:Math.random()*5+2,

life:100,

color:`hsl(${Math.random()*60},100%,60%)`

});

}

}

//////////////////////////////////////////////////
// Loop
//////////////////////////////////////////////////

function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height);

//////////////////////////////////////////////////
// Stars
//////////////////////////////////////////////////

ctx.fillStyle="white";

for(const s of stars){

ctx.beginPath();
ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
ctx.fill();

s.x-=s.s;

if(s.x<0){

s.x=canvas.width;
s.y=Math.random()*canvas.height;

}

}

//////////////////////////////////////////////////
// Before collision
//////////////////////////////////////////////////

if(!exploded){

//////////////////////////////////////////////////
// Jupiter
//////////////////////////////////////////////////

ctx.save();

ctx.translate(jx+55,jy+55);

ctx.rotate(jAngle);

ctx.drawImage(jupiter,-55,-55,110,110);

ctx.restore();

//////////////////////////////////////////////////
// Black Hole
//////////////////////////////////////////////////

ctx.save();

ctx.translate(bx+55,by+55);

ctx.rotate(bAngle);

ctx.drawImage(black,-55,-55,110,110);

ctx.restore();

jx+=1.5;
bx-=1.5;

jAngle+=0.01;
bAngle-=0.02;

let dx=jx-bx;
let dy=jy-by;

let d=Math.sqrt(dx*dx+dy*dy);

if(d<90){

exploded=true;

createExplosion(
canvas.width/2,
canvas.height/2
);

}

}

//////////////////////////////////////////////////
// Explosion
//////////////////////////////////////////////////

for(let i=particles.length-1;i>=0;i--){

let p=particles[i];

ctx.fillStyle=p.color;

ctx.beginPath();

ctx.arc(
p.x,
p.y,
p.size,
0,
Math.PI*2
);

ctx.fill();

p.x+=p.vx;
p.y+=p.vy;

p.vx*=0.98;
p.vy*=0.98;

p.size*=0.985;

p.life--;

if(p.life<=0){

particles.splice(i,1);

}

}

//////////////////////////////////////////////////
// White Flash
//////////////////////////////////////////////////

if(exploded){

ctx.fillStyle="rgba(255,255,255,0.06)";
ctx.fillRect(0,0,canvas.width,canvas.height);

}

//////////////////////////////////////////////////
// Restart
//////////////////////////////////////////////////

if(exploded && particles.length==0){

exploded=false;

jx=-120;
jy=10;

bx=canvas.width+120;
by=0;

}

requestAnimationFrame(draw);

}

draw();
